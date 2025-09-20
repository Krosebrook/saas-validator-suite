import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

interface GetIdeaRequest {
  id: number;
}

interface IdeaDetail {
  id: number;
  title: string;
  description?: string;
  source: string;
  source_url?: string;
  status: string;
  raw_data?: any;
  enrichment_data?: any;
  created_at: Date;
  score?: {
    overall_score?: number;
    market_potential?: number;
    competition_level?: number;
    technical_feasibility?: number;
    monetization_potential?: number;
    compliance_score?: number;
    ai_analysis?: string;
  };
  cost_estimate?: {
    infrastructure_cost?: number;
    development_cost?: number;
    operational_cost?: number;
    projected_revenue?: number;
    roi_estimate?: number;
    break_even_months?: number;
  };
}

// Gets detailed information about a specific idea
export const get = api<GetIdeaRequest, IdeaDetail>(
  { auth: true, expose: true, method: "GET", path: "/ideas/:id" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Get user ID
    const user = await db.queryRow`
      SELECT id FROM users WHERE clerk_id = ${auth.userID}
    `;
    
    if (!user) {
      throw new Error("User not found");
    }

    const idea = await db.queryRow`
      SELECT * FROM ideas 
      WHERE id = ${req.id} AND user_id = ${user.id}
    `;

    if (!idea) {
      throw APIError.notFound("Idea not found");
    }

    // Get score data
    const score = await db.queryRow`
      SELECT * FROM scores WHERE idea_id = ${req.id}
    `;

    // Get cost estimate
    const costEstimate = await db.queryRow`
      SELECT * FROM cost_estimates WHERE idea_id = ${req.id}
    `;

    const result: IdeaDetail = {
      id: idea.id,
      title: idea.title,
      description: idea.description,
      source: idea.source,
      source_url: idea.source_url,
      status: idea.status,
      raw_data: idea.raw_data,
      enrichment_data: idea.enrichment_data,
      created_at: idea.created_at,
    };

    if (score) {
      result.score = {
        overall_score: score.overall_score,
        market_potential: score.market_potential,
        competition_level: score.competition_level,
        technical_feasibility: score.technical_feasibility,
        monetization_potential: score.monetization_potential,
        compliance_score: score.compliance_score,
        ai_analysis: score.ai_analysis,
      };
    }

    if (costEstimate) {
      result.cost_estimate = {
        infrastructure_cost: costEstimate.infrastructure_cost,
        development_cost: costEstimate.development_cost,
        operational_cost: costEstimate.operational_cost,
        projected_revenue: costEstimate.projected_revenue,
        roi_estimate: costEstimate.roi_estimate,
        break_even_months: costEstimate.break_even_months,
      };
    }

    return result;
  }
);
