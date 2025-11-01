export interface KeyphrasesResult {
  keyphrases: Array<{ phrase: string; score: number }>;
}

const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it', 
  'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this'
]);

export function extractKeyphrases(text: string): KeyphrasesResult {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !STOP_WORDS.has(w));
  
  const wordFreq: Record<string, number> = {};
  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });

  const sorted = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const maxFreq = sorted[0]?.[1] || 1;
  
  const keyphrases = sorted.map(([phrase, freq]) => ({
    phrase,
    score: freq / maxFreq
  }));

  return { keyphrases };
}
