export class ContentParser {
  static parseEnhancedContent(content: any): { text: string; structured?: any } {
    if (!content) {
      return { text: 'No content available' };
    }

    try {
      // Handle string content directly
      if (typeof content === 'string') {
        return { text: content };
      }

      // Handle object with various possible structures
      if (typeof content === 'object') {
        // Check for common content properties
        if (content.enhanced_content) {
          return this.parseEnhancedContent(content.enhanced_content);
        }
        
        if (content.content) {
          return this.parseEnhancedContent(content.content);
        }
        
        if (content.text) {
          return { text: content.text, structured: content };
        }
        
        if (content.summary) {
          return { text: content.summary, structured: content };
        }
        
        if (content.enhancement) {
          return this.parseEnhancedContent(content.enhancement);
        }
        
        if (content.result) {
          return this.parseEnhancedContent(content.result);
        }

        // Handle array of content items
        if (Array.isArray(content) && content.length > 0) {
          const textItems = content
            .map(item => this.parseEnhancedContent(item).text)
            .filter(text => text && text !== 'No content available');
          
          if (textItems.length > 0) {
            return { text: textItems.join('\n\n'), structured: content };
          }
        }

        // If it's an object but no recognized structure, try to extract any text
        const objectText = this.extractTextFromObject(content);
        if (objectText) {
          return { text: objectText, structured: content };
        }

        // Last resort: stringify the object if it has meaningful content
        const stringified = JSON.stringify(content, null, 2);
        if (stringified !== '{}' && stringified !== '[]') {
          return { text: stringified, structured: content };
        }
      }

      // Fallback for other data types
      return { text: String(content) };
    } catch (error) {
      console.error('Error parsing enhanced content:', error);
      // Return the raw content as string if parsing fails
      return { text: String(content) };
    }
  }

  private static extractTextFromObject(obj: any): string | null {
    const textFields = ['text', 'content', 'description', 'summary', 'enhancement', 'result', 'output'];
    
    for (const field of textFields) {
      if (obj[field] && typeof obj[field] === 'string') {
        return obj[field];
      }
    }

    // Look for nested objects
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        const nestedText = this.extractTextFromObject(value);
        if (nestedText) {
          return nestedText;
        }
      }
    }

    return null;
  }

  static parseQuizData(data: any) {
    if (!data) return null;
    
    try {
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }
      
      if (data.questions && Array.isArray(data.questions)) {
        return data;
      }
      
      return null;
    } catch {
      return null;
    }
  }

  static parseChatContent(content: any) {
    if (!content) return 'No content available';
    
    if (typeof content === 'string') {
      return content;
    }
    
    if (content.message || content.text || content.content) {
      return content.message || content.text || content.content;
    }
    
    return JSON.stringify(content, null, 2);
  }
}
