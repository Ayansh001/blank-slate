
export interface PageNoteTemplate {
  type: 'single' | 'combined' | 'batch';
  title: string;
  content: string;
  tags: string[];
  metadata: Record<string, any>;
}

export class PageNoteTemplates {
  /**
   * Generate template for single page note
   */
  static createSinglePageTemplate(
    pageNumber: number,
    content: string,
    fileName?: string,
    originalStats?: { totalPages: number }
  ): PageNoteTemplate {
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    const characterCount = content.length;

    return {
      type: 'single',
      title: `OCR Page ${pageNumber}${fileName ? ` from ${fileName}` : ''}`,
      content: this.generateSinglePageContent(pageNumber, content, wordCount, characterCount, fileName, originalStats),
      tags: ['ocr', 'single-page', `page-${pageNumber}`],
      metadata: {
        pageNumber,
        wordCount,
        characterCount,
        fileName,
        originalStats,
        extractionDate: new Date().toISOString()
      }
    };
  }

  /**
   * Generate template for combined pages note
   */
  static createCombinedPagesTemplate(
    pageNumbers: number[],
    combinedContent: string,
    pageRange: string,
    fileName?: string,
    originalStats?: { totalPages: number }
  ): PageNoteTemplate {
    const wordCount = combinedContent.split(/\s+/).filter(word => word.length > 0).length;
    const characterCount = combinedContent.length;

    return {
      type: 'combined',
      title: `OCR Pages ${pageRange}${fileName ? ` from ${fileName}` : ''}`,
      content: this.generateCombinedPagesContent(pageRange, combinedContent, wordCount, characterCount, fileName, originalStats),
      tags: ['ocr', 'multi-page', 'combined', ...pageNumbers.map(p => `page-${p}`)],
      metadata: {
        pageNumbers,
        pageRange,
        wordCount,
        characterCount,
        fileName,
        originalStats,
        extractionDate: new Date().toISOString()
      }
    };
  }

  /**
   * Generate template for batch save note
   */
  static createBatchPagesTemplate(
    pageNumbers: number[],
    pageDetails: Array<{ pageNumber: number; wordCount: number; characterCount: number; content: string }>,
    pageRange: string,
    fileName?: string,
    originalStats?: { totalPages: number }
  ): PageNoteTemplate {
    const totalWords = pageDetails.reduce((sum, page) => sum + page.wordCount, 0);
    const totalCharacters = pageDetails.reduce((sum, page) => sum + page.characterCount, 0);
    const combinedContent = pageDetails
      .map(page => `=== PAGE ${page.pageNumber} ===\n${page.content}\n=== END PAGE ${page.pageNumber} ===`)
      .join('\n\n');

    return {
      type: 'batch',
      title: `OCR Batch: Pages ${pageRange}${fileName ? ` from ${fileName}` : ''}`,
      content: this.generateBatchPagesContent(pageRange, pageDetails, combinedContent, totalWords, totalCharacters, fileName, originalStats),
      tags: ['ocr', 'batch-save', 'multi-page', ...pageNumbers.map(p => `page-${p}`)],
      metadata: {
        pageNumbers,
        pageRange,
        pageDetails,
        totalWords,
        totalCharacters,
        fileName,
        originalStats,
        extractionDate: new Date().toISOString()
      }
    };
  }

  // Private content generation methods
  private static generateSinglePageContent(
    pageNumber: number,
    content: string,
    wordCount: number,
    characterCount: number,
    fileName?: string,
    originalStats?: { totalPages: number }
  ): string {
    return `<div>
      <div style="background-color: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
        <p><strong>📄 OCR Extracted Page</strong></p>
        <p><strong>Page:</strong> ${pageNumber}${fileName ? ` from ${fileName}` : ''}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Word Count:</strong> ${wordCount}</p>
        <p><strong>Character Count:</strong> ${characterCount}</p>
        ${originalStats ? `<p><strong>Original Document:</strong> ${originalStats.totalPages} pages total</p>` : ''}
      </div>
      <hr style="margin: 16px 0;" />
      <div style="white-space: pre-wrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6;">
        ${content.split('\n').map(line => `<p>${line || '<br>'}</p>`).join('')}
      </div>
    </div>`;
  }

  private static generateCombinedPagesContent(
    pageRange: string,
    combinedContent: string,
    wordCount: number,
    characterCount: number,
    fileName?: string,
    originalStats?: { totalPages: number }
  ): string {
    return `<div>
      <div style="background-color: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
        <p><strong>📄 OCR Selected Pages Combined</strong></p>
        <p><strong>Pages:</strong> ${pageRange}${fileName ? ` from ${fileName}` : ''}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Total Word Count:</strong> ${wordCount}</p>
        <p><strong>Total Character Count:</strong> ${characterCount}</p>
        ${originalStats ? `<p><strong>Original Document:</strong> ${originalStats.totalPages} pages total</p>` : ''}
      </div>
      <hr style="margin: 16px 0;" />
      <div style="white-space: pre-wrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6;">
        ${combinedContent.split('\n').map(line => `<p>${line || '<br>'}</p>`).join('')}
      </div>
    </div>`;
  }

  private static generateBatchPagesContent(
    pageRange: string,
    pageDetails: Array<{ pageNumber: number; wordCount: number; characterCount: number; content: string }>,
    combinedContent: string,
    totalWords: number,
    totalCharacters: number,
    fileName?: string,
    originalStats?: { totalPages: number }
  ): string {
    const pageDetailsList = pageDetails.map(page => 
      `<li>Page ${page.pageNumber}: ${page.wordCount} words, ${page.characterCount} characters</li>`
    ).join('');

    return `<div>
      <div style="background-color: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
        <p><strong>📄 OCR Batch Save</strong></p>
        <p><strong>Pages:</strong> ${pageRange}${fileName ? ` from ${fileName}` : ''}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Total Word Count:</strong> ${totalWords}</p>
        <p><strong>Total Character Count:</strong> ${totalCharacters}</p>
        ${originalStats ? `<p><strong>Original Document:</strong> ${originalStats.totalPages} pages total</p>` : ''}
        <p><strong>Page Details:</strong></p>
        <ul style="margin-left: 20px;">
          ${pageDetailsList}
        </ul>
      </div>
      <hr style="margin: 16px 0;" />
      <div style="white-space: pre-wrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6;">
        ${combinedContent.split('\n').map(line => `<p>${line || '<br>'}</p>`).join('')}
      </div>
    </div>`;
  }
}
