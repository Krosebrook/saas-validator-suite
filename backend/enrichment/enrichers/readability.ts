export interface ReadabilityResult {
  content?: string;
  excerpt?: string;
  wordCount: number;
  readingTime: number;
}

export async function enrichWithReadability(url: string): Promise<ReadabilityResult> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EnrichmentBot/1.0)'
      }
    });

    if (!response.ok) {
      return { wordCount: 0, readingTime: 0 };
    }

    const html = await response.text();
    
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyHtml = bodyMatch ? bodyMatch[1] : html;
    
    const content = bodyHtml
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = content.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    const readingTime = Math.ceil(wordCount / 200);

    const excerpt = content.substring(0, 500);

    return {
      content,
      excerpt,
      wordCount,
      readingTime
    };
  } catch (error) {
    console.error('Readability enrichment error:', error);
    return { wordCount: 0, readingTime: 0 };
  }
}
