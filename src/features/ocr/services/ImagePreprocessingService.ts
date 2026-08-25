
import { PreprocessingOptions } from '../types';

export class ImagePreprocessingService {
  async preprocessImage(imageFile: File, options: PreprocessingOptions): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      const img = new Image();

      img.onload = () => {
        try {
          const sourceWidth = img.width;
          const sourceHeight = img.height;
          
          const cropX = options.crop?.x || 0;
          const cropY = options.crop?.y || 0;
          const cropWidth = options.crop?.width || sourceWidth;
          const cropHeight = options.crop?.height || sourceHeight;

          canvas.width = cropWidth;
          canvas.height = cropHeight;

          ctx.save();

          if (options.rotation) {
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((options.rotation * Math.PI) / 180);
            ctx.translate(-canvas.width / 2, -canvas.height / 2);
          }

          ctx.drawImage(
            img,
            cropX, cropY, cropWidth, cropHeight,
            0, 0, canvas.width, canvas.height
          );

          if (options.brightness !== undefined || options.contrast !== undefined) {
            this.applyBrightnessContrast(ctx, canvas, options);
          }

          ctx.restore();

          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create processed image blob'));
            }
          }, 'image/png', 0.9);
        } catch (error) {
          reject(new Error(`Image preprocessing failed: ${error.message}`));
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for preprocessing'));
      };

      img.src = URL.createObjectURL(imageFile);
    });
  }

  private applyBrightnessContrast(
    ctx: CanvasRenderingContext2D, 
    canvas: HTMLCanvasElement, 
    options: PreprocessingOptions
  ): void {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const brightness = (options.brightness || 0) * 255 / 100;
    const contrast = (options.contrast || 0) / 100 + 1;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, data[i] * contrast + brightness));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * contrast + brightness));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * contrast + brightness));
    }

    ctx.putImageData(imageData, 0, 0);
  }
}
