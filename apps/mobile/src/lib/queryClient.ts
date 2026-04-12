import { QueryClient } from '@tanstack/react-query';
import {
  ApiError,
  ApiNetworkError,
  ApiTimeoutError,
} from './api/apiClient';

const MAX_QUERY_RETRIES = 2;

const isRetriableStatus = (status: number): boolean =>
  status === 408 || status === 429 || status >= 500;

const shouldRetryQuery = (failureCount: number, error: unknown): boolean => {
  if (failureCount >= MAX_QUERY_RETRIES) {
    return false;
  }

  if (error instanceof ApiTimeoutError || error instanceof ApiNetworkError) {
    return true;
  }

  if (error instanceof ApiError) {
    return isRetriableStatus(error.status);
  }

  return true;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: shouldRetryQuery,
      retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4000),
      refetchOnReconnect: true,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
