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
    const { fileId, analysisType, content, customPrompt } = await req.json();

    if (!analysisType) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: analysisType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get file content if fileId provided and no content given
    let analysisContent = content || '';
    if (fileId && !analysisContent) {
      const { data: fileData } = await supabase
        .from('files')
        .select('ocr_text, name, file_type')
        .eq('id', fileId)
        .eq('user_id', user.id)
        .single();

      if (fileData) {
        analysisContent = fileData.ocr_text || `File: ${fileData.name} (${fileData.file_type})`;
      }
    }

    if (!analysisContent) {
      return new Response(
        JSON.stringify({ error: 'No content available for analysis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's active AI config
    const { data: configData } = await supabase
      .from('ai_service_configs')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!configData) {
      return new Response(
        JSON.stringify({ error: 'No active AI service configured', requiresConfig: true }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve API key server-side
    const serviceName = configData.service_name.toLowerCase();
    let apiKey: string | null = null;
    
    if (serviceName === 'openai') {
      apiKey = Deno.env.get('OPENAI_API_KEY') ?? configData.api_key ?? null;
    } else if (serviceName === 'gemini') {
      apiKey = Deno.env.get('GEMINI_API_KEY') ?? configData.api_key ?? null;
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: `${configData.service_name} API key not configured`, requiresConfig: true }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build analysis prompt
    const prompt = customPrompt || getAnalysisPrompt(analysisType, analysisContent);

    let analysisResult: any;

    if (serviceName === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: configData.model_name || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are an expert document analyst. Return only valid JSON.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401 || response.status === 403) {
          return new Response(
            JSON.stringify({ error: 'Invalid OpenAI API key', requiresConfig: true }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const rawContent = data.choices[0].message.content;
      try {
        analysisResult = { content: JSON.parse(rawContent), confidence: 0.85, tokenUsage: { input_tokens: data.usage?.prompt_tokens || 0, output_tokens: data.usage?.completion_tokens || 0, total_tokens: data.usage?.total_tokens || 0 } };
      } catch {
        analysisResult = { content: { summary: rawContent }, confidence: 0.7, tokenUsage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 } };
      }
    } else if (serviceName === 'gemini') {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${configData.model_name || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `You are an expert document analyst. Return only valid JSON.\n\n${prompt}` }] }]
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401 || response.status === 403) {
          return new Response(
            JSON.stringify({ error: 'Invalid Gemini API key', requiresConfig: true }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      try {
        analysisResult = { content: JSON.parse(rawContent), confidence: 0.85, tokenUsage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 } };
      } catch {
        analysisResult = { content: { summary: rawContent }, confidence: 0.7, tokenUsage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 } };
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'Unsupported AI service' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        ...analysisResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Document analysis error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getAnalysisPrompt(analysisType: string, content: string): string {
  const prompts: Record<string, string> = {
    summary: 'Provide a comprehensive summary highlighting main points and key takeaways.',
    key_points: 'Extract and list the key points, main arguments, and important details.',
    questions: 'Generate thoughtful questions that test understanding of the concepts.',
    concepts: 'Identify and explain the main concepts, terms, and ideas.',
    topics: 'Identify and categorize the main topics and themes.',
  };

  return `${prompts[analysisType] || prompts.summary}\n\nDocument content:\n${content}\n\nRespond with valid JSON.`;
}
