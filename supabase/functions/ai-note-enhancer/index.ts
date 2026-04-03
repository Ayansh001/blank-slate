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
    const { noteId, content, enhancementType } = await req.json();
    console.log('Note enhancement request:', { noteId, enhancementType, contentLength: content?.length });

    if (!noteId || !content || !enhancementType) {
      console.error('Missing required parameters:', { noteId: !!noteId, content: !!content, enhancementType });
      return new Response(
        JSON.stringify({ 
          error: 'Note ID, content, and enhancement type are required',
          details: 'All three parameters must be provided to generate enhancements'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    
    if (authHeader) {
      const { data: userData, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (authError) {
        console.error('Authentication error:', authError);
        return new Response(
          JSON.stringify({ 
            error: 'Authentication failed',
            details: 'Please log in again to continue'
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      userId = userData.user?.id;
    }

    if (!userId) {
      console.error('No user ID found');
      return new Response(
        JSON.stringify({ 
          error: 'User authentication required',
          details: 'Please log in to use AI enhancement features'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', userId);

    // Get user's active AI config
    const { data: configData, error: configError } = await supabase
      .from('ai_service_configs')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (configError) {
      console.error('Error fetching AI config:', configError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch AI configuration',
          details: 'Please check your AI service settings'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!configData) {
      console.error('No active AI configuration found for user:', userId);
      return new Response(
        JSON.stringify({ 
          error: 'No active AI service configured',
          details: 'Please configure an AI service (OpenAI, Gemini, etc.) in your settings before using AI features',
          requiresConfig: true
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Using AI service:', configData.service_name, 'with model:', configData.model_name);

    // Debug: Log API key format (first 10 chars only for security)
    console.log('API key format check:', {
      hasKey: !!configData.api_key_encrypted,
      keyLength: configData.api_key_encrypted?.length,
      keyPrefix: configData.api_key_encrypted?.substring(0, 10),
      service: configData.service_name
    });

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
    if (!apiKey && configData.api_key_encrypted) {
      console.log('Using stored API key as fallback');
      apiKey = configData.api_key_encrypted;
    }

    // Validate API key exists
    if (!apiKey) {
      console.error('No API key found for service:', configData.service_name);
      return new Response(
        JSON.stringify({ 
          error: 'AI service API key not configured',
          details: `Please add your ${configData.service_name} API key in the AI settings or configure it as an Edge Function secret`,
          requiresConfig: true
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = createEnhancementPrompt(content, enhancementType);
    const serviceName = configData.service_name.toLowerCase();

    console.log('Calling AI service:', serviceName, 'with prompt length:', prompt.length);

    let enhancement;

    if (serviceName === 'openai') {
      console.log('Using OpenAI with model:', configData.model_name || 'gpt-4o-mini');
      
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
              content: 'You are an expert study assistant who helps improve and enhance notes for better learning. Return only valid JSON format as specified.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.5,
          max_tokens: 1500,
        }),
      });

      console.log('OpenAI response status:', response.status, 'headers:', response.headers);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('OpenAI API error:', response.status, errorData);
        console.error('Request headers sent:', {
          'Authorization': `Bearer ${apiKey.substring(0, 10)}...`,
          'Content-Type': 'application/json'
        });
        
        if (response.status === 401) {
          return new Response(
            JSON.stringify({ 
              error: 'Invalid OpenAI API key',
              details: 'The API key is invalid or missing required permissions. Please check your OpenAI API key configuration.',
              requiresConfig: true
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else if (response.status === 429) {
          return new Response(
            JSON.stringify({ 
              error: 'OpenAI rate limit exceeded',
              details: 'Please wait a moment and try again'
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorData}`);
        }
      }

      const data = await response.json();
      console.log('OpenAI response data:', JSON.stringify(data, null, 2));
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from OpenAI');
      }
      
      const enhancementContent = data.choices[0].message.content;

      try {
        enhancement = JSON.parse(enhancementContent);
        console.log('Successfully parsed OpenAI response');
      } catch (error) {
        console.error('Failed to parse OpenAI JSON response:', enhancementContent);
        throw new Error('AI returned invalid JSON format - please try again');
      }
    } else if (serviceName === 'gemini') {
      console.log('Using Gemini with model:', configData.model_name || 'gemini-2.0-flash');
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${configData.model_name || 'gemini-2.0-flash'}:generateContent`, {
        method: 'POST',
        headers: {
          'X-goog-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an expert study assistant who helps improve and enhance notes for better learning. Return only valid JSON format as specified.\n\n${prompt}`
            }]
          }]
        }),
      });

      console.log('Gemini response status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Gemini API error:', response.status, errorData);
        
        if (response.status === 403) {
          return new Response(
            JSON.stringify({ 
              error: 'Invalid Gemini API key',
              details: 'Please check your Gemini API key in AI settings',
              requiresConfig: true
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else if (response.status === 429) {
          return new Response(
            JSON.stringify({ 
              error: 'Gemini rate limit exceeded',
              details: 'Please wait a moment and try again'
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
        }
      }

      const geminiData = await response.json();
      console.log('Gemini response data:', JSON.stringify(geminiData, null, 2));
      
      if (!geminiData.candidates || !geminiData.candidates[0] || !geminiData.candidates[0].content) {
        throw new Error('Invalid response format from Gemini');
      }
      
      const enhancementContent = geminiData.candidates[0].content.parts[0].text || '';
      
      try {
        enhancement = JSON.parse(enhancementContent);
        console.log('Successfully parsed Gemini response');
      } catch (error) {
        console.error('Failed to parse Gemini JSON response:', enhancementContent);
        throw new Error('AI returned invalid JSON format - please try again');
      }
    } else {
      console.error('Unsupported AI service:', serviceName);
      return new Response(
        JSON.stringify({ 
          error: 'Unsupported AI service',
          details: `Service '${serviceName}' is not supported. Please use OpenAI or Gemini.`,
          requiresConfig: true
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save enhancement to database
    console.log('Saving enhancement to database...');
    const { data: savedEnhancement, error: saveError } = await supabase
      .from('note_enhancements')
      .insert({
        note_id: noteId,
        user_id: userId,
        enhancement_type: enhancementType,
        original_content: content,
        enhanced_content: enhancement,
        ai_service: configData.service_name,
        model_used: configData.model_name,
        confidence_score: 0.85
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving enhancement to database:', saveError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to save enhancement',
          details: 'The enhancement was generated but could not be saved. Please try again.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Enhancement saved successfully with ID:', savedEnhancement.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        enhancement: enhancement,
        enhancementId: savedEnhancement.id,
        type: enhancementType
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Note enhancement error:', error);
    
    // Return more specific error information
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: 'Please try again or contact support if the issue persists'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function createEnhancementPrompt(content: string, enhancementType: string): string {
  const basePrompt = `Please analyze and enhance the following note content:\n\n${content}\n\n`;

  switch (enhancementType) {
    case 'summary':
      return basePrompt + `Create a JSON object with this structure:
{
  "summary": "A concise summary of the main points",
  "keyTakeaways": ["Key takeaway 1", "Key takeaway 2", "Key takeaway 3"],
  "wordCount": {
    "original": number,
    "summary": number
  }
}`;

    case 'key_points':
      return basePrompt + `Create a JSON object with this structure:
{
  "keyPoints": [
    {
      "point": "Main point",
      "details": ["Supporting detail 1", "Supporting detail 2"],
      "importance": "high|medium|low"
    }
  ],
  "categories": ["Category 1", "Category 2"]
}`;

    case 'questions':
      return basePrompt + `Create a JSON object with this structure:
{
  "studyQuestions": [
    {
      "question": "Study question",
      "type": "conceptual|factual|analytical",
      "difficulty": "easy|medium|hard"
    }
  ],
  "reviewQuestions": ["Quick review question 1", "Quick review question 2"]
}`;

    case 'flashcards':
      return basePrompt + `Create a JSON object with this structure:
{
  "flashcards": [
    {
      "front": "Question or term",
      "back": "Answer or definition",
      "category": "Subject category",
      "difficulty": "easy|medium|hard"
    }
  ]
}`;

    case 'outline':
      return basePrompt + `Create a JSON object with this structure:
{
  "outline": [
    {
      "heading": "Main topic",
      "level": 1,
      "subtopics": [
        {
          "heading": "Subtopic",
          "level": 2,
          "points": ["Point 1", "Point 2"]
        }
      ]
    }
  ],
  "structure": "A brief description of the content structure"
}`;

    default:
      return basePrompt + `Create a JSON object with enhanced content appropriate for the enhancement type: ${enhancementType}`;
  }
}