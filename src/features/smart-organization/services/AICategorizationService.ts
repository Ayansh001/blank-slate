import { FileData } from '@/hooks/useFiles';

export interface CategorySuggestion {
  category: string;
  confidence: number;
  reason: string;
}

export interface TagSuggestion {
  tag: string;
  confidence: number;
  source: 'content' | 'filename' | 'metadata';
}

export interface SmartOrganizationResult {
  fileId: string;
  suggestedCategory: CategorySuggestion;
  suggestedTags: TagSuggestion[];
  duplicates: string[];
  relatedFiles: string[];
}

class AICategorizationService {
  private categoryKeywords = {
    'academic': ['research', 'paper', 'study', 'thesis', 'journal', 'academic', 'university', 'college', 'education'],
    'legal': ['contract', 'agreement', 'legal', 'law', 'court', 'terms', 'policy', 'compliance'],
    'financial': ['invoice', 'receipt', 'budget', 'financial', 'tax', 'accounting', 'bank', 'statement'],
    'medical': ['medical', 'health', 'patient', 'diagnosis', 'prescription', 'doctor', 'hospital'],
    'technical': ['manual', 'guide', 'specification', 'API', 'documentation', 'technical', 'code', 'software'],
    'personal': ['personal', 'diary', 'note', 'memo', 'reminder', 'private'],
    'business': ['business', 'meeting', 'proposal', 'report', 'presentation', 'company', 'corporate']
  };

  private commonTags = [
    'important', 'urgent', 'draft', 'final', 'review', 'archive', 'template',
    'reference', 'backup', 'shared', 'private', 'public', 'work', 'personal'
  ];

  async analyzeFile(file: FileData): Promise<SmartOrganizationResult> {
    const content = this.extractSearchableContent(file);
    
    return {
      fileId: file.id,
      suggestedCategory: this.categorizeContent(content, file.name),
      suggestedTags: this.generateTags(content, file.name, file.metadata),
      duplicates: [], // Would be populated by comparing with other files
      relatedFiles: [] // Would be populated by content similarity analysis
    };
  }

  async batchAnalyze(files: FileData[]): Promise<SmartOrganizationResult[]> {
    const results = await Promise.all(
      files.map(file => this.analyzeFile(file))
    );

    // Post-process to find duplicates and related files
    return this.findRelationships(results, files);
  }

  private extractSearchableContent(file: FileData): string {
    const searchableText = [
      file.name,
      file.ocr_text || '',
      file.tags?.join(' ') || '',
      file.category || ''
    ].join(' ').toLowerCase();

    return searchableText;
  }

  private categorizeContent(content: string, filename: string): CategorySuggestion {
    const scores: Record<string, number> = {};
    
    // Initialize scores
    Object.keys(this.categoryKeywords).forEach(category => {
      scores[category] = 0;
    });

    // Score based on keyword matches
    Object.entries(this.categoryKeywords).forEach(([category, keywords]) => {
      keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = content.match(regex) || [];
        scores[category] += matches.length;
      });
    });

    // Boost score for filename matches
    Object.entries(this.categoryKeywords).forEach(([category, keywords]) => {
      keywords.forEach(keyword => {
        if (filename.toLowerCase().includes(keyword)) {
          scores[category] += 2; // Filename matches get double weight
        }
      });
    });

    // Find best category
    const bestCategory = Object.entries(scores).reduce(
      (best, [category, score]) => 
        score > best.score ? { category, score } : best,
      { category: 'general', score: 0 }
    );

    const totalWords = content.split(/\s+/).length;
    const confidence = Math.min(bestCategory.score / Math.max(totalWords * 0.1, 1), 1);

    return {
      category: bestCategory.category,
      confidence,
      reason: `Found ${bestCategory.score} relevant keywords`
    };
  }

  private generateTags(content: string, filename: string, metadata: any): TagSuggestion[] {
    const suggestions: TagSuggestion[] = [];
    
    // Content-based tags
    this.commonTags.forEach(tag => {
      const regex = new RegExp(`\\b${tag}\\b`, 'gi');
      if (content.match(regex)) {
        suggestions.push({
          tag,
          confidence: 0.8,
          source: 'content'
        });
      }
    });

    // Filename-based tags
    const filenameParts = filename.toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .split(' ')
      .filter(part => part.length > 2);

    filenameParts.forEach(part => {
      if (!suggestions.some(s => s.tag === part)) {
        suggestions.push({
          tag: part,
          confidence: 0.6,
          source: 'filename'
        });
      }
    });

    // Metadata-based tags
    if (metadata) {
      if (metadata.pages && metadata.pages > 10) {
        suggestions.push({ tag: 'long-document', confidence: 0.9, source: 'metadata' });
      }
      if (metadata.hasImages) {
        suggestions.push({ tag: 'contains-images', confidence: 0.9, source: 'metadata' });
      }
    }

    // Sort by confidence and return top suggestions
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8);
  }

  private findRelationships(
    results: SmartOrganizationResult[], 
    files: FileData[]
  ): SmartOrganizationResult[] {
    // Simple duplicate detection based on name similarity and content
    const filesMap = new Map(files.map(f => [f.id, f]));
    
    return results.map(result => {
      const currentFile = filesMap.get(result.fileId)!;
      const duplicates: string[] = [];
      const relatedFiles: string[] = [];

      files.forEach(otherFile => {
        if (otherFile.id === currentFile.id) return;

        // Check for duplicates (similar names or same checksum)
        if (
          otherFile.checksum === currentFile.checksum ||
          this.calculateSimilarity(currentFile.name, otherFile.name) > 0.8
        ) {
          duplicates.push(otherFile.id);
        }
        // Check for related files (similar content or category)
        else if (
          otherFile.category === result.suggestedCategory.category ||
          this.calculateContentSimilarity(currentFile.ocr_text || '', otherFile.ocr_text || '') > 0.6
        ) {
          relatedFiles.push(otherFile.id);
        }
      });

      return {
        ...result,
        duplicates,
        relatedFiles
      };
    });
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private calculateContentSimilarity(content1: string, content2: string): number {
    if (!content1 || !content2) return 0;
    
    const words1 = new Set(content1.toLowerCase().split(/\s+/));
    const words2 = new Set(content2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}

export const aiCategorizationService = new AICategorizationService();