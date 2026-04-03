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
    const { concept } = await req.json();
    
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

    // Get OpenAI API key from user config or environment
    let apiKey: string | null = null;
    
    try {
      const { data: config } = await supabase
        .from('ai_service_configs')
        .select('api_key')
        .eq('user_id', user.id)
        .eq('service_name', 'openai')
        .single();

      if (config?.api_key) {
        apiKey = config.api_key;
      }
    } catch (error) {
      console.log('No user config found, using environment key');
    }

    if (!apiKey) {
      apiKey = Deno.env.get('OPENAI_API_KEY');
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'OpenAI API key not configured' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

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
    }
  ]
}`;

    const requestBody = {
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Create a comprehensive learning package for: ${concept}` }
      ],
      temperature: 0.7,
      max_tokens: 4000
    };

    // Make API call
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from OpenAI');
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
          tokens_used: data.usage?.total_tokens || 0,
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