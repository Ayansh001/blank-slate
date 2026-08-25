import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function classifyApiError(status: number, errorBody: string): { code: string; message: string } {
  if (status === 401) {
    return { code: 'invalid_key', message: 'Invalid API key. Please check your configuration.' };
  }
  if (status === 403) {
    return { code: 'permission_denied', message: 'API key does not have permission for this request.' };
  }
  if (status === 429) {
    if (errorBody.includes('quota') || errorBody.includes('billing')) {
      return { code: 'quota_exceeded', message: 'API quota exceeded. Please check your billing.' };
    }
    return { code: 'rate_limited', message: 'Rate limited. Please wait a moment and try again.' };
  }
  if (status === 400) {
    if (errorBody.includes('model')) {
      return { code: 'invalid_model', message: 'Invalid model specified. Please check your AI configuration.' };
    }
    return { code: 'bad_request', message: `Bad request: ${errorBody.substring(0, 200)}` };
  }
  if (status === 404) {
    return { code: 'invalid_model', message: 'Model not found. Please select a valid model.' };
  }
  return { code: 'api_error', message: `API error (${status}): ${errorBody.substring(0, 200)}` };
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { prompt, mode = 'basic-concept', options = {} } = await req.json();
    console.log('[concept-learner] Request received:', { prompt: prompt?.substring(0, 50), mode });
    
    if (!prompt) {
      return jsonResponse({ success: false, error: 'Prompt is required', code: 'bad_request' });
    }

    // Get auth token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return jsonResponse({ success: false, error: 'Authorization required', code: 'auth_required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return jsonResponse({ success: false, error: 'Invalid authentication', code: 'auth_failed' });
    }

    // Get active AI config
    const { data: configData, error: configError } = await supabase
      .from('ai_service_configs')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (configError || !configData) {
      return jsonResponse({ 
        success: false, 
        error: 'No active AI service configured. Please configure an AI service in Settings.',
        code: 'no_config'
      }, 200); // 200 so frontend can read the body
    }

    // Get API key
    let apiKey: string | null = null;
    const serviceName = configData.service_name.toLowerCase();
    const dbKey = configData.api_key;
    const envKey = serviceName === 'openai' ? Deno.env.get('OPENAI_API_KEY') : Deno.env.get('GEMINI_API_KEY');
    
    if (serviceName === 'openai' || serviceName === 'gemini') {
      apiKey = dbKey || envKey || null;
    }

    console.log('[concept-learner] KEY DIAGNOSTIC:', { 
      service: serviceName, 
      model: configData.model_name,
      dbKeyPrefix: dbKey?.slice(0, 10) || 'NONE',
      dbKeyLength: dbKey?.length || 0,
      envKeyPrefix: envKey?.slice(0, 10) || 'NONE',
      envKeyLength: envKey?.length || 0,
      usedKeyPrefix: apiKey?.slice(0, 10) || 'NONE',
      usedKeyLength: apiKey?.length || 0,
      source: dbKey ? 'DATABASE' : (envKey ? 'ENV' : 'NONE')
    });

    if (!apiKey) {
      return jsonResponse({ 
        success: false, 
        error: 'API key not configured. Please add your API key in Settings.',
        code: 'missing_key'
      }, 200);
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
      console.log('[concept-learner] Calling OpenAI:', { model: modelToUse });

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
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

      console.log('[concept-learner] OpenAI response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[concept-learner] OpenAI API error:', response.status, errorText);
        const classified = classifyApiError(response.status, errorText);
        return jsonResponse({ 
          success: false, 
          error: classified.message, 
          code: classified.code,
          diagnostics: { provider: 'openai', status: response.status, processingTime: Date.now() - startTime }
        }, 200); // 200 so frontend can parse the classified error
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        return jsonResponse({ 
          success: false, 
          error: 'No content received from OpenAI',
          code: 'empty_response'
        }, 200);
      }

      return jsonResponse({ 
        success: true, 
        result: parseConceptContent(content, prompt, isAdvanced),
        diagnostics: { provider: 'openai', model: modelToUse, processingTime: Date.now() - startTime }
      });

    } else if (serviceName === 'gemini') {
      const modelToUse = configData.model_name || 'gemini-1.5-flash';
      console.log('[concept-learner] Calling Gemini:', { model: modelToUse });
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${apiKey}`, {
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

      console.log('[concept-learner] Gemini response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[concept-learner] Gemini API error:', response.status, errorText);
        const classified = classifyApiError(response.status, errorText);
        return jsonResponse({ 
          success: false, 
          error: classified.message, 
          code: classified.code,
          diagnostics: { provider: 'gemini', status: response.status, processingTime: Date.now() - startTime }
        }, 200);
      }

      const data = await response.json();
      
      if (data.error) {
        console.error('[concept-learner] Gemini error in response body:', data.error);
        return jsonResponse({ 
          success: false, 
          error: data.error.message || 'Gemini returned an error',
          code: 'api_error',
          diagnostics: { provider: 'gemini', processingTime: Date.now() - startTime }
        }, 200);
      }
      
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!content) {
        return jsonResponse({ 
          success: false, 
          error: 'No content received from Gemini',
          code: 'empty_response'
        }, 200);
      }

      return jsonResponse({ 
        success: true, 
        result: parseConceptContent(content, prompt, isAdvanced),
        diagnostics: { provider: 'gemini', model: modelToUse, processingTime: Date.now() - startTime }
      });
    }

    return jsonResponse({ 
      success: false, 
      error: 'Unsupported AI service',
      code: 'unsupported_service'
    }, 200);

  } catch (error) {
    console.error('[concept-learner] Unhandled error:', (error as Error).message, (error as Error).stack);
    return jsonResponse({ 
      success: false, 
      error: (error as Error).message || 'Internal server error',
      code: 'internal_error',
      diagnostics: { processingTime: Date.now() - startTime }
    }, 200); // 200 so frontend can always read the classified error
  }
});

function parseConceptContent(content: string, prompt: string, isAdvanced: boolean): Record<string, unknown> {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : content;
    const parsedResult = JSON.parse(jsonStr);
    
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

    return parsedResult;
  } catch {
    console.warn('[concept-learner] JSON parse failed, using fallback structure');
    return {
      concept: prompt,
      explanation: content,
      keyPoints: [`Key aspects of ${prompt}`],
      examples: [`Example application of ${prompt}`],
      relatedConcepts: [{ name: "Related topic", relationship: "Connected concept" }],
      studyTips: [`Study tip for ${prompt}`]
    };
  }
}
