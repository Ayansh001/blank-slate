/**
 * Utility functions for handling OCR confidence values consistently
 */

/**
 * Normalize confidence to percentage (0-100)
 * Handles both decimal (0-1) and percentage (0-100) inputs
 */
export function normalizeConfidence(confidence: number | null | undefined): number {
  if (!confidence && confidence !== 0) return 0;
  
  // If confidence is between 0 and 1, treat it as decimal and convert to percentage
  if (confidence <= 1) {
    return Math.round(confidence * 100);
  }
  
  // If confidence is already a percentage, just round it
  return Math.round(Math.min(confidence, 100));
}

/**
 * Get confidence color class based on percentage
 */
export function getConfidenceColorClass(confidence: number): string {
  const normalizedConfidence = normalizeConfidence(confidence);
  
  if (normalizedConfidence >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
  if (normalizedConfidence >= 60) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
  return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
}

/**
 * Get confidence description text
 */
export function getConfidenceDescription(confidence: number): string {
  const normalizedConfidence = normalizeConfidence(confidence);
  
  if (normalizedConfidence >= 90) return 'Excellent';
  if (normalizedConfidence >= 80) return 'Good';
  if (normalizedConfidence >= 60) return 'Fair';
  if (normalizedConfidence >= 40) return 'Poor';
  return 'Very Poor';
}

/**
 * Check if confidence is below warning threshold
 */
export function isLowConfidence(confidence: number, threshold: number = 60): boolean {
  return normalizeConfidence(confidence) < threshold;
}