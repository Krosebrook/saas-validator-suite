import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { logger } from "../logging/logger";
import { handleError, NotFoundError, InsufficientCreditsError, DatabaseError } from "../logging/errors";
import { validateRequired, validateString, validateUrl, sanitizeString } from "../logging/validation";
import { applyStandardRateLimit } from "../security/security";

export interface CreateIdeaRequest {
  title: string;
  description?: string;
  source: string;
  source_url?: string;
}

export interface Idea {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  source: string;
  source_url?: string;
  status: string;
  created_at: Date;
}

// Creates a new idea for validation
export const create = api<CreateIdeaRequest, Idea>(
  { auth: true, expose: true, method: "POST", path: "/ideas" },
  async (req) => {
    try {
      const auth = getAuthData()!;
      
      logger.info("Creating new idea", {
        service: "ideas",
        endpoint: "create",
        userId: auth.userID,
        data: { title: req.title, source: req.source }
      });

      // Apply rate limiting
      await applyStandardRateLimit(auth.userID, "create");

      // Validate input
      validateRequired(req.title, "title");
      validateString(req.title, "title", { minLength: 3, maxLength: 200 });
      validateRequired(req.source, "source");
      validateString(req.source, "source", { maxLength: 100 });
      
      if (req.description) {
        validateString(req.description, "description", { maxLength: 1000 });
      }
      
      if (req.source_url) {
        validateUrl(req.source_url, "source_url");
      }

      // Sanitize input
      const sanitizedTitle = sanitizeString(req.title);
      const sanitizedDescription = req.description ? sanitizeString(req.description) : undefined;
      const sanitizedSource = sanitizeString(req.source);
      
      // Get user to check credits
      const user = await db.queryRow`
        SELECT id, credits_remaining FROM users WHERE clerk_id = ${auth.userID}
      `;
      
      if (!user) {
        throw new NotFoundError("User", auth.userID);
      }
      
      if (user.credits_remaining <= 0) {
        throw new InsufficientCreditsError(1, user.credits_remaining);
      }

      // Create the idea
      const idea = await db.queryRow<Idea>`
        INSERT INTO ideas (user_id, title, description, source, source_url)
        VALUES (${user.id}, ${sanitizedTitle}, ${sanitizedDescription}, ${sanitizedSource}, ${req.source_url})
        RETURNING *
      `;

      if (!idea) {
        throw new DatabaseError("idea creation");
      }

      // Deduct credit
      await db.exec`
        UPDATE users 
        SET credits_remaining = credits_remaining - 1
        WHERE id = ${user.id}
      `;

      logger.info("Idea created successfully", {
        service: "ideas",
        endpoint: "create",
        userId: auth.userID,
        data: { ideaId: idea.id }
      });

      return idea;
    } catch (error) {
      handleError(error, { service: "ideas", endpoint: "create" });
    }
  }
);
