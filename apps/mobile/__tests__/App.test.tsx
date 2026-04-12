import {buildMobileEnv} from '../src/config/env';

describe('mobile env', () => {
  it('provides an API base URL fallback', () => {
    const result = buildMobileEnv({
      ISK_MOBILE_API_BASE_URL: undefined,
      ISK_MOBILE_SUPABASE_URL: undefined,
      ISK_MOBILE_SUPABASE_ANON_KEY: undefined,
    });

    expect(result.env.API_BASE_URL).toBe('http://10.0.2.2:3000/api');
  });

  it('rejects placeholder Supabase values', () => {
    const result = buildMobileEnv({
      ISK_MOBILE_API_BASE_URL: 'http://10.0.2.2:3000/api',
      ISK_MOBILE_SUPABASE_URL: 'https://your-project-ref.supabase.co',
      ISK_MOBILE_SUPABASE_ANON_KEY: 'your-supabase-anon-key',
    });

    expect(result.isSupabaseConfigured).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
