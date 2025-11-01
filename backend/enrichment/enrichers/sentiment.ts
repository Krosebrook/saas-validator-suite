export interface SentimentResult {
  score: number;
  label: 'positive' | 'neutral' | 'negative';
}

const POSITIVE_WORDS = new Set([
  'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'awesome',
  'best', 'love', 'perfect', 'beautiful', 'brilliant', 'outstanding', 'superb'
]);

const NEGATIVE_WORDS = new Set([
  'bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'poor', 'disappointing',
  'useless', 'waste', 'annoying', 'frustrating', 'difficult', 'problem'
]);

export function analyzeSentiment(text: string): SentimentResult {
  const words = text.toLowerCase().split(/\s+/);
  
  let score = 0;
  
  words.forEach(word => {
    if (POSITIVE_WORDS.has(word)) score += 1;
    if (NEGATIVE_WORDS.has(word)) score -= 1;
  });

  const normalizedScore = Math.max(-1, Math.min(1, score / Math.max(words.length / 10, 1)));

  let label: 'positive' | 'neutral' | 'negative';
  if (normalizedScore > 0.1) {
    label = 'positive';
  } else if (normalizedScore < -0.1) {
    label = 'negative';
  } else {
    label = 'neutral';
  }

  return { score: normalizedScore, label };
}
