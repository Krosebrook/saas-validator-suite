import React, { useState, useEffect } from 'react';
import { ClerkProvider } from '@clerk/clerk-react';
import { fetchClerkConfig } from '../config';

interface ClerkWrapperProps {
  children: React.ReactNode;
}

export function ClerkWrapper({ children }: ClerkWrapperProps) {
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading authentication...</p>
        </div>
      </div>
    );
  }

  if (!configured || !publishableKey) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-6 max-w-md p-6">
          <h1 className="text-4xl font-bold text-foreground">SaaS Validator Suite</h1>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <p className="text-yellow-700 dark:text-yellow-300">
              Authentication not configured. Please set ClerkPublishableKey and ClerkSecretKey in Settings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      {children}
    </ClerkProvider>
  );
}