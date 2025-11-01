export type SourceType = 'rss' | 'api' | 'html';

export interface Source {
  id: number;
  name: string;
  type: SourceType;
  config: Record<string, unknown>;
  enabled: boolean;
  lastFetchAt?: Date;
  etag?: string;
  lastModified?: string;
}

export interface RawItem {
  id: number;
  sourceId: number;
  extId: string;
  url: string;
  fetchedAt: Date;
  raw: Record<string, unknown>;
  hash: string;
  normalized: boolean;
}

export interface NormalizedItem {
  title: string;
  summary?: string;
  url: string;
  author?: string;
  postedAt?: Date;
  tags: string[];
}
