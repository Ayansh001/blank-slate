
interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

export function validateImageForOCR(file: File): ValidationResult {
  const warnings: string[] = [];

  // Check if file is an image
  if (!file.type.startsWith('image/')) {
    return {
      isValid: false,
      error: 'File must be an image (JPEG, PNG, etc.)'
    };
  }

  // Check file size (max 500MB)
  const maxSize = 500 * 1024 * 1024; // 500MB
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'Image file is too large (maximum 500MB allowed)'
    };
  }

  // Minimum file size check removed for personal project

  // Add warnings for potentially problematic files
  if (file.size > 100 * 1024 * 1024) { // 100MB
    warnings.push('Very large image file may take longer to process');
  }

  // Check supported formats
  const supportedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/bmp',
    'image/tiff',
    'image/webp'
  ];

  if (!supportedTypes.includes(file.type.toLowerCase())) {
    warnings.push(`${file.type} format may not be optimal for OCR. JPEG or PNG recommended.`);
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

export function validateBatchFiles(files: File[]): ValidationResult {
  if (files.length === 0) {
    return {
      isValid: false,
      error: 'No files selected for batch processing'
    };
  }

  if (files.length > 50) {
    return {
      isValid: false,
      error: 'Maximum 50 files allowed for batch processing'
    };
  }

  const warnings: string[] = [];
  let totalSize = 0;

  for (const file of files) {
    const validation = validateImageForOCR(file);
    if (!validation.isValid) {
      return {
        isValid: false,
        error: `File "${file.name}": ${validation.error}`
      };
    }
    
    if (validation.warnings) {
      warnings.push(...validation.warnings.map(w => `${file.name}: ${w}`));
    }

    totalSize += file.size;
  }

  // Check total batch size
  const maxBatchSize = 2000 * 1024 * 1024; // 2GB total
  if (totalSize > maxBatchSize) {
    return {
      isValid: false,
      error: 'Total batch size exceeds 2GB limit'
    };
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}
