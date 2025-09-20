import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface UserProfile {
  id: number;
  clerk_id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  plan: string;
  credits_remaining: number;
  created_at: Date;
}

// Gets the current user's profile
export const getProfile = api<void, UserProfile>(
  { auth: true, expose: true, method: "GET", path: "/user/profile" },
  async () => {
    const auth = getAuthData()!;
    
    let user = await db.queryRow<UserProfile>`
      SELECT * FROM users WHERE clerk_id = ${auth.userID}
    `;

    if (!user) {
      // Create user if doesn't exist
      user = await db.queryRow<UserProfile>`
        INSERT INTO users (clerk_id, email, name)
        VALUES (${auth.userID}, ${auth.email}, ${auth.name || null})
        RETURNING *
      `;
    }

    return user!;
  }
);

interface UpdateProfileRequest {
  name?: string;
  avatar_url?: string;
}

// Updates the current user's profile
export const updateProfile = api<UpdateProfileRequest, UserProfile>(
  { auth: true, expose: true, method: "PUT", path: "/user/profile" },
  async (req) => {
    const auth = getAuthData()!;
    
    const user = await db.queryRow<UserProfile>`
      UPDATE users 
      SET name = COALESCE(${req.name}, name),
          avatar_url = COALESCE(${req.avatar_url}, avatar_url),
          updated_at = NOW()
      WHERE clerk_id = ${auth.userID}
      RETURNING *
    `;

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }
);
