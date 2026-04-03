import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuoteRequest {
  userId: string;
}

interface GeneratedQuote {
  text: string;
  category: 'motivation' | 'study' | 'jokes' | 'relaxation';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role key for database operations to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { userId } = await req.json() as QuoteRequest;

    if (userId !== user.id) {
      throw new Error('User ID mismatch');
    }

    console.log(`Generating quotes for user: ${userId}`);

    // Check if user already has enough quotes for today
    const today = new Date().toISOString().split('T')[0];
    const { data: existingQuotes } = await supabaseClient
      .from('ai_daily_quotes')
      .select('id')
      .eq('user_id', userId)
      .eq('generated_date', today);

    const existingCount = existingQuotes?.length || 0;
    
    // Check unread quotes specifically
    const { data: unreadQuotes } = await supabaseClient
      .from('ai_daily_quotes')
      .select('id')
      .eq('user_id', userId)
      .eq('generated_date', today)
      .eq('is_read', false);

    const unreadCount = unreadQuotes?.length || 0;
    const minUnreadThreshold = 5; // Generate when less than 5 unread quotes

    if (unreadCount >= minUnreadThreshold) {
      console.log(`User has ${unreadCount} unread quotes (threshold: ${minUnreadThreshold})`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Sufficient unread quotes available',
        quotesGenerated: 0,
        existingQuotes: existingCount,
        unreadQuotes: unreadCount
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's active AI service config
    const { data: aiConfig } = await supabaseClient
      .from('ai_service_configs')
      .select('service_name, model_name, api_key, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (!aiConfig) {
      console.log('No active AI service found, using fallback quotes');
      
      // Generate fallback static quotes (minimum 10)
      const fallbackQuotes = [
        { text: "Today's efforts are tomorrow's results. Keep pushing forward!", category: 'motivation' },
        { text: "Every expert was once a beginner. Every pro was once an amateur.", category: 'study' },
        { text: "Why did the student eat his homework? Because the teacher said it was a piece of cake!", category: 'jokes' },
        { text: "Take a deep breath. You're exactly where you need to be right now.", category: 'relaxation' },
        { text: "Progress, not perfection. Every small step counts!", category: 'motivation' },
        { text: "Focus on the step in front of you, not the whole staircase.", category: 'focus' },
        { text: "Knowledge is power. Keep building yours every day!", category: 'study' },
        { text: "What's the best thing about Switzerland? I don't know, but the flag is a big plus!", category: 'jokes' },
        { text: "Success is the sum of small efforts repeated day in and day out.", category: 'achievement' },
        { text: "Sometimes the most productive thing you can do is relax.", category: 'relaxation' }
      ];

      // Save fallback quotes using database function
      for (const quote of fallbackQuotes) {
        const { data, error } = await supabaseClient
          .rpc('insert_daily_quote', {
            _user_id: userId,
            _quote_text: quote.text,
            _category: quote.category,
            _ai_service: 'fallback',
            _model_used: 'static',
            _generated_date: today
          });

        if (error) {
          console.error('Error inserting fallback quote:', error);
        } else {
          console.log('Inserted fallback quote:', data);
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Fallback quotes generated',
        quotesGenerated: fallbackQuotes.length,
        type: 'fallback'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate AI quotes
    console.log(`Attempting to generate quotes with service: ${aiConfig.service_name}`);
    const quotes = await generateAIQuotes(aiConfig);
    console.log(`Generated ${quotes.length} quotes`);
    
    // Save quotes to database using secure function
    let successCount = 0;
    for (const quote of quotes) {
      const { data, error } = await supabaseClient
        .rpc('insert_daily_quote', {
          _user_id: userId,
          _quote_text: quote.text,
          _category: quote.category,
          _ai_service: aiConfig.service_name,
          _model_used: aiConfig.model_name || 'default',
          _generated_date: today
        });

      if (error) {
        console.error('Error inserting AI quote:', error);
      } else {
        console.log('Successfully inserted AI quote:', data);
        successCount++;
      }
    }

    if (successCount === 0) {
      throw new Error('Failed to save any AI quotes to database');
    }

    console.log(`Successfully generated and saved ${successCount}/${quotes.length} AI quotes`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'AI quotes generated successfully',
      quotesGenerated: successCount,
      totalGenerated: quotes.length,
      type: 'ai'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating quotes:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate quotes' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateAIQuotes(aiConfig: any): Promise<GeneratedQuote[]> {
  const categories = ['motivation', 'study', 'jokes', 'relaxation', 'focus', 'achievement', 'perseverance', 'learning'];
  const quotes: GeneratedQuote[] = [];

  for (const category of categories) {
    try {
      const categoryQuotes = await generateQuotesForCategory(aiConfig, category);
      quotes.push(...categoryQuotes);
    } catch (error) {
      console.error(`Error generating quotes for category ${category}:`, error);
      
      // Add multiple fallback quotes for this category (3 per category)
      const fallbackQuotes = getFallbackQuotesForCategory(category);
      quotes.push(...fallbackQuotes);
    }
  }

  return quotes;
}

async function generateQuotesForCategory(aiConfig: any, category: string): Promise<GeneratedQuote[]> {
  const prompts = {
    motivation: "Generate 2 short, inspiring motivational quotes for students. Focus on determination, growth mindset, and academic success. Each quote should be 15-25 words maximum.",
    study: "Generate 2 practical study-related quotes that inspire effective learning habits. Focus on study techniques, knowledge building, and academic excellence. Each quote should be 15-25 words maximum.",
    jokes: "Generate 2 light-hearted, clean study/school-related jokes or funny quotes that can make students smile during their study sessions. Keep them positive and brief (15-25 words).",
    relaxation: "Generate 2 calming, stress-relief quotes for students during study breaks. Focus on mindfulness, peace, and mental wellbeing. Each quote should be 15-25 words maximum.",
    focus: "Generate 2 concentration and focus-related quotes for students. Focus on attention, clarity, and deep work. Each quote should be 15-25 words maximum.",
    achievement: "Generate 2 success and achievement quotes for students. Focus on reaching goals, celebrating progress, and recognizing accomplishments. Each quote should be 15-25 words maximum.",
    perseverance: "Generate 2 persistence and resilience quotes for students. Focus on overcoming challenges, bouncing back from setbacks. Each quote should be 15-25 words maximum.",
    learning: "Generate 2 learning and knowledge acquisition quotes for students. Focus on curiosity, discovery, and the joy of learning. Each quote should be 15-25 words maximum."
  };

  let apiUrl: string;
  let headers: Record<string, string>;
  let body: any;

  if (aiConfig.service_name === 'openai') {
    apiUrl = 'https://api.openai.com/v1/chat/completions';
    const apiKey = aiConfig.api_key || Deno.env.get('OPENAI_API_KEY');
    headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
    body = {
      model: aiConfig.model_name || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that generates inspiring quotes for students. Return only the quotes, one per line, without numbering or extra formatting.'
        },
        {
          role: 'user',
          content: prompts[category as keyof typeof prompts]
        }
      ],
      max_tokens: 300,
      temperature: 0.8
    };
  } else if (aiConfig.service_name === 'gemini') {
    const apiKey = aiConfig.api_key || Deno.env.get('GEMINI_API_KEY');
    apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${aiConfig.model_name || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`;
    headers = {
      'Content-Type': 'application/json',
    };
    body = {
      contents: [{
        parts: [{
          text: prompts[category as keyof typeof prompts] + "\n\nReturn only the quotes, one per line, without numbering or extra formatting."
        }]
      }]
    };
  } else {
    throw new Error(`Unsupported AI service: ${aiConfig.service_name}`);
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  let quotesText: string;
  if (aiConfig.service_name === 'openai') {
    quotesText = data.choices[0].message.content;
  } else if (aiConfig.service_name === 'gemini') {
    quotesText = data.candidates[0].content.parts[0].text;
  } else {
    throw new Error('Unknown AI service response format');
  }

  // Parse quotes from response
  const quoteLines = quotesText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 10 && !line.match(/^\d+\.?/)) // Remove numbering and very short lines
    .slice(0, 2); // Limit to 2 quotes per category

  return quoteLines.map(text => ({
    text: text.replace(/^["']|["']$/g, ''), // Remove quotes if present
    category: category as any
  }));
}

function getFallbackQuotesForCategory(category: string): GeneratedQuote[] {
  const fallbacks = {
    motivation: [
      "Success is the sum of small efforts repeated day in and day out.",
      "Your potential is endless. Go do what you were created to do.",
      "Great things never come from comfort zones. Push yourself today."
    ],
    study: [
      "The beautiful thing about learning is that no one can take it away from you.",
      "Study while others are sleeping; work while others are loafing.",
      "Knowledge is power. Information is liberating. Education is the premise of progress."
    ],
    jokes: [
      "Why did the math book look so sad? Because it had too many problems!",
      "What do you call a study group full of noisy students? A think tank!",
      "Why don't scientists trust atoms? Because they make up everything!"
    ],
    relaxation: [
      "Take a deep breath and remember: you're doing better than you think.",
      "Peace comes from within. Do not seek it without.",
      "Sometimes the most productive thing you can do is relax."
    ],
    focus: [
      "Focus on the step in front of you, not the whole staircase.",
      "Where attention goes, energy flows and results show.",
      "The successful warrior is the average person with laser-like focus."
    ],
    achievement: [
      "Success is not final, failure is not fatal: it is the courage to continue that counts.",
      "Achievement is not about being perfect; it's about being consistent.",
      "Celebrate small wins. They're the stepping stones to big victories."
    ],
    perseverance: [
      "Fall seven times, stand up eight. That's the way of success.",
      "It's not about how many times you fall, but how many times you get back up.",
      "Persistence can change failure into extraordinary achievement."
    ],
    learning: [
      "Every expert was once a beginner. Every pro was once an amateur.",
      "Learning is a treasure that will follow its owner everywhere.",
      "The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice."
    ]
  };
  
  const categoryFallbacks = fallbacks[category as keyof typeof fallbacks] || ["Keep going, you're doing great!"];
  return categoryFallbacks.map(text => ({
    text,
    category: category as any
  }));
}