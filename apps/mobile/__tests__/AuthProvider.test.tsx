import React from 'react';
import renderer from 'react-test-renderer';

const mockAuth = {
  getSession: jest.fn(),
  onAuthStateChange: jest.fn(),
  signOut: jest.fn(),
};

const mockSupabase = {
  auth: mockAuth,
};

const mockSessionManager = {
  clear: jest.fn(),
  onSessionExpired: jest.fn(),
};

const mockQueryClient = {
  cancelQueries: jest.fn(),
  clear: jest.fn(),
};

jest.mock('../src/config/env', () => ({
  IS_SUPABASE_CONFIGURED: true,
}));

jest.mock('../src/lib/supabase', () => ({
  supabase: mockSupabase,
}));

jest.mock('../src/lib/sessionManager', () => ({
  sessionManager: mockSessionManager,
}));

jest.mock('../src/lib/queryClient', () => ({
  queryClient: mockQueryClient,
}));

const {AuthProvider, useAuth} = require('../src/features/auth/AuthProvider') as typeof import('../src/features/auth/AuthProvider');

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.getSession.mockResolvedValue({data: {session: null}, error: null});
    mockAuth.onAuthStateChange.mockReturnValue({
      data: {subscription: {unsubscribe: jest.fn()}},
    });
    mockAuth.signOut.mockResolvedValue({error: null});
    mockSessionManager.clear.mockReset();
    mockSessionManager.onSessionExpired.mockReturnValue(jest.fn());
    mockQueryClient.cancelQueries.mockResolvedValue(undefined);
    mockQueryClient.clear.mockReset();
  });

  it('signOut() clears local/query state and signs out only the current device session', async () => {
    let authApi: {signOut: () => Promise<void>} | null = null;

    function TestConsumer() {
      authApi = useAuth();
      return null;
    }

    let tree: renderer.ReactTestRenderer;
    await renderer.act(async () => {
      tree = renderer.create(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );
    });

    await renderer.act(async () => {
      await authApi!.signOut();
    });

    expect(mockQueryClient.cancelQueries).toHaveBeenCalledTimes(1);
    expect(mockQueryClient.clear).toHaveBeenCalledTimes(1);
    expect(mockSessionManager.clear).toHaveBeenCalledTimes(1);
    expect(mockAuth.signOut).toHaveBeenCalledWith({scope: 'local'});

    await renderer.act(async () => {
      tree!.unmount();
    });
  });
});
