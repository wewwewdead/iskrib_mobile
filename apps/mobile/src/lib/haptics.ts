/**
 * Haptic feedback engine — semantic haptic patterns for Iskrib.
 *
 * Uses react-native-haptic-feedback (bare RN compatible).
 * Graceful degradation: full experience on iOS, vibration fallback on Android.
 * Respects system accessibility settings (reduce-motion disables haptics).
 */
import {AccessibilityInfo, Platform} from 'react-native';
import ReactNativeHapticFeedback, {
  HapticFeedbackTypes,
} from 'react-native-haptic-feedback';

const options = {
  enableVibrateFallback: true, // Android vibration fallback
  ignoreAndroidSystemSettings: true, // Bypass OEM haptic toggle for consistent UX
};

let reduceMotionEnabled = false;

// Listen for reduce-motion changes
AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
  reduceMotionEnabled = enabled;
});
const _rmListener = AccessibilityInfo.addEventListener(
  'reduceMotionChanged',
  enabled => {
    reduceMotionEnabled = enabled;
  },
);
void _rmListener;

function trigger(type: HapticFeedbackTypes) {
  if (reduceMotionEnabled) {
    return;
  }
  try {
    ReactNativeHapticFeedback.trigger(type, options);
  } catch {
    // Silently fail — haptics are enhancement, not critical
  }
}

/** Light tap — for button presses, selections, navigation taps */
export function tapHaptic() {
  trigger(
    Platform.OS === 'ios'
      ? HapticFeedbackTypes.impactLight
      : HapticFeedbackTypes.effectClick,
  );
}

/** Success — for save confirmations, auth completion, publish */
export function successHaptic() {
  trigger(HapticFeedbackTypes.notificationSuccess);
}

/** Error — for validation failures, network errors */
export function errorHaptic() {
  trigger(HapticFeedbackTypes.notificationError);
}

/** Milestone — heavy impact for word count milestones (100, 250, 500, 1000) */
export function milestoneHaptic() {
  trigger(
    Platform.OS === 'ios'
      ? HapticFeedbackTypes.impactHeavy
      : HapticFeedbackTypes.effectHeavyClick,
  );
}

/** Writing pulse — medium impact for periodic writing encouragement */
export function writingPulseHaptic() {
  trigger(
    Platform.OS === 'ios'
      ? HapticFeedbackTypes.impactMedium
      : HapticFeedbackTypes.effectDoubleClick,
  );
}

/** Selection — for text selection, toggle changes */
export function selectionHaptic() {
  trigger(HapticFeedbackTypes.selection);
}

/** Soft tap — for subtle feedback like paragraph completion */
export function softTapHaptic() {
  trigger(
    Platform.OS === 'ios'
      ? HapticFeedbackTypes.impactLight
      : HapticFeedbackTypes.selection,
  );
}

export const Haptics = {
  tap: tapHaptic,
  success: successHaptic,
  error: errorHaptic,
  milestone: milestoneHaptic,
  writingPulse: writingPulseHaptic,
  selection: selectionHaptic,
  softTap: softTapHaptic,
} as const;
