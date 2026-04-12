import * as Sentry from '@sentry/react-native';
import { MOBILE_ENV } from '../../config/env';
import { sessionManager } from '../sessionManager';

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 250;
const RETRY_MAX_DELAY_MS = 2500;
const MAX_SERVER_RETRY_AFTER_MS = 30000;
const RETRIABLE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const JSON_CONTENT_TYPE_PATTERN = /application\/json|\/[a-z0-9.+-]+\+json/i;

export class ApiError extends Error {
  readonly status: number;
  readonly body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export class ApiTimeoutError extends ApiError {
  readonly timeoutMs: number;

  constructor(timeoutMs: number, body?: unknown) {
    super(`Request timed out after ${timeoutMs}ms`, 0, body);
    this.name = 'ApiTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

export class ApiNetworkError extends ApiError {
  readonly originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message, 0);
    this.name = 'ApiNetworkError';
    this.originalError = originalError;
  }
}

export type ApiRequestInit = RequestInit & {
  timeoutMs?: number;
  retries?: number;
  /** Skip automatic Authorization header injection. */
  skipAuth?: boolean;
};

const wait = async (ms: number): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(() => resolve(undefined), ms);
  });
};

const shouldRetryStatus = (status: number): boolean => {
  return status === 408 || status === 429 || status >= 500;
};

const shouldRetryMethod = (method: string): boolean => RETRIABLE_METHODS.has(method.toUpperCase());

const parseRetryAfterMs = (value: string | null): number | null => {
  if (!value) {
    return null;
  }

  const numericValue = Number(value);
  if (Number.isFinite(numericValue) && numericValue >= 0) {
    return Math.min(numericValue * 1000, MAX_SERVER_RETRY_AFTER_MS);
  }

  const dateMs = Date.parse(value);
  if (Number.isNaN(dateMs)) {
    return null;
  }

  return Math.min(Math.max(dateMs - Date.now(), 0), MAX_SERVER_RETRY_AFTER_MS);
};

const backoffDelay = (attempt: number, retryAfterMs?: number | null): number => {
  if (retryAfterMs && retryAfterMs > 0) {
    return retryAfterMs;
  }

  const jitter = Math.floor(Math.random() * 120);
  return Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt + jitter, RETRY_MAX_DELAY_MS);
};

