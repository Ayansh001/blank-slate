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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, quizType, questionCount, difficulty, source } = await req.json();
    console.log('Quiz generation request:', { quizType, questionCount, difficulty, contentLength: content?.length });

    if (!content || !quizType) {
      return new Response(
        JSON.stringify({ 
          error: 'Content and quiz type are required',
          details: 'Both content and quiz type must be provided'
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
      return new Response(
        JSON.stringify({ 
          error: 'User authentication required',
          details: 'Please log in to use AI quiz generation features'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', userId);

    // Check if quiz history is enabled
    const historyEnabled = await checkHistoryPreference(supabase, userId, 'quiz_sessions');
    console.log('Quiz history enabled for user:', userId, historyEnabled);

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

    // Get API key from Supabase Edge Function secrets first (most secure)
    let apiKey: string | null = null;
    const serviceName = configData.service_name.toLowerCase();
    
    if (serviceName === 'openai') {
      apiKey = Deno.env.get('OPENAI_API_KEY');
      console.log('OpenAI API key from secrets:', !!apiKey);
    } else if (serviceName === 'gemini') {
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

    // Generate quiz based on type
    const prompt = createQuizPrompt(content, quizType, questionCount || 5, difficulty || 'medium');
    console.log('Calling AI service:', serviceName, 'with prompt length:', prompt.length);

    let quiz;

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
              content: 'You are an expert educator who creates high-quality, educational quizzes. Return only valid JSON format as specified.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 8000,
        }),
      });

      console.log('OpenAI response status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('OpenAI API error:', response.status, errorData);
        
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
      const quizContent = data.choices[0].message.content;

      try {
        quiz = JSON.parse(quizContent);
        console.log('Successfully parsed OpenAI response');
      } catch (error) {
        console.error('Failed to parse OpenAI JSON response:', quizContent);
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
              text: `You are an expert educator who creates high-quality, educational quizzes. Return only valid JSON format as specified.\n\n${prompt}`
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
      
      const quizContent = geminiData.candidates[0].content.parts[0].text || '';
      
      try {
        quiz = JSON.parse(quizContent);
        console.log('Successfully parsed Gemini response');
      } catch (error) {
        console.error('Failed to parse Gemini JSON response:', quizContent);
        throw new Error('AI returned invalid JSON format - please try again');
      }
    } else {
      return new Response(
        JSON.stringify({ 
          error: 'Unsupported AI service',
          details: `Service '${serviceName}' is not supported. Please use OpenAI or Gemini.`,
          requiresConfig: true
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save quiz session to database only if history is enabled
    if (historyEnabled) {
      console.log('Saving quiz session to database...');
      const { error: saveError } = await supabase.from('quiz_sessions').insert({
        user_id: userId,
        file_id: source?.type === 'file' ? source.id : null,
        note_id: source?.type === 'note' ? source.id : null,
        quiz_type: quizType,
        questions: quiz,
        ai_service: configData.service_name,
        model_used: configData.model_name
      });

      if (saveError) {
        console.error('Error saving quiz session:', saveError);
        // Don't fail the request, just log the error
      } else {
        console.log('Quiz session saved successfully');
      }
    } else {
      console.log('Quiz history disabled - skipping database save');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        quiz: quiz,
        metadata: {
          type: quizType,
          questionCount: quiz.questions?.length || questionCount,
          difficulty: difficulty
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Quiz generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function createQuizPrompt(content: string, quizType: string, questionCount: number, difficulty: string): string {
  const basePrompt = `Based on the following content, create a ${difficulty} difficulty ${quizType} quiz with ${questionCount} questions.\n\nContent:\n${content}\n\n`;

  switch (quizType) {
    case 'multiple_choice':
      return basePrompt + `Create a JSON object with this structure:
{
  "questions": [
    {
      "question": "Question text",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correctAnswer": "A",
      "explanation": "Why this answer is correct"
    }
  ]
}`;

    case 'true_false':
      return basePrompt + `Create a JSON object with this structure:
{
  "questions": [
    {
      "question": "Statement to evaluate",
      "correctAnswer": true,
      "explanation": "Explanation of why this is true/false"
    }
  ]
}`;

    case 'essay':
      return basePrompt + `Create a JSON object with this structure:
{
  "questions": [
    {
      "question": "Essay question",
      "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
      "sampleAnswer": "A sample answer outline"
    }
  ]
}`;

    case 'flashcard':
      return basePrompt + `Create a JSON object with this structure:
{
  "questions": [
    {
      "front": "Question or term",
      "back": "Answer or definition",
      "category": "Subject category"
    }
  ]
}`;

    default:
      return basePrompt + `Create a JSON object with questions array appropriate for the quiz type.`;
  }
}
