
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

    if (error) {
      console.warn('History preference check failed:', error);
      return true;
    }

    return data?.is_enabled ?? true;
  } catch (error) {
    console.warn('Error checking history preference:', error);
    return true;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, apiKey, model = 'gemini-2.0-flash', sessionId, context = [], lastContext = '' } = await req.json();

    if (!message || !apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: message and apiKey' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role for DB operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id ?? null;
      } catch (error) {
        console.error('Error getting user:', error);
      }
    }

    // Check if chat history is enabled
    let historyEnabled = false;
    if (userId) {
      historyEnabled = await checkHistoryPreference(supabase, userId, 'chat_sessions');
    }

    // Build request content with context
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

    console.log(`Calling Gemini with model: ${model}`);

    // Call Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'X-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: requestText }] }],
        generationConfig: {
          maxOutputTokens: 2000,
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error: ${response.status} - ${errorText}`);
      
      if (response.status === 400 && errorText.includes('API_KEY_INVALID')) {
        return new Response(
          JSON.stringify({ error: 'Invalid Gemini API key. Please check your API key in Settings.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Gemini rate limit or quota exceeded. Please check your Google AI Studio billing.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log('Gemini response received successfully');

    // Save messages to database
    if (userId && sessionId && historyEnabled) {
      try {
        await supabase.from('ai_chat_messages').insert({
          session_id: sessionId,
          user_id: userId,
          role: 'user',
          content: message,
        });

        await supabase.from('ai_chat_messages').insert({
          session_id: sessionId,
          user_id: userId,
          role: 'assistant',
          content: content,
        });

        const { data: sessionData } = await supabase
          .from('ai_chat_sessions')
          .select('total_messages, total_tokens_used')
          .eq('id', sessionId)
          .eq('user_id', userId)
          .single();

        const currentMessages = sessionData?.total_messages || 0;

        await supabase.from('ai_chat_sessions')
          .update({
            total_messages: currentMessages + 2,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sessionId)
          .eq('user_id', userId);

        console.log('Messages saved to database');
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
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
