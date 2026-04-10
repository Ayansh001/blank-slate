
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

console.log('Function loaded: ai-gemini-chat');
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function checkHistoryPreference(supabase: any, userId: string, featureType: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('ai_history_preferences')
      .select('is_enabled')
      .eq('user_id', userId)
      .eq('feature_type', featureType)
      .maybeSingle();

    if (error) return true;
    return data?.is_enabled ?? true;
  } catch {
    return true;
  }
}

serve(async (req) => {
  console.log('ai-gemini-chat invoked:', req.method);
  console.log('Env check:', {
    SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
    SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    GEMINI_API_KEY: !!Deno.env.get('GEMINI_API_KEY'),
  });
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, model = 'gemini-pro', sessionId, context = [], lastContext = '' } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id;
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Authentication required', requiresConfig: true }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve API key server-side
    let apiKey = Deno.env.get('GEMINI_API_KEY') || null;

    if (!apiKey) {
      const { data: configData } = await supabase
        .from('ai_service_configs')
        .select('api_key, model_name')
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('service_name', 'gemini')
        .maybeSingle();

      if (configData?.api_key) {
        apiKey = configData.api_key;
      }
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured', requiresConfig: true }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let historyEnabled = false;
    if (userId) {
      historyEnabled = await checkHistoryPreference(supabase, userId, 'chat_sessions');
    }

    // Build request content
    let requestText = '';
    if (lastContext) {
      requestText += `Previous conversation context: ${lastContext}\n\n`;
    }
    requestText += 'You are an AI study assistant. ';
    if (context && context.length > 0) {
      const contextText = context.map((file: any) => 
        `File: ${file.name}\nContent: ${file.content || 'No content available'}`
      ).join('\n\n');
      requestText += `Context files:\n${contextText}\n\n`;
    }
    requestText += 'IMPORTANT: End your response with: [CONTEXT: <15-word summary of Q&A>]\n\n';
    requestText += `User Question: ${message}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: requestText }] }]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      
      if (response.status === 401 || response.status === 403) {
        return new Response(
          JSON.stringify({ error: 'Invalid Gemini API key', code: 'invalid_key', requiresConfig: true }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Gemini rate limit exceeded', code: 'quota_exceeded' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Save messages if authenticated and history enabled
    if (userId && sessionId && historyEnabled) {
      try {
        await supabase.from('ai_chat_messages').insert({
          session_id: sessionId, user_id: userId, role: 'user', content: message
        });
        await supabase.from('ai_chat_messages').insert({
          session_id: sessionId, user_id: userId, role: 'assistant', content: content
        });

        const { data: sessionData } = await supabase
          .from('ai_chat_sessions')
          .select('total_messages, total_tokens_used')
          .eq('id', sessionId).eq('user_id', userId).single();

        await supabase.from('ai_chat_sessions').update({
          total_messages: (sessionData?.total_messages || 0) + 2,
          updated_at: new Date().toISOString()
        }).eq('id', sessionId).eq('user_id', userId);
      } catch (dbError) {
        console.error('Database error (non-blocking):', dbError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, response: content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Gemini chat error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
