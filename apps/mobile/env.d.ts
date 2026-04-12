declare module '@env' {
  export const ISK_MOBILE_API_BASE_URL: string | undefined;
  export const ISK_MOBILE_SUPABASE_URL: string | undefined;
  export const ISK_MOBILE_SUPABASE_ANON_KEY: string | undefined;
  export const ISK_MOBILE_SENTRY_DSN: string | undefined;
}

declare module '@sentry/react-native' {
  export function init(options: {dsn?: string; enabled?: boolean; tracesSampleRate?: number}): void;
  export function captureException(error: unknown, context?: {extra?: Record<string, unknown>}): void;
  export function captureMessage(message: string, context?: {level?: string; extra?: Record<string, unknown>}): void;
  export function addBreadcrumb(breadcrumb: {category?: string; message?: string; level?: string; data?: Record<string, unknown>}): void;
}

declare module 'react-native-keychain' {
  export function getGenericPassword(options?: {service?: string}): Promise<false | {password: string; username: string}>;
  export function setGenericPassword(username: string, password: string, options?: {service?: string}): Promise<boolean>;
  export function resetGenericPassword(options?: {service?: string}): Promise<boolean>;
}
