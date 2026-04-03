
import { pdfService } from '@/features/pdf/services/PDFService';

export interface PDFPageImage {
  pageNumber: number;
  canvas: HTMLCanvasElement;
  imageBlob: Blob;
  width: number;
  height: number;
}

export interface PDFToImageOptions {
  scale?: number;
  pages?: number[]; // specific pages to convert, empty array = all pages
  quality?: number;
}

class PDFToImageService {
  async convertPDFToImages(
    pdfFile: File,
    options: PDFToImageOptions = {}
  ): Promise<PDFPageImage[]> {
    const {
      scale = 2.0, // Higher scale for better OCR accuracy
      pages = [],
      quality = 0.95
    } = options;

    try {
      console.log('Converting PDF to images with options:', options);
      const pdf = await pdfService.loadDocument(pdfFile);
      const numPages = pdf.numPages;
      console.log(`PDF has ${numPages} pages`);

      // Determine which pages to convert
      const pagesToConvert = pages.length > 0 
        ? pages.filter(p => p >= 1 && p <= numPages)
        : Array.from({ length: numPages }, (_, i) => i + 1);

      console.log('Converting pages:', pagesToConvert);
      const pageImages: PDFPageImage[] = [];

      for (const pageNum of pagesToConvert) {
        console.log(`Converting page ${pageNum} to image`);
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        // Create canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) {
          throw new Error('Could not get canvas context');
        }

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render PDF page to canvas
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };

        await page.render(renderContext).promise;
        console.log(`Successfully rendered page ${pageNum} to canvas`);

        // Convert canvas to blob
        const imageBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to convert canvas to blob'));
              }
            },
            'image/png',
            quality
          );
        });

        pageImages.push({
          pageNumber: pageNum,
          canvas,
          imageBlob,
          width: canvas.width,
          height: canvas.height
        });

        console.log(`Successfully converted page ${pageNum} to image blob`);
      }

      console.log(`Successfully converted ${pageImages.length} pages to images`);
      return pageImages;
    } catch (error) {
      console.error('PDF to image conversion failed:', error);
      throw new Error(`Failed to convert PDF to images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPageCount(pdfFile: File): Promise<number> {
    try {
      return await pdfService.getPageCount(pdfFile);
    } catch (error) {
      console.error('Failed to get PDF page count:', error);
      throw new Error('Failed to read PDF file');
    }
  }

  // Convert a single page for quick preview
  async convertSinglePage(
    pdfFile: File,
    pageNumber: number,
    scale: number = 1.5
  ): Promise<PDFPageImage | null> {
    const pages = await this.convertPDFToImages(pdfFile, {
      pages: [pageNumber],
      scale
    });
    
    return pages.length > 0 ? pages[0] : null;
  }
}

export const pdfToImageService = new PDFToImageService();
export { PDFToImageService };
