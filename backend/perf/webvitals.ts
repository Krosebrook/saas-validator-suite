import { api } from "encore.dev/api";
import db from "../db";

interface WebVitalsRequest {
  metrics: Array<{
    name: 'CLS' | 'LCP' | 'INP' | 'TTFB' | 'FID';
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    route: string;
    device?: string;
  }>;
  userId?: string;
}

interface WebVitalsResponse {
  recorded: number;
}

export const recordWebVitals = api(
  { method: "POST", path: "/perf/webvitals", expose: true },
  async (req: WebVitalsRequest): Promise<WebVitalsResponse> => {

    for (const metric of req.metrics) {
      await db.query(
        `INSERT INTO analytics_events (user_id, event_type, event_data)
         VALUES ($1, 'web_vital', $2)`,
        [
          req.userId ? parseInt(req.userId) : null,
          JSON.stringify({
            name: metric.name,
            value: metric.value,
            rating: metric.rating,
            route: metric.route,
            device: metric.device || 'unknown'
          })
        ]
      );
    }

    return { recorded: req.metrics.length };
  }
);
