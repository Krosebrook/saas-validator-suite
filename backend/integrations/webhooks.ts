import { api } from "encore.dev/api";
import db from "../db";
import crypto from "crypto";

interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
}

interface WebhookResponse {
  received: boolean;
}

export const zapierWebhook = api(
  { method: "POST", path: "/integrations/webhook/zapier", expose: true },
  async (req: WebhookPayload): Promise<WebhookResponse> => {
    await processWebhook('zapier', req);
    return { received: true };
  }
);

export const n8nWebhook = api(
  { method: "POST", path: "/integrations/webhook/n8n", expose: true },
  async (req: WebhookPayload): Promise<WebhookResponse> => {
    await processWebhook('n8n', req);
    return { received: true };
  }
);

async function processWebhook(provider: string, payload: WebhookPayload): Promise<void> {

  await db.query(
    `INSERT INTO webhook_deliveries (webhook_id, event_type, payload, status, attempts)
     VALUES (NULL, $1, $2, 'success', 1)`,
    [payload.event, JSON.stringify(payload.data)]
  );
}

export async function triggerWebhooks(eventType: string, data: Record<string, unknown>): Promise<void> {

  const webhooks = await db.query(
    `SELECT * FROM integration_webhooks WHERE $1 = ANY(events) AND enabled = true`,
    [eventType]
  );

  for (const webhook of webhooks.rows) {
    const payload = { event: eventType, data };

    await db.query(
      `INSERT INTO webhook_deliveries (webhook_id, event_type, payload, status, attempts, next_retry)
       VALUES ($1, $2, $3, 'pending', 0, NOW())`,
      [webhook.id, eventType, JSON.stringify(payload)]
    );
  }
}

export async function deliverPendingWebhooks(): Promise<void> {

  const pending = await db.query(
    `SELECT wd.*, iw.webhook_url, iw.secret
     FROM webhook_deliveries wd
     JOIN integration_webhooks iw ON wd.webhook_id = iw.id
     WHERE wd.status = 'pending' AND wd.next_retry <= NOW() AND wd.attempts < 5
     LIMIT 100`
  );

  for (const delivery of pending.rows) {
    try {
      const signature = generateSignature(delivery.payload, delivery.secret);

      const response = await fetch(delivery.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature
        },
        body: JSON.stringify(delivery.payload)
      });

      if (response.ok) {
        await db.query(
          `UPDATE webhook_deliveries SET status = 'success', response_code = $1 WHERE id = $2`,
          [response.status, delivery.id]
        );
      } else {
        const nextRetry = new Date(Date.now() + Math.pow(2, delivery.attempts) * 60000);
        await db.query(
          `UPDATE webhook_deliveries 
           SET status = 'failed', attempts = attempts + 1, response_code = $1, next_retry = $2
           WHERE id = $3`,
          [response.status, nextRetry, delivery.id]
        );
      }
    } catch (error: any) {
      const nextRetry = new Date(Date.now() + Math.pow(2, delivery.attempts) * 60000);
      await db.query(
        `UPDATE webhook_deliveries 
         SET status = 'failed', attempts = attempts + 1, response_body = $1, next_retry = $2
         WHERE id = $3`,
        [error.message, nextRetry, delivery.id]
      );
    }
  }
}

function generateSignature(payload: any, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret || 'default-secret');
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
}
