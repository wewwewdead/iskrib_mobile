/**
 * Centralized native-stack screen animation config.
 *
 * Use these constants when registering screens or setting `screenOptions`
 * so the navigator's animation vocabulary stays in one place. The `as const`
 * narrows the literal types to satisfy native-stack's `animation` prop.
 */
export const SCREEN_ANIMATIONS = {
  push: 'slide_from_right',
  modal: 'slide_from_bottom',
  fade: 'fade',
  fadeFromBottom: 'fade_from_bottom',
} as const;

/** Default duration for the screen-to-screen slide. Tuned for ~220ms native. */
export const SCREEN_ANIMATION_DURATION = 220;
