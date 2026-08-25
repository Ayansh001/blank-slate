
import * as pdfjsLib from 'pdfjs-dist';

// Centralized PDF service to handle worker initialization and common operations
class PDFService {
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;
    
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.initialize();
    return this.initializationPromise;
  }

  private async initialize(): Promise<void> {
    try {
      // Use a more compatible worker URL for version 3.11.174
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
      this.isInitialized = true;
      console.log('PDF.js worker initialized successfully');
    } catch (error) {
      console.error('Failed to initialize PDF.js worker:', error);
      throw new Error(`PDF initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async loadDocument(source: string | File | ArrayBuffer): Promise<pdfjsLib.PDFDocumentProxy> {
    await this.ensureInitialized();
    
    try {
      let documentSource;
      
      if (typeof source === 'string') {
        // URL
        documentSource = source;
      } else if (source instanceof File) {
        // File object
        documentSource = { data: await source.arrayBuffer() };
      } else {
        // ArrayBuffer
        documentSource = { data: source };
      }

      const loadingTask = pdfjsLib.getDocument(documentSource);
      return await loadingTask.promise;
    } catch (error) {
      console.error('Failed to load PDF document:', error);
      throw new Error(`Failed to load PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPageCount(source: string | File | ArrayBuffer): Promise<number> {
    const pdf = await this.loadDocument(source);
    return pdf.numPages;
  }

  async convertUrlToFile(url: string, filename: string): Promise<File> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();
      return new File([blob], filename, { type: 'application/pdf' });
    } catch (error) {
      throw new Error(`Failed to convert URL to file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  isPDFFile(fileType: string): boolean {
    // More permissive PDF detection
    return fileType === 'application/pdf' || 
           fileType === 'application/x-pdf' || 
           fileType.includes('pdf');
  }

  isImageFile(fileType: string): boolean {
    return fileType.startsWith('image/');
  }

  isOCRSupported(fileType: string): boolean {
    return this.isPDFFile(fileType) || this.isImageFile(fileType);
  }
}

export const pdfService = new PDFService();
export { PDFService };
