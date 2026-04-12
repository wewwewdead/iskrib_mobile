import renderer from 'react-test-renderer';
import {renderHook} from './helpers/renderHook';

// --- Mocks (before import) ---

const mockSoftTapHaptic = jest.fn();
jest.mock('../src/lib/haptics', () => ({
  softTapHaptic: () => mockSoftTapHaptic(),
}));

let mockStoredValue: string | null = null;
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(mockStoredValue)),
    setItem: jest.fn((_key: string, val: string) => {
      mockStoredValue = val;
      return Promise.resolve();
    }),
  },
}));

// Minimal reanimated mock for hook tests
jest.mock('react-native-reanimated', () => {
  const sharedValue = (init: number) => ({value: init});
  return {
    useSharedValue: (init: number) => sharedValue(init),
    withTiming: (val: number) => val,
    Easing: {inOut: () => ({}), ease: {}},
    useReducedMotion: () => false,
  };
});

// Mock AppState
const mockAppStateListeners: Array<(state: string) => void> = [];
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn((_type: string, fn: (state: string) => void) => {
      mockAppStateListeners.push(fn);
      return {remove: jest.fn()};
    }),
  },
}));

import {useFlowAtmosphere} from '../src/hooks/useFlowAtmosphere';

describe('useFlowAtmosphere', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockStoredValue = null;
    mockSoftTapHaptic.mockClear();
    mockAppStateListeners.length = 0;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns expected shape with defaults', async () => {
    const {result} = renderHook(() => useFlowAtmosphere());

    // Allow AsyncStorage read to resolve
    await renderer.act(async () => {
      await Promise.resolve();
    });

    expect(result.current.enabled).toBe(true);
    expect(result.current.loaded).toBe(true);
    expect(result.current.warmth).toBeDefined();
    expect(result.current.flowLevel).toBeDefined();
    expect(typeof result.current.reportTypingEvent).toBe('function');
    expect(typeof result.current.toggleEnabled).toBe('function');
  });

  it('reads enabled=false from AsyncStorage', async () => {
    mockStoredValue = 'false';
    const {result} = renderHook(() => useFlowAtmosphere());

    await renderer.act(async () => {
      await Promise.resolve();
    });

    expect(result.current.enabled).toBe(false);
  });

  it('toggleEnabled flips state and persists', async () => {
    const {result} = renderHook(() => useFlowAtmosphere());
    await renderer.act(async () => {
      await Promise.resolve();
    });
    expect(result.current.enabled).toBe(true);

    await renderer.act(async () => {
      await result.current.toggleEnabled();
    });

    expect(result.current.enabled).toBe(false);
    expect(mockStoredValue).toBe('false');
  });

  it('reportTypingEvent does nothing when disabled', async () => {
    mockStoredValue = 'false';
    const {result} = renderHook(() => useFlowAtmosphere());
    await renderer.act(async () => {
      await Promise.resolve();
    });

    // Should not throw
    result.current.reportTypingEvent(100);
    expect(result.current.warmth.value).toBe(0);
  });

  it('warmth stays 0 with no typing events', async () => {
    const {result} = renderHook(() => useFlowAtmosphere());
    await renderer.act(async () => {
      await Promise.resolve();
    });

    // Advance past a few ticks
    renderer.act(() => {
      jest.advanceTimersByTime(2000);
    });

    // Warmth should be near 0 (tiny sessionDepth contribution at most)
    expect(result.current.warmth.value).toBeLessThan(0.01);
  });

  it('warmth increases when typing events are reported', async () => {
    const {result} = renderHook(() => useFlowAtmosphere());
    await renderer.act(async () => {
      await Promise.resolve();
    });

    // Simulate typing: report increasing content lengths
    renderer.act(() => {
      for (let i = 0; i < 20; i++) {
        result.current.reportTypingEvent(i * 15); // ~15 chars per event
        jest.advanceTimersByTime(500);
      }
    });

    // After 10 seconds of typing at ~15 chars per event, velocity should be nonzero
    expect(result.current.warmth.value).toBeGreaterThan(0.05);
  });

  it('flow level reaches 1 after 30+ seconds of typing', async () => {
    const {result} = renderHook(() => useFlowAtmosphere());
    await renderer.act(async () => {
      await Promise.resolve();
    });

    // Simulate 35 seconds of steady typing
    renderer.act(() => {
      for (let i = 0; i < 70; i++) {
        result.current.reportTypingEvent(i * 5);
        jest.advanceTimersByTime(500);
      }
    });

    expect(result.current.flowLevel.value).toBeGreaterThanOrEqual(1);
  });

  it('flow level stays 0 with very slow typing', async () => {
    const {result} = renderHook(() => useFlowAtmosphere());
    await renderer.act(async () => {
      await Promise.resolve();
    });

    // Type one char every 5 seconds — well below velocity threshold
    renderer.act(() => {
      for (let i = 0; i < 20; i++) {
        result.current.reportTypingEvent(i);
        jest.advanceTimersByTime(5000);
      }
    });

    expect(result.current.flowLevel.value).toBe(0);
  });

  it('does not fire haptic before flow level 3', async () => {
    const {result} = renderHook(() => useFlowAtmosphere());
    await renderer.act(async () => {
      await Promise.resolve();
    });

    // Simulate 60 seconds of moderate typing (reaches level 1, maybe 2)
    renderer.act(() => {
      for (let i = 0; i < 120; i++) {
        result.current.reportTypingEvent(i * 5);
        jest.advanceTimersByTime(500);
      }
    });

    // Should not have fired haptic (takes 5 min of sustained typing)
    expect(mockSoftTapHaptic).not.toHaveBeenCalled();
  });

  it('fires haptic exactly once when reaching flow level 3', async () => {
    const {result} = renderHook(() => useFlowAtmosphere());
    await renderer.act(async () => {
      await Promise.resolve();
    });

    // Simulate 6 minutes of sustained fast typing (>300 chars per 30s window)
    // 720 ticks * 500ms = 360 seconds = 6 minutes
    renderer.act(() => {
      for (let i = 0; i < 720; i++) {
        // Report ~10 chars per 500ms tick = 600 chars per 30s window (well above threshold)
        result.current.reportTypingEvent(i * 10);
        jest.advanceTimersByTime(500);
      }
    });

    expect(result.current.flowLevel.value).toBe(3);
    expect(mockSoftTapHaptic).toHaveBeenCalledTimes(1);

    // Continue typing — haptic should NOT fire again
    renderer.act(() => {
      for (let i = 720; i < 740; i++) {
        result.current.reportTypingEvent(i * 10);
        jest.advanceTimersByTime(500);
      }
    });

    expect(mockSoftTapHaptic).toHaveBeenCalledTimes(1);
  });

  it('warmth decays when typing stops', async () => {
    const {result} = renderHook(() => useFlowAtmosphere());
    await renderer.act(async () => {
      await Promise.resolve();
    });

    // Build up warmth with fast typing
    renderer.act(() => {
      for (let i = 0; i < 60; i++) {
        result.current.reportTypingEvent(i * 10);
        jest.advanceTimersByTime(500);
      }
    });

    const warmthDuringTyping = result.current.warmth.value;
    expect(warmthDuringTyping).toBeGreaterThan(0.1);

    // Stop typing, let time pass (60 seconds)
    renderer.act(() => {
      jest.advanceTimersByTime(60_000);
    });

    // Warmth should have decayed (velocity drops to 0 as events age out)
    expect(result.current.warmth.value).toBeLessThan(warmthDuringTyping);
  });

  it('resets state on unmount', async () => {
    const {result, unmount} = renderHook(() => useFlowAtmosphere());
    await renderer.act(async () => {
      await Promise.resolve();
    });

    // Build up some warmth
    renderer.act(() => {
      for (let i = 0; i < 40; i++) {
        result.current.reportTypingEvent(i * 10);
        jest.advanceTimersByTime(500);
      }
    });

    // Unmount should clean up (warmth resets to 0)
    renderer.act(() => {
      unmount();
    });

    expect(result.current.warmth.value).toBe(0);
    expect(result.current.flowLevel.value).toBe(0);
  });
});
