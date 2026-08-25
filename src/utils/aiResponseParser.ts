
/**
 * Universal AI Response Parser
 * Handles various AI response formats including JSON wrapped in markdown code blocks
 */

export interface ParsedResponse {
  success: boolean;
  data?: any;
  error?: string;
  fallbackContent?: string;
}

export function parseAIResponse(rawContent: any): ParsedResponse {
  console.log('Parsing AI response:', { rawContent, type: typeof rawContent });

  // If it's already a parsed object, return it
  if (typeof rawContent === 'object' && rawContent !== null) {
    return {
      success: true,
      data: rawContent
    };
  }

  // If it's not a string, try to stringify and then parse
  let contentString = typeof rawContent === 'string' ? rawContent : String(rawContent);

  // Handle empty or null content
  if (!contentString || contentString.trim() === '') {
    return {
      success: false,
      error: 'Empty response content',
      fallbackContent: 'No content received'
    };
  }

  // Try direct JSON parse first
  try {
    const directParse = JSON.parse(contentString);
    return {
      success: true,
      data: directParse
    };
  } catch (directParseError) {
    console.log('Direct JSON parse failed, trying extraction methods');
  }

  // Extract JSON from markdown code blocks (multiple patterns)
  const jsonBlockPatterns = [
    /```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/i,
    /```\s*\n?\{[\s\S]*?\}\s*\n?```/i,
    /```json\s*\n?([\s\S]*?)\n?\s*```/i
  ];
  
  for (const pattern of jsonBlockPatterns) {
    const match = contentString.match(pattern);
    if (match && match[1]) {
      try {
        const extractedJson = match[1].trim();
        console.log('Extracted JSON from markdown block');
        const parsedJson = JSON.parse(extractedJson);
        return {
          success: true,
          data: parsedJson
        };
      } catch (extractParseError) {
        console.error('Failed to parse extracted JSON:', extractParseError);
        continue;
      }
    }
  }

  // Try to extract JSON from mixed content (more aggressive patterns)
  const jsonPatterns = [
    /\{[\s\S]*\}/,  // Basic JSON object
    /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g,  // Nested objects
    /\[[\s\S]*\]/   // JSON arrays
  ];
  
  for (const pattern of jsonPatterns) {
    const jsonMatch = contentString.match(pattern);
    if (jsonMatch) {
      try {
        const extractedJson = jsonMatch[0];
        const parsedJson = JSON.parse(extractedJson);
        return {
          success: true,
          data: parsedJson
        };
      } catch (mixedParseError) {
        console.error('Failed to parse JSON from mixed content:', mixedParseError);
        continue;
      }
    }
  }

  // Try to find and fix common JSON formatting issues
  try {
    let fixedContent = contentString
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
      .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote unquoted keys
      .trim();

    // Look for JSON-like content and try to extract it
    const jsonLikeMatch = fixedContent.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonLikeMatch) {
      const parsedJson = JSON.parse(jsonLikeMatch[0]);
      console.log('Successfully parsed after fixing formatting issues');
      return {
        success: true,
        data: parsedJson
      };
    }
  } catch (fixParseError) {
    console.log('Failed to parse after attempting fixes');
  }

  // If all parsing attempts fail, return the content as fallback
  return {
    success: false,
    error: 'Could not parse response as JSON',
    fallbackContent: contentString
  };
}

/**
 * Helper function to safely convert word count values to numbers
 */
function parseWordCount(value: any): number {
  if (typeof value === 'number') {
    return value;
  }
  
  if (typeof value === 'string') {
    // Try to extract numbers from strings like "CALCULATE_ACTUAL_WORD_COUNT_OF_PROVIDED_CONTENT"
    const numberMatch = value.match(/\d+/);
    if (numberMatch) {
      return parseInt(numberMatch[0], 10);
    }
    
    // Try direct parseInt
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  
  return 0; // Default fallback
}

/**
 * Validates and extracts enhancement data based on enhancement type
 */
export function validateEnhancementData(data: any, enhancementType: string): any {
  if (!data || typeof data !== 'object') {
    return null;
  }

  switch (enhancementType) {
    case 'summary':
      const summaryData = {
        summary: data.summary || 'No summary available',
        keyTakeaways: data.keyTakeaways || [],
        wordCount: {
          original: parseWordCount(data.wordCount?.original),
          summary: parseWordCount(data.wordCount?.summary)
        }
      };
      
      console.log('Validated summary data:', summaryData);
      return summaryData;

    case 'key_points':
      return {
        keyPoints: data.keyPoints || [],
        categories: data.categories || []
      };

    case 'questions':
      // Normalize questions to preserve AI-generated answers
      const normalizeQuestions = (questions: any[]) => {
        return questions.map((q: any) => {
          if (typeof q === 'string') {
            return {
              question: q,
              answer: null // Don't provide fallback for string-only questions
            };
          }
          
          // Only apply fallback if answer is truly missing (null, undefined, or empty string)
          const hasValidAnswer = q.answer && q.answer.trim() !== '';
          
          return {
            question: q.question || 'Invalid question',
            answer: hasValidAnswer ? q.answer : null, // Preserve original answer or set to null
            type: q.type,
            difficulty: q.difficulty
          };
        });
      };

      const normalizeReviewQuestions = (questions: any[]) => {
        return questions.map((q: any) => {
          if (typeof q === 'string') {
            return {
              question: q,
              answer: null // Don't provide fallback for string-only questions
            };
          }
          
          // Only apply fallback if answer is truly missing
          const hasValidAnswer = q.answer && q.answer.trim() !== '';
          
          return {
            question: q.question || q,
            answer: hasValidAnswer ? q.answer : null // Preserve original answer or set to null
          };
        });
      };

      console.log('Processing questions data:', data);
      console.log('Study questions before normalization:', data.studyQuestions);
      console.log('Review questions before normalization:', data.reviewQuestions);

      const processedData = {
        studyQuestions: normalizeQuestions(data.studyQuestions || []),
        reviewQuestions: normalizeReviewQuestions(data.reviewQuestions || [])
      };

      console.log('Processed questions data:', processedData);
      return processedData;

    default:
      return data;
  }
}

/**
 * Validates and extracts quiz data
 */
export function validateQuizData(data: any): any {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const questions = data.questions || [];
  
  // Validate question structure
  const validatedQuestions = questions.map((q: any) => ({
    question: q.question || 'Invalid question',
    options: q.options || [],
    correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : null,
    explanation: q.explanation || ''
  }));

  return {
    questions: validatedQuestions
  };
}

/**
 * Safely extracts content from nested response structures
 */
export function extractContentFromResponse(response: any): any {
  if (!response) return null;

  // Check for common response wrapper patterns
  if (response.content) return response.content;
  if (response.result) return response.result;
  if (response.data) return response.data;
  if (response.enhancement) return response.enhancement;
  
  return response;
}
