
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { content, quizType = 'multiple_choice', difficulty = 'medium', questionCount = 5 } = await req.json()
    
    if (!content) {
      throw new Error('Content is required for quiz generation')
    }

    console.log('Generating quiz with params:', { 
      contentLength: content.length, 
      quizType, 
      difficulty, 
      questionCount 
    })

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Create quiz generation prompt
    const systemPrompt = `You are an expert educator who creates high-quality, educational quizzes. 
    Create a ${difficulty} difficulty ${quizType.replace('_', ' ')} quiz with exactly ${questionCount} questions based on the provided content.
    Return ONLY valid JSON in this exact format:
    {
      "title": "Quiz Title",
      "description": "Brief description",
      "questions": [
        {
          "id": "q1",
          "question": "Question text?",
          "type": "${quizType}",
          "options": ["A", "B", "C", "D"],
          "correct_answer": "A",
          "explanation": "Why this is correct"
        }
      ]
    }`

    const userPrompt = `Based on this content, create a quiz:\n\n${content.slice(0, 3000)}`

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenAI API error:', error)
      throw new Error(`OpenAI API failed: ${response.status}`)
    }

    const data = await response.json()
    const aiContent = data.choices?.[0]?.message?.content

    if (!aiContent) {
      throw new Error('No content received from OpenAI')
    }

    // Parse JSON response
    let quizData
    try {
      // Clean the response and parse JSON
      const cleanedContent = aiContent.replace(/```json\n?|\n?```/g, '').trim()
      quizData = JSON.parse(cleanedContent)
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError)
      console.log('Raw AI response:', aiContent)
      
      // Fallback: create a simple quiz structure
      quizData = {
        title: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Quiz`,
        description: 'AI-generated quiz based on your content',
        questions: [{
          id: 'q1',
          question: 'What is the main topic of the provided content?',
          type: quizType,
          options: ['Topic A', 'Topic B', 'Topic C', 'Topic D'],
          correct_answer: 'Topic A',
          explanation: 'Based on the content analysis'
        }]
      }
    }

    // Validate quiz structure
    if (!quizData.questions || !Array.isArray(quizData.questions)) {
      throw new Error('Invalid quiz format: missing questions array')
    }

    console.log('Quiz generated successfully:', {
      title: quizData.title,
      questionCount: quizData.questions.length
    })

    return new Response(
      JSON.stringify({
        success: true,
        quiz: quizData,
        metadata: {
          questionCount: quizData.questions.length,
          difficulty,
          type: quizType,
          tokensUsed: data.usage?.total_tokens || 0
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Quiz generation error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Quiz generation failed',
        fallback: {
          title: 'Sample Quiz',
          description: 'A basic quiz to test your knowledge',
          questions: [{
            id: 'fallback_1',
            question: 'What would you like to learn more about?',
            type: 'multiple_choice',
            options: ['This topic', 'Related concepts', 'Advanced details', 'Practical applications'],
            correct_answer: 'This topic',
            explanation: 'Understanding the main topic is the first step in learning.'
          }]
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  }
})
