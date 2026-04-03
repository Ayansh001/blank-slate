import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Get OpenAI configuration
    const { data: configData, error: configError } = await supabase
      .from('ai_service_configs')
      .select('*')
      .eq('user_id', user.id)
      .eq('service_name', 'openai')
      .eq('is_active', true)
      .maybeSingle();

    if (configError || !configData) {
      return new Response(JSON.stringify({ 
        error: 'OpenAI service not configured',
        details: 'Please configure OpenAI service in your AI settings'
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get API key from secrets or database (simplified approach)
    const apiKey = Deno.env.get('OPENAI_API_KEY') || configData.api_key;

    if (!apiKey) {
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured',
        details: 'Please add your OpenAI API key in the AI settings'
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

    // Ensure chat session exists
    const { data: existingSession } = await supabase
      .from('ai_chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existingSession) {
      await supabase.from('ai_chat_sessions').insert({
        id: sessionId,
        user_id: user.id,
        ai_service: 'openai',
        model_used: configData.model_name || 'gpt-4o-mini',
        session_name: `Chat ${new Date().toLocaleDateString()}`,
        system_prompt: 'AI Study Assistant'
      });
    }

    // Save user message
    await supabase.from('ai_chat_messages').insert({
      session_id: sessionId,
      user_id: user.id,
      role: 'user',
      content: message
    });

    // Use only supported OpenAI models
    const supportedModels: Record<string, string> = {
      'gpt-4o': 'gpt-4o',
      'gpt-4o-mini': 'gpt-4o-mini',
      'gpt-4': 'gpt-4o',
      'gpt-4-turbo': 'gpt-4o',
      'gpt-3.5-turbo': 'gpt-4o-mini'
    };
    
    const modelToUse = supportedModels[configData.model_name || 'gpt-4o-mini'] || 'gpt-4o-mini';

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        const sendEvent = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          let assistantMessage = '';

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
                  content: `You are an AI study assistant. Help users understand and analyze their documents, answer questions, and provide educational support.${context}`
                },
                { role: 'user', content: message }
              ],
              stream: true,
              temperature: 0.7,
              max_tokens: 4000
            }),
          });

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
            }
            
            throw new Error(errorMessage);
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

          // Save assistant message
          if (assistantMessage) {
            await supabase.from('ai_chat_messages').insert({
              session_id: sessionId,
              user_id: user.id,
              role: 'assistant',
              content: assistantMessage
            });
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
    console.error('OpenAI chat handler error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});