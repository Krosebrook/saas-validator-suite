export interface EntitiesResult {
  entities: Array<{ text: string; type: string }>;
}

const ENTITY_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  url: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g,
  money: /\$\d+(?:,\d{3})*(?:\.\d{2})?|\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:USD|EUR|GBP)/gi,
  percentage: /\d+(?:\.\d+)?%/g
};

export function extractEntities(text: string): EntitiesResult {
  const entities: Array<{ text: string; type: string }> = [];

  for (const [type, pattern] of Object.entries(ENTITY_PATTERNS)) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      entities.push({ text: match[0], type });
    }
  }

  const capitalized = text.matchAll(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g);
  for (const match of capitalized) {
    if (match[0].split(/\s+/).length <= 4) {
      entities.push({ text: match[0], type: 'proper_noun' });
    }
  }

  return { entities: entities.slice(0, 50) };
}
