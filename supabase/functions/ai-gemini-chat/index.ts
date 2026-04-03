
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, apiKey, model = 'gemini-2.0-flash', sessionId, context = [], lastContext = '' } = await req.json();

    if (!message || !apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: message and apiKey' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client with auth
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
    });

    // Get user from auth header
    let userId = null;
    if (authHeader) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id;
      } catch (error) {
        console.error('Error getting user:', error);
      }
    }

    // Check if chat history is enabled (only if user is authenticated)
    let historyEnabled = false;
    if (userId) {
      historyEnabled = await checkHistoryPreference(supabase, userId, 'chat_sessions');
      console.log('Chat history enabled for user:', userId, historyEnabled);
    }

    // Log last context if available
    if (lastContext) {
      console.log('Using last context:', lastContext.slice(0, 100) + '...');
    }

    // Build request content with context
    let requestText = '';

    // Add last conversation context if available
    if (lastContext) {
      requestText += `Previous conversation context: ${lastContext}\n\n`;
    }

    // Add system prompt
    requestText += 'You are an AI study assistant. ';

    // Add file context if provided
    if (context && context.length > 0) {
      const contextText = context.map((file: any) => 
        `File: ${file.name}\nContent: ${file.content || 'No content available'}`
      ).join('\n\n');
      
      requestText += `Context files:\n${contextText}\n\n`;
    }

    // Add context generation instruction
    requestText += 'IMPORTANT: End your response with: [CONTEXT: <15-word summary of Q&A>]\n\n';

    // Add user message
    requestText += `User Question: ${message}`;

    // Call Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'X-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: requestText
              }
            ]
          }
        ]
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Save messages to database only if user is authenticated, sessionId is provided, and history is enabled
    if (userId && sessionId && historyEnabled) {
      try {
        // Save user message
        await supabase
          .from('ai_chat_messages')
          .insert({
            session_id: sessionId,
            user_id: userId,
            role: 'user',
            content: message
          });

        // Save assistant message
        await supabase
          .from('ai_chat_messages')
          .insert({
            session_id: sessionId,
            user_id: userId,
            role: 'assistant',
            content: content
          });

        // Get current totals and update session statistics
        const { data: sessionData } = await supabase
          .from('ai_chat_sessions')
          .select('total_messages, total_tokens_used')
          .eq('id', sessionId)
          .eq('user_id', userId)
          .single();

        const currentMessages = sessionData?.total_messages || 0;

        await supabase
          .from('ai_chat_sessions')
          .update({
            total_messages: currentMessages + 2,
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId)
          .eq('user_id', userId);

        console.log('Messages saved to database');
      } catch (dbError) {
        console.error('Database error (non-blocking):', dbError);
        // Don't throw - we still want to return the AI response
      }
    } else if (userId && !historyEnabled) {
      console.log('Chat history disabled - skipping database save');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        response: content
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Gemini chat error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
