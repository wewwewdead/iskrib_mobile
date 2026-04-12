import {sessionManager} from '../src/lib/sessionManager';

const mockAuth = {
  getSession: jest.fn(),
  refreshSession: jest.fn(),
  onAuthStateChange: jest.fn(
    () => ({data: {subscription: {unsubscribe: jest.fn()}}}),
  ),
};

const mockClient = {auth: mockAuth} as unknown as Parameters<
  typeof sessionManager.init
>[0];

function makeSession(overrides: {
  access_token?: string;
  expires_at?: number;
} = {}) {
  return {
    access_token: overrides.access_token ?? 'tok_valid',
    refresh_token: 'ref_tok',
    expires_at: overrides.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
    user: {id: 'user-1'},
  };
}

describe('sessionManager', () => {
  beforeEach(() => {
    sessionManager._reset();
    jest.restoreAllMocks();
    mockAuth.getSession.mockReset();
    mockAuth.refreshSession.mockReset();
    mockAuth.onAuthStateChange.mockReset().mockReturnValue({
      data: {subscription: {unsubscribe: jest.fn()}},
    });
  });

  it('getToken() returns cached token when session is valid', async () => {
    const session = makeSession();
    mockAuth.getSession.mockResolvedValue({data: {session}, error: null});

    await sessionManager.init(mockClient);

    const token = await sessionManager.getToken();
    expect(token).toBe('tok_valid');
    // Should NOT have called refreshSession
    expect(mockAuth.refreshSession).not.toHaveBeenCalled();
  });

  it('getToken() returns null when no session exists', async () => {
    mockAuth.getSession.mockResolvedValue({data: {session: null}, error: null});

    await sessionManager.init(mockClient);

    const token = await sessionManager.getToken();
    expect(token).toBeNull();
  });

  it('getToken() triggers refresh when token is expired', async () => {
    // Session expired 5 minutes ago
    const expiredSession = makeSession({
      expires_at: Math.floor(Date.now() / 1000) - 300,
    });
    mockAuth.getSession.mockResolvedValue({
      data: {session: expiredSession},
      error: null,
    });

    const freshSession = makeSession({access_token: 'tok_fresh'});
    mockAuth.refreshSession.mockResolvedValue({
      data: {session: freshSession},
      error: null,
    });

    await sessionManager.init(mockClient);

    const token = await sessionManager.getToken();
    expect(token).toBe('tok_fresh');
    expect(mockAuth.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('getToken() single-flight: multiple concurrent calls share one refresh promise', async () => {
    const expiredSession = makeSession({
      expires_at: Math.floor(Date.now() / 1000) - 300,
    });
    mockAuth.getSession.mockResolvedValue({
      data: {session: expiredSession},
      error: null,
    });

    const freshSession = makeSession({access_token: 'tok_shared'});
    mockAuth.refreshSession.mockResolvedValue({
      data: {session: freshSession},
      error: null,
    });

    await sessionManager.init(mockClient);

    // Fire three concurrent getToken() calls
    const [t1, t2, t3] = await Promise.all([
      sessionManager.getToken(),
      sessionManager.getToken(),
      sessionManager.getToken(),
    ]);

    expect(t1).toBe('tok_shared');
    expect(t2).toBe('tok_shared');
    expect(t3).toBe('tok_shared');
    // refreshSession should only have been called once (single-flight)
    expect(mockAuth.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('refreshAndGetToken() returns new token on successful refresh', async () => {
    const session = makeSession();
    mockAuth.getSession.mockResolvedValue({data: {session}, error: null});

    const freshSession = makeSession({access_token: 'tok_refreshed'});
    mockAuth.refreshSession.mockResolvedValue({
      data: {session: freshSession},
      error: null,
    });

    await sessionManager.init(mockClient);

    const token = await sessionManager.refreshAndGetToken();
    expect(token).toBe('tok_refreshed');
  });

  it('refreshAndGetToken() returns null and fires onSessionExpired when refresh fails', async () => {
    const session = makeSession();
    mockAuth.getSession.mockResolvedValue({data: {session}, error: null});
    mockAuth.refreshSession.mockResolvedValue({
      data: {session: null},
      error: new Error('refresh token expired'),
    });

    await sessionManager.init(mockClient);

    const expiredListener = jest.fn();
    sessionManager.onSessionExpired(expiredListener);

    const token = await sessionManager.refreshAndGetToken();
    expect(token).toBeNull();
    expect(expiredListener).toHaveBeenCalledTimes(1);
  });

  it('onSessionExpired listener is called when refresh permanently fails', async () => {
    const expiredSession = makeSession({
      expires_at: Math.floor(Date.now() / 1000) - 300,
    });
    mockAuth.getSession.mockResolvedValue({
      data: {session: expiredSession},
      error: null,
    });
    mockAuth.refreshSession.mockResolvedValue({
      data: {session: null},
      error: new Error('token revoked'),
    });

    await sessionManager.init(mockClient);

    const listener1 = jest.fn();
    const listener2 = jest.fn();
    sessionManager.onSessionExpired(listener1);
    sessionManager.onSessionExpired(listener2);

    await sessionManager.getToken();

    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
  });

  it('clear() resets cached session', async () => {
    const session = makeSession();
    mockAuth.getSession.mockResolvedValue({data: {session}, error: null});

    await sessionManager.init(mockClient);

    expect(sessionManager.isAuthenticated()).toBe(true);

    sessionManager.clear();

    expect(sessionManager.isAuthenticated()).toBe(false);
    const token = await sessionManager.getToken();
    expect(token).toBeNull();
  });
});
