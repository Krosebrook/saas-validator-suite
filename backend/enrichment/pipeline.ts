import { Subscription } from "encore.dev/pubsub";
import { ItemNormalized } from "../scraper/run";
import db from "../db";
import { enrichWithReadability } from "./enrichers/readability";
import { detectLanguage } from "./enrichers/language";
import { extractKeyphrases } from "./enrichers/keyphrases";
import { extractEntities } from "./enrichers/entities";
import { analyzeSentiment } from "./enrichers/sentiment";
import { generateEmbedding } from "./enrichers/embeddings";

const _ = new Subscription(ItemNormalized, "enrichment-pipeline", {
  handler: async (event) => {

    try {
      await db.query(
        `INSERT INTO enrich_jobs (item_id, status, started_at) VALUES ($1, 'running', NOW())`,
        [event.itemId]
      );

      const itemResult = await db.query(
        `SELECT * FROM raw_items WHERE id = $1`,
        [event.itemId]
      );

      if (itemResult.rows.length === 0) {
        throw new Error(`Raw item ${event.itemId} not found`);
      }

      const rawItem = itemResult.rows[0];
      const raw = rawItem.raw;

      const title = (raw.title as string) || event.title || '';
      const summary = (raw.summary || raw.description) as string || '';
      const url = event.url;
      const fullText = `${title} ${summary}`;

      const [readability, language, keyphrases, entities, sentiment, embedding] = await Promise.all([
        enrichWithReadability(url),
        Promise.resolve(detectLanguage(fullText)),
        Promise.resolve(extractKeyphrases(fullText)),
        Promise.resolve(extractEntities(fullText)),
        Promise.resolve(analyzeSentiment(fullText)),
        generateEmbedding(fullText)
      ]);

      const duplicateCheck = await db.query(
        `SELECT id FROM ideas WHERE title_hash = $1 LIMIT 1`,
        [hashTitle(title)]
      );

      const signals = {
        readability,
        language,
        keyphrases: keyphrases.keyphrases,
        entities: entities.entities,
        sentiment,
        isDuplicate: duplicateCheck.rows.length > 0
      };

      const tags: string[] = [];
      if (raw.tags && Array.isArray(raw.tags)) {
        tags.push(...raw.tags.map((t: any) => String(t)));
      }
      keyphrases.keyphrases.slice(0, 5).forEach(kp => tags.push(kp.phrase));

      const ideaResult = await db.query(
        `INSERT INTO ideas (title, description, source, source_url, raw_data, signals, tags, title_hash, vectors, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector, 'completed')
         RETURNING id`,
        [
          title,
          summary,
          'scraper',
          url,
          JSON.stringify(raw),
          JSON.stringify(signals),
          tags,
          hashTitle(title),
          `[${embedding.vector.join(',')}]`
        ]
      );

      const ideaId = ideaResult.rows[0].id;

      await db.query(
        `UPDATE enrich_jobs SET status = 'done', result = $1, completed_at = NOW() WHERE item_id = $2`,
        [JSON.stringify({ ideaId, signals }), event.itemId]
      );

    } catch (error: any) {
      console.error('Enrichment pipeline error:', error);
      
      await db.query(
        `UPDATE enrich_jobs 
         SET status = 'failed', errors = $1, attempts = attempts + 1, completed_at = NOW() 
         WHERE item_id = $2`,
        [JSON.stringify({ message: error.message, stack: error.stack }), event.itemId]
      );
    }
  }
});

function hashTitle(title: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(title.toLowerCase().trim()).digest('hex');
}
