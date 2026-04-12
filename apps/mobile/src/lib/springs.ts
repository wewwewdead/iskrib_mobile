/**
 * Spring animation presets and hooks for Iskrib.
 *
 * Pre-configured Reanimated spring configs inspired by Benji Taylor's fluid
 * design philosophy. All animations run on the native thread via worklets.
 *
 * Tuning guidance:
 * - gentle: fluid motion without bounce — for page transitions, fade-ins
 * - bouncy: visible overshoot — for reactions, celebrations, entry animations
 * - snappy: crisp and fast — for toggles, toolbar show/hide, micro-interactions
 * - breathing: infinite oscillation — for save indicators, presence, FAB idle
 *
 * Breathing scale values:
 * - Subtle idle (FAB, presence avatars): 1.0 ↔ 1.02
 * - Visibility-critical (save indicator): 1.0 ↔ 1.15
 */
import {useEffect} from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  type WithSpringConfig,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';

// ─── Spring Configs ───

export const SpringPresets = {
  gentle: {
    damping: 20,
    stiffness: 150,
    mass: 1,
  } satisfies WithSpringConfig,

  bouncy: {
    damping: 12,
    stiffness: 200,
    mass: 1,
  } satisfies WithSpringConfig,

  snappy: {
    damping: 30,
    stiffness: 300,
    mass: 0.8,
  } satisfies WithSpringConfig,
} as const;

// ─── Hooks ───

/**
 * Spring entry animation — scale and opacity spring to 1 with spring physics.
 * Returns animated style to spread onto an Animated.View.
 * Skips animation if reduce-motion is enabled.
 *
 * @param delay - ms before the spring starts. Default 0.
 * @param preset - optional preset override. Default behavior (omitted):
 *   scale uses `bouncy`, opacity uses `gentle` (the original pop-in feel).
 *   Pass `'gentle'` to use gentle for BOTH scale and opacity — the
 *   subtler feel used by peek. Pass `'bouncy'` explicitly for the default.
 * @param initialScale - starting scale value. Default 0 (pops in from
 *   nothing). Use 0.96 for a subtle "settle" effect (peek modal).
 */
export function useSpringEntry(
  delay = 0,
  preset?: 'bouncy' | 'gentle',
  initialScale = 0,
) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(reduceMotion ? 1 : initialScale);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    const scaleConfig =
      preset === 'gentle' ? SpringPresets.gentle : SpringPresets.bouncy;
    const opacityConfig = SpringPresets.gentle;
    const timer = setTimeout(() => {
      scale.value = withSpring(1, scaleConfig);
      opacity.value = withSpring(1, opacityConfig);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay, preset, reduceMotion, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
    opacity: opacity.value,
  }));

  return animatedStyle;
}

/**
 * Spring press animation — scale down on press, spring back on release.
 * Returns { animatedStyle, onPressIn, onPressOut }.
 */
export function useSpringPress(scaleDown = 0.97) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const onPressIn = () => {
    if (reduceMotion) {
      return;
    }
    scale.value = withSpring(scaleDown, SpringPresets.snappy);
  };

  const onPressOut = () => {
    if (reduceMotion) {
      return;
    }
    scale.value = withSpring(1, SpringPresets.bouncy);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  return {animatedStyle, onPressIn, onPressOut};
}

/**
 * Breathing animation — continuous scale oscillation for living indicators.
 *
 * @param maxScale - Peak scale value. Use 1.02 for subtle idle, 1.15 for visibility-critical.
 * @param duration - Duration of one half-cycle in ms. Default 1500.
 */
export function useBreathing(maxScale = 1.02, duration = 1500) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      scale.value = 1;
      return;
    }
    scale.value = withRepeat(
      withSequence(
        withTiming(maxScale, {duration, easing: Easing.inOut(Easing.ease)}),
        withTiming(1, {duration, easing: Easing.inOut(Easing.ease)}),
      ),
      -1, // infinite
      false,
    );
  }, [maxScale, duration, reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  return animatedStyle;
}

/**
 * Spring fade-in — opacity springs from 0 to 1.
 * Simpler than useSpringEntry (no scale).
 */
export function useSpringFadeIn(delay = 0) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    const timer = setTimeout(() => {
      opacity.value = withSpring(1, SpringPresets.gentle);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay, reduceMotion, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return animatedStyle;
}

/**
 * Spring entrance animation with lift + fade.
 * Good for staged screen content where scale would feel too performative.
 */
export function useSpringEntrance(delay = 0, offset = 18, scaleFrom = 1) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const translateY = useSharedValue(reduceMotion ? 0 : offset);
  const scale = useSharedValue(reduceMotion ? 1 : scaleFrom);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      translateY.value = 0;
      scale.value = 1;
      return;
    }

    const timer = setTimeout(() => {
      opacity.value = withSpring(1, SpringPresets.gentle);
      translateY.value = withSpring(0, SpringPresets.gentle);
      scale.value = withSpring(1, SpringPresets.gentle);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, offset, reduceMotion, opacity, translateY, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      {translateY: translateY.value},
      {scale: scale.value},
    ],
  }));

  return animatedStyle;
}
