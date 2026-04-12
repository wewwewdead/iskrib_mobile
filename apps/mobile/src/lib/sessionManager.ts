import type { Session } from '@supabase/supabase-js';
import * as Sentry from '@sentry/react-native';

type SessionExpiredListener = () => void;

/**
 * Singleton token manager that lives outside the React tree.
 *
 *   ┌─────────────┐   getToken()   ┌────────────────┐
 *   │  apiClient   │ ─────────────▶ │ SessionManager │
 *   └─────────────┘                 │  ├─ cached?    │──▶ return token
 *                                   │  ├─ expired?   │──▶ single-flight refresh
 *                                   │  └─ dead?      │──▶ onSessionExpired
 *                                   └────────────────┘
 */

let supabaseRef: {
  auth: {
    getSession: () => Promise<{ data: { session: Session | null }; error: unknown }>;
    refreshSession: () => Promise<{ data: { session: Session | null }; error: unknown }>;
    onAuthStateChange: (
      cb: (event: string, session: Session | null) => void,
    ) => { data: { subscription: { unsubscribe: () => void } } };
  };
} | null = null;

let cachedSession: Session | null = null;

const TOKEN_EXPIRY_BUFFER_MS = 30_000; // refresh 30s before expiry

const expiredListeners = new Set<SessionExpiredListener>();

let refreshPromise: Promise<string | null> | null = null;

let initialized = false;
let initPromise: Promise<void> | null = null;

function isTokenExpired(session: Session): boolean {
  if (!session.expires_at) return false;
  const expiresAtMs = session.expires_at * 1000;
  return Date.now() >= expiresAtMs - TOKEN_EXPIRY_BUFFER_MS;
}

async function doRefresh(): Promise<string | null> {
  if (!supabaseRef) return null;

  const { data, error } = await supabaseRef.auth.refreshSession();

  if (error || !data.session) {
    cachedSession = null;
    Sentry.captureMessage('Session refresh failed — forcing sign out', {
      level: 'warning',
      extra: {error: error instanceof Error ? error.message : String(error)},
    });
    for (const listener of expiredListeners) {
      try {
        listener();
      } catch {
        // listener errors must not break the manager
      }
    }
    return null;
  }

  cachedSession = data.session;
  return data.session.access_token;
}

export const sessionManager = {
  /**
   * Bind the Supabase client. Call once during app bootstrap.
   * Loads the persisted session and subscribes to auth changes.
   */
  init(client: typeof supabaseRef): Promise<void> {
    if (initPromise) return initPromise;

    supabaseRef = client;

    initPromise = (async () => {
      if (!supabaseRef) {
        initialized = true;
        return;
      }

      try {
        const { data } = await supabaseRef.auth.getSession();
        cachedSession = data.session ?? null;
      } catch {
        cachedSession = null;
      }

      supabaseRef.auth.onAuthStateChange((_event, session) => {
        cachedSession = session;
      });

      initialized = true;
    })();

    return initPromise;
  },

  /** Wait for init to complete. Safe to call multiple times. */
  async waitForInit(): Promise<void> {
    if (initialized) return;
    if (initPromise) await initPromise;
  },

  /**
   * Get a valid access token.
   * - Returns cached token if not expired.
   * - Refreshes (single-flight) if expired.
   * - Returns null if unauthenticated or refresh permanently fails.
   */
  async getToken(): Promise<string | null> {
    await this.waitForInit();

    if (!cachedSession) return null;

    if (!isTokenExpired(cachedSession)) {
      return cachedSession.access_token;
    }

    // Single-flight: all concurrent callers share the same refresh promise
    if (!refreshPromise) {
      refreshPromise = doRefresh().finally(() => {
        refreshPromise = null;
      });
    }

    return refreshPromise;
  },

  /**
   * Attempt to refresh and return a new token.
   * Used by apiClient on 401 — tries once, returns null on failure.
   */
  async refreshAndGetToken(): Promise<string | null> {
    if (!supabaseRef) return null;

    if (!refreshPromise) {
      refreshPromise = doRefresh().finally(() => {
        refreshPromise = null;
      });
    }

    return refreshPromise;
  },

  /** Quick synchronous check. */
  isAuthenticated(): boolean {
    return cachedSession != null;
  },

  /** Get the current user ID or null. */
  getUserId(): string | null {
    return cachedSession?.user?.id ?? null;
  },

  /** Subscribe to permanent auth failure (refresh token expired). */
  onSessionExpired(listener: SessionExpiredListener): () => void {
    expiredListeners.add(listener);
    return () => {
      expiredListeners.delete(listener);
    };
  },

  /** Clear local state (called by AuthProvider on signOut). */
  clear(): void {
    cachedSession = null;
    refreshPromise = null;
  },

  /** @internal — for testing only */
  _reset(): void {
    supabaseRef = null;
    cachedSession = null;
    refreshPromise = null;
    expiredListeners.clear();
    initialized = false;
    initPromise = null;
  },
};
