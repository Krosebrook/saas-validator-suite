export interface EmbeddingResult {
  vector: number[];
  model: string;
}

export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  const cleanText = text.substring(0, 8000);

  const vector = simpleHash(cleanText);

  return {
    vector,
    model: 'simple-hash-v1'
  };
}

function simpleHash(text: string): number[] {
  const vector = new Array(1536).fill(0);
  
  const chars = text.split('');
  chars.forEach((char, idx) => {
    const code = char.charCodeAt(0);
    const pos = (code + idx) % 1536;
    vector[pos] += (code % 100) / 100;
  });

  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  
  return magnitude > 0 ? vector.map(v => v / magnitude) : vector;
}
