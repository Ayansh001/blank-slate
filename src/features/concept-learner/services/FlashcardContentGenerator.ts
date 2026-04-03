interface ContentPair {
  front: string;
  back: string;
}

interface ContentMetadata {
  quality: number;
  confidence: number;
  contentType: 'concept' | 'keypoint' | 'example' | 'tip';
}

interface RelatedConcept {
  name: string;
  relationship: string;
  explanation: string;
}

export class FlashcardContentGenerator {
  static generateContentPair(content: string, type: 'concept' | 'keypoint' | 'example' | 'tip', conceptName: string): ContentPair & { metadata: ContentMetadata } {
    const cleanContent = content.trim();
    
    switch (type) {
      case 'concept':
        return this.generateConceptPair(cleanContent, conceptName);
      case 'keypoint':
        return this.generateKeyPointPair(cleanContent, conceptName);
      case 'example':
        return this.generateExamplePair(cleanContent, conceptName);
      case 'tip':
        return this.generateTipPair(cleanContent, conceptName);
      default:
        return this.generateImprovedFallbackPair(cleanContent, conceptName);
    }
  }

  private static generateConceptPair(content: string, conceptName: string): ContentPair & { metadata: ContentMetadata } {
    return {
      front: `What is ${conceptName}?`,
      back: this.extractMainDefinition(content),
      metadata: {
        quality: this.assessContentQuality(content),
        confidence: 0.9,
        contentType: 'concept'
      }
    };
  }

  private static generateKeyPointPair(content: string, conceptName: string): ContentPair & { metadata: ContentMetadata } {
    // Check for key-value structure (term: definition)
    if (content.includes(':')) {
      const colonIndex = content.indexOf(':');
      const term = content.substring(0, colonIndex).trim();
      const definition = content.substring(colonIndex + 1).trim();
      
      if (term.length > 0 && definition.length > 15) {
        return {
          front: `What does "${term}" mean in the context of ${conceptName}?`,
          back: definition,
          metadata: {
            quality: 0.85,
            confidence: 0.9,
            contentType: 'keypoint'
          }
        };
      }
    }

    // Look for bullet points or list items
    if (content.includes('•') || content.includes('-') || content.includes('*')) {
      const cleanedContent = content.replace(/^[•\-\*]\s*/, '').trim();
      if (cleanedContent.length > 20) {
        return {
          front: `What is a key point about ${conceptName}?`,
          back: cleanedContent,
          metadata: {
            quality: 0.8,
            confidence: 0.85,
            contentType: 'keypoint'
          }
        };
      }
    }

    // Extract meaningful sentences
    const sentences = this.splitIntoSentences(content);
    if (sentences.length >= 1 && sentences[0].length > 15) {
      return {
        front: `What should you know about ${conceptName}?`,
        back: sentences[0],
        metadata: {
          quality: 0.75,
          confidence: 0.8,
          contentType: 'keypoint'
        }
      };
    }

    return this.generateImprovedFallbackPair(content, conceptName);
  }

  private static generateExamplePair(content: string, conceptName: string): ContentPair & { metadata: ContentMetadata } {
    // Look for example indicators
    const exampleMarkers = ['example', 'for instance', 'such as', 'like', 'including', 'e.g.', 'for example'];
    const lowerContent = content.toLowerCase();
    
    for (const marker of exampleMarkers) {
      const index = lowerContent.indexOf(marker);
      if (index !== -1) {
        const afterMarker = content.substring(index + marker.length).trim();
        const cleanExample = afterMarker.replace(/^[:\-,\s]+/, '');
        
        if (cleanExample.length > 20) {
          return {
            front: `Give an example of ${conceptName}`,
            back: cleanExample,
            metadata: {
              quality: 0.85,
              confidence: 0.9,
              contentType: 'example'
            }
          };
        }
      }
    }

    // If no explicit example markers, treat whole content as example
    return {
      front: `How is ${conceptName} demonstrated in practice?`,
      back: this.extractMainDefinition(content),
      metadata: {
        quality: 0.7,
        confidence: 0.75,
        contentType: 'example'
      }
    };
  }

