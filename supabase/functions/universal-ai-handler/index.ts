
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

console.log('Function loaded: universal-ai-handler');
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('universal-ai-handler invoked:', req.method);
  console.log('Env check:', {
    SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
    SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    OPENAI_API_KEY: !!Deno.env.get('OPENAI_API_KEY'),
    GEMINI_API_KEY: !!Deno.env.get('GEMINI_API_KEY'),
  });
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('No user found')

    const { prompt, mode, content_type, source_id, options } = await req.json()

    if (!prompt) {
      throw new Error('Prompt is required')
    }

    console.log('Universal AI Handler called:', { mode, content_type, source_id, options })

    // Check user's history preference
    const historyEnabled = await checkUserHistoryPreference(supabaseClient, user.id, mode, content_type)

    // Get user's AI configuration
    const { data: aiConfigs, error: configError } = await supabaseClient
      .from('ai_service_configs')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (configError || !aiConfigs) {
      return new Response(
        JSON.stringify({ error: 'No active AI service configured', code: 'no_config', requiresConfig: true }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Resolve API key: env secret first, then DB
    const resolvedKey = resolveApiKey(aiConfigs);
    if (!resolvedKey) {
      return new Response(
        JSON.stringify({ error: `${aiConfigs.service_name} API key not configured`, code: 'no_key', requiresConfig: true }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Using AI service:', aiConfigs.service_name)

    let result;
    const configWithKey = { ...aiConfigs, api_key: resolvedKey };
    
    if (aiConfigs.service_name === 'openai') {
      result = await callOpenAI(prompt, configWithKey, options)
    } else if (aiConfigs.service_name === 'gemini') {
      result = await callGemini(prompt, configWithKey, options)
    } else if (aiConfigs.service_name === 'anthropic') {
      result = await callAnthropic(prompt, configWithKey, options)
    } else {
      throw new Error(`Unsupported AI service: ${aiConfigs.service_name}`)
    }

    // Save to database only if history is enabled
    if (historyEnabled && source_id) {
      await saveToDatabase(supabaseClient, user.id, mode, content_type, source_id, result, aiConfigs)
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Universal AI Handler error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message, code: 'internal_error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function resolveApiKey(config: any): string | null {
  const serviceName = (config.service_name || '').toLowerCase();
  
  if (serviceName === 'openai') {
    return Deno.env.get('OPENAI_API_KEY') ?? config.api_key ?? null;
  } else if (serviceName === 'gemini') {
    return Deno.env.get('GEMINI_API_KEY') ?? config.api_key ?? null;
  } else if (serviceName === 'anthropic') {
    return Deno.env.get('ANTHROPIC_API_KEY') ?? config.api_key ?? null;
  }
  return config.api_key ?? null;
}

async function checkUserHistoryPreference(supabaseClient: any, userId: string, mode: string, contentType: string): Promise<boolean> {
  try {
    let featureType = 'usage_tracking';
    if (mode === 'enhance' && contentType === 'note') featureType = 'note_enhancements';
    else if (mode === 'enhance' && contentType === 'file') featureType = 'document_analyses';
    else if (mode === 'quiz') featureType = 'quiz_sessions';
    else if (mode === 'chat') featureType = 'chat_sessions';
    else if (mode === 'concept') featureType = 'concept_learning';

    const { data: preference, error } = await supabaseClient
      .from('ai_history_preferences')
      .select('is_enabled')
      .eq('user_id', userId)
      .eq('feature_type', featureType)
      .single()

    if (error) return true;
    return preference?.is_enabled ?? true;
  } catch {
    return true;
  }
}

async function callOpenAI(prompt: string, config: any, options: any) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.api_key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model_name || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 401 || response.status === 403) {
      throw new Error('Invalid OpenAI API key - please check your configuration');
    } else if (response.status === 429) {
      throw new Error('OpenAI rate limit exceeded - please try again later');
    }
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

async function callGemini(prompt: string, config: any, options: any) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.model_name || 'gemini-pro'}:generateContent?key=${config.api_key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2000 },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 401 || response.status === 403) {
      throw new Error('Invalid Gemini API key - please check your configuration');
    } else if (response.status === 429) {
      throw new Error('Gemini rate limit exceeded - please try again later');
    }
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

async function callAnthropic(prompt: string, config: any, options: any) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': config.api_key,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model_name || 'claude-3-haiku-20240307',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 401 || response.status === 403) {
      throw new Error('Invalid Anthropic API key - please check your configuration');
    } else if (response.status === 429) {
      throw new Error('Anthropic rate limit exceeded - please try again later');
    }
    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json()
  return data.content?.[0]?.text || ''
}

async function saveToDatabase(supabaseClient: any, userId: string, mode: string, contentType: string, sourceId: string, result: any, aiConfig: any) {
  try {
    if (mode === 'enhance' && contentType === 'note') {
      await supabaseClient.from('note_enhancements').insert({
        user_id: userId, note_id: sourceId, enhancement_type: 'summary',
        enhanced_content: result, ai_service: aiConfig.service_name, model_used: aiConfig.model_name,
      })
    } else if (mode === 'quiz') {
      await supabaseClient.from('quiz_sessions').insert({
        user_id: userId, source_id: sourceId, quiz_data: result,
        ai_service: aiConfig.service_name, model_used: aiConfig.model_name,
      })
    }
  } catch (error) {
    console.error('Error saving to database:', error)
  }
}
