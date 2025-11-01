import { api } from "encore.dev/api";
import * as cron from "encore.dev/cron";
import db from "../db";

interface CreateDigestRequest {
  userId: number;
  schedule?: string;
}

interface CreateDigestResponse {
  digestId: number;
}

interface RunDigestParams {
  digestId: string;
}

interface RunDigestResponse {
  runId: number;
  status: string;
}

export const createDigest = api(
  { method: "POST", path: "/digests", expose: true },
  async (req: CreateDigestRequest): Promise<CreateDigestResponse> => {

    const result = await db.query(
      `INSERT INTO digests (user_id, schedule, enabled)
       VALUES ($1, $2, true)
       RETURNING id`,
      [req.userId, req.schedule || 'weekly']
    );

    return { digestId: result.rows[0].id };
  }
);

export const runDigest = api(
  { method: "POST", path: "/digests/:digestId/run", expose: true },
  async ({ digestId }: RunDigestParams): Promise<RunDigestResponse> => {

    const digestResult = await db.query(
      `SELECT * FROM digests WHERE id = $1`,
      [digestId]
    );

    if (digestResult.rows.length === 0) {
      throw new Error('Digest not found');
    }

    const digest = digestResult.rows[0];

    const runResult = await db.query(
      `INSERT INTO digest_runs (digest_id, status)
       VALUES ($1, 'processing')
       RETURNING id`,
      [digestId]
    );

    const runId = runResult.rows[0].id;

    processDigest(runId, digest).catch(async (error) => {
      await db.query(
        `UPDATE digest_runs SET status = 'failed', logs = $1, completed_at = NOW() WHERE id = $2`,
        [error.message, runId]
      );
    });

    return { runId, status: 'processing' };
  }
);

export const weeklyDigest = cron.job(
  { id: "weekly-digest", schedule: "0 9 * * 1" },
  async () => {
    const digests = await db.query(
      `SELECT * FROM digests WHERE enabled = true AND schedule = 'weekly'`
    );

    for (const digest of digests.rows) {
      await runDigest({ digestId: digest.id.toString() });
    }
  }
);

export const ping = api({ method: "GET", path: "/digests/healthz" }, async () => ({ ok: true }));

async function processDigest(runId: number, digest: any): Promise<void> {

  const topIdeas = await db.query(
    `SELECT * FROM ideas 
     WHERE owner_id = $1 
     ORDER BY score DESC NULLS LAST, created_at DESC 
     LIMIT 5`,
    [digest.user_id]
  );

  const userResult = await db.query(
    `SELECT email, name FROM users WHERE id = $1`,
    [digest.user_id]
  );

  const user = userResult.rows[0];

  const emailContent = `
    Hi ${user.name || 'there'},
    
    Here are your top ideas this week:
    
    ${topIdeas.rows.map((idea, i) => `
    ${i + 1}. ${idea.title} (Score: ${idea.score || 'N/A'})
    `).join('\n')}
    
    Keep building!
  `;

  console.log(`Sending digest to ${user.email}:`, emailContent);

  await db.query(
    `UPDATE digest_runs SET status = 'sent', sent_count = $1, completed_at = NOW() WHERE id = $2`,
    [topIdeas.rows.length, runId]
  );

  await db.query(
    `UPDATE digests SET last_run = NOW() WHERE id = $1`,
    [digest.id]
  );
}
