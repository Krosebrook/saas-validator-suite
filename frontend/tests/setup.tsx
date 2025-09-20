import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Clerk
vi.mock('@clerk/clerk-react', () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  SignedIn: ({ children }: { children: React.ReactNode }) => children,
  SignedOut: ({ children }: { children: React.ReactNode }) => children,
  SignInButton: ({ children }: { children: React.ReactNode }) => children,
  UserButton: () => <div>User Button</div>,
  useAuth: () => ({
    isSignedIn: true,
    getToken: () => Promise.resolve('mock-token'),
  }),
}));

// Mock backend client
vi.mock('~backend/client', () => ({
  default: {
    with: () => ({
      ideas: {
        create: vi.fn(),
        list: vi.fn(),
        get: vi.fn(),
      },
      users: {
        getProfile: vi.fn(),
      },
      ai: {
        analyze: vi.fn(),
      },
      scoring: {
        submitFeedback: vi.fn(),
      },
      compliance: {
        scan: vi.fn(),
      },
    }),
  },
}));
