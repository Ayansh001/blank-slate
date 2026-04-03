
import { ImageOCRProcessor } from './ImageOCRProcessor';
import { PDFOCRProcessor } from './PDFOCRProcessor';
import { pdfService } from '@/features/pdf/services/PDFService';
import { ProcessOCRParams } from '../types';

export class OCRProcessorFactory {
  static async process(params: ProcessOCRParams & { 
    pdfPages?: number[]; 
    onProgress?: (progress: number) => void;
  }) {
    if (pdfService.isPDFFile(params.imageFile.type) && params.pdfPages) {
      return await PDFOCRProcessor.process({
        ...params,
        pdfPages: params.pdfPages
      });
    } else {
      return await ImageOCRProcessor.process(params);
    }
  }
}
