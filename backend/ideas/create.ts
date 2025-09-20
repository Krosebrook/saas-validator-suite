import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

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
    const auth = getAuthData()!;
    
    // Get user to check credits
    const user = await db.queryRow`
      SELECT id, credits_remaining FROM users WHERE clerk_id = ${auth.userID}
    `;
    
    if (!user || user.credits_remaining <= 0) {
      throw new Error("Insufficient credits");
    }

    // Create the idea
    const idea = await db.queryRow<Idea>`
      INSERT INTO ideas (user_id, title, description, source, source_url)
      VALUES (${user.id}, ${req.title}, ${req.description}, ${req.source}, ${req.source_url})
      RETURNING *
    `;

    // Deduct credit
    await db.exec`
      UPDATE users 
      SET credits_remaining = credits_remaining - 1
      WHERE id = ${user.id}
    `;

    return idea!;
  }
);