  private static generateTipPair(content: string, conceptName: string): ContentPair & { metadata: ContentMetadata } {
    // Remove common tip prefixes
    const cleanTip = content
      .replace(/^(tip|strategy|remember|note|hint|suggestion):\s*/i, '')
      .replace(/^(to\s+)?(study|learn|understand|remember|master)\s+/i, '')
      .trim();

    return {
      front: `How can you effectively study ${conceptName}?`,
      back: cleanTip,
      metadata: {
        quality: 0.8,
        confidence: 0.85,
        contentType: 'tip'
      }
    };
  }

  private static generateImprovedFallbackPair(content: string, conceptName: string): ContentPair & { metadata: ContentMetadata } {
    // Try to find natural break points
    const sentences = this.splitIntoSentences(content);
    
    if (sentences.length >= 2) {
      // Use first sentence as context for question, rest as answer
      const firstSentence = sentences[0];
      const restContent = sentences.slice(1).join(' ');
      
      return {
        front: `Regarding ${conceptName}: ${firstSentence}. What more should you know?`,
        back: restContent,
        metadata: {
          quality: 0.6,
          confidence: 0.7,
          contentType: 'concept'
        }
      };
    }
    
    // If single sentence, create a completion-style question
    if (sentences.length === 1 && sentences[0].length > 30) {
      const sentence = sentences[0];
      const midPoint = Math.floor(sentence.length * 0.4); // Take 40% for question
      const breakPoint = sentence.lastIndexOf(' ', midPoint);
      
      if (breakPoint > 10) {
        return {
          front: `Complete this statement about ${conceptName}: "${sentence.substring(0, breakPoint)}..."`,
          back: sentence.substring(breakPoint).trim(),
          metadata: {
            quality: 0.65,
            confidence: 0.75,
            contentType: 'concept'
          }
        };
      }
    }
    
    // Final fallback - create a general question
    return {
      front: `What is important to know about ${conceptName}?`,
      back: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
      metadata: {
        quality: 0.4,
        confidence: 0.5,
        contentType: 'concept'
      }
    };
  }

