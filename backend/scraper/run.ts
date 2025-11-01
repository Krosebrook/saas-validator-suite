import { api } from "encore.dev/api";
import db from "../db";
import { RSSAdapter } from "./adapters/rss";
import { APIAdapter } from "./adapters/api";
import { HTMLAdapter } from "./adapters/html";
import type { Source, SourceType } from "./types";
import { BaseAdapter } from "./adapters/base";
import { Topic } from "encore.dev/pubsub";

interface RunRequest {
  source?: string;
}

interface RunResponse {
  sourcesProcessed: number;
  itemsFound: number;
  itemsNormalized: number;
}

interface ItemNormalizedEvent {
  itemId: number;
  title: string;
  url: string;
}

export const ItemNormalized = new Topic<ItemNormalizedEvent>("scraper.item.normalized", {
  deliveryGuarantee: "at-least-once",
});

export const run = api(
  { method: "POST", path: "/scraper/run", expose: true },
  async (req: RunRequest): Promise<RunResponse> => {
    
    const sourcesQuery = req.source
      ? `SELECT * FROM sources WHERE name = $1 AND enabled = true`
      : `SELECT * FROM sources WHERE enabled = true`;
    
    const params = req.source ? [req.source] : [];
    const sourcesResult = await db.query(sourcesQuery, params);
    
    const sources = sourcesResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type as SourceType,
      config: row.config,
      enabled: row.enabled,
      lastFetchAt: row.last_fetch_at,
      etag: row.etag,
      lastModified: row.last_modified
    }));

    let totalItemsFound = 0;
    let totalItemsNormalized = 0;

    for (const source of sources) {
      try {
        const adapter = createAdapter(source);
        const items = await adapter.fetch();
        totalItemsFound += items.length;

        for (const item of items) {
          const hash = adapter['generateHash'](item.url, (item.raw.title as string) || '');
          
          const existingCheck = await db.query(
            `SELECT id FROM raw_items WHERE hash = $1`,
            [hash]
          );

          if (existingCheck.rows.length > 0) {
            continue;
          }

          const insertResult = await db.query(
            `INSERT INTO raw_items (source_id, ext_id, url, raw, hash, normalized)
             VALUES ($1, $2, $3, $4, $5, false)
             RETURNING id`,
            [source.id, item.extId, item.url, JSON.stringify(item.raw), hash]
          );

          const rawItemId = insertResult.rows[0].id;

          const normalized = adapter.normalize(item.raw);
          
          await db.query(
            `UPDATE raw_items SET normalized = true WHERE id = $1`,
            [rawItemId]
          );

          await ItemNormalized.publish({
            itemId: rawItemId,
            title: normalized.title,
            url: normalized.url
          });

          totalItemsNormalized++;
        }

        await db.query(
          `UPDATE sources SET last_fetch_at = NOW() WHERE id = $1`,
          [source.id]
        );
      } catch (error) {
        console.error(`Error processing source ${source.name}:`, error);
      }
    }

    return {
      sourcesProcessed: sources.length,
      itemsFound: totalItemsFound,
      itemsNormalized: totalItemsNormalized
    };
  }
);

function createAdapter(source: Source): BaseAdapter {
  switch (source.type) {
    case 'rss':
      return new RSSAdapter(source);
    case 'api':
      return new APIAdapter(source);
    case 'html':
      return new HTMLAdapter(source);
    default:
      throw new Error(`Unknown source type: ${source.type}`);
  }
}
