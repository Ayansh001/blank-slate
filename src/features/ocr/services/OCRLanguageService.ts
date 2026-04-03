
import { SUPPORTED_LANGUAGES, LANGUAGE_NAMES } from '../constants/languages';

export class OCRLanguageService {
  getSupportedLanguages(): string[] {
    return [...SUPPORTED_LANGUAGES];
  }

  getLanguageName(code: string): string {
    return LANGUAGE_NAMES[code] || code;
  }

  isLanguageSupported(code: string): boolean {
    return SUPPORTED_LANGUAGES.includes(code as any);
  }

  getDefaultLanguage(): string {
    return 'eng';
  }
}
