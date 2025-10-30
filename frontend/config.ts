import backend from '~backend/client';

// API base URL
export const apiBaseUrl = "";

// Clerk publishable key will be fetched dynamically from the backend
// This removes the security vulnerability of hardcoding the key in client code
export let clerkPublishableKey: string | null = null;

// Function to fetch Clerk configuration from backend
export async function fetchClerkConfig(): Promise<string> {
  try {
    const config = await backend.auth.getClerkConfig();
    clerkPublishableKey = config.publishableKey;
    return config.publishableKey;
  } catch (error) {
    console.error('Error fetching Clerk configuration:', error);
    throw error;
  }
}
