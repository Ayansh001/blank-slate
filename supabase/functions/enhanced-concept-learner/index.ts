
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { concept, provider = 'gemini' } = await req.json();
    
    if (!concept) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Concept is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get auth token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Authorization required' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid authentication' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get the appropriate AI provider
    let apiKey: string;
    let apiEndpoint: string;
    let requestBody: any;

    if (provider === 'openai') {
      apiKey = Deno.env.get('OPENAI_API_KEY')!;
      apiEndpoint = 'https://api.openai.com/v1/chat/completions';
      
      const systemPrompt = `You are an intelligent AI tutor. Create a comprehensive learning package for the concept provided. 

Return a JSON object with these exact fields:
{
  "concept": "Main concept name",
  "explanation": "Clear, detailed explanation in 3-5 paragraphs",
  "keyPoints": ["Array of 4-7 important takeaways"],
  "studyTips": ["Array of 2-4 study strategies"],
  "examples": ["Array of 2-3 real-world examples"],
  "relatedConcepts": [{"name": "Concept name", "relationship": "How it relates"}],
  "mindMap": {
    "center": "Main topic",
    "branches": [
      {"topic": "Definition", "subtopics": ["sub-concept 1", "sub-concept 2"]},
      {"topic": "Examples", "subtopics": ["example 1", "example 2"]},
      {"topic": "Applications", "subtopics": ["application 1", "application 2"]},
      {"topic": "Key Terms", "subtopics": ["term 1", "term 2"]}
    ]
  },
  "knowledgeGraph": {
    "centralNode": "Main concept",
    "connectedNodes": ["5-7 related topics"]
  },
  "youtubeSearchQuery": "Smart search phrase for educational videos",
  "flashcardSummaries": [
    {
      "id": "concept-main",
      "shortSummary": "Brief 1-sentence summary",
      "comprehensiveExplanation": "Detailed 2-3 paragraph explanation with examples, applications, and deeper insights"
    },
    {
      "id": "keypoint-0",
      "shortSummary": "Key point brief summary",
      "comprehensiveExplanation": "Detailed explanation of this key point with context and applications"
    }
  ]
}`;

      requestBody = {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Create a comprehensive learning package for: ${concept}` }
        ],
        temperature: 0.7,
        max_tokens: 4000
      };
    } else {
      // Default to Gemini
      apiKey = Deno.env.get('GEMINI_API_KEY')!;
      apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
      
      const promptText = `Create a comprehensive learning package for the concept: "${concept}"

Return a valid JSON object with exactly these fields:
{
  "concept": "The main concept name",
  "explanation": "A clear, engaging explanation in 3-5 paragraphs",
  "keyPoints": ["4-7 essential takeaways"],
  "studyTips": ["2-4 proven learning strategies"],
  "examples": ["2-3 concrete examples"],
  "relatedConcepts": [
    {"name": "Related Concept 1", "relationship": "How it connects"},
    {"name": "Related Concept 2", "relationship": "How it differs"}
  ],
  "mindMap": {
    "center": "${concept}",
    "branches": [
      {"topic": "Core Definition", "subtopics": ["fundamental aspects", "key characteristics"]},
      {"topic": "Real Examples", "subtopics": ["practical applications", "everyday instances"]},
      {"topic": "Key Applications", "subtopics": ["where it's used", "why it matters"]},
      {"topic": "Important Terms", "subtopics": ["vocabulary", "technical concepts"]}
    ]
  },
  "knowledgeGraph": {
    "centralNode": "${concept}",
    "connectedNodes": ["5-7 related topics that form a learning network"]
  },
  "youtubeSearchQuery": "Optimized search phrase for educational videos about ${concept}",
  "flashcardSummaries": [
    {
      "id": "concept-main-${concept}",
      "shortSummary": "Brief one-sentence summary of the main concept",
      "comprehensiveExplanation": "Detailed 2-3 paragraph explanation with practical applications, deeper insights, connections to related concepts, and real-world examples that help students truly understand and master this concept"
    }
  ]
}

Generate additional flashcard summaries for each key point and example with both short summaries and comprehensive explanations.`;

      requestBody = {
        contents: [{
          parts: [{
            text: promptText
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4000,
        }
      };
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `${provider.toUpperCase()} API key not configured` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Make API call
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (provider === 'openai') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${provider.toUpperCase()} API error:`, response.status, errorText);
      throw new Error(`${provider.toUpperCase()} API error: ${response.status}`);
    }

    const data = await response.json();
    let content: string;

    if (provider === 'openai') {
      content = data.choices?.[0]?.message?.content;
    } else {
      content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    }

    if (!content) {
      throw new Error(`No content received from ${provider.toUpperCase()}`);
    }

    try {
      // Clean the content to extract JSON
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsedResult = JSON.parse(cleanContent);
      
      // Ensure flashcardSummaries exist with proper structure
      if (!parsedResult.flashcardSummaries || parsedResult.flashcardSummaries.length === 0) {
        parsedResult.flashcardSummaries = [
          {
            id: `concept-main-${concept}`,
            shortSummary: parsedResult.explanation?.split('.')[0] + '.' || `Brief summary of ${concept}`,
            comprehensiveExplanation: parsedResult.explanation || `Comprehensive explanation of ${concept} with practical applications and deeper insights.`
          }
        ];

        // Add flashcards for key points
        if (parsedResult.keyPoints) {
          parsedResult.keyPoints.forEach((point: string, index: number) => {
            parsedResult.flashcardSummaries.push({
              id: `keypoint-${index}-${concept}`,
              shortSummary: point.split('.')[0] + '.',
              comprehensiveExplanation: `Detailed explanation of this key point: ${point}. This concept is important because it helps understand the fundamental aspects of ${concept} and its practical applications in real-world scenarios.`
            });
          });
        }

        // Add flashcards for examples
        if (parsedResult.examples) {
          parsedResult.examples.forEach((example: string, index: number) => {
            parsedResult.flashcardSummaries.push({
              id: `example-${index}-${concept}`,
              shortSummary: example.split('.')[0] + '.',
              comprehensiveExplanation: `This example illustrates ${concept}: ${example}. Understanding this example helps grasp how ${concept} works in practice and can be applied to solve real problems.`
            });
          });
        }
      }

      // Fetch YouTube videos using the search query
      let youtubeVideos = [];
      try {
        const youtubeResponse = await supabase.functions.invoke('youtube-search-handler', {
          body: { 
            query: parsedResult.youtubeSearchQuery || concept,
            maxResults: 5 
          }
        });
        
        if (youtubeResponse.data?.success && youtubeResponse.data?.videos) {
          youtubeVideos = youtubeResponse.data.videos;
        }
      } catch (error) {
        console.error('YouTube integration error:', error);
        // Continue without videos
      }
      
      // Add YouTube videos to the result
      const enhancedResult = {
        ...parsedResult,
        youtubeVideos: youtubeVideos
      };
      
      // Save to concept learning sessions
      await supabase
        .from('concept_learning_sessions')
        .insert({
          user_id: user.id,
          concept: concept,
          mode: 'enhanced',
          response_data: enhancedResult,
          tokens_used: provider === 'openai' ? data.usage?.total_tokens || 0 : data.usageMetadata?.totalTokenCount || 0,
          processing_time: Date.now()
        });

      return new Response(JSON.stringify({ 
        success: true, 
        result: enhancedResult 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Content received:', content);
      
      // Fallback: create structured response from plain text
      const fallbackResult = {
        concept: concept,
        explanation: content,
        keyPoints: [`Key aspects of ${concept}`],
        studyTips: [`Study tip for ${concept}`],
        examples: [`Example application of ${concept}`],
        relatedConcepts: [{ name: "Related topic", relationship: "Connected concept" }],
        mindMap: {
          center: concept,
          branches: [
            { topic: "Definition", subtopics: ["Basic meaning"] },
            { topic: "Examples", subtopics: ["Real-world use"] }
          ]
        },
        knowledgeGraph: {
          centralNode: concept,
          connectedNodes: ["Related topic 1", "Related topic 2"]
        },
        youtubeSearchQuery: `${concept} explained tutorial`,
        flashcardSummaries: [
          {
            id: `concept-main-${concept}`,
            shortSummary: content.split('.')[0] + '.',
            comprehensiveExplanation: content
          }
        ]
      };
      
      return new Response(JSON.stringify({ 
        success: true, 
        result: fallbackResult 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Enhanced concept learner error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
