import type { NormalizedItem, Source } from "../types";

export abstract class BaseAdapter {
  protected source: Source;
  protected baseDelay = 1000;
  protected maxRetries = 3;

  constructor(source: Source) {
    this.source = source;
  }

  abstract fetch(): Promise<Array<{ extId: string; url: string; raw: Record<string, unknown> }>>;

  abstract normalize(raw: Record<string, unknown>): NormalizedItem;

  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected async retryWithBackoff<T>(fn: () => Promise<T>, attempt = 0): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= this.maxRetries) {
        throw error;
      }
      const jitter = Math.random() * 1000;
      const backoff = this.baseDelay * Math.pow(2, attempt) + jitter;
      await this.delay(backoff);
      return this.retryWithBackoff(fn, attempt + 1);
    }
  }

  protected generateHash(url: string, title: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(`${url}|${title}`).digest('hex');
  }
}
