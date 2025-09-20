import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { Query } from "encore.dev/api";
import db from "../db";

interface ListIdeasRequest {
  limit?: Query<number>;
  offset?: Query<number>;
  status?: Query<string>;
}

interface IdeaWithScore {
  id: number;
  title: string;
  description?: string;
  source: string;
  status: string;
  overall_score?: number;
  created_at: Date;
}

interface ListIdeasResponse {
  ideas: IdeaWithScore[];
  total: number;
}

// Lists ideas for the authenticated user
export const list = api<ListIdeasRequest, ListIdeasResponse>(
  { auth: true, expose: true, method: "GET", path: "/ideas" },
  async (req) => {
    const auth = getAuthData()!;
    const limit = req.limit || 20;
    const offset = req.offset || 0;
    
    // Get user ID
    const user = await db.queryRow`
      SELECT id FROM users WHERE clerk_id = ${auth.userID}
    `;
    
    if (!user) {
      throw new Error("User not found");
    }

    let whereClause = "WHERE i.user_id = $1";
    const params: any[] = [user.id];
    
    if (req.status) {
      whereClause += " AND i.status = $" + (params.length + 1);
      params.push(req.status);
    }

    const ideas = await db.rawQueryAll<IdeaWithScore>(`
      SELECT 
        i.id,
        i.title,
        i.description,
        i.source,
        i.status,
        s.overall_score,
        i.created_at
      FROM ideas i
      LEFT JOIN scores s ON i.id = s.idea_id
      ${whereClause}
      ORDER BY i.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, ...params, limit, offset);

    const totalResult = await db.rawQueryRow<{ count: number }>(
      `SELECT COUNT(*) as count FROM ideas i ${whereClause}`,
      ...params
    );

    return {
      ideas,
      total: totalResult?.count || 0
    };
  }
);
