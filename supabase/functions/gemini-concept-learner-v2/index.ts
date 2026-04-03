
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

    // Get API key
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Gemini API key not configured' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Enhanced prompt structure optimized for Gemini with comprehensive flashcard explanations
    const promptText = `You are an intelligent AI tutor integrated into StudyVault, a comprehensive learning platform. Create a complete educational package for the concept: "${concept}"

Please respond with a valid JSON object containing exactly these fields:

{
  "concept": "The main concept name",
  "explanation": "A clear, engaging explanation in 3-5 paragraphs that makes the concept accessible to beginners while highlighting real-world relevance and practical applications",
  "keyPoints": [
    "4-7 essential takeaways that capture the core understanding needed",
    "Each point should be concise but comprehensive",
    "Include **bold** formatting for critical terms"
  ],
  "studyTips": [
    "2-4 proven learning strategies specific to this concept",
    "Include memory techniques, mnemonics, or study hacks",
    "Focus on practical methods for retention and understanding"
  ],
  "examples": [
    "2-3 concrete examples from real life or academic contexts",
    "Make examples relatable and illustrative of key principles",
    "Range from simple to more complex applications"
  ],
  "relatedConcepts": [
    {
      "name": "Related Concept 1",
      "relationship": "Detailed explanation of how it connects, differs, or builds upon the main concept"
    },
    {
      "name": "Related Concept 2", 
      "relationship": "Clear description of the relationship and why it matters for understanding"
    }
  ],
  "mindMap": {
    "center": "${concept}",
    "branches": [
      {
        "topic": "Core Definition",
        "subtopics": ["fundamental aspects", "key characteristics"]
      },
      {
        "topic": "Real Examples",
        "subtopics": ["practical applications", "everyday instances"]
      },
      {
        "topic": "Key Applications",
        "subtopics": ["where it's used", "why it matters"]
      },
      {
        "topic": "Important Terms",
        "subtopics": ["vocabulary", "technical concepts"]
      },
      {
        "topic": "Related Ideas",
        "subtopics": ["connected concepts", "broader context"]
      }
    ]
  },
  "knowledgeGraph": {
    "centralNode": "${concept}",
    "connectedNodes": [
      "5-7 related topics that form a learning network",
      "Include prerequisites, advanced topics, and applications",
      "Focus on concepts students should explore next"
    ]
  },
  "youtubeSearchQuery": "An optimized search phrase for finding high-quality educational videos about ${concept}",
  "flashcardSummaries": [
    {
      "id": "concept-main-${concept}",
      "shortSummary": "A concise 1-2 sentence summary of the main concept that serves as a quick reminder",
      "comprehensiveExplanation": "A detailed 3-4 paragraph explanation that provides deep understanding, practical applications, connections to related concepts, and study strategies. This should be comprehensive enough that a student could understand the concept thoroughly just from this explanation."
    },
    {
      "id": "keypoint-0-${concept}",
      "shortSummary": "Brief summary of the first key point",
      "comprehensiveExplanation": "Detailed explanation of the first key point with examples, applications, and how it connects to the broader concept"
    },
    {
      "id": "keypoint-1-${concept}",
      "shortSummary": "Brief summary of the second key point",
      "comprehensiveExplanation": "Detailed explanation of the second key point with practical insights and learning strategies"
    },
    {
      "id": "example-0-${concept}",
      "shortSummary": "Brief description of the first example",
      "comprehensiveExplanation": "Detailed analysis of the first example, explaining why it demonstrates the concept, what principles it illustrates, and how students can apply similar thinking"
    },
    {
      "id": "tip-0-${concept}",
      "shortSummary": "Brief description of the first study tip",
      "comprehensiveExplanation": "Comprehensive explanation of the study strategy, why it works for this concept, how to implement it effectively, and what results to expect"
    }
  ]
}

CRITICAL REQUIREMENTS for flashcardSummaries:
- Generate exactly one flashcard summary for each key point, example, and study tip you create
- Each comprehensiveExplanation should be 150-300 words and provide deep, actionable insights
- Make shortSummary brief (1-2 sentences) but comprehensiveExplanation detailed and educational
- Ensure each flashcard adds unique value and perspective on the concept
- Include practical applications, connections to other concepts, and effective study approaches

Guidelines:
- Write in an engaging, educational tone
- Make complex ideas accessible without oversimplifying
- Include specific, actionable study strategies
- Ensure all JSON fields are properly formatted
- Focus on practical understanding and real-world connections

Generate the comprehensive learning package now:`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: promptText
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 6000,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Gemini error: ${data.error.message}`);
    }
    
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error('No content received from Gemini');
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
      
      // Ensure flashcardSummaries exist
      if (!parsedResult.flashcardSummaries || parsedResult.flashcardSummaries.length === 0) {
        console.log('AI did not generate flashcardSummaries, creating fallback');
        parsedResult.flashcardSummaries = [
          {
            id: `concept-main-${concept}`,
            shortSummary: parsedResult.explanation?.split('.')[0] + '.' || `Brief summary of ${concept}`,
            comprehensiveExplanation: parsedResult.explanation || `Comprehensive explanation of ${concept} with practical applications and deeper insights.`
          }
        ];
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
          mode: 'advanced',
          response_data: enhancedResult,
          tokens_used: data.usageMetadata?.totalTokenCount || 0,
          processing_time: Date.now() // placeholder
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
      
      // Fallback: create structured response from plain text with comprehensive explanations
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
            shortSummary: `Brief overview of ${concept}`,
            comprehensiveExplanation: content.substring(0, 500) + '...'
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
    console.error('Gemini concept learner error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
