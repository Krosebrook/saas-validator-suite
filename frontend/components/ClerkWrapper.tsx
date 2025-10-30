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

  useEffect(() => {
    const loadClerkConfig = async () => {
      try {
        const key = await fetchClerkConfig();
        setPublishableKey(key);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load authentication configuration');
        console.error('Failed to load Clerk configuration:', err);
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

  if (error || !publishableKey) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4 max-w-md p-6">
          <div className="text-red-500 text-xl">⚠️</div>
          <h2 className="text-xl font-semibold text-foreground">Authentication Configuration Required</h2>
          <p className="text-muted-foreground">
            {error || 'Failed to load authentication configuration'}
          </p>
          <div className="text-left bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">To configure Clerk authentication:</p>
            <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
              <li>Open Settings in the sidebar</li>
              <li>Set <code className="bg-background px-1 py-0.5 rounded">ClerkSecretKey</code></li>
              <li>Set <code className="bg-background px-1 py-0.5 rounded">ClerkPublishableKey</code></li>
            </ol>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
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