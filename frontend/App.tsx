import React from 'react';
import { ClerkProvider, SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { clerkPublishableKey } from './config';
import Dashboard from './pages/Dashboard';
import IdeasPage from './pages/Ideas';
import IdeaDetail from './pages/IdeaDetail';
import AnalyticsPage from './pages/Analytics';
import SettingsPage from './pages/Settings';
import Navbar from './components/Navbar';
import { NotificationProvider } from './components/NotificationProvider';

const queryClient = new QueryClient();

function App() {
  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-background">
          <SignedOut>
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center space-y-6">
                <h1 className="text-4xl font-bold text-foreground">SaaS Validator Suite</h1>
                <p className="text-lg text-muted-foreground">
                  Validate your SaaS ideas with AI-powered analysis
                </p>
                <SignInButton mode="modal">
                  <button className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors">
                    Sign In to Get Started
                  </button>
                </SignInButton>
              </div>
            </div>
          </SignedOut>
          
          <SignedIn>
            <NotificationProvider>
              <Router>
                <div className="flex h-screen">
                  <Navbar />
                  <main className="flex-1 overflow-auto">
                    <div className="p-6">
                      <Routes>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/ideas" element={<IdeasPage />} />
                        <Route path="/ideas/:id" element={<IdeaDetail />} />
                        <Route path="/analytics" element={<AnalyticsPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                      </Routes>
                    </div>
                  </main>
                </div>
              </Router>
            </NotificationProvider>
          </SignedIn>
          
          <Toaster />
        </div>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;
