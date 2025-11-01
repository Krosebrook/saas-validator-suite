import { api } from "encore.dev/api";
import db from "../db";
import type { SourceType } from "./types";

interface ListSourcesResponse {
  sources: Array<{
    id: number;
    name: string;
    type: SourceType;
    enabled: boolean;
    lastFetchAt?: string;
  }>;
}

interface UpdateSourceRequest {
  enabled?: boolean;
  config?: Record<string, unknown>;
}

interface UpdateSourceResponse {
  success: boolean;
}

export const listSources = api(
  { method: "GET", path: "/scraper/sources", expose: true },
  async (): Promise<ListSourcesResponse> => {
    const result = await db.query(
      `SELECT id, name, type, enabled, last_fetch_at 
       FROM sources 
       ORDER BY name`
    );

    return {
      sources: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        enabled: row.enabled,
        lastFetchAt: row.last_fetch_at?.toISOString()
      }))
    };
  }
);

interface UpdateSourceParams {
  id: string;
}

export const updateSource = api(
  { method: "PATCH", path: "/scraper/sources/:id", expose: true },
  async ({ id, ...req }: UpdateSourceParams & UpdateSourceRequest): Promise<UpdateSourceResponse> => {
    
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (req.enabled !== undefined) {
      updates.push(`enabled = $${paramCount++}`);
      values.push(req.enabled);
    }

    if (req.config !== undefined) {
      updates.push(`config = $${paramCount++}`);
      values.push(JSON.stringify(req.config));
    }

    if (updates.length === 0) {
      return { success: false };
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    await db.query(
      `UPDATE sources SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      values
    );

    return { success: true };
  }
);
