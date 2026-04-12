/**
 * Gesture vocabulary for Iskrib — built on react-native-gesture-handler v2.
 *
 * Provides reusable gesture hooks for Honk-style micro-interactions:
 * - Double-tap reactions with heart at tap coordinates
 * - Spring-physics pull-to-refresh
 * - Swipe-to-dismiss
 *
 * Accessibility: When VoiceOver/TalkBack is active, double-tap gestures
 * are disabled (double-tap is the screen reader activation gesture).
 * Components should provide a visible fallback button.
 */
import {useCallback, useEffect, useRef, useState} from 'react';
import {AccessibilityInfo} from 'react-native';
import {Gesture} from 'react-native-gesture-handler';
import {
  useSharedValue,
  withSpring,
  withTiming,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import {SpringPresets} from './springs';
import {Haptics} from './haptics';

// Track screen reader state globally
let screenReaderActive = false;

AccessibilityInfo.isScreenReaderEnabled().then(enabled => {
  screenReaderActive = enabled;
});
const _srListener = AccessibilityInfo.addEventListener(
  'screenReaderChanged',
  enabled => {
    screenReaderActive = enabled;
  },
);
// Keep reference to prevent garbage collection
void _srListener;

/** Check if screen reader is currently active */
export function isScreenReaderActive(): boolean {
  return screenReaderActive;
}

interface DoubleTapReactionResult {
  /** The composed Exclusive gesture (doubleTap prioritized over singleTap) */
  gesture: ReturnType<typeof Gesture.Exclusive>;
  /** Whether a reaction is currently showing */
  showReaction: boolean;
  /** Coordinates where the heart should appear */
  reactionPosition: {x: number; y: number};
  /** Whether screen reader is active (show button fallback instead) */
  isScreenReader: boolean;
}

/**
 * Double-tap reaction gesture — Honk-style heart at tap coordinates.
 *
 * Uses Gesture.Exclusive(doubleTap, singleTap) to disambiguate.
 * Note: This adds ~250ms delay to single-tap — acceptable tradeoff for delight.
 *
 * When VoiceOver/TalkBack is active, returns a no-op gesture.
 * Use `isScreenReader` to conditionally render a visible heart button.
 *
 * @param onReact - Called when double-tap fires (trigger API call, etc.)
 * @param onSingleTap - Called on single tap (navigation, etc.)
 */
export function useDoubleTapReaction(
  onReact: () => void,
  onSingleTap?: () => void,
): DoubleTapReactionResult {
  const [showReaction, setShowReaction] = useState(false);
  const [reactionPosition, setReactionPosition] = useState({x: 0, y: 0});
  const [isScreenReader, setIsScreenReader] = useState(screenReaderActive);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const listener = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      enabled => {
        setIsScreenReader(enabled);
      },
    );
    return () => listener.remove();
  }, []);

  const handleDoubleTap = useCallback(
    (x: number, y: number) => {
      setReactionPosition({x, y});
      setShowReaction(true);
      Haptics.tap();
      onReact();

      // Auto-hide after 1.5s
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
      }
      hideTimer.current = setTimeout(() => setShowReaction(false), 1500);
    },
    [onReact],
  );

  const handleSingleTap = useCallback(() => {
    onSingleTap?.();
  }, [onSingleTap]);

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(event => {
      if (!screenReaderActive) {
        runOnJS(handleDoubleTap)(event.x, event.y);
      }
    });

  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      runOnJS(handleSingleTap)();
    });

  // Exclusive: doubleTap wins over singleTap when both could match
  const gesture = Gesture.Exclusive(doubleTap, singleTap);

  return {gesture, showReaction, reactionPosition, isScreenReader};
}

/**
 * Spring-animated value for pull-to-refresh visual indicator.
 * Use with native RefreshControl — this only handles the visual spring,
 * not scroll physics (which would conflict with FlatList internals).
 */
export function useSpringRefresh() {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  const onRefreshStart = () => {
    rotation.value = withTiming(360, {duration: 800});
    scale.value = withSpring(1.1, SpringPresets.bouncy);
  };

  const onRefreshEnd = () => {
    rotation.value = withTiming(0, {duration: 300});
    scale.value = withSpring(1, SpringPresets.gentle);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {rotate: `${rotation.value}deg`},
      {scale: scale.value},
    ],
  }));

  return {animatedStyle, onRefreshStart, onRefreshEnd};
}

/**
 * Swipe-to-dismiss gesture with velocity-based spring.
 *
 * @param onDismiss - Called when swipe threshold is crossed
 * @param direction - 'left' | 'right' | 'both'
 * @param threshold - Minimum translation to trigger dismiss (default 100)
 */
export function useSwipeDismiss(
  onDismiss: () => void,
  direction: 'left' | 'right' | 'both' = 'right',
  threshold = 100,
) {
  const translateX = useSharedValue(0);

  const handleDismiss = useCallback(() => {
    Haptics.tap();
    onDismiss();
  }, [onDismiss]);

  const panGesture = Gesture.Pan()
    .onUpdate(event => {
      if (direction === 'right' && event.translationX < 0) {
        return;
      }
      if (direction === 'left' && event.translationX > 0) {
        return;
      }
      translateX.value = event.translationX;
    })
    .onEnd(event => {
      if (Math.abs(event.translationX) > threshold) {
        translateX.value = withTiming(
          event.translationX > 0 ? 400 : -400,
          {duration: 200},
        );
        runOnJS(handleDismiss)();
      } else {
        translateX.value = withSpring(0, SpringPresets.snappy);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{translateX: translateX.value}],
    opacity:
      1 - Math.min(Math.abs(translateX.value) / 400, 0.5),
  }));

  return {panGesture, animatedStyle};
}
