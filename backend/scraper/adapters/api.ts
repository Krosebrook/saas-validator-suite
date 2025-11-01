import { BaseAdapter } from "./base";
import type { NormalizedItem } from "../types";

export class APIAdapter extends BaseAdapter {
  async fetch(): Promise<Array<{ extId: string; url: string; raw: Record<string, unknown> }>> {
    const apiUrl = this.source.config.url as string;
    const apiKey = this.source.config.apiKey as string | undefined;
    const idField = this.source.config.idField as string || 'id';
    const urlField = this.source.config.urlField as string || 'url';

    if (!apiUrl) {
      throw new Error("API URL not configured");
    }

    return this.retryWithBackoff(async () => {
      const headers: Record<string, string> = {
        'Accept': 'application/json'
      };

      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      if (this.source.etag) {
        headers['If-None-Match'] = this.source.etag;
      }

      const response = await fetch(apiUrl, { headers });

      if (response.status === 304) {
        return [];
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const items = Array.isArray(data) ? data : (data.items || data.data || []);

      return items.map((item: any) => ({
        extId: String(item[idField] || item.id || ''),
        url: String(item[urlField] || item.url || ''),
        raw: item
      }));
    });
  }

  normalize(raw: Record<string, unknown>): NormalizedItem {
    const titleField = this.source.config.titleField as string || 'title';
    const summaryField = this.source.config.summaryField as string || 'summary';
    const urlField = this.source.config.urlField as string || 'url';
    const authorField = this.source.config.authorField as string || 'author';
    const dateField = this.source.config.dateField as string || 'createdAt';
    const tagsField = this.source.config.tagsField as string || 'tags';

    const title = (raw[titleField] as string) || '';
    const url = (raw[urlField] as string) || '';
    const summary = (raw[summaryField] as string);
    const author = (raw[authorField] as string);
    const postedAt = raw[dateField] ? new Date(raw[dateField] as string) : undefined;

    let tags: string[] = [];
    if (raw[tagsField]) {
      tags = Array.isArray(raw[tagsField]) 
        ? (raw[tagsField] as string[]) 
        : [String(raw[tagsField])];
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
