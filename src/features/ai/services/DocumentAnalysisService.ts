// Document Analysis Service - Handles AI-powered document analysis
import { supabase } from '@/integrations/supabase/client';
import { DocumentAnalysis, AIAnalysisRequest, AIAnalysisResult, TokenUsage } from '../types';
import { AIServiceManager } from './AIServiceManager';
import { AIErrorHandler } from './AIErrorHandler';
import { aiUsageTracker } from './AIUsageTracker';

export class DocumentAnalysisService {
  private static instance: DocumentAnalysisService;
  private aiServiceManager = AIServiceManager.getInstance();

  public static getInstance(): DocumentAnalysisService {
    if (!DocumentAnalysisService.instance) {
      DocumentAnalysisService.instance = new DocumentAnalysisService();
    }
    return DocumentAnalysisService.instance;
  }

  async analyzeDocument(request: AIAnalysisRequest, userId: string): Promise<AIAnalysisResult> {
    try {
      const startTime = Date.now();

      // Get file content
      const fileContent = await this.getFileContent(request.fileId, userId);
      if (!fileContent) {
        return { success: false, error: 'File not found or no content available' };
      }

      // Get AI service configuration
      const aiConfig = await this.aiServiceManager.getActiveAIService(userId);
      if (!aiConfig) {
        return { success: false, error: 'No AI service configured' };
      }

      // Generate analysis using AI service
      const analysisResult = await this.callAIService(
        aiConfig,
        request.analysisType,
        fileContent,
        request.customPrompt
      );

      const processingTime = Date.now() - startTime;

      // Save analysis to database
      const { data, error } = await supabase
        .from('document_analyses')
        .insert({
          file_id: request.fileId,
          user_id: userId,
          analysis_type: request.analysisType,
          ai_service: aiConfig.service_name,
          model_used: aiConfig.model_name,
          prompt_used: this.getPromptForAnalysisType(request.analysisType, request.customPrompt),
          analysis_result: analysisResult.content,
          confidence_score: analysisResult.confidence,
          processing_time_ms: processingTime,
          token_usage: analysisResult.tokenUsage
        })
        .select()
        .single();

      if (error) throw error;

      // Track usage with both systems
      if (analysisResult.tokenUsage) {
        const cost = this.aiServiceManager.calculateCost(
          aiConfig.service_name as any,
          analysisResult.tokenUsage.input_tokens,
          analysisResult.tokenUsage.output_tokens
        );
        
        // Legacy tracking through AIServiceManager
        await this.aiServiceManager.trackUsage(
          userId,
          aiConfig.service_name,
          `analysis_${request.analysisType}`,
          analysisResult.tokenUsage.total_tokens,
          cost
        );

        // New centralized tracking
        aiUsageTracker.track({
          tokensUsed: analysisResult.tokenUsage.total_tokens,
          operationType: `document_analysis_${request.analysisType}`,
          serviceName: aiConfig.service_name,
          costEstimate: cost
        });
      }

      return { success: true, analysis: data as DocumentAnalysis };
    } catch (error) {
      AIErrorHandler.handle(error, 'document analysis');
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Analysis failed' 
      };
    }
  }

  async getDocumentAnalyses(fileId: string, userId: string): Promise<DocumentAnalysis[]> {
    const { data, error } = await supabase
      .from('document_analyses')
      .select('*')
      .eq('file_id', fileId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as DocumentAnalysis[] || [];
  }

  async getUserAnalyses(userId: string, limit?: number): Promise<DocumentAnalysis[]> {
    let query = supabase
      .from('document_analyses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as DocumentAnalysis[] || [];
  }

  private async getFileContent(fileId: string, userId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('files')
      .select('ocr_text, name, file_type')
      .eq('id', fileId)
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;
    return data.ocr_text || `File: ${data.name} (${data.file_type})`;
  }

  private async callAIService(
    aiConfig: any,
    analysisType: string,
    content: string,
    customPrompt?: string
  ): Promise<{
    content: any;
    confidence: number;
    tokenUsage: TokenUsage;
  }> {
    // Call AI service through Supabase Edge Function
    const response = await supabase.functions.invoke('ai-document-analysis', {
      body: {
        service: aiConfig.service_name,
        model: aiConfig.model_name,
        analysisType,
        content,
        customPrompt,
        apiKey: aiConfig.api_key // Direct API key usage
      }
    });

    if (response.error) throw response.error;
    return response.data;
  }

  private getPromptForAnalysisType(analysisType: string, customPrompt?: string): string {
    if (customPrompt) return customPrompt;

    const prompts = {
      summary: 'Provide a comprehensive summary of this document, highlighting the main points and key takeaways.',
      key_points: 'Extract and list the key points, main arguments, and important details from this document.',
      questions: 'Generate thoughtful questions that test understanding of the concepts and information in this document.',
      concepts: 'Identify and explain the main concepts, terms, and ideas presented in this document.',
      topics: 'Identify and categorize the main topics and themes covered in this document.'
    };

    return prompts[analysisType as keyof typeof prompts] || prompts.summary;
  }
}