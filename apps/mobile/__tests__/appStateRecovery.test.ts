import {AppState, type AppStateStatus} from 'react-native';
import renderer from 'react-test-renderer';

// Capture the AppState listener so we can invoke it manually
let appStateListener: ((state: AppStateStatus) => void) | null = null;
const mockRemove = jest.fn();

jest.spyOn(AppState, 'addEventListener').mockImplementation(
  (_type: string, listener: (state: AppStateStatus) => void) => {
    appStateListener = listener;
    return {remove: mockRemove} as any;
  },
);

// Mock queryClient
const mockSubscribe = jest.fn(() => jest.fn());
jest.mock('../src/lib/queryClient', () => ({
  queryClient: {
    getQueryCache: () => ({
      subscribe: mockSubscribe,
    }),
  },
}));

import {useAppStateRecovery} from '../src/hooks/useAppStateRecovery';
import {renderHook} from './helpers/renderHook';

describe('useAppStateRecovery', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    appStateListener = null;
    mockSubscribe.mockClear();
    mockRemove.mockClear();
    mockSubscribe.mockReturnValue(jest.fn());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('isCatchingUp is false initially', () => {
    const {result} = renderHook(() => useAppStateRecovery());
    expect(result.current.isCatchingUp).toBe(false);
  });

  it('isCatchingUp becomes true after background >5 minutes', () => {
    const {result} = renderHook(() => useAppStateRecovery());

    expect(appStateListener).not.toBeNull();

    // Simulate going to background
    const bgTime = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(bgTime);

    renderer.act(() => {
      appStateListener!('background');
    });

    // Simulate returning after 6 minutes
    jest.spyOn(Date, 'now').mockReturnValue(bgTime + 6 * 60 * 1000);

    renderer.act(() => {
      appStateListener!('active');
    });

    expect(result.current.isCatchingUp).toBe(true);
  });

  it('isCatchingUp auto-clears after 5 second timeout', () => {
    const {result} = renderHook(() => useAppStateRecovery());

    // Trigger catching up state
    const bgTime = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(bgTime);

    renderer.act(() => {
      appStateListener!('background');
    });

    jest.spyOn(Date, 'now').mockReturnValue(bgTime + 6 * 60 * 1000);

    renderer.act(() => {
      appStateListener!('active');
    });

    expect(result.current.isCatchingUp).toBe(true);

    // Advance past the 5-second timeout
    renderer.act(() => {
      jest.advanceTimersByTime(5001);
    });

    expect(result.current.isCatchingUp).toBe(false);
  });

  it('isCatchingUp clears on successful query update', () => {
    // Set up mockSubscribe to capture the cache subscription callback
    let cacheCallback: ((event: Record<string, unknown>) => void) | null = null;
    (mockSubscribe as jest.Mock).mockImplementation(
      (cb: (event: Record<string, unknown>) => void) => {
        cacheCallback = cb;
        return jest.fn();
      },
    );

    const {result} = renderHook(() => useAppStateRecovery());

    // Trigger catching up state
    const bgTime = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(bgTime);

    renderer.act(() => {
      appStateListener!('background');
    });

    jest.spyOn(Date, 'now').mockReturnValue(bgTime + 6 * 60 * 1000);

    renderer.act(() => {
      appStateListener!('active');
    });

    expect(result.current.isCatchingUp).toBe(true);

    // Simulate a successful query update via the cache subscription
    expect(cacheCallback).not.toBeNull();

    renderer.act(() => {
      cacheCallback!({
        type: 'updated',
        query: {state: {status: 'success'}},
      });
    });

    expect(result.current.isCatchingUp).toBe(false);
  });
});
