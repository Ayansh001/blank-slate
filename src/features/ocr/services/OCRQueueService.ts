
interface QueueItem {
  id: string;
  fileId: string;
  imageFile: File;
  language: string;
  preprocessing?: any;
  onProgress?: (progress: { status: string; progress: number }) => void;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
}

export class OCRQueueService {
  private queue: QueueItem[] = [];
  private processing = false;
  private maxConcurrent = 2;
  private currentProcessing = 0;

  async addToQueue(item: Omit<QueueItem, 'id' | 'resolve' | 'reject'>): Promise<any> {
    return new Promise((resolve, reject) => {
      const queueItem: QueueItem = {
        ...item,
        id: Math.random().toString(36).substring(2),
        resolve,
        reject
      };
      
      this.queue.push(queueItem);
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.currentProcessing >= this.maxConcurrent) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.processing = true;
    this.currentProcessing++;

    try {
      // Dynamic import to avoid circular dependency
      const { ocrService } = await import('./OCRService');
      const result = await ocrService.processImage(item.imageFile, {
        language: item.language,
        preprocessing: item.preprocessing,
        onProgress: item.onProgress
      });
      
      item.resolve(result);
    } catch (error) {
      item.reject(error as Error);
    } finally {
      this.currentProcessing--;
      this.processing = false;
      
      // Process next item in queue
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  clearQueue(): void {
    this.queue.forEach(item => {
      item.reject(new Error('Queue cleared'));
    });
    this.queue = [];
  }
}

export const ocrQueueService = new OCRQueueService();
