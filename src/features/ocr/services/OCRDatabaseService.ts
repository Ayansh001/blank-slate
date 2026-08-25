
import { supabase } from '@/integrations/supabase/client';

export class OCRDatabaseService {
  static async createOCRJob(params: {
    fileId: string;
    userId: string;
    language: string;
    preprocessingOptions: any;
  }) {
    const { data: job, error: jobError } = await supabase
      .from('ocr_jobs')
      .insert({
        file_id: params.fileId,
        user_id: params.userId,
        language: params.language,
        preprocessing_options: params.preprocessingOptions as any,
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (jobError) throw jobError;
    return job;
  }

  static async updateJobProgress(jobId: string, progress: number) {
    try {
      await supabase
        .from('ocr_jobs')
        .update({ progress: Math.round(progress) })
        .eq('id', jobId);
    } catch (error) {
      console.warn('Failed to update progress:', error);
    }
  }

  static async completeJob(jobId: string) {
    await supabase
      .from('ocr_jobs')
      .update({
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }

  static async failJob(jobId: string, errorMessage: string) {
    await supabase
      .from('ocr_jobs')
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Also update file status
    const { data: job } = await supabase
      .from('ocr_jobs')
      .select('file_id, user_id')
      .eq('id', jobId)
      .single();

    if (job) {
      await supabase
        .from('files')
        .update({ ocr_status: 'failed' })
        .eq('id', job.file_id)
        .eq('user_id', job.user_id);
    }
  }

  static async saveOCRResults(params: {
    fileId: string;
    userId: string;
    text: string;
    confidence: number;
    language: string;
  }) {
    try {
      // Use the comprehensive function with better error handling
      const { data: result, error: rpcError } = await supabase
        .rpc('update_ocr_status_comprehensive', {
          _file_id: params.fileId,
          _user_id: params.userId,
          _ocr_text: params.text,
          _ocr_confidence: params.confidence,
          _ocr_language: params.language,
          _ocr_status: 'completed'
        });

      if (rpcError) {
        console.error('RPC error saving OCR results:', rpcError);
        throw new Error(`Database RPC error: ${rpcError.message}`);
      }

      // Type guard for the result
      const resultObj = result as any;
      if (!resultObj?.success) {
        console.error('OCR save operation failed:', result);
        throw new Error(resultObj?.error || 'Failed to update OCR results in database');
      }

      console.log('OCR results saved successfully:', {
        fileId: params.fileId,
        textLength: params.text.length,
        confidence: params.confidence,
        updatedCount: resultObj.updated_count
      });

      return result;
    } catch (error) {
      console.error('Failed to save OCR results:', error);
      throw error instanceof Error ? error : new Error('Unknown error saving OCR results');
    }
  }
}
