import { createClerkClient, verifyToken } from "@clerk/backend";
import { Header, Cookie, APIError, Gateway, api } from "encore.dev/api";
import { authHandler } from "encore.dev/auth";
import { secret } from "encore.dev/config";

const clerkSecretKey = secret("ClerkSecretKey");
const clerkPublishableKey = secret("ClerkPublishableKey");

let clerkClient: ReturnType<typeof createClerkClient> | null = null;

function getClerkClient() {
  if (!clerkClient) {
    try {
      const key = clerkSecretKey();
      if (!key || key.trim() === "") {
        throw APIError.unavailable(
          "Clerk is not configured. Please set ClerkSecretKey and ClerkPublishableKey in Settings."
        );
      }
      clerkClient = createClerkClient({ secretKey: key });
    } catch (err) {
      throw APIError.unavailable(
        "Clerk is not configured. Please set ClerkSecretKey and ClerkPublishableKey in Settings.",
        err as Error
      );
    }
  }
  return clerkClient;
}

interface AuthParams {
  authorization?: Header<"Authorization">;
  session?: Cookie<"session">;
}

export interface AuthData {
  userID: string;
  email: string;
  name?: string;
}

const AUTHORIZED_PARTIES = [
  "https://saas-validator-suite-d370vmc82vjsm36vu8rg.lp.dev",
];

export const auth = authHandler<AuthParams, AuthData>(
  async (data) => {
    const token = data.authorization?.replace("Bearer ", "") ?? data.session?.value;
    if (!token) {
      throw APIError.unauthenticated("missing token");
    }

    try {
      const verifiedToken = await verifyToken(token, {
        authorizedParties: AUTHORIZED_PARTIES,
        secretKey: clerkSecretKey(),
      });

      const client = getClerkClient();
      const user = await client.users.getUser(verifiedToken.sub);
      return {
        userID: user.id,
        email: user.emailAddresses[0]?.emailAddress || "",
        name: user.firstName ? `${user.firstName} ${user.lastName}`.trim() : undefined,
      };
    } catch (err) {
      throw APIError.unauthenticated("invalid token", err as Error);
    }
  }
);

export const gw = new Gateway({ authHandler: auth });

// Secure endpoint to get Clerk publishable key
export const getClerkConfig = api(
  { method: "GET", path: "/auth/clerk-config", expose: true },
  async (): Promise<{ publishableKey: string; configured: boolean }> => {
    try {
      const key = clerkPublishableKey();
      if (!key || key.trim() === "") {
        return {
          publishableKey: "",
          configured: false,
        };
      }
      return {
        publishableKey: key,
        configured: true,
      };
    } catch (err) {
      return {
        publishableKey: "",
        configured: false,
      };
    }
  }
);
