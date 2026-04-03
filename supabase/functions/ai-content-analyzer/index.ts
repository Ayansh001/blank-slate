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
    const { files, analysisType = 'comprehensive' } = await req.json();

    if (!files || !Array.isArray(files) || files.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Files array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // We'll use the user's configured AI service instead of hardcoded OpenAI

    // Create Supabase client
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

    const results = [];

    for (const file of files) {
      try {
        const analysis = await analyzeContent(file, analysisType, supabase, userId);
        
        // Get the AI service used from user's config
        const { data: configData } = await supabase
          .from('ai_service_configs')
          .select('service_name, model_name')
          .eq('user_id', userId)
          .eq('is_active', true)
          .maybeSingle();
        
        // Save analysis to database
        const { data: savedAnalysis } = await supabase
          .from('document_analyses')
          .insert({
            file_id: file.id,
            user_id: userId,
            analysis_type: analysisType,
            ai_service: configData?.service_name || 'openai',
            model_used: configData?.model_name || 'gpt-4o-mini',
            analysis_result: analysis,
            confidence_score: 0.85,
            processing_time_ms: Date.now() - new Date(file.uploadedAt || new Date()).getTime()
          })
          .select()
          .single();

        results.push({
          fileId: file.id,
          fileName: file.name,
          analysis: analysis,
          analysisId: savedAnalysis?.id
        });

        // Track learning activity
        await supabase.rpc('track_learning_activity', {
          _user_id: userId,
          _activity_type: 'file_analyzed',
          _activity_data: {
            file_id: file.id,
            file_name: file.name,
            analysis_type: analysisType,
            content_length: file.content?.length || 0
          },
          _time_spent_minutes: 1,
          _knowledge_areas: analysis.topics || [],
          _difficulty_level: analysis.complexity || 1
        });

      } catch (error) {
        console.error(`Error analyzing file ${file.id}:`, error);
        results.push({
          fileId: file.id,
          fileName: file.name,
          error: error.message
        });
      }
    }

    // Find content relationships
    const relationships = await findContentRelationships(files, results, userId, supabase);

    return new Response(
      JSON.stringify({ 
        success: true,
        results: results,
        relationships: relationships,
        summary: {
          totalFiles: files.length,
          successfulAnalyses: results.filter(r => !r.error).length,
          failedAnalyses: results.filter(r => r.error).length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Content analysis error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function analyzeContent(file: any, analysisType: string, supabase: any, userId: string) {
  const content = file.content || file.ocr_text || '';
  
  if (!content) {
    throw new Error('No content available for analysis');
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

  const prompt = createAnalysisPrompt(content, file.name, analysisType);
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
            content: 'You are an expert content analyst who provides comprehensive analysis of documents for educational purposes. Return only valid JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const analysisContent = data.choices[0].message.content;

    try {
      return JSON.parse(analysisContent);
    } catch (error) {
      throw new Error('Failed to parse analysis content as JSON');
    }
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
            text: `You are an expert content analyst who provides comprehensive analysis of documents for educational purposes. Return only valid JSON format.\n\n${prompt}`
          }]
        }]
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const geminiData = await response.json();
    const analysisContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    try {
      return JSON.parse(analysisContent);
    } catch (error) {
      throw new Error('Failed to parse analysis content as JSON');
    }
  }

  throw new Error('Unsupported AI service');
}

function createAnalysisPrompt(content: string, fileName: string, analysisType: string): string {
  const basePrompt = `Analyze the following document content from "${fileName}":\n\n${content}\n\n`;

  return basePrompt + `Provide a comprehensive analysis in this JSON format:
{
  "summary": "Brief summary of the document",
  "topics": ["Topic 1", "Topic 2", "Topic 3"],
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "complexity": 1-5,
  "readingLevel": "elementary|middle|high|college|graduate",
  "estimatedStudyTime": "Time in minutes",
  "concepts": [
    {
      "concept": "Concept name",
      "definition": "Brief definition",
      "importance": "high|medium|low"
    }
  ],
  "studyQuestions": ["Question 1", "Question 2", "Question 3"],
  "relatedTopics": ["Related topic 1", "Related topic 2"],
  "practicalApplications": ["Application 1", "Application 2"],
  "prerequisites": ["Prerequisite 1", "Prerequisite 2"]
}`;
}

async function findContentRelationships(files: any[], results: any[], userId: string, supabase: any) {
  const relationships = [];
  
  // Simple relationship detection based on topic overlap
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      const result1 = results[i];
      const result2 = results[j];
      
      if (result1.error || result2.error) continue;
      
      const topics1 = result1.analysis.topics || [];
      const topics2 = result2.analysis.topics || [];
      
      const commonTopics = topics1.filter(topic => topics2.includes(topic));
      
      if (commonTopics.length > 0) {
        const relationship = {
          user_id: userId,
          source_type: 'file',
          source_id: result1.fileId,
          related_type: 'file',
          related_id: result2.fileId,
          relationship_type: 'similar_topic',
          confidence_score: Math.min(0.9, 0.5 + (commonTopics.length * 0.1)),
          ai_explanation: `Both documents cover similar topics: ${commonTopics.join(', ')}`
        };
        
        relationships.push(relationship);
        
        // Save to database
        await supabase.from('content_relationships').insert(relationship);
      }
    }
  }
  
  return relationships;
}