  private static splitIntoSentences(content: string): string[] {
    // Split on sentence boundaries, keeping the punctuation
    return content
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 10);
  }

  private static extractMainDefinition(content: string): string {
    const sentences = this.splitIntoSentences(content);
    if (sentences.length > 0) {
      return sentences[0];
    }
    return content.substring(0, 150) + (content.length > 150 ? '...' : '');
  }

  private static assessContentQuality(content: string): number {
    let score = 0.5;
    
    // Length check
    if (content.length > 50) score += 0.1;
    if (content.length > 100) score += 0.1;
    
    // Sentence structure
    const sentences = this.splitIntoSentences(content);
    if (sentences.length > 1) score += 0.1;
    
    // Has useful connecting words
    const usefulWords = ['because', 'therefore', 'however', 'which', 'that', 'when', 'where', 'while', 'although'];
    if (usefulWords.some(word => content.toLowerCase().includes(word))) score += 0.1;
    
    // Has specific terminology
    if (content.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/)) score += 0.1;
    
    return Math.min(1.0, score);
  }

  static generateUniqueRelatedConcepts(
    currentCard: any,
    allCards: any[],
    conceptName: string
  ): RelatedConcept[] {
    const relatedConcepts: RelatedConcept[] = [];
    
    // Get concepts from other cards that are actually different
    const otherCards = allCards.filter(card => 
      card.id !== currentCard.id && 
      card.front !== currentCard.front
    );
    
    // Prioritize cards of different categories for variety
    const differentCategoryCards = otherCards.filter(card => card.category !== currentCard.category);
    const sameCategoryCards = otherCards.filter(card => card.category === currentCard.category);
    
    // Add 2 related concepts from different categories
    differentCategoryCards.slice(0, 2).forEach(card => {
      const relationship = this.getDetailedRelationshipType(currentCard.category, card.category, conceptName);
      relatedConcepts.push({
        name: this.extractConceptName(card.front),
        relationship: relationship.relationship,
        explanation: relationship.explanation
      });
    });
    
    // Add 1 from same category if available and space permits
    if (sameCategoryCards.length > 0 && relatedConcepts.length < 3) {
      const card = sameCategoryCards[0];
      relatedConcepts.push({
        name: this.extractConceptName(card.front),
        relationship: `Related ${card.category}`,
        explanation: `Another ${card.category} that complements understanding of ${conceptName}`
      });
    }
    
    // Generate conceptual related topics if not enough from cards
    if (relatedConcepts.length < 2) {
      const syntheticConcepts = this.generateSyntheticRelatedConcepts(currentCard, conceptName);
      relatedConcepts.push(...syntheticConcepts.slice(0, 3 - relatedConcepts.length));
    }
    
    return relatedConcepts.slice(0, 3);
  }

  private static getDetailedRelationshipType(currentCategory: string, otherCategory: string, conceptName: string): { relationship: string; explanation: string } {
    const relationships = {
      'concept-definition': {
        relationship: 'Defines core terms',
        explanation: `This definition clarifies key terminology used when discussing ${conceptName}`
      },
      'concept-example': {
        relationship: 'Practical demonstration',
        explanation: `This example shows how ${conceptName} appears in real-world situations`
      },
      'concept-application': {
        relationship: 'Applied usage',
        explanation: `This application demonstrates how to use knowledge of ${conceptName} effectively`
      },
      'definition-example': {
        relationship: 'Illustrated by example',
        explanation: `This example helps visualize and understand the definition in practice`
      },
      'definition-application': {
        relationship: 'Applied in practice',
        explanation: `This application shows how the defined concepts are used in real scenarios`
      },
      'example-application': {
        relationship: 'Extended application',
        explanation: `This builds on the example to show broader applications and usage patterns`
      }
    };
    
    const key = `${currentCategory}-${otherCategory}` as keyof typeof relationships;
    return relationships[key] || {
      relationship: `Related to ${conceptName}`,
      explanation: `This concept connects to and enhances understanding of ${conceptName}`
    };
  }

  private static generateSyntheticRelatedConcepts(currentCard: any, conceptName: string): RelatedConcept[] {
    const category = currentCard.category;
    
    switch (category) {
      case 'concept':
        return [
          {
            name: `Advanced ${conceptName}`,
            relationship: 'Builds upon foundation',
            explanation: `Advanced concepts and techniques that build on this foundational understanding`
          },
          {
            name: `${conceptName} Applications`,
            relationship: 'Practical usage',
            explanation: `Real-world applications and use cases for this concept`
          }
        ];
      
      case 'definition':
        return [
          {
            name: `${conceptName} Examples`,
            relationship: 'Demonstrates concept',
            explanation: `Concrete examples that illustrate this definition in practice`
          },
          {
            name: `${conceptName} Variations`,
            relationship: 'Related forms',
            explanation: `Different forms and variations of this concept`
          }
        ];
      
      case 'example':
        return [
          {
            name: `${conceptName} Theory`,
            relationship: 'Underlying principles',
            explanation: `The theoretical foundation that explains why this example works`
          },
          {
            name: `Similar ${conceptName} Cases`,
            relationship: 'Parallel examples',
            explanation: `Other examples that follow similar patterns and principles`
          }
        ];
      
      case 'application':
        return [
          {
            name: `${conceptName} Best Practices`,
            relationship: 'Optimization strategies',
            explanation: `Best practices and optimized approaches for this application`
          },
          {
            name: `${conceptName} Troubleshooting`,
            relationship: 'Problem solving',
            explanation: `Common issues and solutions when applying this concept`
          }
        ];
      
      default:
        return [
          {
            name: `Related ${conceptName} Topics`,
            relationship: 'Connected concepts',
            explanation: `Other important topics that connect to and complement this concept`
          }
        ];
    }
  }

  private static extractConceptName(front: string): string {
    // Remove question words and extract the main concept
    return front
      .replace(/^(what|how|why|when|where|which|complete this|give an|regarding)\s+(is|are|does|do|can|will|about|statement|example|an)?\s*/i, '')
      .replace(/\?$/, '')
      .replace(/\.\.\.$/, '')
      .replace(/^"/, '')
      .replace(/"$/, '')
      .trim();
  }
}
