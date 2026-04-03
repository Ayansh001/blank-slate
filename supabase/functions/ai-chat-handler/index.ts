import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const { message, sessionId, fileReferences = [] } = await req.json();

    if (!message || !sessionId) {
      console.error('Missing required fields:', { message: !!message, sessionId: !!sessionId });
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: message or sessionId' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(JSON.stringify({ 
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

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(JSON.stringify({ 
        error: 'Invalid authentication' 
      }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Authenticated user:', user.id);

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
        details: 'Please configure an AI service (OpenAI, Gemini, etc.) in your settings',
        requiresConfig: true
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Using AI service:', configData.service_name, 'with model:', configData.model_name);

    // Get API key from environment secrets first (most secure)
    let apiKey: string | null = null;
    const serviceName = configData.service_name.toLowerCase();
    
    if (serviceName === 'openai') {
      apiKey = Deno.env.get('OPENAI_API_KEY');
      console.log('OpenAI API key available:', !!apiKey);
    } else if (serviceName === 'gemini') {
      apiKey = Deno.env.get('GEMINI_API_KEY');
      console.log('Gemini API key available:', !!apiKey);
    }

    // Fallback to stored API key if no secret is configured
    if (!apiKey && configData.api_key_encrypted) {
      console.log('Using stored API key as fallback');
      apiKey = configData.api_key_encrypted;
    }

    if (!apiKey) {
      console.error('No API key found for service:', configData.service_name);
      return new Response(JSON.stringify({ 
        error: 'AI service API key not configured',
        details: `Please add your ${configData.service_name} API key in settings`,
        requiresConfig: true
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Build context from file references if provided
    let contextPrompt = '';
    if (fileReferences.length > 0) {
      contextPrompt = '\n\nContext from uploaded files:\n' + fileReferences.map(
        (file: any) => `${file.name}: ${file.content || file.ocr_text || 'No content available'}`
      ).join('\n\n');
    }

    // Ensure chat session exists
    const { data: existingSession } = await supabase
      .from('ai_chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existingSession) {
      console.log('Creating new chat session:', sessionId);
      const { error: insertError } = await supabase.from('ai_chat_sessions').insert({
        id: sessionId,
        user_id: user.id,
        ai_service: configData.service_name,
        model_used: configData.model_name || 'default',
        session_name: `Chat ${new Date().toLocaleDateString()}`,
        session_type: 'chat',
        system_prompt: 'AI Study Assistant'
      });

      if (insertError) {
        console.error('Failed to create chat session:', insertError);
        return new Response(JSON.stringify({ 
          error: 'Failed to create chat session' 
        }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Save user message to database
    const { error: messageError } = await supabase.from('ai_chat_messages').insert({
      session_id: sessionId,
      user_id: user.id,
      role: 'user',
      content: message
    });

    if (messageError) {
      console.error('Failed to save user message:', messageError);
    }

    // Create SSE stream for real-time responses
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        const sendEvent = (data: any) => {
          const eventData = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(eventData));
        };

        try {
          let assistantMessage = '';

          console.log('Starting AI stream for service:', serviceName);

          if (serviceName === 'openai') {
            // OpenAI model mapping for supported models
            const modelMapping: Record<string, string> = {
              'gpt-4': 'gpt-4o-mini',
              'gpt-4-turbo': 'gpt-4o',
              'gpt-4o-mini': 'gpt-4o-mini',
              'gpt-4o': 'gpt-4o',
              'gpt-3.5-turbo': 'gpt-4o-mini',
              'gpt-4.1-2025-04-14': 'gpt-4o',
              'gpt-4.1-mini-2025-04-14': 'gpt-4o-mini'
            };
            
            const requestedModel = configData.model_name || 'gpt-4o-mini';
            const modelToUse = modelMapping[requestedModel] || 'gpt-4o-mini';
            
            console.log('OpenAI model requested:', requestedModel, '-> using:', modelToUse);
            
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: modelToUse,
                messages: [
                  {
                    role: 'system',
                    content: `You are an AI study assistant. Help users with their questions, analyze documents, and provide educational support.${contextPrompt}`
                  },
                  { role: 'user', content: message }
                ],
                stream: true,
                temperature: 0.7,
                max_tokens: 4000
              }),
            });

            console.log('OpenAI API response status:', response.status);

            if (!response.ok) {
              const errorText = await response.text();
              console.error('OpenAI API error:', response.status, errorText);
              
              let errorMessage = 'OpenAI API error';
              if (response.status === 401) {
                errorMessage = 'Invalid OpenAI API key - please check your configuration';
              } else if (response.status === 429) {
                errorMessage = 'OpenAI rate limit exceeded - please try again later';
              } else if (response.status === 400) {
                errorMessage = 'Invalid request to OpenAI API';
              } else {
                errorMessage = `OpenAI API error: ${response.status}`;
              }
              
              throw new Error(errorMessage);
            }

            // Process OpenAI streaming response
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
                    } catch (parseError) {
                      // Ignore JSON parse errors in streaming
                      console.warn('Parse error in stream:', parseError);
                    }
                  }
                }
              }
            }

          } else if (serviceName === 'gemini') {
            const modelToUse = configData.model_name || 'gemini-2.0-flash-exp';
            console.log('Gemini model:', modelToUse);
            
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${apiKey}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contents: [{
                  parts: [{
                    text: `You are an AI study assistant. Help users with their questions, analyze documents, and provide educational support.${contextPrompt}\n\nUser: ${message}`
                  }]
                }],
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 4000,
                }
              }),
            });

            console.log('Gemini API response status:', response.status);

            if (!response.ok) {
              const errorText = await response.text();
              console.error('Gemini API error:', response.status, errorText);
              
              let errorMessage = 'Gemini API error';
              if (response.status === 401) {
                errorMessage = 'Invalid Gemini API key - please check your configuration';
              } else if (response.status === 429) {
                errorMessage = 'Gemini rate limit exceeded - please try again later';
              } else if (response.status === 400) {
                errorMessage = 'Invalid request to Gemini API';
              }
              
              throw new Error(errorMessage);
            }

            const geminiData = await response.json();
            
            if (geminiData.error) {
              console.error('Gemini API returned error:', geminiData.error);
              throw new Error(`Gemini error: ${geminiData.error.message || 'Unknown error'}`);
            }
            
            const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
            
            if (content) {
              assistantMessage = content;
              // Simulate streaming for consistent UX
              const words = content.split(' ');
              for (let i = 0; i < words.length; i += 5) {
                const chunk = words.slice(i, i + 5).join(' ');
                sendEvent({ type: 'chunk', content: chunk + ' ' });
                await new Promise(resolve => setTimeout(resolve, 50));
              }
            } else {
              console.warn('No content received from Gemini');
              throw new Error('No response content received from Gemini');
            }

          } else {
            throw new Error(`Unsupported AI service: ${serviceName}`);
          }

          // Save assistant message to database
          if (assistantMessage.trim()) {
            const { error: saveError } = await supabase.from('ai_chat_messages').insert({
              session_id: sessionId,
              user_id: user.id,
              role: 'assistant',
              content: assistantMessage.trim()
            });

            if (saveError) {
              console.error('Failed to save assistant message:', saveError);
            }
          }

          // Send completion event
          sendEvent({ type: 'complete' });
          controller.close();

        } catch (error) {
          console.error('Stream processing error:', error);
          sendEvent({ 
            type: 'error', 
            message: error.message || 'An error occurred while processing your request'
          });
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
    console.error('AI Chat Handler error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});