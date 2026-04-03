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
    const { prompt, mode = 'basic-concept', options = {} } = await req.json();
    
    if (!prompt) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Prompt is required' 
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

    // Get active AI config
    const { data: configData, error: configError } = await supabase
      .from('ai_service_configs')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (configError || !configData) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No active AI service configured' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get API key
    let apiKey: string | null = null;
    if (configData.service_name.toLowerCase() === 'openai') {
      apiKey = Deno.env.get('OPENAI_API_KEY') || configData.api_key_encrypted;
    } else if (configData.service_name.toLowerCase() === 'gemini') {
      apiKey = Deno.env.get('GEMINI_API_KEY') || configData.api_key_encrypted;
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'API key not configured' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const isAdvanced = mode === 'advanced-concept-learning';
    
    // Build enhanced prompt for concept learning
    const systemPrompt = isAdvanced 
      ? `You are an expert educational AI that creates comprehensive concept explanations with advanced features.

For the given concept, provide a detailed JSON response with ALL of the following fields:
- concept: The main concept name
- explanation: A comprehensive explanation (2-3 paragraphs)
- keyPoints: Array of 4-6 key points that summarize the concept
- examples: Array of 3-4 practical examples or applications
- relatedConcepts: Array of 3-5 related concepts with their relationship explained
- studyTips: Array of 4-5 specific study tips for mastering this concept
- practicalApplications: Array of real-world applications
- mindMap: Object with center (main concept) and branches (array of objects with topic and subtopics)
- knowledgeGraph: Object with nodes (id, label, type) and edges (from, to, relationship)
- youtubeVideos: Array of educational video suggestions (mock data with realistic titles)

Make the response educational, comprehensive, and structured for effective learning.`
      : `You are an educational AI assistant. Explain the given concept clearly and provide helpful learning materials.

Provide a JSON response with:
- concept: The main concept name
- explanation: Clear explanation in 1-2 paragraphs
- keyPoints: Array of 3-4 main points
- examples: Array of 2-3 examples
- relatedConcepts: Array of 2-3 related topics
- studyTips: Array of 2-3 study suggestions`;

    let response;
    const serviceName = configData.service_name.toLowerCase();

    if (serviceName === 'openai') {
      // Use supported OpenAI models
      const modelMapping: Record<string, string> = {
        'gpt-4': 'gpt-4o',
        'gpt-4-turbo': 'gpt-4o',
        'gpt-4o-mini': 'gpt-4o-mini',
        'gpt-4o': 'gpt-4o',
        'gpt-3.5-turbo': 'gpt-4o-mini'
      };
      
      const modelToUse = modelMapping[configData.model_name || 'gpt-4o-mini'] || 'gpt-4o-mini';

      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Explain this concept: ${prompt}` }
          ],
          temperature: 0.7,
          max_tokens: isAdvanced ? 4000 : 2000
        }),
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
        const parsedResult = JSON.parse(content);
        
        // Enhance with mock advanced features if in advanced mode
        if (isAdvanced && !parsedResult.youtubeVideos) {
          parsedResult.youtubeVideos = [
            {
              id: "mock1",
              title: `Understanding ${prompt} - Complete Guide`,
              thumbnail: `https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg`,
              channel: "Educational Channel",
              description: `Comprehensive explanation of ${prompt} with examples`,
              url: `https://youtube.com/watch?v=dQw4w9WgXcQ`
            }
          ];
        }

        return new Response(JSON.stringify({ 
          success: true, 
          result: parsedResult 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        // Fallback: create structured response from plain text
        const fallbackResult = {
          concept: prompt,
          explanation: content,
          keyPoints: [`Key aspects of ${prompt}`],
          examples: [`Example application of ${prompt}`],
          relatedConcepts: [{ name: "Related topic", relationship: "Connected concept" }],
          studyTips: [`Study tip for ${prompt}`]
        };
        
        return new Response(JSON.stringify({ 
          success: true, 
          result: fallbackResult 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

    } else if (serviceName === 'gemini') {
      const modelToUse = configData.model_name || 'gemini-2.0-flash-exp';
      
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt}\n\nUser: Explain this concept: ${prompt}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: isAdvanced ? 4000 : 2000,
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
        const parsedResult = JSON.parse(content);
        
        // Enhance with mock advanced features if in advanced mode
        if (isAdvanced && !parsedResult.youtubeVideos) {
          parsedResult.youtubeVideos = [
            {
              id: "mock1",
              title: `Understanding ${prompt} - Complete Guide`,
              thumbnail: `https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg`,
              channel: "Educational Channel", 
              description: `Comprehensive explanation of ${prompt} with examples`,
              url: `https://youtube.com/watch?v=dQw4w9WgXcQ`
            }
          ];
        }

        return new Response(JSON.stringify({ 
          success: true, 
          result: parsedResult 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        // Fallback: create structured response from plain text
        const fallbackResult = {
          concept: prompt,
          explanation: content,
          keyPoints: [`Key aspects of ${prompt}`],
          examples: [`Example application of ${prompt}`],
          relatedConcepts: [{ name: "Related topic", relationship: "Connected concept" }],
          studyTips: [`Study tip for ${prompt}`]
        };
        
        return new Response(JSON.stringify({ 
          success: true, 
          result: fallbackResult 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Unsupported AI service' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Concept learner error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});