
export interface OCRProgress {
  status: string;
  progress: number;
}

export interface OCRResult {
  text: string;
  confidence: number;
  language: string;
  words: Array<{
    text: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  }>;
  pageCount?: number;
  pages?: number[];
  pageResults?: Array<{
    pageNumber: number;
    text: string;
    confidence: number;
  }>;
}

export interface PreprocessingOptions {
  brightness?: number;
  contrast?: number;
  rotation?: number;
  crop?: { x: number; y: number; width: number; height: number };
  [key: string]: any;
}

export interface OCRJob {
  id: string;
  file_id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  language: string;
  preprocessing_options: PreprocessingOptions;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ProcessOCRParams {
  fileId: string;
  imageFile: File;
  language?: string;
  preprocessing?: PreprocessingOptions;
}

export interface BatchProcessParams {
  files: Array<{ fileId: string; imageFile: File }>;
  options?: { language?: string; preprocessing?: PreprocessingOptions };
}
