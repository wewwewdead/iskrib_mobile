import React, {useCallback, useState} from 'react';
import {LayoutChangeEvent, StyleSheet, Text, View} from 'react-native';
import {Canvas, RoundedRect} from '@shopify/react-native-skia';
import Animated, {FadeIn} from 'react-native-reanimated';
import {useTheme} from '../../../theme/ThemeProvider';
import {fonts} from '../../../theme/typography';
import {spacing, radii} from '../../../theme/spacing';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEKS = 12;
const ROWS = 7;
const CELL_GAP = 3;
const CELL_RADIUS = 2;
const DAY_LABEL_WIDTH = 16;

interface Props {
  /** Weekly frequency data — we'll spread across days as a best-effort visualization */
  publishingFrequency?: Array<{week_start: string; count: number}>;
  isFirstVisit: boolean;
}

function getOpacity(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 0.15;
  if (count === 2) return 0.4;
  if (count === 3) return 0.7;
  return 1;
}

/**
 * Distributes weekly counts across weekdays for grid visualization.
 * Since we only have weekly aggregates, we distribute posts across Mon-Fri.
 */
function buildGrid(frequency: Array<{week_start: string; count: number}> | undefined): number[][] {
  const grid: number[][] = Array.from({length: ROWS}, () =>
    Array.from({length: WEEKS}, () => 0),
  );

  if (!frequency) return grid;

  const weeks = frequency.slice(-WEEKS);
  weeks.forEach((week, colIdx) => {
    const col = WEEKS - weeks.length + colIdx;
    if (col < 0) return;

    let remaining = week.count;
    // Distribute posts across weekdays (Mon-Fri primarily)
    const days = [0, 1, 2, 3, 4]; // Mon-Fri indices
    for (let i = 0; i < remaining && i < 7; i++) {
      const dayIdx = i < 5 ? days[i] : i;
      grid[dayIdx][col] = Math.min(grid[dayIdx][col] + 1, 4);
    }
  });

  return grid;
}

export const ActivityGrid = React.memo(function ActivityGrid({
  publishingFrequency,
  isFirstVisit,
}: Props) {
  const {colors, scaledType} = useTheme();
  const [cardWidth, setCardWidth] = useState(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setCardWidth(e.nativeEvent.layout.width);
  }, []);

  const grid = buildGrid(publishingFrequency);

  const thisWeekCount = publishingFrequency?.length
    ? publishingFrequency[publishingFrequency.length - 1]?.count ?? 0
    : 0;

  const gridWidth = cardWidth - spacing.lg * 2 - DAY_LABEL_WIDTH - spacing.sm;
  const cellSize = gridWidth > 0 ? (gridWidth - (WEEKS - 1) * CELL_GAP) / WEEKS : 0;
  const canvasHeight = ROWS * cellSize + (ROWS - 1) * CELL_GAP;

  return (
    <Animated.View entering={isFirstVisit ? FadeIn.delay(600).duration(400) : undefined}>
      <View
        style={[styles.container, {backgroundColor: colors.bgCard}]}
        onLayout={onLayout}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Publishing activity: ${thisWeekCount} posts this week`}>
        <Text style={[styles.sectionTitle, {color: colors.textHeading}]}>
          Publishing Activity
        </Text>
        <Text style={[scaledType.caption, {color: colors.textMuted}]}>
          {thisWeekCount} post{thisWeekCount !== 1 ? 's' : ''} this week
        </Text>

        {cardWidth > 0 && cellSize > 0 && (
          <View style={styles.gridRow}>
            {/* Day labels */}
            <View style={styles.dayLabels}>
              {DAYS.map((day, i) => (
                <Text
                  key={`${day}-${i}`}
                  style={[
                    styles.dayLabel,
                    {color: colors.textMuted, height: cellSize, lineHeight: cellSize},
                  ]}>
                  {i % 2 === 0 ? day : ''}
                </Text>
              ))}
            </View>

            {/* Skia grid */}
            <Canvas style={{width: gridWidth, height: canvasHeight}}>
              {grid.map((row, rowIdx) =>
                row.map((count, colIdx) => {
                  const x = colIdx * (cellSize + CELL_GAP);
                  const y = rowIdx * (cellSize + CELL_GAP);
                  const opacity = getOpacity(count);

                  return (
                    <RoundedRect
                      key={`${rowIdx}-${colIdx}`}
                      x={x}
                      y={y}
                      width={cellSize}
                      height={cellSize}
                      r={CELL_RADIUS}
                      color={
                        opacity === 0
                          ? colors.bgSecondary
                          : colors.accentAmber
                      }
                      opacity={opacity === 0 ? 1 : opacity}
                    />
                  );
                }),
              )}
            </Canvas>
          </View>
        )}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  sectionTitle: {
    fontFamily: fonts.ui.bold,
    fontSize: 16,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  dayLabels: {
    width: DAY_LABEL_WIDTH,
  },
  dayLabel: {
    fontFamily: fonts.ui.regular,
    fontSize: 10,
    textAlign: 'center',
  },
});
