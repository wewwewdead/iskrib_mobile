import React, {useEffect} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import {SpringPresets} from '../lib/springs';
import {useTheme} from '../theme/ThemeProvider';
import {fonts} from '../theme/typography';
import {spacing, radii} from '../theme/spacing';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  visible: boolean;
  duration?: number;
  bottomOffset?: number;
  onDismiss: () => void;
}

export function Toast({
  message,
  type = 'info',
  visible,
  duration = 3000,
  bottomOffset = spacing.xxxl,
  onDismiss,
}: ToastProps) {
  const {colors} = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      progress.value = withSequence(
        withSpring(1, SpringPresets.gentle),
        withDelay(
          duration,
          withTiming(0, {duration: 400}, finished => {
            if (finished) {
              runOnJS(onDismiss)();
            }
          }),
        ),
      );
    } else {
      progress.value = withTiming(0, {duration: 200});
    }
  }, [visible, duration, onDismiss, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.4, 1], [0, 1, 1], Extrapolation.CLAMP),
    transform: [
      {translateY: interpolate(progress.value, [0, 1], [12, 0], Extrapolation.CLAMP)},
    ],
  }));

  const dotColor =
    type === 'success'
      ? colors.accentSage
      : type === 'error'
        ? colors.danger
        : colors.accentAmber;

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {bottom: bottomOffset},
        animatedStyle,
      ]}
      pointerEvents="none">
      <View style={[styles.toast, {backgroundColor: colors.bgElevated}]}>
        <View style={[styles.dot, {backgroundColor: dotColor}]} />
        <Text style={[styles.message, {color: colors.textSecondary}]} numberOfLines={2}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.pill,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.serif.italic,
    letterSpacing: 0.1,
  },
});
