import { BaseAdapter } from "./base";
import type { NormalizedItem } from "../types";

export class HTMLAdapter extends BaseAdapter {
  async fetch(): Promise<Array<{ extId: string; url: string; raw: Record<string, unknown> }>> {
    const pageUrl = this.source.config.url as string;
    const selectors = this.source.config.selectors as Record<string, string> || {};

    if (!pageUrl) {
      throw new Error("HTML page URL not configured");
    }

    return this.retryWithBackoff(async () => {
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (compatible; IdeaScraperBot/1.0)'
      };

      if (this.source.etag) {
        headers['If-None-Match'] = this.source.etag;
      }

      const response = await fetch(pageUrl, { headers });

      if (response.status === 304) {
        return [];
      }

      const html = await response.text();
      const items = this.parseHTML(html, selectors);

      return items.map((item, idx) => ({
        extId: this.generateHash(item.url || pageUrl, item.title || `item-${idx}`),
        url: item.url || pageUrl,
        raw: item
      }));
    });
  }

  private parseHTML(html: string, selectors: Record<string, string>): any[] {
    const containerSelector = selectors.container || 'article';
    const titleSelector = selectors.title || 'h2, h3';
    const linkSelector = selectors.link || 'a';
    const summarySelector = selectors.summary || 'p';

    const containerRegex = new RegExp(`<${containerSelector}[^>]*>([\\s\\S]*?)<\\/${containerSelector}>`, 'gi');
    const items: any[] = [];

    for (const match of html.matchAll(containerRegex)) {
      const containerHtml = match[1];

      const extractFirst = (selector: string, extractHref = false): string | undefined => {
        const tag = selector.split(/[.\[#\s]/)[0];
        const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
        const tagMatch = containerHtml.match(regex);
        if (!tagMatch) return undefined;

        if (extractHref) {
          const hrefMatch = tagMatch[0].match(/href=["']([^"']*)["']/i);
          return hrefMatch ? hrefMatch[1] : undefined;
        }

        return tagMatch[1].replace(/<[^>]+>/g, '').trim();
      };

      const item: any = {
        title: extractFirst(titleSelector),
        url: extractFirst(linkSelector, true),
        summary: extractFirst(summarySelector)
      };

      if (item.title || item.url) {
        items.push(item);
      }
    }

    return items;
  }

  normalize(raw: Record<string, unknown>): NormalizedItem {
    return {
      title: (raw.title as string) || '',
      summary: (raw.summary as string),
      url: (raw.url as string) || '',
      author: (raw.author as string),
      postedAt: raw.postedAt ? new Date(raw.postedAt as string) : undefined,
      tags: (raw.tags as string[]) || []
    };
  }
}
