import React, {useCallback, useState} from 'react';
import {LayoutChangeEvent, StyleSheet, Text, View} from 'react-native';
import {Canvas, Path, LinearGradient, vec} from '@shopify/react-native-skia';
import Animated, {FadeIn} from 'react-native-reanimated';
import {useTheme} from '../../../theme/ThemeProvider';
import {fonts} from '../../../theme/typography';
import {spacing, radii} from '../../../theme/spacing';
import {GlassCard} from '../../../components/GlassCard';
import {useAnimatedCounter} from '../../../hooks/useAnimatedCounter';
import {useChartData} from '../hooks/useChartData';

interface Props {
  value: number;
  label: string;
  series?: Array<{date: string; count: number}>;
  trendPercent: number | null;
  isFirstVisit: boolean;
}

export const HeroMetricCard = React.memo(function HeroMetricCard({
  value,
  label,
  series,
  trendPercent,
  isFirstVisit,
}: Props) {
  const {colors, scaledType} = useTheme();
  const [chartWidth, setChartWidth] = useState(0);
  const displayValue = useAnimatedCounter(value, isFirstVisit ? 600 : 300);
  const chartData = useChartData(series, chartWidth, CHART_HEIGHT);

  const onChartLayout = useCallback((e: LayoutChangeEvent) => {
    setChartWidth(e.nativeEvent.layout.width);
  }, []);

  const trendColor =
    trendPercent === null || trendPercent === 0
      ? null
      : trendPercent > 0
        ? colors.success
        : colors.danger;

  const trendLabel =
    trendPercent === null
      ? null
      : trendPercent === 0
        ? null
        : `${trendPercent > 0 ? '+' : ''}${trendPercent.toFixed(1)}%`;

  return (
    <Animated.View entering={isFirstVisit ? FadeIn.delay(100).duration(400) : undefined}>
      <GlassCard borderRadius={radii.hero} padding={0}>
        {/* Text content */}
        <View style={styles.textSection}>
          <Text style={[scaledType.label, {color: colors.textMuted}]}>{label}</Text>
          <View style={styles.valueRow}>
            <Text style={[styles.value, {color: colors.textHeading}]}>
              {displayValue.toLocaleString()}
            </Text>
            {trendLabel && trendColor && (
              <View style={[styles.trendBadge, {backgroundColor: trendColor + '18'}]}>
                <Text style={[styles.trendText, {color: trendColor}]}>
                  {trendLabel}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Skia area chart */}
        <View
          style={styles.chartContainer}
          onLayout={onChartLayout}
          accessible
          accessibilityRole="image"
          accessibilityLabel={
            series && series.length > 0
              ? `Views trend over time: ${series[0].count} to ${series[series.length - 1].count} views`
              : 'No trend data available'
          }>
          {chartWidth > 0 && chartData && (
            <Canvas style={{width: chartWidth, height: CHART_HEIGHT}}>
              {/* Gradient fill */}
              <Path path={chartData.fillPath} style="fill">
                <LinearGradient
                  start={vec(0, 0)}
                  end={vec(0, CHART_HEIGHT)}
                  colors={[colors.accentAmber + '4D', colors.accentAmber + '00']}
                />
              </Path>
              {/* Line */}
              <Path
                path={chartData.linePath}
                style="stroke"
                strokeWidth={2.5}
                strokeCap="round"
                strokeJoin="round"
                color={colors.accentAmber}
              />
            </Canvas>
          )}
          {/* Flat line fallback when no data */}
          {chartWidth > 0 && !chartData && (
            <Canvas style={{width: chartWidth, height: CHART_HEIGHT}}>
              <Path
                path={`M 0 ${CHART_HEIGHT - 1} L ${chartWidth} ${CHART_HEIGHT - 1}`}
                style="stroke"
                strokeWidth={1}
                color={colors.borderLight}
              />
            </Canvas>
          )}
        </View>
      </GlassCard>
    </Animated.View>
  );
});

const CHART_HEIGHT = 120;

const styles = StyleSheet.create({
  textSection: {
    padding: spacing.xl,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  value: {
    fontFamily: fonts.heading.bold,
    fontSize: 42,
  },
  trendBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  trendText: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 13,
  },
  chartContainer: {
    height: CHART_HEIGHT,
    overflow: 'hidden',
  },
});
