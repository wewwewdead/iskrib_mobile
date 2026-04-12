/**
 * SaveIndicator — a living dot that shows save status.
 *
 * Design review refinement: uses COLOR SHIFT (not scale breathing) to avoid
 * animation uniformity with other breathing elements. Only the FAB breathes.
 *
 * States: saved (sage), saving (golden pulse), error (red), unsaved (faint)
 */
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';
import {useEffect} from 'react';
import {useTheme} from '../theme/ThemeProvider';
import {fonts} from '../theme/typography';
import {spacing} from '../theme/spacing';

interface SaveIndicatorProps {
  status: 'saved' | 'saving' | 'unsaved' | 'error';
}

export function SaveIndicator({status}: SaveIndicatorProps) {
  const {colors} = useTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      return;
    }

    if (status === 'saving') {
      // Pulsing opacity when saving (color shift, not scale)
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.4, {duration: 500, easing: Easing.inOut(Easing.ease)}),
          withTiming(1, {duration: 500, easing: Easing.inOut(Easing.ease)}),
        ),
        -1,
        false,
      );
    } else {
      opacity.value = withTiming(1, {duration: 300});
    }
  }, [status, reduceMotion, opacity]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const dotColor =
    status === 'saved'
      ? colors.accentSage
      : status === 'saving'
        ? colors.accentGold
        : status === 'error'
          ? colors.danger
          : colors.textFaint;

  const label =
    status === 'saved'
      ? 'SAVED'
      : status === 'saving'
        ? 'SAVING'
        : status === 'error'
          ? 'SAVE FAILED'
          : '';

  return (
    <View style={styles.container} accessibilityLabel={`Document ${status}`}>
      <Animated.View
        style={[styles.dot, {backgroundColor: dotColor}, dotStyle]}
      />
      {label ? (
        <Text style={[styles.label, {color: dotColor}]}>{label}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontFamily: fonts.ui.regular,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
