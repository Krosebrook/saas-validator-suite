import { api } from "encore.dev/api";
import db from "../db";

interface LeaderboardRequest {
  period?: 'weekly' | 'all';
}

interface LeaderboardResponse {
  entries: Array<{
    userId: number;
    points: number;
    rank: number;
    userName?: string;
  }>;
}

interface UpdateMetricsRequest {
  userId: number;
  action: 'import' | 'enrich' | 'validate' | 'export';
}

interface UpdateMetricsResponse {
  points: number;
  streakDays: number;
}

const POINTS_CONFIG = {
  import: 5,
  enrich: 3,
  validate: 10,
  export: 7
};

export const getLeaderboard = api(
  { method: "GET", path: "/gamify/leaderboard", expose: true },
  async (req: LeaderboardRequest): Promise<LeaderboardResponse> => {

    let query: string;
    const params: any[] = [];

    if (req.period === 'weekly') {
      query = `
        SELECT l.user_id, l.points, l.rank, u.name as user_name
        FROM leaderboards l
        JOIN users u ON l.user_id = u.id
        WHERE l.snapshot_date >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY l.rank
        LIMIT 100
      `;
    } else {
      query = `
        SELECT um.user_id, um.points, u.name as user_name,
               ROW_NUMBER() OVER (ORDER BY um.points DESC) as rank
        FROM user_metrics um
        JOIN users u ON um.user_id = u.id
        ORDER BY um.points DESC
        LIMIT 100
      `;
    }

    const result = await db.query(query, params);

    return {
      entries: result.rows.map(row => ({
        userId: row.user_id,
        points: row.points,
        rank: row.rank,
        userName: row.user_name
      }))
    };
  }
);

export const updateMetrics = api(
  { method: "POST", path: "/gamify/metrics", expose: true },
  async (req: UpdateMetricsRequest): Promise<UpdateMetricsResponse> => {

    const points = POINTS_CONFIG[req.action] || 0;

    await db.query(
      `INSERT INTO user_metrics (user_id, points, last_activity)
       VALUES ($1, $2, CURRENT_DATE)
       ON CONFLICT (user_id) DO UPDATE SET
         points = user_metrics.points + $2,
         last_activity = CURRENT_DATE,
         total_${req.action}s = COALESCE(user_metrics.total_${req.action}s, 0) + 1,
         updated_at = NOW()`,
      [req.userId, points]
    );

    const streakResult = await db.query(
      `UPDATE user_metrics
       SET streak_days = CASE
         WHEN last_activity = CURRENT_DATE - INTERVAL '1 day' THEN streak_days + 1
         WHEN last_activity < CURRENT_DATE - INTERVAL '1 day' THEN 1
         ELSE streak_days
       END
       WHERE user_id = $1
       RETURNING points, streak_days`,
      [req.userId]
    );

    const row = streakResult.rows[0];
    return {
      points: row.points,
      streakDays: row.streak_days
    };
  }
);
