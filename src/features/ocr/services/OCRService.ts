
import { OCRProgress, OCRResult, PreprocessingOptions } from '../types';
import { TesseractWorkerService } from './TesseractWorkerService';
import { ImagePreprocessingService } from './ImagePreprocessingService';
import { OCRResultParser } from './OCRResultParser';
import { OCRLanguageService } from './OCRLanguageService';
import { validateImageForOCR } from '../utils/fileValidation';

class OCRService {
  private workerService = new TesseractWorkerService();
  private preprocessingService = new ImagePreprocessingService();
  private resultParser = new OCRResultParser();
  private languageService = new OCRLanguageService();
  private processingSessions = new Map<string, boolean>();

  async processImage(
    imageFile: File,
    options: {
      language?: string;
      preprocessing?: PreprocessingOptions;
      onProgress?: (progress: OCRProgress) => void;
      sessionId?: string;
    } = {}
  ): Promise<OCRResult> {
    const sessionId = options.sessionId || Math.random().toString(36).substring(2);
    
    if (this.processingSessions.get(sessionId)) {
      throw new Error('OCR processing already in progress for this session');
    }

    this.processingSessions.set(sessionId, true);
    const progressCallback = options.onProgress || (() => {});

    try {
      // Validate file
      const validation = validateImageForOCR(imageFile);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid image file');
      }

      const language = options.language || this.languageService.getDefaultLanguage();
      
      progressCallback({ status: 'Initializing OCR worker...', progress: 0.1 });
      await this.workerService.initialize(language);

      progressCallback({ status: 'Preprocessing image...', progress: 0.2 });
      const processedImage = options.preprocessing 
        ? await this.preprocessingService.preprocessImage(imageFile, options.preprocessing)
        : imageFile;

      progressCallback({ status: 'Extracting text...', progress: 0.4 });
      const data = await this.workerService.processImage(processedImage, (progress) => {
        progressCallback({ 
          status: 'Processing OCR...', 
          progress: 0.4 + (progress * 0.5) 
        });
      });

      progressCallback({ status: 'Parsing results...', progress: 0.9 });
      const result = this.resultParser.parseResult(data, language);

      if (!this.resultParser.validateResult(result)) {
        throw new Error('Invalid OCR result format');
      }

      progressCallback({ status: 'Complete', progress: 1 });
      return result;
    } catch (error) {
      console.error('OCR processing failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`OCR processing failed: ${errorMessage}`);
    } finally {
      this.processingSessions.delete(sessionId);
    }
  }

  async terminate(): Promise<void> {
    try {
      await this.workerService.terminate();
      this.processingSessions.clear();
      console.log('OCR service terminated successfully');
    } catch (error) {
      console.error('Error terminating OCR service:', error);
    }
  }

  getSupportedLanguages(): string[] {
    return this.languageService.getSupportedLanguages();
  }

  getLanguageName(code: string): string {
    return this.languageService.getLanguageName(code);
  }

  isSessionProcessing(sessionId: string): boolean {
    return this.processingSessions.get(sessionId) || false;
  }

  getActiveSessionsCount(): number {
    return this.processingSessions.size;
  }

  isCurrentlyProcessing(): boolean {
    return this.processingSessions.size > 0;
  }
}

export const ocrService = new OCRService();
export { OCRService };
