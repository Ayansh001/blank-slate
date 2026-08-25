
export const SUPPORTED_LANGUAGES = [
  'eng', 'spa', 'fra', 'deu', 'ita', 'por', 'rus', 
  'chi_sim', 'jpn', 'kor', 'ara', 'hin', 'tha', 'vie'
] as const;

export const LANGUAGE_NAMES: Record<string, string> = {
  'eng': 'English',
  'spa': 'Spanish',
  'fra': 'French',
  'deu': 'German',
  'ita': 'Italian',
  'por': 'Portuguese',
  'rus': 'Russian',
  'chi_sim': 'Chinese (Simplified)',
  'jpn': 'Japanese',
  'kor': 'Korean',
  'ara': 'Arabic',
  'hin': 'Hindi',
  'tha': 'Thai',
  'vie': 'Vietnamese'
};
