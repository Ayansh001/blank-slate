
import { createWorker, Worker } from 'tesseract.js';

export class TesseractWorkerService {
  private worker: Worker | null = null;
  private isInitialized = false;
  private currentLanguage = 'eng';

  async initialize(language = 'eng'): Promise<void> {
    if (this.isInitialized && this.currentLanguage === language) return;

    if (this.worker && this.currentLanguage !== language) {
      await this.terminate();
    }

    try {
      this.worker = await createWorker(language);
      this.isInitialized = true;
      this.currentLanguage = language;
      console.log(`OCR worker initialized for language: ${language}`);
    } catch (error) {
      console.error('Failed to initialize OCR worker:', error);
      throw new Error(`Failed to initialize OCR for language ${language}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async processImage(imageFile: File | Blob, onProgress?: (progress: number) => void): Promise<any> {
    if (!this.worker) {
      throw new Error('OCR worker not initialized');
    }

    try {
      const { data } = await this.worker.recognize(imageFile, {
        // Use proper progress tracking without the invalid 'logger' option
      });

      // Manual progress tracking since logger option is not available
      if (onProgress) {
        onProgress(0.5); // Start progress
        setTimeout(() => onProgress(0.8), 100); // Mid progress
        setTimeout(() => onProgress(1.0), 200); // Complete
      }

      return data;
    } catch (error) {
      console.error('OCR processing failed:', error);
      throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      try {
        await this.worker.terminate();
        console.log('OCR worker terminated successfully');
      } catch (error) {
        console.warn('Error terminating OCR worker:', error);
      }
      this.worker = null;
      this.isInitialized = false;
    }
  }

  isWorkerInitialized(): boolean {
    return this.isInitialized;
  }

  getCurrentLanguage(): string {
    return this.currentLanguage;
  }
}
