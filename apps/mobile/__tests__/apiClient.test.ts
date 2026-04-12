import {
  ApiError,
  ApiNetworkError,
  ApiTimeoutError,
  apiRequest,
} from '../src/lib/api/apiClient';
import {sessionManager} from '../src/lib/sessionManager';

jest.mock('../src/lib/sessionManager', () => ({
  sessionManager: {
    getToken: jest.fn().mockResolvedValue('mock-token'),
    refreshAndGetToken: jest.fn(),
    waitForInit: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockedSessionManager = sessionManager as jest.Mocked<
  typeof sessionManager
>;

describe('apiRequest', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    mockedSessionManager.getToken.mockClear().mockResolvedValue('mock-token');
    mockedSessionManager.refreshAndGetToken.mockClear();
    mockedSessionManager.waitForInit.mockClear().mockResolvedValue(undefined);
  });

  it('returns parsed JSON payload on success', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: {
        get: () => 'application/json',
      },
      json: async () => ({value: 'ok'}),
      text: async () => '',
    } as never);

    const payload = await apiRequest<{value: string}>('/health');
    expect(payload.value).toBe('ok');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('throws ApiError for non-2xx responses', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: {
        get: () => 'application/json',
      },
      json: async () => ({error: 'Unauthorized'}),
      text: async () => '',
    } as never);

    await expect(apiRequest('/private', {retries: 0})).rejects.toBeInstanceOf(
      ApiError,
    );
  });

  it('retries GET requests for retriable status codes', async () => {
    jest.useFakeTimers();
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        headers: {get: () => 'application/json'},
        json: async () => ({error: 'temporarily unavailable'}),
        text: async () => '',
      } as never)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {get: () => 'application/json'},
        json: async () => ({value: 'ok'}),
        text: async () => '',
      } as never);

    const request = apiRequest<{value: string}>('/health', {retries: 1});
    await jest.advanceTimersByTimeAsync(2000);

    await expect(request).resolves.toEqual({value: 'ok'});
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-idempotent methods by default', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      headers: {get: () => 'application/json'},
      json: async () => ({error: 'temporarily unavailable'}),
      text: async () => '',
    } as never);

    await expect(
      apiRequest('/save', {method: 'POST', retries: 3}),
    ).rejects.toBeInstanceOf(ApiError);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('wraps network failures with ApiNetworkError', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('Network request failed'));

    await expect(apiRequest('/health', {retries: 0})).rejects.toBeInstanceOf(
      ApiNetworkError,
    );
  });

  it('throws ApiTimeoutError when request exceeds timeout', async () => {
    jest.useFakeTimers();
    jest.spyOn(globalThis, 'fetch').mockImplementation(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => {
              const abortError = new Error('Aborted');
              abortError.name = 'AbortError';
              reject(abortError);
            },
            {once: true},
          );
        }),
    );

    const pendingRequest = apiRequest('/slow', {timeoutMs: 50, retries: 0});
    pendingRequest.catch(() => undefined);
    await jest.advanceTimersByTimeAsync(100);

    await expect(pendingRequest).rejects.toBeInstanceOf(ApiTimeoutError);
  });

  it('auto-attaches Authorization header from sessionManager', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: {get: () => 'application/json'},
      json: async () => ({ok: true}),
      text: async () => '',
    } as never);

    await apiRequest('/protected', {retries: 0});

    const [, init] = fetchSpy.mock.calls[0];
    const headers = init?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer mock-token');
  });

  it('skips auth header when skipAuth is true', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: {get: () => 'application/json'},
      json: async () => ({ok: true}),
      text: async () => '',
    } as never);

    await apiRequest('/public', {retries: 0, skipAuth: true});

    const [, init] = fetchSpy.mock.calls[0];
    const headers = init?.headers as Headers;
    expect(headers.get('Authorization')).toBeNull();
    expect(mockedSessionManager.getToken).not.toHaveBeenCalled();
  });

  it('on 401 GET: attempts refresh and retries with new token', async () => {
    mockedSessionManager.refreshAndGetToken.mockResolvedValue('fresh-token');

    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: {get: () => 'application/json'},
        json: async () => ({error: 'Unauthorized'}),
        text: async () => '',
      } as never)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {get: () => 'application/json'},
        json: async () => ({retried: true}),
        text: async () => '',
      } as never);

    const result = await apiRequest<{retried: boolean}>('/protected', {
      retries: 0,
    });

    expect(result).toEqual({retried: true});
    expect(mockedSessionManager.refreshAndGetToken).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // Verify retry used the fresh token
    const [, retryInit] = fetchSpy.mock.calls[1];
    const retryHeaders = retryInit?.headers as Headers;
    expect(retryHeaders.get('Authorization')).toBe('Bearer fresh-token');
  });

  it('on 401 POST: does NOT retry (mutation safety)', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: {get: () => 'application/json'},
      json: async () => ({error: 'Unauthorized'}),
      text: async () => '',
    } as never);

    await expect(
      apiRequest('/save', {method: 'POST', retries: 0}),
    ).rejects.toBeInstanceOf(ApiError);

    // refreshAndGetToken should NOT have been called for POST
    expect(mockedSessionManager.refreshAndGetToken).not.toHaveBeenCalled();
  });
});
