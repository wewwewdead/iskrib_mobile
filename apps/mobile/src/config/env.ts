import {
  ISK_MOBILE_API_BASE_URL,
  ISK_MOBILE_SUPABASE_ANON_KEY,
  ISK_MOBILE_SUPABASE_URL,
  ISK_MOBILE_SENTRY_DSN,
} from '@env';

export type MobileEnv = {
  API_BASE_URL: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SENTRY_DSN: string;
};

export type RawMobileEnv = {
  ISK_MOBILE_API_BASE_URL?: string;
  ISK_MOBILE_SUPABASE_URL?: string;
  ISK_MOBILE_SUPABASE_ANON_KEY?: string;
  ISK_MOBILE_SENTRY_DSN?: string;
};

export type MobileEnvBuildResult = {
  env: MobileEnv;
  warnings: string[];
  isSupabaseConfigured: boolean;
};

const DEFAULT_API_BASE_URL = 'http://10.0.2.2:3000/api';
const PLACEHOLDER_VALUE_FRAGMENTS = [
  'your-project-ref',
  'your-supabase-anon-key',
  'public-anon-key-placeholder',
  'example.supabase.co',
];

const fromEnv = (value: string | undefined): string => String(value ?? '').trim();

const stripTrailingSlashes = (value: string): string => value.replace(/\/+$/, '');

const isLikelyHttpUrl = (value: string): boolean => {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const isPlaceholderValue = (value: string): boolean => {
  const normalized = value.toLowerCase();
  return PLACEHOLDER_VALUE_FRAGMENTS.some((fragment) => normalized.includes(fragment));
};

const normalizeApiBaseUrl = (rawValue: string, warnings: string[]): string => {
  const value = rawValue.trim();
  if (!value) {
    warnings.push(
      'ISK_MOBILE_API_BASE_URL is unset; falling back to http://10.0.2.2:3000/api for emulator development.',
    );
    return DEFAULT_API_BASE_URL;
  }

  const normalized = stripTrailingSlashes(value);
  if (!isLikelyHttpUrl(normalized)) {
    warnings.push(
      `ISK_MOBILE_API_BASE_URL is invalid ("${value}"); falling back to ${DEFAULT_API_BASE_URL}.`,
    );
    return DEFAULT_API_BASE_URL;
  }

  return normalized;
};

const normalizeSupabaseUrl = (rawValue: string, warnings: string[]): string => {
  const value = stripTrailingSlashes(rawValue.trim());
  if (!value) {
    return '';
  }

  if (isPlaceholderValue(value)) {
    warnings.push('ISK_MOBILE_SUPABASE_URL contains a template placeholder value.');
    return '';
  }

  if (!isLikelyHttpUrl(value)) {
    warnings.push(`ISK_MOBILE_SUPABASE_URL is not a valid http(s) URL ("${rawValue}").`);
    return '';
  }

  return value;
};

const normalizeSupabaseAnonKey = (rawValue: string, warnings: string[]): string => {
  const value = rawValue.trim();
  if (!value) {
    return '';
  }

  if (isPlaceholderValue(value)) {
    warnings.push('ISK_MOBILE_SUPABASE_ANON_KEY contains a template placeholder value.');
    return '';
  }

  return value;
};

export const buildMobileEnv = (rawEnv: RawMobileEnv): MobileEnvBuildResult => {
  const warnings: string[] = [];

  const env: MobileEnv = {
    API_BASE_URL: normalizeApiBaseUrl(fromEnv(rawEnv.ISK_MOBILE_API_BASE_URL), warnings),
    SUPABASE_URL: normalizeSupabaseUrl(fromEnv(rawEnv.ISK_MOBILE_SUPABASE_URL), warnings),
    SUPABASE_ANON_KEY: normalizeSupabaseAnonKey(
      fromEnv(rawEnv.ISK_MOBILE_SUPABASE_ANON_KEY),
      warnings,
    ),
    SENTRY_DSN: fromEnv(rawEnv.ISK_MOBILE_SENTRY_DSN),
  };

  return {
    env,
    warnings,
    isSupabaseConfigured: env.SUPABASE_URL.length > 0 && env.SUPABASE_ANON_KEY.length > 0,
  };
};

const resolvedMobileEnv = buildMobileEnv({
  ISK_MOBILE_API_BASE_URL,
  ISK_MOBILE_SUPABASE_URL,
  ISK_MOBILE_SUPABASE_ANON_KEY,
  ISK_MOBILE_SENTRY_DSN,
});

export const MOBILE_ENV: MobileEnv = resolvedMobileEnv.env;
export const IS_SUPABASE_CONFIGURED = resolvedMobileEnv.isSupabaseConfigured;
export const ENV_WARNINGS = Object.freeze([...resolvedMobileEnv.warnings]);

if (__DEV__ && ENV_WARNINGS.length > 0) {
  for (const warning of ENV_WARNINGS) {
    // Surface non-fatal configuration issues during local development.
    console.warn(`[env] ${warning}`);
  }
}

if (__DEV__) {
  console.info(`[env] Resolved mobile API base URL: ${MOBILE_ENV.API_BASE_URL}`);
}
