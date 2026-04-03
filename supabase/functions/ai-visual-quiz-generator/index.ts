
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VisualQuizRequest {
  questionType: 'diagram_labeling' | 'chart_analysis' | 'visual_interpretation';
  subject: string;
  context: string;
  specificPrompt: string;
}

interface VisualQuizResponse {
  success: boolean;
  imageBase64?: string;
  imageDescription?: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const requestBody: VisualQuizRequest = await req.json();
    const { questionType, subject, context, specificPrompt } = requestBody;

    console.log('Generating visual content for:', { questionType, subject });

    // Create educational image prompt based on question type
    const imagePrompt = createEducationalImagePrompt(questionType, subject, context, specificPrompt);
    
    console.log('Using image prompt:', imagePrompt);

    // Call OpenAI image generation API
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3', // Using dall-e-3 as it's more reliable than gpt-image-1
        prompt: imagePrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        response_format: 'b64_json'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data.data || !data.data[0] || !data.data[0].b64_json) {
      throw new Error('No image data received from OpenAI');
    }

    const imageBase64 = `data:image/png;base64,${data.data[0].b64_json}`;
    const imageDescription = createImageDescription(questionType, subject, context);

    console.log('Successfully generated visual content');

    const result: VisualQuizResponse = {
      success: true,
      imageBase64,
      imageDescription
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-visual-quiz-generator:', error);
    
    const errorResult: VisualQuizResponse = {
      success: false,
      error: error.message || 'Failed to generate visual content'
    };

    return new Response(JSON.stringify(errorResult), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function createEducationalImagePrompt(
  questionType: string, 
  subject: string, 
  context: string, 
  specificPrompt: string
): string {
  const baseStyle = "educational, clean, professional, clear labels, high contrast, suitable for learning";
  
  switch (questionType) {
    case 'diagram_labeling':
      return `Create a detailed educational diagram showing ${specificPrompt}. Style: ${baseStyle}. The diagram should have clear, readable labels pointing to different parts or components. Use a simple, clean design with good contrast for educational purposes. Subject area: ${subject}.`;
      
    case 'chart_analysis':
      return `Create a professional data visualization chart or graph showing ${specificPrompt}. Style: ${baseStyle}. Include clear axes labels, legend, and meaningful data that can be analyzed. The chart should be educational and contain realistic data relevant to ${subject}.`;
      
    case 'visual_interpretation':
      return `Create an educational infographic or visual representation showing ${specificPrompt}. Style: ${baseStyle}. The visual should help explain concepts through clear imagery, icons, and minimal text. Focus on ${subject} education.`;
      
    default:
      return `Create an educational visual aid for ${subject}: ${specificPrompt}. Style: ${baseStyle}.`;
  }
}

function createImageDescription(questionType: string, subject: string, context: string): string {
  switch (questionType) {
    case 'diagram_labeling':
      return `Educational diagram with labeled components for ${subject} learning`;
      
    case 'chart_analysis':
      return `Data visualization chart with analyzable information for ${subject}`;
      
    case 'visual_interpretation':
      return `Educational infographic for ${subject} concept understanding`;
      
    default:
      return `Educational visual content for ${subject}`;
  }
}
