import { api } from "encore.dev/api";
import db from "../db";

interface RunRequest {
  itemId?: number;
}

interface RunResponse {
  message: string;
  itemsQueued: number;
}

interface GetSignalsRequest {
  ideaId: number;
}

interface GetSignalsResponse {
  signals: Record<string, unknown>;
}

export const run = api(
  { method: "POST", path: "/enrichment/run", expose: true },
  async (req: RunRequest): Promise<RunResponse> => {

    if (req.itemId) {
      const existing = await db.query(
        `SELECT id FROM enrich_jobs WHERE item_id = $1 AND status IN ('queued', 'running')`,
        [req.itemId]
      );

      if (existing.rows.length === 0) {
        await db.query(
          `INSERT INTO enrich_jobs (item_id, status) VALUES ($1, 'queued')`,
          [req.itemId]
        );
      }

      return { message: 'Item queued for enrichment', itemsQueued: 1 };
    }

    const items = await db.query(
      `SELECT id FROM raw_items WHERE normalized = true 
       AND id NOT IN (SELECT item_id FROM enrich_jobs WHERE status IN ('done', 'running'))
       LIMIT 100`
    );

    for (const item of items.rows) {
      await db.query(
        `INSERT INTO enrich_jobs (item_id, status) VALUES ($1, 'queued')`,
        [item.id]
      );
    }

    return { message: 'Items queued for enrichment', itemsQueued: items.rows.length };
  }
);

export const getSignals = api(
  { method: "GET", path: "/enrichment/ideas/:ideaId/signals", expose: true },
  async ({ ideaId }: GetSignalsRequest): Promise<GetSignalsResponse> => {
    const db = getDB();

    const result = await db.query(
      `SELECT signals FROM ideas WHERE id = $1`,
      [ideaId]
    );

    if (result.rows.length === 0) {
      throw new Error('Idea not found');
    }

    return { signals: result.rows[0].signals || {} };
  }
);
