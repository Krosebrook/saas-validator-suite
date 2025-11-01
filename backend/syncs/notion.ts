import { api } from "encore.dev/api";
import db from "../db";

interface NotionPushRequest {
  userId: number;
  ideaIds?: number[];
}

interface NotionPushResponse {
  synced: number;
  errors: string[];
}

interface NotionPullRequest {
  userId: number;
}

interface NotionPullResponse {
  synced: number;
  errors: string[];
}

export const pushToNotion = api(
  { method: "POST", path: "/syncs/notion/push", expose: true },
  async (req: NotionPushRequest): Promise<NotionPushResponse> => {

    const connResult = await db.query(
      `SELECT * FROM notion_conns WHERE user_id = $1 AND sync_enabled = true`,
      [req.userId]
    );

    if (connResult.rows.length === 0) {
      throw new Error('Notion connection not configured');
    }

    const conn = connResult.rows[0];

    const ideasQuery = req.ideaIds && req.ideaIds.length > 0
      ? `SELECT * FROM ideas WHERE id = ANY($1) AND owner_id = $2`
      : `SELECT * FROM ideas WHERE owner_id = $1 LIMIT 50`;

    const ideasParams = req.ideaIds && req.ideaIds.length > 0
      ? [req.ideaIds, req.userId]
      : [req.userId];

    const ideasResult = await db.query(ideasQuery, ideasParams);

    const errors: string[] = [];
    let synced = 0;

    for (const idea of ideasResult.rows) {
      try {
        await pushIdeaToNotion(conn, idea);
        synced++;
      } catch (error: any) {
        errors.push(`Failed to sync idea ${idea.id}: ${error.message}`);
      }
    }

    await db.query(
      `INSERT INTO notion_sync_log (user_id, direction, ideas_synced, errors)
       VALUES ($1, 'push', $2, $3)`,
      [req.userId, synced, JSON.stringify(errors)]
    );

    await db.query(
      `UPDATE notion_conns SET last_sync = NOW() WHERE user_id = $1`,
      [req.userId]
    );

    return { synced, errors };
  }
);

export const pullFromNotion = api(
  { method: "POST", path: "/syncs/notion/pull", expose: true },
  async (req: NotionPullRequest): Promise<NotionPullResponse> => {

    const connResult = await db.query(
      `SELECT * FROM notion_conns WHERE user_id = $1 AND sync_enabled = true`,
      [req.userId]
    );

    if (connResult.rows.length === 0) {
      throw new Error('Notion connection not configured');
    }

    const conn = connResult.rows[0];

    const errors: string[] = [];
    let synced = 0;

    await db.query(
      `INSERT INTO notion_sync_log (user_id, direction, ideas_synced, errors)
       VALUES ($1, 'pull', $2, $3)`,
      [req.userId, synced, JSON.stringify(errors)]
    );

    await db.query(
      `UPDATE notion_conns SET last_sync = NOW() WHERE user_id = $1`,
      [req.userId]
    );

    return { synced, errors };
  }
);

async function pushIdeaToNotion(conn: any, idea: any): Promise<void> {
  console.log(`Syncing idea ${idea.id} to Notion database ${conn.database_id}`);
}
