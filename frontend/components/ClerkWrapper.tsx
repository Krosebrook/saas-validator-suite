import React, { useState, useEffect } from 'react';
import { ClerkProvider } from '@clerk/clerk-react';
import { fetchClerkConfig } from '../config';

interface ClerkWrapperProps {
  children: React.ReactNode;
}

export function ClerkWrapper({ children }: ClerkWrapperProps) {
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    const loadClerkConfig = async () => {
      try {
        const config = await fetchClerkConfig();
        if (!config.configured || !config.publishableKey) {
          setConfigured(false);
          setPublishableKey(null);
        } else {
          setPublishableKey(config.publishableKey);
          setConfigured(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load authentication configuration');
        console.error('Failed to load Clerk configuration:', err);
        setConfigured(false);
      } finally {
        setLoading(false);
      }
    };

    loadClerkConfig();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading authentication...</p>
        </div>
      </div>
    );
  }

  if (!configured || !publishableKey) {
    return (
      <>
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm">
            <span className="text-yellow-500">⚠️</span>
            <span className="text-yellow-700 dark:text-yellow-300">
              Authentication not configured. Running in demo mode.
            </span>
            <a 
              href="/settings" 
              className="ml-auto text-yellow-700 dark:text-yellow-300 underline hover:no-underline"
            >
              Configure Clerk
            </a>
          </div>
        </div>
        {children}
      </>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      {children}
    </ClerkProvider>
  );
}