
import { pdfToImageService } from '../services/PDFToImageService';
import { pdfTextExtractionService } from '../services/PDFTextExtractionService';
import { ocrQueueService } from '../services/OCRQueueService';
import { ProcessOCRParams } from '../types';

export class PDFOCRProcessor {
  static async process(params: ProcessOCRParams & { 
    pdfPages: number[]; 
    onProgress?: (progress: number) => void;
  }) {
    // First, try native text extraction for text-based PDFs
    const nativeTextResult = await pdfTextExtractionService.extractNativeText(params.imageFile, params.pdfPages);
    
    if (nativeTextResult && nativeTextResult.hasNativeText) {
      console.log('Using native PDF text extraction');
      
      // Format native text results with proper page separation
      const formattedText = nativeTextResult.pageResults
        .map(page => {
          const pageText = page.text.trim();
          return pageText 
            ? `=== PAGE ${page.pageNumber} ===\n${pageText}\n=== END PAGE ${page.pageNumber} ===`
            : `=== PAGE ${page.pageNumber} ===\n[No text found on this page]\n=== END PAGE ${page.pageNumber} ===`;
        })
        .join('\n\n');
      
      return {
        text: formattedText,
        confidence: nativeTextResult.confidence,
        pageCount: nativeTextResult.pageResults.length,
        pages: nativeTextResult.pageResults.map(p => p.pageNumber),
        pageResults: nativeTextResult.pageResults
      };
    }

    // Fall back to OCR for scanned PDFs
    console.log('PDF appears to be scanned, using OCR');
    const pageImages = await pdfToImageService.convertPDFToImages(params.imageFile, {
      pages: params.pdfPages,
      scale: 2.0 // Higher resolution for better OCR
    });

    // Process each page and combine results
    const pageResults = [];
    for (const pageImage of pageImages) {
      const pageFile = new File([pageImage.imageBlob], `${params.imageFile.name}-page-${pageImage.pageNumber}.png`, {
        type: 'image/png'
      });

      const pageResult = await ocrQueueService.addToQueue({
        fileId: `${params.fileId}-page-${pageImage.pageNumber}`,
        imageFile: pageFile,
        language: params.language,
        preprocessing: params.preprocessing,
        onProgress: params.onProgress ? (progress) => {
          params.onProgress!(progress.progress);
        } : undefined
      });

      pageResults.push({
        pageNumber: pageImage.pageNumber,
        text: pageResult.text,
        confidence: pageResult.confidence
      });
    }

    // Combine all page results with standardized formatting
    const combinedText = pageResults
      .map(result => {
        const pageText = result.text.trim();
        return pageText 
          ? `=== PAGE ${result.pageNumber} ===\n${pageText}\n=== END PAGE ${result.pageNumber} ===`
          : `=== PAGE ${result.pageNumber} ===\n[No text found on this page]\n=== END PAGE ${result.pageNumber} ===`;
      })
      .join('\n\n');
    
    const avgConfidence = pageResults.reduce((sum, result) => sum + (result.confidence || 0), 0) / pageResults.length;

    return {
      text: combinedText,
      confidence: avgConfidence,
      pageCount: pageResults.length,
      pages: pageResults.map(r => r.pageNumber),
      pageResults: pageResults
    };
  }
}
