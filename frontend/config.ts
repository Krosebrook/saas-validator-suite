// API base URL
export const apiBaseUrl = "";

// Clerk publishable key will be fetched dynamically from the backend
// This removes the security vulnerability of hardcoding the key in client code
export let clerkPublishableKey: string | null = null;

// Function to fetch Clerk configuration from backend
export async function fetchClerkConfig(): Promise<string> {
  try {
    const response = await fetch('/auth/clerk-config');
    if (!response.ok) {
      throw new Error(`Failed to fetch Clerk config: ${response.status}`);
    }
    const config = await response.json();
    clerkPublishableKey = config.publishableKey;
    return config.publishableKey;
  } catch (error) {
    console.error('Error fetching Clerk configuration:', error);
    throw error;
  }
}
