import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

interface SubmitFeedbackRequest {
  idea_id: number;
  feedback_type: "thumbs_up" | "thumbs_down" | "note";
  feedback_value?: string;
  notes?: string;
}

interface FeedbackResponse {
  success: boolean;
}

// Submits user feedback for adaptive scoring
export const submitFeedback = api<SubmitFeedbackRequest, FeedbackResponse>(
  { auth: true, expose: true, method: "POST", path: "/scoring/feedback" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Get user ID
    const user = await db.queryRow`
      SELECT id FROM users WHERE clerk_id = ${auth.userID}
    `;
    
    if (!user) {
      throw new Error("User not found");
    }

    // Verify user owns the idea
    const idea = await db.queryRow`
      SELECT id FROM ideas 
      WHERE id = ${req.idea_id} AND user_id = ${user.id}
    `;

    if (!idea) {
      throw new Error("Idea not found");
    }

    // Store feedback
    await db.exec`
      INSERT INTO user_feedback (user_id, idea_id, feedback_type, feedback_value, notes)
      VALUES (${user.id}, ${req.idea_id}, ${req.feedback_type}, ${req.feedback_value}, ${req.notes})
    `;

    return { success: true };
  }
);
