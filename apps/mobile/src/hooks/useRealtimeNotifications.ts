import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { queryClient } from '../lib/queryClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

type Options = {
  onNewNotification?: (payload: Record<string, unknown>) => void;
};

const RECONNECT_BASE_MS = 2000;
const RECONNECT_CAP_MS = 30000;

export function useRealtimeNotifications(
  userId: string | undefined,
  options?: Options,
) {
  const callbackRef = useRef(options?.onNewNotification);
  callbackRef.current = options?.onNewNotification;
  const reconnectAttemptRef = useRef(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userId || !supabase) return;
    const client = supabase;
    let isActive = true;

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      queryClient.invalidateQueries({ queryKey: ['notification-count', userId] });
    };

    const subscribe = () => {
      const channel: RealtimeChannel = client
        .channel(`notifications:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `receiver_id=eq.${userId}`,
          },
          (payload) => {
            invalidate();
            callbackRef.current?.(payload.new as Record<string, unknown>);
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notification_opinions',
            filter: `receiver_id=eq.${userId}`,
          },
          (payload) => {
            invalidate();
            callbackRef.current?.(payload.new as Record<string, unknown>);
          },
        )
        .subscribe((status) => {
          if (!isActive || channelRef.current !== channel) {
            return;
          }

          if (status === 'SUBSCRIBED') {
            reconnectAttemptRef.current = 0;
            clearReconnectTimer();
            return;
          }

          if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            if (reconnectTimerRef.current) {
              return;
            }

            const delay = Math.min(
              RECONNECT_BASE_MS * 2 ** reconnectAttemptRef.current,
              RECONNECT_CAP_MS,
            );
            reconnectAttemptRef.current += 1;

            reconnectTimerRef.current = setTimeout(() => {
              if (!isActive || channelRef.current !== channel) {
                return;
              }

              clearReconnectTimer();
              channelRef.current = subscribe();
              client.removeChannel(channel);
              invalidate();
            }, delay);
          }
        });

      channelRef.current = channel;
      return channel;
    };

    subscribe();

    return () => {
      isActive = false;
      clearReconnectTimer();
      if (channelRef.current) {
        client.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId]);
}
