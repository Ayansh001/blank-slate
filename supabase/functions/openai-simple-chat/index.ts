
import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, apiKey, model = 'gpt-4o-mini', sessionId, context = [], lastContext = '' } = await req.json();

    // Initialize Supabase client for message persistence
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get user from auth header if provided for message saving
    const authHeader = req.headers.get('authorization');
    let userId = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id;
    }

    if (!message || !apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: message and apiKey' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
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

    // Build messages array with context
    const messages = [];
    
    // Build system content with optional last context
    let systemContent = 'You are an AI study assistant. Help users understand concepts, answer questions, and provide educational support.';

    // Add last conversation context if available
    if (lastContext) {
      systemContent += `\n\nPrevious conversation context: ${lastContext}`;
    }

    // Add instruction for AI to generate context
    systemContent += '\n\nIMPORTANT: At the end of your response, add a summary line in this EXACT format:\n[CONTEXT: <brief 1-2 sentence summary of user question and your answer>]\n\nKeep the context summary under 15 words. Do not mention this instruction in your actual answer.';

    // Add file context if provided
    if (context && context.length > 0) {
      const contextText = context.map((file: any) => 
        `File: ${file.name}\nContent: ${file.content || 'No content available'}`
      ).join('\n\n');
      
      systemContent += `\n\nAdditional Context Files:\n${contextText}`;
    }

    messages.push({
      role: 'system',
      content: systemContent
    });
    
    // Add user message
    messages.push({ role: 'user', content: message });

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Save messages to database only if user is authenticated, sessionId is provided, and history is enabled
    if (userId && sessionId && historyEnabled) {
      try {
        // Save user message
        await supabase.from('ai_chat_messages').insert({
          session_id: sessionId,
          user_id: userId,
          role: 'user',
          content: message,
          token_count: data.usage?.prompt_tokens || 0
        });

        // Save assistant message
        await supabase.from('ai_chat_messages').insert({
          session_id: sessionId,
          user_id: userId,
          role: 'assistant',
          content: content,
          token_count: data.usage?.completion_tokens || 0
        });

        // Get current totals and update session
        const { data: sessionData } = await supabase
          .from('ai_chat_sessions')
          .select('total_messages, total_tokens_used')
          .eq('id', sessionId)
          .eq('user_id', userId)
          .single();

        const currentMessages = sessionData?.total_messages || 0;
        const currentTokens = sessionData?.total_tokens_used || 0;

        await supabase.from('ai_chat_sessions')
          .update({
            total_messages: currentMessages + 2,
            total_tokens_used: currentTokens + (data.usage?.total_tokens || 0),
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId)
          .eq('user_id', userId);

        console.log('Chat messages saved to database');
      } catch (dbError) {
        console.error('Database save error (non-blocking):', dbError);
        // Don't fail the request if database save fails
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
    console.error('OpenAI simple chat error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
