import { BaseAdapter } from "./base";
import type { NormalizedItem } from "../types";

export class RSSAdapter extends BaseAdapter {
  async fetch(): Promise<Array<{ extId: string; url: string; raw: Record<string, unknown> }>> {
    const feedUrl = this.source.config.url as string;
    if (!feedUrl) {
      throw new Error("RSS feed URL not configured");
    }

    return this.retryWithBackoff(async () => {
      const headers: Record<string, string> = {};
      if (this.source.etag) {
        headers['If-None-Match'] = this.source.etag;
      }
      if (this.source.lastModified) {
        headers['If-Modified-Since'] = this.source.lastModified;
      }

      const response = await fetch(feedUrl, { headers });

      if (response.status === 304) {
        return [];
      }

      const xml = await response.text();
      const items = this.parseRSS(xml);

      return items.map((item, idx) => ({
        extId: item.guid || item.link || `${this.source.id}-${idx}`,
        url: item.link || '',
        raw: item
      }));
    });
  }

  private parseRSS(xml: string): any[] {
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
    const items: any[] = [];

    for (const match of itemMatches) {
      const itemXml = match[1];
      const item: any = {};

      const extractTag = (tag: string): string | undefined => {
        const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
        const tagMatch = itemXml.match(regex);
        return tagMatch ? tagMatch[1].trim() : undefined;
      };

      item.title = extractTag('title');
      item.link = extractTag('link');
      item.description = extractTag('description');
      item.guid = extractTag('guid');
      item.pubDate = extractTag('pubDate');
      item.author = extractTag('author') || extractTag('dc:creator');

      items.push(item);
    }

    return items;
  }

  normalize(raw: Record<string, unknown>): NormalizedItem {
    const title = (raw.title as string) || '';
    const url = (raw.link as string) || '';
    const summary = (raw.description as string) || '';
    const author = (raw.author as string);
    const postedAt = raw.pubDate ? new Date(raw.pubDate as string) : undefined;

    const tags: string[] = [];
    if (raw.category) {
      if (Array.isArray(raw.category)) {
        tags.push(...raw.category.map(c => String(c)));
      } else {
        tags.push(String(raw.category));
      }
    }

    return {
      title,
      summary,
      url,
      author,
      postedAt,
      tags
    };
  }
}
