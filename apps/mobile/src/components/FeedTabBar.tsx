import React, {useCallback, useEffect, useState} from 'react';
import {LayoutChangeEvent, Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withSpring} from 'react-native-reanimated';
import {useTheme} from '../theme/ThemeProvider';
import {fonts} from '../theme/typography';
import {spacing} from '../theme/spacing';
import {SpringPresets} from '../lib/springs';
import {Haptics} from '../lib/haptics';

export type FeedTab = 'all' | 'following' | 'foryou';

interface FeedTabBarProps {
  activeTab: FeedTab;
  onTabChange: (tab: FeedTab) => void;
}

const TABS: {key: FeedTab; label: string}[] = [
  {key: 'all', label: 'All'},
  {key: 'following', label: 'Following'},
  {key: 'foryou', label: 'For You'},
];

const INDICATOR_INSET = 0.2; // 20% inset on each side of the tab

export function FeedTabBar({activeTab, onTabChange}: FeedTabBarProps) {
  const {colors} = useTheme();
  const [rowWidth, setRowWidth] = useState(0);
  const indicatorX = useSharedValue(0);

  const tabWidth = rowWidth > 0 ? rowWidth / TABS.length : 0;
  const indicatorWidth = tabWidth * (1 - 2 * INDICATOR_INSET);
  const activeIndex = TABS.findIndex(t => t.key === activeTab);

  useEffect(() => {
    if (rowWidth > 0 && activeIndex >= 0) {
      const target = activeIndex * tabWidth + tabWidth * INDICATOR_INSET;
      indicatorX.value = withSpring(target, SpringPresets.snappy);
    }
  }, [activeIndex, tabWidth, rowWidth, indicatorX]);

  const onRowLayout = useCallback((e: LayoutChangeEvent) => {
    setRowWidth(e.nativeEvent.layout.width);
  }, []);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{translateX: indicatorX.value}],
  }));

  const handleTabPress = (tab: FeedTab) => {
    Haptics.selection();
    onTabChange(tab);
  };

  return (
    <View style={[styles.container, {borderBottomColor: colors.borderCard}]}>
      <View style={styles.row} onLayout={onRowLayout}>
        {TABS.map(tab => {
          const active = activeTab === tab.key;
          return (
            <Pressable key={tab.key} style={styles.tab} onPress={() => handleTabPress(tab.key)}>
              <Text
                style={[
                  styles.tabText,
                  {
                    color: active ? colors.textHeading : colors.textMuted,
                    fontFamily: active ? fonts.ui.semiBold : fonts.ui.regular,
                  },
                ]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
        {rowWidth > 0 && (
          <Animated.View
            style={[
              styles.indicator,
              {backgroundColor: colors.accentAmber, width: indicatorWidth},
              indicatorStyle,
            ]}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    position: 'relative',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  tabText: {
    fontSize: 14,
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2.5,
    borderRadius: 2,
  },
});
