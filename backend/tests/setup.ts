import { vi } from 'vitest';

vi.mock('~encore/auth', () => ({
  getAuthData: vi.fn(() => ({ userID: 'test-user-id' })),
}));
