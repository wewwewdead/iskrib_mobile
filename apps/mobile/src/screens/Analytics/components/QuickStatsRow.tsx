import React from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import Animated, {FadeInRight} from 'react-native-reanimated';
import {useTheme} from '../../../theme/ThemeProvider';
import {fonts} from '../../../theme/typography';
import {spacing, radii} from '../../../theme/spacing';
import {GlassCard} from '../../../components/GlassCard';

interface StatItem {
  label: string;
  value: number;
  suffix?: string;
  color: string;
}

interface Props {
  stats: StatItem[];
  isFirstVisit: boolean;
}

// Stat colors now come from theme tokens via the stat item's `color` prop

export const QuickStatsRow = React.memo(function QuickStatsRow({stats, isFirstVisit}: Props) {
  const {colors, scaledType} = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}>
      {stats.map((stat, index) => {
        const dotColor = stat.color === 'amber' ? colors.accentAmber : stat.color;
        return (
          <Animated.View
            key={stat.label}
            entering={isFirstVisit ? FadeInRight.delay(300 + index * 80).duration(400) : undefined}>
            <GlassCard borderRadius={radii.xxxl} padding={spacing.md}>
              <View style={styles.pill}>
                <View style={styles.labelRow}>
                  <View style={[styles.dot, {backgroundColor: dotColor}]} />
                  <Text style={[scaledType.caption, {color: colors.textMuted}]}>
                    {stat.label}
                  </Text>
                </View>
                <Text style={[styles.value, {color: colors.textHeading}]}>
                  {stat.value.toLocaleString()}{stat.suffix ?? ''}
                </Text>
              </View>
            </GlassCard>
          </Animated.View>
        );
      })}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  scrollContent: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xxs,
  },
  pill: {
    minWidth: 90,
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  value: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 22,
  },
});
