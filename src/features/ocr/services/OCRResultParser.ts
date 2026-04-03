
import { OCRResult } from '../types';

export class OCRResultParser {
  parseResult(data: any, language: string): OCRResult {
    if (!data) {
      throw new Error('No OCR data returned');
    }

    const result: OCRResult = {
      text: data.text || '',
      confidence: data.confidence || 0,
      language,
      words: []
    };

    if (data.blocks) {
      const words: OCRResult['words'] = [];
      data.blocks.forEach((block: any) => {
        if (block.paragraphs) {
          block.paragraphs.forEach((paragraph: any) => {
            if (paragraph.lines) {
              paragraph.lines.forEach((line: any) => {
                if (line.words) {
                  line.words.forEach((word: any) => {
                    words.push({
                      text: word.text,
                      confidence: word.confidence,
                      bbox: word.bbox
                    });
                  });
                }
              });
            }
          });
        }
      });
      result.words = words;
    }

    return result;
  }

  validateResult(result: OCRResult): boolean {
    return (
      typeof result.text === 'string' &&
      typeof result.confidence === 'number' &&
      typeof result.language === 'string' &&
      Array.isArray(result.words)
    );
  }
}
