
// Storage limit constants to ensure consistency across all components
export const AI_HISTORY_LIMIT_BYTES = 512 * 1024 * 1024; // 0.5GB for AI History data
export const FILE_STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024; // 1GB for file storage

// Helper function to format bytes
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
}

// Helper function to get storage limit labels
export const STORAGE_LABELS = {
  AI_HISTORY: '0.5GB',
  FILE_STORAGE: '1GB'
} as const;
