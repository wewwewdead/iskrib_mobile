/**
 * ReadingTimeBar — shows writing progress as estimated reading time.
 *
 * Benji Taylor philosophy: progress should feel meaningful, not mechanical.
 * Instead of raw word count, we show reading time (words / 200 wpm).
 * The golden fill springs smoothly as the user types.
 */
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import {useEffect} from 'react';
import {useTheme} from '../theme/ThemeProvider';
import {fonts} from '../theme/typography';
import {spacing} from '../theme/spacing';
import {SpringPresets} from '../lib/springs';

interface ReadingTimeBarProps {
  wordCount: number;
  /** Max reading time in minutes for 100% fill (default: 10 min = 2000 words) */
  maxMinutes?: number;
}

const WORDS_PER_MINUTE = 200;

export function ReadingTimeBar({wordCount, maxMinutes = 10}: ReadingTimeBarProps) {
  const {colors} = useTheme();
  const reduceMotion = useReducedMotion();
  const fillWidth = useSharedValue(0);

  const readingMinutes = wordCount / WORDS_PER_MINUTE;
  const progress = Math.min(readingMinutes / maxMinutes, 1);

  useEffect(() => {
    if (reduceMotion) {
      fillWidth.value = progress;
    } else {
      fillWidth.value = withSpring(progress, SpringPresets.gentle);
    }
  }, [progress, reduceMotion, fillWidth]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillWidth.value * 100}%`,
  }));

  const readingTimeText =
    readingMinutes < 1
      ? '< 1 min read'
      : `${Math.round(readingMinutes)} min read`;

  return (
    <View style={styles.container}>
      <View style={[styles.track, {backgroundColor: colors.borderLight}]}>
        <Animated.View
          style={[
            styles.fill,
            {backgroundColor: colors.accentGold},
            fillStyle,
          ]}
        />
      </View>
      <Text style={[styles.label, {color: colors.textMuted}]}>
        {readingTimeText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  track: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 1,
  },
  label: {
    fontFamily: fonts.ui.regular,
    fontSize: 11,
    letterSpacing: 0.3,
    minWidth: 72,
    textAlign: 'right',
  },
});
