import { api } from "encore.dev/api";
import db from "../db";

interface OnePagerParams {
  ideaId: string;
}

interface OnePagerResponse {
  exportId: number;
  status: string;
}

interface GetExportParams {
  exportId: string;
}

interface GetExportResponse {
  id: number;
  status: string;
  artifactUrl?: string;
  errorMessage?: string;
}

export const createOnePager = api(
  { method: "POST", path: "/compose/onepager/:ideaId", expose: true },
  async ({ ideaId }: OnePagerParams): Promise<OnePagerResponse> => {

    const ideaResult = await db.query(
      `SELECT i.*, iv.dims, iv.overall, iv.rationale
       FROM ideas i
       LEFT JOIN idea_validation iv ON i.id = iv.idea_id
       WHERE i.id = $1`,
      [ideaId]
    );

    if (ideaResult.rows.length === 0) {
      throw new Error('Idea not found');
    }

    const idea = ideaResult.rows[0];

    const userResult = await db.query(
      `SELECT id FROM users WHERE id = $1`,
      [idea.user_id || idea.owner_id]
    );

    const userId = userResult.rows[0]?.id;

    const exportResult = await db.query(
      `INSERT INTO exports (idea_id, user_id, type, status)
       VALUES ($1, $2, 'onepager', 'processing')
       RETURNING id`,
      [ideaId, userId]
    );

    const exportId = exportResult.rows[0].id;

    generatePDF(exportId, idea).catch(async (error) => {
      await db.query(
        `UPDATE exports SET status = 'failed', error_message = $1, completed_at = NOW() WHERE id = $2`,
        [error.message, exportId]
      );
    });

    return { exportId, status: 'processing' };
  }
);

export const getExport = api(
  { method: "GET", path: "/compose/exports/:exportId", expose: true },
  async ({ exportId }: GetExportParams): Promise<GetExportResponse> => {

    const result = await db.query(
      `SELECT id, status, artifact_url, error_message FROM exports WHERE id = $1`,
      [exportId]
    );

    if (result.rows.length === 0) {
      throw new Error('Export not found');
    }

    const exp = result.rows[0];
    return {
      id: exp.id,
      status: exp.status,
      artifactUrl: exp.artifact_url,
      errorMessage: exp.error_message
    };
  }
);

async function generatePDF(exportId: number, idea: any): Promise<void> {

  const html = generateHTML(idea);

  const artifactUrl = `/exports/${exportId}.pdf`;

  await db.query(
    `UPDATE exports SET status = 'completed', artifact_url = $1, completed_at = NOW() WHERE id = $2`,
    [artifactUrl, exportId]
  );
}

function generateHTML(idea: any): string {
  const title = idea.title || 'Untitled Idea';
  const description = idea.description || 'No description provided';
  const score = idea.overall || idea.score || 0;
  const dims = idea.dims || {};

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title} - One Pager</title>
      <style>
        body { font-family: sans-serif; margin: 40px; }
        h1 { color: #333; }
        .score { font-size: 48px; font-weight: bold; color: #4CAF50; }
        .dimensions { margin-top: 30px; }
        .dim { margin: 10px 0; }
        .dim-label { font-weight: bold; }
        .dim-bar { display: inline-block; height: 20px; background: #4CAF50; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p>${description}</p>
      <div class="score">Score: ${score.toFixed(1)}/100</div>
      <div class="dimensions">
        <h2>Validation Dimensions</h2>
        ${Object.entries(dims).map(([key, value]) => `
          <div class="dim">
            <span class="dim-label">${key.replace(/_/g, ' ')}:</span>
            <div class="dim-bar" style="width: ${value}%"></div>
            <span>${value}</span>
          </div>
        `).join('')}
      </div>
    </body>
    </html>
  `;
}
