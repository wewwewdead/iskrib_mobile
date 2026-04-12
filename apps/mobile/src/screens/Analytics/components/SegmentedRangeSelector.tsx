import React, {useCallback, useState} from 'react';
import {LayoutChangeEvent, Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming, Easing} from 'react-native-reanimated';
import {useTheme} from '../../../theme/ThemeProvider';
import {fonts} from '../../../theme/typography';
import {radii, shadows} from '../../../theme/spacing';
import {Haptics} from '../../../lib/haptics';

const SEGMENTS = [
  {label: '7d', value: '7d'},
  {label: '30d', value: '30d'},
  {label: '90d', value: '90d'},
  {label: 'All', value: 'all'},
];

const INSET = 3;
const HEIGHT = 44;

interface Props {
  selected: string;
  onSelect: (value: string) => void;
}

export const SegmentedRangeSelector = React.memo(function SegmentedRangeSelector({
  selected,
  onSelect,
}: Props) {
  const {colors} = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);
  const thumbX = useSharedValue(0);

  const segmentWidth = containerWidth > 0 ? (containerWidth - INSET * 2) / SEGMENTS.length : 0;
  const activeIndex = SEGMENTS.findIndex(s => s.value === selected);

  // Update thumb position when selection or layout changes
  React.useEffect(() => {
    if (containerWidth > 0 && activeIndex >= 0) {
      thumbX.value = withTiming(INSET + activeIndex * segmentWidth, {
        duration: 250,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      });
    }
  }, [activeIndex, segmentWidth, containerWidth, thumbX]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{translateX: thumbX.value}],
    width: segmentWidth,
  }));

  const shadowStyle = shadows(colors);

  return (
    <View
      style={[styles.container, {backgroundColor: colors.bgSecondary}]}
      onLayout={onLayout}>
      {containerWidth > 0 && (
        <Animated.View
          style={[
            styles.thumb,
            {backgroundColor: colors.bgElevated},
            shadowStyle.cardSm,
            thumbStyle,
          ]}
        />
      )}
      {SEGMENTS.map(seg => (
        <Pressable
          key={seg.value}
          style={styles.segment}
          onPress={() => {
            Haptics.selection();
            onSelect(seg.value);
          }}
          accessibilityRole="tab"
          accessibilityState={{selected: selected === seg.value}}
          accessibilityLabel={`${seg.label} time range`}>
          <Text
            style={[
              styles.label,
              {color: selected === seg.value ? colors.textHeading : colors.textMuted},
            ]}>
            {seg.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: HEIGHT,
    borderRadius: radii.pill,
    position: 'relative',
    overflow: 'hidden',
  },
  thumb: {
    position: 'absolute',
    top: INSET,
    bottom: INSET,
    borderRadius: radii.pill,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    minHeight: 44,
  },
  label: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 13,
  },
});
