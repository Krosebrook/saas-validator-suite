export interface LanguageResult {
  language: string;
  confidence: number;
}

const COMMON_WORDS: Record<string, string[]> = {
  en: ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it'],
  es: ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se'],
  fr: ['le', 'de', 'un', 'être', 'et', 'à', 'il', 'avoir', 'ne', 'je'],
  de: ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich']
};

export function detectLanguage(text: string): LanguageResult {
  const words = text.toLowerCase().split(/\s+/).slice(0, 100);
  
  const scores: Record<string, number> = {};
  
  for (const [lang, commonWords] of Object.entries(COMMON_WORDS)) {
    scores[lang] = words.filter(w => commonWords.includes(w)).length;
  }

  const detectedLang = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  
  if (!detectedLang || detectedLang[1] === 0) {
    return { language: 'en', confidence: 0.5 };
  }

  const confidence = Math.min(detectedLang[1] / 10, 1);
  
  return {
    language: detectedLang[0],
    confidence
  };
}
