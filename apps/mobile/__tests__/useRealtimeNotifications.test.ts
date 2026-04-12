import {renderHook} from './helpers/renderHook';

let mockSubscribeCallback: ((status: string) => void) | null = null;

const mockChannel: Record<string, jest.Mock> = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn((cb?: (status: string) => void) => {
    if (cb) {
      mockSubscribeCallback = cb;
    }
    return mockChannel;
  }),
};

// The supabase mock object — must have removeChannel directly on it
const mockSupabase = {
  channel: jest.fn(() => mockChannel),
  removeChannel: jest.fn(),
};

jest.mock('../src/lib/supabase', () => ({
  get supabase() {
    return mockSupabase;
  },
}));

jest.mock('../src/lib/queryClient', () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
  },
}));

import {useRealtimeNotifications} from '../src/hooks/useRealtimeNotifications';

describe('useRealtimeNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscribeCallback = null;
    // Reset the on/subscribe chain
    mockChannel.on.mockReturnThis();
    mockChannel.subscribe.mockImplementation(
      (cb?: (status: string) => void) => {
        if (cb) {
          mockSubscribeCallback = cb;
        }
        return mockChannel;
      },
    );
  });

  it('subscribes to channel when userId is provided', () => {
    renderHook(() => useRealtimeNotifications('user-123'));

    expect(mockSupabase.channel).toHaveBeenCalledWith('notifications:user-123');
    expect(mockChannel.on).toHaveBeenCalled();
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it('does not subscribe when userId is undefined', () => {
    renderHook(() => useRealtimeNotifications(undefined));

    expect(mockSupabase.channel).not.toHaveBeenCalled();
  });

  it('calls removeChannel on cleanup', () => {
    const {unmount} = renderHook(() =>
      useRealtimeNotifications('user-456'),
    );

    unmount();

    expect(mockSupabase.removeChannel).toHaveBeenCalled();
  });

  it('reconnects on CHANNEL_ERROR status', () => {
    jest.useFakeTimers();

    renderHook(() => useRealtimeNotifications('user-789'));

    // Initial subscription
    const initialCallCount = mockSupabase.channel.mock.calls.length;
    expect(initialCallCount).toBe(1);

    // Simulate CHANNEL_ERROR via the subscribe callback
    expect(mockSubscribeCallback).not.toBeNull();
    mockSubscribeCallback!('CHANNEL_ERROR');

    // Advance past reconnect delay (base = 2000ms)
    jest.advanceTimersByTime(3000);

    // Should have removed old channel and created a new one
    expect(mockSupabase.removeChannel).toHaveBeenCalled();
    expect(mockSupabase.channel.mock.calls.length).toBeGreaterThan(
      initialCallCount,
    );

    jest.useRealTimers();
  });

  it('does not queue duplicate reconnect timers for the same channel', () => {
    jest.useFakeTimers();

    renderHook(() => useRealtimeNotifications('user-789'));

    expect(mockSubscribeCallback).not.toBeNull();
    mockSubscribeCallback!('CHANNEL_ERROR');
    mockSubscribeCallback!('TIMED_OUT');

    jest.advanceTimersByTime(3000);

    expect(mockSupabase.channel).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });

  it('does not reconnect after unmount', () => {
    jest.useFakeTimers();

    const {unmount} = renderHook(() => useRealtimeNotifications('user-999'));

    expect(mockSubscribeCallback).not.toBeNull();
    mockSubscribeCallback!('CHANNEL_ERROR');
    unmount();

    jest.advanceTimersByTime(3000);

    expect(mockSupabase.channel).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });
});
