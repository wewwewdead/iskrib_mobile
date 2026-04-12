import React, {useEffect} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Canvas, Path, Skia, StrokeCap} from '@shopify/react-native-skia';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {useTheme} from '../../../theme/ThemeProvider';
import {fonts} from '../../../theme/typography';
import {spacing, radii} from '../../../theme/spacing';
import {GlassCard} from '../../../components/GlassCard';

const RING_SIZE = 120;
const STROKE_WIDTH = 10;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CENTER = RING_SIZE / 2;

interface Props {
  currentStreak: number;
  longestStreak: number;
  isFirstVisit: boolean;
}

function createArcPath(startAngle: number, endAngle: number): string {
  const startRad = (startAngle - 90) * (Math.PI / 180);
  const endRad = (endAngle - 90) * (Math.PI / 180);

  const x1 = CENTER + RADIUS * Math.cos(startRad);
  const y1 = CENTER + RADIUS * Math.sin(startRad);
  const x2 = CENTER + RADIUS * Math.cos(endRad);
  const y2 = CENTER + RADIUS * Math.sin(endRad);

  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return `M ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${x2} ${y2}`;
}

export const StreakRing = React.memo(function StreakRing({
  currentStreak,
  longestStreak,
  isFirstVisit,
}: Props) {
  const {colors, scaledType} = useTheme();

  const maxTarget = Math.max(longestStreak, 7);
  const progress = Math.min(currentStreak / maxTarget, 1);
  const sweepAngle = progress * 360;
  const isPersonalBest = currentStreak > 0 && currentStreak >= longestStreak;

  // Background ring (full circle)
  const bgPath = Skia.Path.MakeFromSVGString(
    createArcPath(0, 359.9),
  );

  // Progress ring
  const progressPath =
    sweepAngle > 0
      ? Skia.Path.MakeFromSVGString(createArcPath(0, Math.max(sweepAngle, 1)))
      : null;

  return (
    <Animated.View entering={isFirstVisit ? FadeIn.delay(500).duration(400) : undefined}>
      <GlassCard borderRadius={radii.hero} padding={spacing.lg}>
        <Text style={[styles.sectionTitle, {color: colors.textHeading}]}>Writing Streak</Text>
        <View style={styles.row}>
          {/* Skia Ring */}
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={`Writing streak: ${currentStreak} days current, ${longestStreak} days longest, ${Math.round(progress * 100)}% of personal best`}>
            <Canvas style={{width: RING_SIZE, height: RING_SIZE}}>
              {/* Background ring */}
              {bgPath && (
                <Path
                  path={bgPath}
                  style="stroke"
                  strokeWidth={STROKE_WIDTH}
                  strokeCap="round"
                  color={colors.bgSecondary}
                />
              )}
              {/* Progress ring */}
              {progressPath && (
                <Path
                  path={progressPath}
                  style="stroke"
                  strokeWidth={STROKE_WIDTH}
                  strokeCap="round"
                  color={colors.accentAmber}
                />
              )}
            </Canvas>
            {/* Center text */}
            <View style={styles.centerText}>
              <Text style={[styles.centerNumber, {color: colors.textHeading}]}>
                {currentStreak}
              </Text>
              <Text style={[scaledType.caption, {color: colors.textMuted}]}>days</Text>
            </View>
          </View>

          {/* Right side text */}
          <View style={styles.info}>
            <View style={styles.streakItem}>
              <Text style={[styles.currentValue, {color: colors.accentAmber}]}>
                {currentStreak} days
              </Text>
              <Text style={[scaledType.caption, {color: colors.textMuted}]}>Current</Text>
            </View>
            <View style={styles.streakItem}>
              <Text style={[styles.longestValue, {color: colors.textHeading}]}>
                {longestStreak} days
              </Text>
              <Text style={[scaledType.caption, {color: colors.textMuted}]}>Longest</Text>
            </View>
            {isPersonalBest && (
              <View style={[styles.bestBadge, {backgroundColor: colors.accentAmber + '18'}]}>
                <Text style={[styles.bestText, {color: colors.accentAmber}]}>
                  Personal best!
                </Text>
              </View>
            )}
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  sectionTitle: {
    fontFamily: fonts.ui.bold,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  centerText: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerNumber: {
    fontFamily: fonts.heading.bold,
    fontSize: 28,
  },
  info: {
    flex: 1,
    gap: spacing.md,
  },
  streakItem: {
    gap: 2,
  },
  currentValue: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 18,
  },
  longestValue: {
    fontFamily: fonts.ui.regular,
    fontSize: 14,
  },
  bestBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  bestText: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 12,
  },
});
