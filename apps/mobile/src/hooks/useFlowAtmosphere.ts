/**
 * Flow-responsive atmosphere engine for the writing editor.
 *
 * Tracks typing velocity (character deltas over a rolling 30-second window)
 * and session duration to compute a "warmth" value (0-1) and flow level (0-3).
 * These drive the AtmosphereLayer visual overlays.
 *
 * Inputs: call `reportTypingEvent(charDelta)` from the editor's onChange.
 * Outputs: Reanimated shared values for native-thread visual transitions.
 */
import {useCallback, useEffect, useRef, useState} from 'react';
import {AppState, type AppStateStatus} from 'react-native';
import {
  useSharedValue,
  withTiming,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {softTapHaptic} from '../lib/haptics';

const STORAGE_KEY = '@iskrib:atmosphereEnabled';
const TICK_INTERVAL_MS = 500;
const VELOCITY_WINDOW_MS = 30_000;
const CHARS_AT_MAX_VELOCITY = 300; // ~60 wpm over 30s
const SESSION_DEPTH_CAP_MIN = 10;
const VELOCITY_WEIGHT = 0.85;
const SESSION_DEPTH_WEIGHT = 0.15;

// Flow level thresholds
const LEVEL_1_MIN_SESSION_S = 30;
const LEVEL_1_MIN_VELOCITY = 0.1;
const LEVEL_2_SUSTAINED_S = 120; // 2 minutes
const LEVEL_3_SUSTAINED_S = 300; // 5 minutes
const SUSTAINED_VELOCITY_THRESHOLD = 0.3;
const SUSTAINED_RESET_IDLE_S = 30;

// Transition timing (ms) — slow enough to be imperceptible
const WARMTH_TRANSITION_MS = 3000;
const LEVEL_DROP_IDLE_S = 30; // seconds of idle before dropping one level

interface TypingEvent {
  charDelta: number;
  timestamp: number;
}

export function useFlowAtmosphere() {
  const reduceMotion = useReducedMotion();

  // Persisted toggle
  const [enabled, setEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      if (val === 'false') setEnabled(false);
      setLoaded(true);
    });
  }, []);

  // Re-read toggle when app returns to foreground (covers Settings changes)
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        AsyncStorage.getItem(STORAGE_KEY).then(val => {
          setEnabled(val !== 'false');
        });
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, []);

  const toggleEnabled = useCallback(async () => {
    const next = !enabled;
    setEnabled(next);
    await AsyncStorage.setItem(STORAGE_KEY, String(next));
  }, [enabled]);

  // Shared values for native-thread animation
  const warmth = useSharedValue(0);
  const flowLevel = useSharedValue(0);

  // JS-thread tracking refs
  const eventsRef = useRef<TypingEvent[]>([]);
  const sessionStartRef = useRef(Date.now());
  const sustainedSecondsRef = useRef(0);
  const lastAboveThresholdRef = useRef(0);
  const lastTypingRef = useRef(0);
  const levelDropTimerRef = useRef(0);
  const flowEntryFiredRef = useRef(false);
  const prevFlowLevelRef = useRef(0);
  const prevContentLenRef = useRef(0);

  // The sole input — any editor calls this with character count changes
  const reportTypingEvent = useCallback(
    (contentLength: number) => {
      if (!enabled) return;
      const now = Date.now();
      const delta = Math.abs(contentLength - prevContentLenRef.current);
      prevContentLenRef.current = contentLength;
      if (delta > 0) {
        eventsRef.current.push({charDelta: delta, timestamp: now});
        lastTypingRef.current = now;
      }
    },
    [enabled],
  );

  // Tick loop — runs every 500ms on JS thread, pauses when app is backgrounded
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled || !loaded) return;

    sessionStartRef.current = Date.now();
    eventsRef.current = [];
    sustainedSecondsRef.current = 0;
    lastAboveThresholdRef.current = 0;
    lastTypingRef.current = 0;
    levelDropTimerRef.current = 0;
    flowEntryFiredRef.current = false;
    prevFlowLevelRef.current = 0;
    prevContentLenRef.current = 0;

    const timingConfig = {
      duration: reduceMotion ? 0 : WARMTH_TRANSITION_MS,
      easing: Easing.inOut(Easing.ease),
    };

    const tick = () => {
      const now = Date.now();

      // Prune old events outside the velocity window
      const cutoff = now - VELOCITY_WINDOW_MS;
      eventsRef.current = eventsRef.current.filter(e => e.timestamp >= cutoff);

      // Compute velocity (0-1)
      const totalChars = eventsRef.current.reduce(
        (sum, e) => sum + e.charDelta,
        0,
      );
      const velocity = Math.min(totalChars / CHARS_AT_MAX_VELOCITY, 1);

      // Compute session depth (0-1, caps at 10 minutes)
      const sessionMinutes =
        (now - sessionStartRef.current) / 60_000;
      const sessionDepth = Math.min(sessionMinutes / SESSION_DEPTH_CAP_MIN, 1);

      // Compute warmth
      const w = velocity * VELOCITY_WEIGHT + sessionDepth * SESSION_DEPTH_WEIGHT;
      warmth.value = withTiming(w, timingConfig);

      // Track sustained seconds for flow level thresholds
      const idleSeconds = lastTypingRef.current > 0
        ? (now - lastTypingRef.current) / 1000
        : Infinity;

      if (velocity >= SUSTAINED_VELOCITY_THRESHOLD) {
        // Accumulate sustained time (0.5s per tick)
        sustainedSecondsRef.current += TICK_INTERVAL_MS / 1000;
        lastAboveThresholdRef.current = now;
      } else if (idleSeconds >= SUSTAINED_RESET_IDLE_S) {
        // Reset sustained counter after prolonged idle
        sustainedSecondsRef.current = 0;
      }

      // Compute flow level
      let newLevel = 0;
      if (
        velocity >= LEVEL_1_MIN_VELOCITY &&
        sessionMinutes * 60 >= LEVEL_1_MIN_SESSION_S
      ) {
        newLevel = 1;
      }
      if (sustainedSecondsRef.current >= LEVEL_2_SUSTAINED_S) {
        newLevel = 2;
      }
      if (sustainedSecondsRef.current >= LEVEL_3_SUSTAINED_S) {
        newLevel = 3;
      }

      // Level drop hysteresis — only drop one level per LEVEL_DROP_IDLE_S of inactivity
      const prevLevel = prevFlowLevelRef.current;
      if (newLevel < prevLevel) {
        levelDropTimerRef.current += TICK_INTERVAL_MS / 1000;
        if (levelDropTimerRef.current >= LEVEL_DROP_IDLE_S) {
          // Drop one level at a time
          newLevel = Math.max(newLevel, prevLevel - 1);
          levelDropTimerRef.current = 0;
        } else {
          // Hold at previous level during grace period
          newLevel = prevLevel;
        }
      } else {
        levelDropTimerRef.current = 0;
      }

      prevFlowLevelRef.current = newLevel;
      flowLevel.value = withTiming(newLevel, timingConfig);

      // Flow state entry haptic — fires once per session
      if (newLevel === 3 && !flowEntryFiredRef.current) {
        flowEntryFiredRef.current = true;
        softTapHaptic();
      }
    };

    const startInterval = () => {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(tick, TICK_INTERVAL_MS);
    };

    const stopInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    // Pause when app is backgrounded, resume when foregrounded
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        startInterval();
      } else {
        stopInterval();
      }
    };
    const appStateSub = AppState.addEventListener('change', handleAppState);

    startInterval();

    return () => {
      stopInterval();
      appStateSub.remove();
      warmth.value = withTiming(0, timingConfig);
      flowLevel.value = withTiming(0, timingConfig);
    };
  }, [enabled, loaded, reduceMotion, warmth, flowLevel]);

  return {
    warmth,
    flowLevel,
    enabled,
    loaded,
    toggleEnabled,
    reportTypingEvent,
  };
}
