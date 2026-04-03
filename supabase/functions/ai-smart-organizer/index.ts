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
    const { items, organizationType } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Items array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    
    if (authHeader) {
      const { data: userData } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      userId = userData.user?.id;
    }

    if (!userId) {
      throw new Error('User authentication required');
    }

    // Get user's active AI config
    const { data: configData } = await supabase
      .from('ai_service_configs')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (!configData) {
      throw new Error('No active AI configuration found');
    }

    // Create organization suggestions
    const organizationSuggestions = await createOrganizationSuggestions(
      items, 
      organizationType, 
      configData
    );

    return new Response(
      JSON.stringify({ 
        success: true,
        suggestions: organizationSuggestions,
        summary: {
          totalItems: items.length,
          suggestedCategories: organizationSuggestions.categories?.length || 0,
          organizationType: organizationType
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Smart organization error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function createOrganizationSuggestions(items: any[], organizationType: string, configData: any) {
  const itemsContext = items.map(item => ({
    id: item.id,
    name: item.name,
    type: item.type || 'unknown',
    content: item.content || item.ocr_text || '',
    tags: item.tags || []
  }));

  const prompt = createOrganizationPrompt(itemsContext, organizationType);
  const serviceName = configData.service_name.toLowerCase();
  const apiKey = configData.api_key_encrypted;

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
          {
            role: 'system',
            content: 'You are an expert organizational assistant who helps users organize their files and notes intelligently. Return only valid JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } else if (serviceName === 'gemini') {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${configData.model_name || 'gemini-2.0-flash'}:generateContent`, {
      method: 'POST',
      headers: {
        'X-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are an expert organizational assistant who helps users organize their files and notes intelligently. Return only valid JSON format.\n\n${prompt}`
          }]
        }]
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const geminiData = await response.json();
    const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return JSON.parse(content);
  }

  throw new Error('Unsupported AI service');
}

function createOrganizationPrompt(items: any[], organizationType: string): string {
  const itemsText = items.map(item => 
    `ID: ${item.id}, Name: ${item.name}, Type: ${item.type}, Content: ${item.content.slice(0, 200)}...`
  ).join('\n');

  return `Analyze the following items and suggest an intelligent organization structure:

Items:
${itemsText}

Organization Type: ${organizationType}

Provide organization suggestions in this JSON format:
{
  "categories": [
    {
      "name": "Category Name",
      "description": "Why this category makes sense",
      "items": ["item_id_1", "item_id_2"],
      "suggestedTags": ["tag1", "tag2"]
    }
  ],
  "folderStructure": {
    "name": "Suggested folder structure",
    "folders": [
      {
        "name": "Folder Name",
        "items": ["item_id_1"],
        "subfolders": []
      }
    ]
  },
  "reasoning": "Explanation of the organizational logic",
  "duplicateItems": ["item_id_1", "item_id_2"],
  "improvementSuggestions": ["suggestion1", "suggestion2"]
}`;
}