/**
 * Utility functions for safe file downloads with proper cleanup
 */

export interface DownloadOptions {
  fileName: string;
  content: string;
  mimeType?: string;
}

/**
 * Safely download text content as a file with proper error handling and cleanup
 */
export function downloadTextFile({ fileName, content, mimeType = 'text/plain' }: DownloadOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    let url: string | null = null;
    let anchor: HTMLAnchorElement | null = null;

    try {
      const blob = new Blob([content], { type: mimeType });
      url = URL.createObjectURL(blob);
      
      anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.style.display = 'none';
      
      document.body.appendChild(anchor);
      anchor.click();
      
      resolve();
    } catch (error) {
      console.error('Download failed:', error);
      reject(error instanceof Error ? error : new Error('Download failed'));
    } finally {
      // Cleanup
      if (anchor && document.body.contains(anchor)) {
        document.body.removeChild(anchor);
      }
      if (url) {
        // Use setTimeout to ensure the download has started before revoking
        setTimeout(() => URL.revokeObjectURL(url!), 100);
      }
    }
  });
}

/**
 * Copy text to clipboard with fallback for older browsers
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for older browsers or non-HTTPS contexts
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand('copy');
      } finally {
        document.body.removeChild(textArea);
      }
    }
  } catch (error) {
    console.error('Copy to clipboard failed:', error);
    throw new Error('Failed to copy text to clipboard');
  }
}

/**
 * Generate safe filename from text content or fallback
 */
export function generateSafeFileName(baseName: string, content: string, extension: string = '.txt'): string {
  // Try to extract a meaningful name from the first line of content
  const firstLine = content.split('\n')[0]?.trim();
  
  if (firstLine && firstLine.length > 3 && firstLine.length < 50) {
    // Clean the filename - remove invalid characters
    const cleanName = firstLine.replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, '_');
    return `${cleanName}${extension}`;
  }
  
  // Use the base name with timestamp for uniqueness
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  return `${baseName}_${timestamp}${extension}`;
}