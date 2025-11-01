import { api } from "encore.dev/api";
import db from "../db";

interface ScoreRequest {
  ideaId: number;
  dimensions: Record<string, number>;
}

interface ScoreResponse {
  dims: Record<string, number>;
  overall: number;
  rationale: string;
}

export const score = api(
  { method: "POST", path: "/validation/score", expose: true },
  async (req: ScoreRequest): Promise<ScoreResponse> => {

    const dimensionsResult = await db.query(
      `SELECT key, weight FROM validation_dimensions WHERE enabled = true`
    );

    const configuredDims: Record<string, number> = {};
    let totalWeight = 0;

    for (const row of dimensionsResult.rows) {
      configuredDims[row.key] = row.weight;
      totalWeight += row.weight;
    }

    if (totalWeight !== 100) {
      throw new Error(`Dimension weights must sum to 100, got ${totalWeight}`);
    }

    const dims = { ...configuredDims };
    for (const [key, value] of Object.entries(req.dimensions)) {
      if (key in configuredDims) {
        dims[key] = Math.max(0, Math.min(100, value));
      }
    }

    let overall = 0;
    for (const [key, score] of Object.entries(dims)) {
      const weight = configuredDims[key] || 0;
      overall += (score * weight) / 100;
    }

    const rationale = generateRationale(dims, overall);

    await db.query(
      `INSERT INTO idea_validation (idea_id, dims, overall, rationale, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (idea_id) 
       DO UPDATE SET dims = $2, overall = $3, rationale = $4, updated_at = NOW()`,
      [req.ideaId, JSON.stringify(dims), overall, rationale]
    );

    await db.query(
      `UPDATE ideas SET score = $1 WHERE id = $2`,
      [overall, req.ideaId]
    );

    return { dims, overall, rationale };
  }
);

function generateRationale(dims: Record<string, number>, overall: number): string {
  const parts: string[] = [];

  if (overall >= 75) {
    parts.push('This idea shows strong potential across multiple dimensions.');
  } else if (overall >= 50) {
    parts.push('This idea has moderate potential with some areas for improvement.');
  } else {
    parts.push('This idea faces significant challenges that should be addressed.');
  }

  const sorted = Object.entries(dims).sort((a, b) => b[1] - a[1]);
  const top3 = sorted.slice(0, 3).map(([key]) => key.replace(/_/g, ' '));
  const bottom3 = sorted.slice(-3).map(([key]) => key.replace(/_/g, ' '));

  parts.push(`Strongest dimensions: ${top3.join(', ')}.`);
  parts.push(`Areas needing attention: ${bottom3.join(', ')}.`);

  return parts.join(' ');
}
