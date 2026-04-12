/**
 * Screen entrance animation presets for staged page reveals.
 *
 * Composes Reanimated 4 layout animations with the spring values from
 * `springs.ts` so the motion vocabulary stays consistent with the rest of
 * the app. All entering animations run on the UI thread and automatically
 * honor `useReducedMotion()` (Reanimated handles that for layout animations).
 *
 * Usage:
 *   - `screenInHero` / `feedIn` are applied by the `<ScreenEntrance>` wrapper.
 *   - `heroIn` / `bodyIn` / `actionsIn` can be opted into on individual
 *     `Animated.View` children inside a hero screen for richer staging.
 *
 * Stagger budget: hero screens fit inside ~350ms, feed screens inside ~200ms.
 */
import {FadeIn, FadeInDown, FadeInUp} from 'react-native-reanimated';
import {SpringPresets} from './springs';

const SNAPPY = SpringPresets.snappy;

// Wrapper-level entrances (used by ScreenEntrance component)

/** Hero screen wrapper: snappy fade + lift from below. */
export const screenInHero = FadeInDown.springify()
  .damping(SNAPPY.damping)
  .stiffness(SNAPPY.stiffness)
  .mass(SNAPPY.mass);

/** Feed/list screen wrapper: fast fade only. No translation. */
export const feedIn = FadeIn.duration(120);

// Opt-in inner element entrances (use on Animated.View children inside a hero screen)

/** First-stage element. Title, hero block. No delay. */
export const heroIn = FadeInDown.springify()
  .damping(SNAPPY.damping)
  .stiffness(SNAPPY.stiffness)
  .mass(SNAPPY.mass);

/** Second-stage element. Body content, charts. 50ms delay. */
export const bodyIn = FadeInUp.delay(50)
  .springify()
  .damping(SNAPPY.damping)
  .stiffness(SNAPPY.stiffness)
  .mass(SNAPPY.mass);

/** Third-stage element. CTAs, action bars. 100ms delay. */
export const actionsIn = FadeInUp.delay(100)
  .springify()
  .damping(SNAPPY.damping)
  .stiffness(SNAPPY.stiffness)
  .mass(SNAPPY.mass);
