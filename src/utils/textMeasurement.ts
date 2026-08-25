/**
 * Text measurement utilities for dynamic sizing
 */

export interface TextDimensions {
  width: number;
  height: number;
}

export function measureText(
  text: string, 
  fontSize: number = 12, 
  fontFamily: string = 'Arial, sans-serif',
  fontWeight: string = 'normal'
): TextDimensions {
  // Create a temporary canvas to measure text
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) {
    // Fallback calculation
    return {
      width: text.length * fontSize * 0.6,
      height: fontSize * 1.2
    };
  }
  
  context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  const metrics = context.measureText(text);
  
  return {
    width: metrics.width,
    height: fontSize * 1.2 // Approximate height based on font size
  };
}

export function calculateOptimalTextWidth(
  text: string,
  maxWidth: number = 200,
  minWidth: number = 80,
  fontSize: number = 12
): number {
  const measured = measureText(text, fontSize);
  
  // Add padding
  const paddedWidth = measured.width + 20;
  
  // Constrain to bounds
  return Math.max(minWidth, Math.min(maxWidth, paddedWidth));
}

export function truncateText(text: string, maxWidth: number, fontSize: number = 12): string {
  const charWidth = fontSize * 0.6; // Approximate character width
  const maxChars = Math.floor((maxWidth - 20) / charWidth); // Account for padding
  
  if (text.length <= maxChars) {
    return text;
  }
  
  return text.substring(0, maxChars - 3) + '...';
}