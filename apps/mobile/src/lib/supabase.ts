import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IS_SUPABASE_CONFIGURED, MOBILE_ENV } from '../config/env';
import { secureStorage } from './secureStorage';
import { sessionManager } from './sessionManager';

const stripTrailingSlashes = (value: string): string => value.replace(/\/+$/, '');

const createSupabaseClient = (): SupabaseClient => {
  const resolvedSupabaseUrl = stripTrailingSlashes(MOBILE_ENV.SUPABASE_URL);
  const resolvedSupabaseKey = MOBILE_ENV.SUPABASE_ANON_KEY;

  return createClient(resolvedSupabaseUrl, resolvedSupabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      storage: secureStorage,
    },
    realtime: {
      params: {
        eventsPerSecond: 2,
      },
    },
  });
};

export const supabase: SupabaseClient | null = IS_SUPABASE_CONFIGURED
  ? createSupabaseClient()
  : null;

// Initialize SessionManager with the Supabase client so it can manage tokens.
// This runs at module load time — SessionManager.waitForInit() gates first use.
if (supabase) {
  sessionManager.init(supabase);
}
