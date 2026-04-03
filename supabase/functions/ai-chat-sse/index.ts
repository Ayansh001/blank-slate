import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to check history preferences
async function checkHistoryPreference(supabase: any, userId: string, featureType: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('ai_history_preferences')
      .select('is_enabled')
      .eq('user_id', userId)
      .eq('feature_type', featureType)
      .maybeSingle();

    if (error) {
      console.warn('History preference check failed:', error);
      return true; // Default to enabled on error
    }

    return data?.is_enabled ?? true; // Default to enabled if no preference found
  } catch (error) {
    console.warn('Error checking history preference:', error);
    return true; // Default to enabled on error
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const { message, sessionId, fileReferences = [] } = await req.json();

    if (!message || !sessionId) {
      return new Response(JSON.stringify({ error: 'Missing required fields: message or sessionId' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if chat history is enabled
    const historyEnabled = await checkHistoryPreference(supabase, user.id, 'chat_sessions');
    console.log('Chat history enabled for user:', user.id, historyEnabled);

    // Get user's active AI config
    const { data: configData, error: configError } = await supabase
      .from('ai_service_configs')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (configError) {
      console.error('Error fetching AI config:', configError);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch AI configuration',
        details: 'Please check your AI service settings'
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!configData) {
      console.error('No active AI configuration found for user:', user.id);
      return new Response(JSON.stringify({ 
        error: 'No active AI service configured',
        details: 'Please configure an AI service (OpenAI, Gemini, etc.) in your settings before using AI features',
        requiresConfig: true
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Using AI service:', configData.service_name, 'with model:', configData.model_name);

    // Get API key from Supabase Edge Function secrets first (most secure)
    let apiKey: string | null = null;
    
    if (configData.service_name.toLowerCase() === 'openai') {
      apiKey = Deno.env.get('OPENAI_API_KEY');
      console.log('OpenAI API key from secrets:', !!apiKey);
    } else if (configData.service_name.toLowerCase() === 'gemini') {
      apiKey = Deno.env.get('GEMINI_API_KEY');
      console.log('Gemini API key from secrets:', !!apiKey);
    }

    // Fallback to stored API key if no secret is configured
    if (!apiKey && configData.api_key) {
      console.log('Using stored API key as fallback');
      apiKey = configData.api_key;
    }

    // Validate API key exists
    if (!apiKey) {
      console.error('No API key found for service:', configData.service_name);
      return new Response(JSON.stringify({ 
        error: 'AI service API key not configured',
        details: `Please add your ${configData.service_name} API key in the AI settings or configure it as an Edge Function secret`,
        requiresConfig: true
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Build context from file references
    let context = '';
    if (fileReferences.length > 0) {
      context = '\n\nContext from files:\n' + fileReferences.map(
        (file: any) => `${file.name}: ${file.content || file.ocr_text || 'No content available'}`
      ).join('\n\n');
    }

    // Ensure chat session exists (only if history is enabled)
    if (historyEnabled) {
      const { data: existingSession } = await supabase
        .from('ai_chat_sessions')
        .select('id')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existingSession) {
        console.log('Creating new chat session:', sessionId);
        await supabase.from('ai_chat_sessions').insert({
          id: sessionId,
          user_id: user.id,
          ai_service: configData.service_name,
          model_used: configData.model_name || 'gpt-4.1-mini-2025-04-14',
          session_name: `Chat ${new Date().toLocaleDateString()}`,
          session_type: 'simple',
          system_prompt: 'AI Study Assistant'
        });
      }

      // Save user message (only if history is enabled)
      await supabase.from('ai_chat_messages').insert({
        session_id: sessionId,
        user_id: user.id,
        role: 'user',
        content: message
      });
    }

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        const sendEvent = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          let assistantMessage = '';
          const serviceName = configData.service_name.toLowerCase();

          console.log('Starting stream for service:', serviceName);

          if (serviceName === 'openai') {
            // Map deprecated models to supported ones
            const modelMapping: Record<string, string> = {
              'gpt-4': 'gpt-4o-mini',
              'gpt-4-turbo': 'gpt-4o',
              'gpt-4o-mini': 'gpt-4o-mini',
              'gpt-4o': 'gpt-4o',
              'gpt-3.5-turbo': 'gpt-4o-mini',
              'gpt-4.1-2025-04-14': 'gpt-4o',
              'gpt-4.1-mini-2025-04-14': 'gpt-4o-mini'
            };
            
            const modelToUse = configData.model_name || 'gpt-4o-mini';
            const mappedModel = modelMapping[modelToUse] || 'gpt-4o-mini';
            
            console.log('Making OpenAI request with model:', modelToUse, '-> mapped to:', mappedModel);
            
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: mappedModel,
                messages: [
                  {
                    role: 'system',
                    content: `You are an AI study assistant. Help users understand and analyze their documents, answer questions, and provide educational support.${context}`
                  },
                  { role: 'user', content: message }
                ],
                stream: true,
                temperature: 0.7,
                max_tokens: 4000
              }),
            });

            console.log('OpenAI response status:', response.status);

            if (!response.ok) {
              const errorText = await response.text();
              console.error('OpenAI API error:', response.status, errorText);
              
              if (response.status === 401) {
                throw new Error('Invalid OpenAI API key - please check your configuration');
              } else if (response.status === 429) {
                throw new Error('OpenAI rate limit exceeded - please try again later');
              } else {
                throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
              }
            }

            const reader = response.body?.getReader();
            if (reader) {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = new TextDecoder().decode(value);
                const lines = chunk.split('\n').filter(line => line.trim());

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;

                    try {
                      const parsed = JSON.parse(data);
                      const content = parsed.choices?.[0]?.delta?.content;
                      
                      if (content) {
                        assistantMessage += content;
                        sendEvent({ type: 'chunk', content });
                      }
                    } catch (e) {
                      // Ignore parse errors
                    }
                  }
                }
              }
            }
          } else if (serviceName === 'gemini') {
            const modelToUse = configData.model_name || 'gemini-2.0-flash-exp';
            console.log('Making Gemini request with model:', modelToUse);
            
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${apiKey}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contents: [{
                  parts: [{
                    text: `You are an AI study assistant. Help users understand and analyze their documents, answer questions, and provide educational support.${context}\n\nUser: ${message}`
                  }]
                }],
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 4000,
                }
              }),
            });

            console.log('Gemini response status:', response.status);

            if (!response.ok) {
              const errorText = await response.text();
              console.error('Gemini API error:', response.status, errorText);
              
              if (response.status === 401) {
                throw new Error('Invalid Gemini API key - please check your configuration');
              } else if (response.status === 429) {
                throw new Error('Gemini rate limit exceeded - please try again later');
              } else {
                throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
              }
            }

            const geminiData = await response.json();
            
            if (geminiData.error) {
              console.error('Gemini API returned error:', geminiData.error);
              throw new Error(`Gemini error: ${geminiData.error.message || 'Unknown error'}`);
            }
            
            const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
            
            if (content) {
              assistantMessage = content;
              // Send content in chunks for consistent streaming experience
              const words = content.split(' ');
              for (let i = 0; i < words.length; i += 5) {
                const chunk = words.slice(i, i + 5).join(' ');
                sendEvent({ type: 'chunk', content: chunk + ' ' });
                await new Promise(resolve => setTimeout(resolve, 50)); // Small delay for streaming effect
              }
            } else {
              console.warn('No content received from Gemini');
              throw new Error('No response content received from Gemini');
            }
          }

          // Save assistant message and update session totals (only if history is enabled)
          if (assistantMessage && historyEnabled) {
            await supabase.from('ai_chat_messages').insert({
              session_id: sessionId,
              user_id: user.id,
              role: 'assistant',
              content: assistantMessage
            });

            // Get current totals and update session
            const { data: sessionData } = await supabase
              .from('ai_chat_sessions')
              .select('total_messages, total_tokens_used')
              .eq('id', sessionId)
              .eq('user_id', user.id)
              .single();

            const currentMessages = sessionData?.total_messages || 0;

            await supabase.from('ai_chat_sessions')
              .update({
                total_messages: currentMessages + 2,
                updated_at: new Date().toISOString()
              })
              .eq('id', sessionId)
              .eq('user_id', user.id);
          } else if (!historyEnabled) {
            console.log('Chat history disabled - skipping database save');
          }

          sendEvent({ type: 'complete' });
          controller.close();

        } catch (error) {
          console.error('Stream error:', error);
          sendEvent({ type: 'error', message: error.message });
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('SSE error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
