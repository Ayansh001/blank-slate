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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { noteId, content, enhancementType } = await req.json();
    console.log('Enhancement request:', { noteId, enhancementType, contentLength: content?.length });
    
    if (!noteId || !content || !enhancementType) {
      return new Response(
        JSON.stringify({ error: 'Note ID, content, and enhancement type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API key from environment
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client for auth  
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract token from Bearer header
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !userData.user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', userData.user.id);

    // Check if note enhancement history is enabled
    const historyEnabled = await checkHistoryPreference(supabase, userData.user.id, 'note_enhancements');
    console.log('Note enhancement history enabled for user:', userData.user.id, historyEnabled);

    // Process and clean content
    let processedContent = content;
    
    // Remove HTML tags and clean content
    processedContent = processedContent.replace(/<[^>]*>/g, ' ');
    processedContent = processedContent.replace(/\s+/g, ' ').trim();
    
    // Content length limits removed for personal project

    console.log('Processed content length:', processedContent.length);

    const prompt = createEnhancementPrompt(processedContent, enhancementType);
    console.log('Sending prompt to OpenAI, length:', prompt.length);

    // Add timeout to the request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    let enhancement;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert study assistant who helps improve and enhance notes for better learning. Return only valid JSON format as specified. Keep responses concise and well-structured.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.5,
          max_tokens: 8000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', response.status, response.statusText, errorText);
        
        if (response.status === 401) {
          throw new Error('Invalid OpenAI API key');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again in a moment');
        } else if (response.status >= 500) {
          throw new Error('OpenAI service temporarily unavailable');
        } else {
          throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();
      console.log('OpenAI response received successfully');
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from OpenAI');
      }
      
      const enhancementContent = data.choices[0].message.content;

      try {
        enhancement = JSON.parse(enhancementContent);
        console.log('Successfully parsed enhancement JSON');
      } catch (error) {
        console.error('Failed to parse OpenAI JSON response:', enhancementContent);
        throw new Error('AI returned invalid JSON format - please try again');
      }

      // Save enhancement to database only if history is enabled
      if (historyEnabled) {
        try {
          console.log('Saving note enhancement to database...');
          const { error: saveError } = await supabase
            .from('note_enhancements')
            .insert({
              user_id: userData.user.id,
              note_id: noteId,
              enhancement_type: enhancementType,
              original_content: processedContent.substring(0, 10000), // Limit size
              enhanced_content: enhancement,
              ai_service: 'openai',
              model_used: 'gpt-4o-mini',
              confidence_score: 85,
              is_applied: false
            });

          if (saveError) {
            console.error('Error saving note enhancement:', saveError);
            // Don't fail the request, just log the error
          } else {
            console.log('Note enhancement saved successfully');
          }
        } catch (dbError) {
          console.error('Database save error (non-blocking):', dbError);
          // Don't fail the request if database save fails
        }
      } else {
        console.log('Note enhancement history disabled - skipping database save');
      }
      
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out - please try again with shorter content');
      }
      throw error;
    }

    return new Response(
      JSON.stringify({ enhancement }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Note enhancement error:', error);
    
    // Provide specific error messages for common issues
    let errorMessage = 'Enhancement generation failed';
    let statusCode = 500;
    
    if (error.message?.includes('authentication') || error.message?.includes('Invalid authentication')) {
      errorMessage = 'Authentication failed. Please log in again.';
      statusCode = 401;
    } else if (error.message?.includes('API key')) {
      errorMessage = 'AI service configuration error. Please check settings.';
      statusCode = 500;
    } else if (error.message?.includes('Rate limit')) {
      errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
      statusCode = 429;
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'Request timed out. Please try with shorter content.';
      statusCode = 408;
    } else if (error.message?.includes('JSON')) {
      errorMessage = 'AI response format error. Please try again.';
      statusCode = 500;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error.message || 'Please try again or contact support if the issue persists'
      }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function createEnhancementPrompt(content: string, enhancementType: string): string {
  const basePrompt = `Please analyze and enhance the following note content:\n\n${content}\n\n`;

  switch (enhancementType) {
    case 'summary':
      return basePrompt + `Create a JSON object with this structure:
{
  "summary": "A comprehensive summary of the main points from the actual content provided",
  "keyTakeaways": ["Key takeaway 1", "Key takeaway 2", "Key takeaway 3"],
  "wordCount": {
    "original": 245,
    "summary": 67
  }
}

CRITICAL INSTRUCTIONS:
- Replace the example numbers (245, 67) with the ACTUAL word count of the original content and your generated summary
- Count the real words in the content I provided above
- Count the real words in your summary response
- Do not use placeholder or example numbers like 500 or 150 - calculate the actual counts`;

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
      "answer": "Detailed educational answer that explains the concept thoroughly",
      "type": "conceptual|factual|analytical",
      "difficulty": "easy|medium|hard"
    }
  ],
  "reviewQuestions": [
    {
      "question": "Quick review question",
      "answer": "Concise but complete answer explanation"
    }
  ]
}

CRITICAL INSTRUCTIONS:
- Every question MUST have a corresponding detailed answer
- Study question answers should be comprehensive and educational, explaining the concepts clearly
- Review question answers should be concise but complete and helpful
- Base all questions and answers on the actual content provided
- Answers should help students understand the material better, not just state facts`;

    default:
      return basePrompt + `Create a JSON object with enhanced content appropriate for the enhancement type: ${enhancementType}`;
  }
}
