import { api } from "encore.dev/api";
import db from "../db";

interface CompareRequest {
  ideaIds: number[];
  metrics?: string[];
}

interface CompareResponse {
  ideas: Array<{
    id: number;
    title: string;
    metrics: Record<string, any>;
  }>;
  deltas: Record<string, any>;
}

export const compare = api(
  { method: "POST", path: "/compare/ideas", expose: true },
  async (req: CompareRequest): Promise<CompareResponse> => {

    if (req.ideaIds.length === 0) {
      throw new Error('No idea IDs provided');
    }

    const placeholders = req.ideaIds.map((_, i) => `$${i + 1}`).join(',');
    
    const result = await db.query(
      `SELECT * FROM idea_comparison_metrics WHERE id IN (${placeholders})`,
      req.ideaIds
    );

    const ideas = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      metrics: {
        score: row.score,
        validationScore: row.validation_score,
        overallScore: row.overall_score,
        marketPotential: row.market_potential,
        competitionLevel: row.competition_level,
        technicalFeasibility: row.technical_feasibility,
        monetizationPotential: row.monetization_potential,
        startupViability: row.startup_viability,
        marketVerdict: row.market_verdict,
        competitiveVerdict: row.competitive_verdict,
        tagCount: row.tag_count,
        exportCount: row.export_count
      }
    }));

    const deltas: Record<string, any> = {};
    
    if (ideas.length >= 2) {
      const metrics = ['score', 'validationScore', 'overallScore', 'marketPotential'];
      
      for (const metric of metrics) {
        const values = ideas.map(i => i.metrics[metric] || 0);
        const max = Math.max(...values);
        const min = Math.min(...values);
        const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
        
        deltas[metric] = { max, min, avg, range: max - min };
      }
    }

    return { ideas, deltas };
  }
);
