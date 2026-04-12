/**
 * Real-time presence hook — shows who's currently writing on Iskrib.
 *
 * Uses Supabase Realtime Presence to broadcast and track writing activity.
 * Broadcasting is debounced (5s intervals) to minimize battery drain.
 *
 * Offline/error states:
 * - When disconnected, presence data is cleared (bar hides gracefully)
 * - When zero writers, returns empty array (UI collapses to zero height)
 * - Reconnection automatically restores presence tracking
 *
 * Supabase plan limits: Free tier allows 200 concurrent realtime connections.
 * Monitor usage; gate presence to "following" users if limits are hit.
 */
import {useCallback, useEffect, useRef, useState} from 'react';
import {AppState, type AppStateStatus} from 'react-native';
import type {RealtimeChannel} from '@supabase/supabase-js';
import {supabase} from '../lib/supabase';
import {useAuth} from '../features/auth/AuthProvider';

interface PresenceUser {
  userId: string;
  username: string;
  avatarUrl: string | null;
}

type ConnectionState = 'connected' | 'disconnected' | 'connecting';

interface UsePresenceResult {
  /** Users currently writing */
  usersWritingNow: PresenceUser[];
  /** Whether the current user is broadcasting writing state */
  isUserWriting: boolean;
  /** Realtime connection state */
  connectionState: ConnectionState;
  /** Start broadcasting that the current user is writing */
  startWriting: () => void;
  /** Stop broadcasting writing state */
  stopWriting: () => void;
}

const CHANNEL_NAME = 'presence:writing';
const BROADCAST_DEBOUNCE_MS = 5000;

export function usePresence(): UsePresenceResult {
  const {session} = useAuth();
  const [usersWritingNow, setUsersWritingNow] = useState<PresenceUser[]>([]);
  const [isUserWriting, setIsUserWriting] = useState(false);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>('disconnected');

  const channelRef = useRef<RealtimeChannel | null>(null);
  const broadcastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBroadcastRef = useRef<number>(0);

  // Track app state to pause presence when backgrounded
  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state !== 'active' && channelRef.current && isUserWriting) {
        // App backgrounded — stop broadcasting
        channelRef.current.untrack();
        setIsUserWriting(false);
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [isUserWriting]);

  // Set up presence channel
  useEffect(() => {
    if (!session?.user || !supabase) {
      setConnectionState('disconnected');
      setUsersWritingNow([]);
      return;
    }

    const client = supabase;
    const userId = session.user.id;

    setConnectionState('connecting');

    const channel = client.channel(CHANNEL_NAME);

    channel
      .on('presence', {event: 'sync'}, () => {
        const state = channel.presenceState();
        const users: PresenceUser[] = [];

        for (const [presenceKey, presences] of Object.entries(state)) {
          // Skip current user
          if (presenceKey === userId) {
            continue;
          }
          const latest = presences[presences.length - 1] as any;
          if (latest?.is_writing) {
            users.push({
              userId: presenceKey,
              username: latest.username || 'Unknown',
              avatarUrl: latest.avatar_url || null,
            });
          }
        }

        setUsersWritingNow(users);
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          setConnectionState('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionState('disconnected');
          setUsersWritingNow([]);
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      setConnectionState('disconnected');
      setUsersWritingNow([]);
      if (broadcastTimerRef.current) {
        clearTimeout(broadcastTimerRef.current);
      }
    };
  }, [session?.user]);

  const startWriting = useCallback(() => {
    if (!channelRef.current || !session?.user || isUserWriting) {
      return;
    }

    const now = Date.now();
    const timeSinceLastBroadcast = now - lastBroadcastRef.current;

    // Debounce broadcasts to 5s intervals
    if (timeSinceLastBroadcast < BROADCAST_DEBOUNCE_MS) {
      if (!broadcastTimerRef.current) {
        broadcastTimerRef.current = setTimeout(() => {
          broadcastTimerRef.current = null;
          startWriting();
        }, BROADCAST_DEBOUNCE_MS - timeSinceLastBroadcast);
      }
      return;
    }

    lastBroadcastRef.current = now;
    setIsUserWriting(true);

    channelRef.current.track({
      is_writing: true,
      username: session.user.user_metadata?.username || 'Unknown',
      avatar_url: session.user.user_metadata?.avatar_url || null,
    });
  }, [session?.user, isUserWriting]);

  const stopWriting = useCallback(() => {
    if (!channelRef.current || !isUserWriting) {
      return;
    }

    setIsUserWriting(false);
    channelRef.current.untrack();

    if (broadcastTimerRef.current) {
      clearTimeout(broadcastTimerRef.current);
      broadcastTimerRef.current = null;
    }
  }, [isUserWriting]);

  return {
    usersWritingNow,
    isUserWriting,
    connectionState,
    startWriting,
    stopWriting,
  };
}
