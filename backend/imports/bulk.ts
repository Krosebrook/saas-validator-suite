import { api } from "encore.dev/api";
import db from "../db";

interface CreateImportRequest {
  userId: number;
  filename: string;
  format: 'csv' | 'jsonl';
}

interface CreateImportResponse {
  importId: number;
  uploadUrl: string;
}

interface CommitImportParams {
  importId: string;
}

interface CommitImportBody {
  data: string;
}

interface CommitImportResponse {
  success: boolean;
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: string[];
}

interface GetImportParams {
  importId: string;
}

interface GetImportResponse {
  id: number;
  status: string;
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
}

export const createImport = api(
  { method: "POST", path: "/imports", expose: true },
  async (req: CreateImportRequest): Promise<CreateImportResponse> => {

    const result = await db.query(
      `INSERT INTO imports (user_id, filename, format, status)
       VALUES ($1, $2, $3, 'uploading')
       RETURNING id`,
      [req.userId, req.filename, req.format]
    );

    const importId = result.rows[0].id;
    const uploadUrl = `/imports/${importId}/upload`;

    return { importId, uploadUrl };
  }
);

export const commitImport = api(
  { method: "POST", path: "/imports/:importId/commit", expose: true },
  async ({ importId, ...req }: CommitImportParams & CommitImportBody): Promise<CommitImportResponse> => {

    const importResult = await db.query(
      `SELECT * FROM imports WHERE id = $1`,
      [importId]
    );

    if (importResult.rows.length === 0) {
      throw new Error('Import not found');
    }

    const importRecord = importResult.rows[0];

    await db.query(
      `UPDATE imports SET status = 'processing' WHERE id = $1`,
      [importId]
    );

    const lines = req.data.trim().split('\n');
    const errors: string[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < lines.length; i++) {
      try {
        const line = lines[i].trim();
        if (!line) continue;

        let data: any;
        if (importRecord.format === 'jsonl') {
          data = JSON.parse(line);
        } else {
          const parts = line.split(',');
          data = {
            title: parts[0]?.trim(),
            description: parts[1]?.trim(),
            url: parts[2]?.trim()
          };
        }

        if (!data.title) {
          throw new Error('Title is required');
        }

        const titleHash = hashTitle(data.title);

        await db.query(
          `INSERT INTO ideas (owner_id, title, description, source_url, title_hash, status)
           VALUES ($1, $2, $3, $4, $5, 'pending')
           ON CONFLICT (title_hash, owner_id) DO NOTHING`,
          [importRecord.user_id, data.title, data.description, data.url, titleHash]
        );

        successCount++;
      } catch (error: any) {
        errorCount++;
        errors.push(`Line ${i + 1}: ${error.message}`);
      }
    }

    await db.query(
      `UPDATE imports 
       SET status = 'completed', total_rows = $1, processed_rows = $2, 
           success_count = $3, error_count = $4, errors = $5, completed_at = NOW()
       WHERE id = $6`,
      [lines.length, lines.length, successCount, errorCount, JSON.stringify(errors.slice(0, 100)), importId]
    );

    return {
      success: true,
      totalRows: lines.length,
      successCount,
      errorCount,
      errors: errors.slice(0, 10)
    };
  }
);

export const getImport = api(
  { method: "GET", path: "/imports/:importId", expose: true },
  async ({ importId }: GetImportParams): Promise<GetImportResponse> => {

    const result = await db.query(
      `SELECT * FROM imports WHERE id = $1`,
      [importId]
    );

    if (result.rows.length === 0) {
      throw new Error('Import not found');
    }

    const imp = result.rows[0];
    return {
      id: imp.id,
      status: imp.status,
      totalRows: imp.total_rows,
      processedRows: imp.processed_rows,
      successCount: imp.success_count,
      errorCount: imp.error_count
    };
  }
);

function hashTitle(title: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(title.toLowerCase().trim()).digest('hex');
}
