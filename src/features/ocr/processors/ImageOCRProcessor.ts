
import { ocrQueueService } from '../services/OCRQueueService';
import { ProcessOCRParams } from '../types';

export class ImageOCRProcessor {
  static async process(params: ProcessOCRParams & { onProgress?: (progress: number) => void }) {
    return await ocrQueueService.addToQueue({
      fileId: params.fileId,
      imageFile: params.imageFile,
      language: params.language,
      preprocessing: params.preprocessing,
      onProgress: params.onProgress ? (progress) => {
        params.onProgress!(progress.progress);
      } : undefined
    });
  }
}