const buildUrl = (path: string): string => {
  const trimmedPath = path.trim();
  if (/^https?:\/\//i.test(trimmedPath)) {
    return trimmedPath;
  }

  const normalizedPath = trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`;
  return `${MOBILE_ENV.API_BASE_URL}${normalizedPath}`;
};

const parseBody = async (response: Response): Promise<unknown> => {
  if (response.status === 204 || response.status === 205) {
    return undefined;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (JSON_CONTENT_TYPE_PATTERN.test(contentType)) {
    return response.json().catch(() => undefined);
  }

  return response.text().catch(() => undefined);
};

const extractErrorMessage = (status: number, statusText: string, body: unknown): string => {
  if (typeof body === 'string' && body.trim().length > 0) {
    return body.trim();
  }

  if (typeof body === 'object' && body) {
    const payload = body as { error?: unknown; message?: unknown; detail?: unknown };
    const candidate = payload.error ?? payload.message ?? payload.detail;
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  const suffix = statusText.trim();
  return suffix ? `Request failed (${status} ${suffix})` : `Request failed (${status})`;
};

const shouldRetryError = (error: unknown): boolean => {
  return (
    error instanceof ApiTimeoutError ||
    error instanceof ApiNetworkError ||
    error instanceof TypeError
  );
};

const normalizeError = (
  error: unknown,
  timeoutMs: number,
  didTimeout: boolean,
  callerSignal: AbortSignal | undefined,
): unknown => {
  if (!(error instanceof Error)) {
    return new Error('Unknown request error');
  }

  if (error.name === 'AbortError') {
    if (didTimeout) {
      return new ApiTimeoutError(timeoutMs);
    }

    if (callerSignal?.aborted) {
      return error;
    }
  }

  if (error instanceof TypeError) {
    return new ApiNetworkError('Network request failed', error);
  }

  return error;
};

async function executeRequest<T>(
  path: string,
  requestInit: RequestInit,
  method: string,
  timeoutMs: number,
  maxAttempts: number,
  callerSignal: AbortSignal | undefined,
): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let didTimeout = false;
    let callerAbortListener: (() => void) | null = null;

    if (callerSignal) {
      if (callerSignal.aborted) {
        controller.abort();
      } else {
        callerAbortListener = () => controller.abort();
        callerSignal.addEventListener('abort', callerAbortListener, { once: true });
      }
    }

    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        didTimeout = true;
        controller.abort();
      }, timeoutMs);
    }

    try {
      const response = await fetch(buildUrl(path), {
        ...requestInit,
        signal: controller.signal,
      });

      const body = await parseBody(response);

      if (!response.ok) {
        if (attempt < maxAttempts - 1 && shouldRetryStatus(response.status)) {
          const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'));
          await wait(backoffDelay(attempt, retryAfterMs));
          continue;
        }

        const message = extractErrorMessage(response.status, response.statusText ?? '', body);

        Sentry.addBreadcrumb({
          category: 'api',
          message: `${method} ${path} → ${response.status}`,
          level: response.status >= 500 ? 'error' : 'warning',
          data: {status: response.status, attempt},
        });

        throw new ApiError(message, response.status, body);
      }

      return body as T;
    } catch (error) {
      const normalizedError = normalizeError(error, timeoutMs, didTimeout, callerSignal);

      if (normalizedError instanceof ApiTimeoutError || normalizedError instanceof ApiNetworkError) {
        Sentry.addBreadcrumb({
          category: 'api',
          message: `${method} ${path} → ${normalizedError.name}`,
          level: 'error',
          data: {attempt},
        });
      }

      if (attempt < maxAttempts - 1 && shouldRetryError(normalizedError)) {
        await wait(backoffDelay(attempt));
        continue;
      }

      throw normalizedError;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (callerSignal && callerAbortListener) {
        callerSignal.removeEventListener('abort', callerAbortListener);
      }
    }
  }

  throw new Error('Unexpected request failure');
}

export async function apiRequest<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const timeoutMs = init.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = Math.max(0, Math.floor(init.retries ?? DEFAULT_RETRIES));
  const callerSignal = init.signal;
  const skipAuth = init.skipAuth ?? false;
  const requestInit: RequestInit = { ...init };
  delete (requestInit as ApiRequestInit).timeoutMs;
  delete (requestInit as ApiRequestInit).retries;
  delete (requestInit as ApiRequestInit).skipAuth;
  requestInit.method = method;

  const headers = new Headers(requestInit.headers ?? {});
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  // Auto-attach auth header from SessionManager
  if (!skipAuth && !headers.has('Authorization')) {
    const token = await sessionManager.getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  requestInit.headers = headers;

  const maxAttempts = shouldRetryMethod(method) ? retries + 1 : 1;

  try {
    return await executeRequest<T>(path, requestInit, method, timeoutMs, maxAttempts, callerSignal);
  } catch (error) {
    // 401 handling: attempt token refresh and retry (GET/HEAD only)
    if (
      error instanceof ApiError &&
      error.status === 401 &&
      !skipAuth &&
      shouldRetryMethod(method)
    ) {
      const freshToken = await sessionManager.refreshAndGetToken();
      if (freshToken) {
        const retryHeaders = new Headers(requestInit.headers ?? {});
        retryHeaders.set('Authorization', `Bearer ${freshToken}`);
        const retryInit = { ...requestInit, headers: retryHeaders };
        return executeRequest<T>(path, retryInit, method, timeoutMs, 1, callerSignal);
      }
    }

    throw error;
  }
}
