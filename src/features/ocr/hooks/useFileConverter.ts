
import { toast } from 'sonner';
import { pdfService } from '@/features/pdf/services/PDFService';

export function useFileConverter() {
  const convertUrlToFile = async (url: string, filename: string, originalMimeType: string): Promise<File> => {
    try {
      console.log('Converting URL to file:', { url, filename, originalMimeType });
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      // Use the actual response content type, fallback to original if not available
      let mimeType = blob.type || originalMimeType;
      
      // If still no MIME type, infer from filename extension
      if (!mimeType || mimeType === 'application/octet-stream') {
        const extension = filename.toLowerCase().split('.').pop();
        switch (extension) {
          case 'pdf':
            mimeType = 'application/pdf';
            break;
          case 'jpg':
          case 'jpeg':
            mimeType = 'image/jpeg';
            break;
          case 'png':
            mimeType = 'image/png';
            break;
          case 'bmp':
            mimeType = 'image/bmp';
            break;
          case 'tiff':
          case 'tif':
            mimeType = 'image/tiff';
            break;
          case 'webp':
            mimeType = 'image/webp';
            break;
          default:
            mimeType = originalMimeType;
        }
      }
      
      console.log('File conversion result:', { 
        originalType: originalMimeType, 
        responseType: blob.type, 
        finalType: mimeType,
        size: blob.size 
      });
      
      return new File([blob], filename, { type: mimeType });
    } catch (error) {
      const message = `Failed to convert URL to file: ${error instanceof Error ? error.message : 'Unknown error'}`;
      toast.error(message);
      throw new Error(message);
    }
  };

  return {
    convertUrlToFile
  };
}
