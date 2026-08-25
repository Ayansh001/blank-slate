
export function validateImageFile(file: File): void {
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  if (file.size > 500 * 1024 * 1024) {
    throw new Error('Image file too large (max 500MB)');
  }
}

export function validateLanguage(language: string): boolean {
  const supportedLanguages = [
    'eng', 'spa', 'fra', 'deu', 'ita', 'por', 'rus', 
    'chi_sim', 'jpn', 'kor', 'ara', 'hin', 'tha', 'vie'
  ];
  return supportedLanguages.includes(language);
}

export function validatePreprocessingOptions(options: any): boolean {
  if (!options || typeof options !== 'object') return true;
  
  const validKeys = ['brightness', 'contrast', 'rotation', 'crop'];
  return Object.keys(options).every(key => validKeys.includes(key));
}
