import React, {useCallback, useEffect, useState} from 'react';
import {LayoutChangeEvent, Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withSpring} from 'react-native-reanimated';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts} from '../../theme/typography';
import {spacing} from '../../theme/spacing';
import {SpringPresets} from '../../lib/springs';
import {Haptics} from '../../lib/haptics';

export type ProfileTab = 'writings' | 'stories' | 'opinions' | 'media';

interface ProfileTabBarProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
}

const TABS: {key: ProfileTab; label: string}[] = [
  {key: 'writings', label: 'Writings'},
  {key: 'stories', label: 'Stories'},
  {key: 'opinions', label: 'Opinions'},
  {key: 'media', label: 'Media'},
];

const INDICATOR_INSET = 0.2;

export function ProfileTabBar({activeTab, onTabChange}: ProfileTabBarProps) {
  const {colors} = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);
  const indicatorX = useSharedValue(0);

  const tabWidth = containerWidth > 0 ? containerWidth / TABS.length : 0;
  const indicatorWidth = tabWidth * (1 - 2 * INDICATOR_INSET);
  const activeIndex = TABS.findIndex(t => t.key === activeTab);

  useEffect(() => {
    if (containerWidth > 0 && activeIndex >= 0) {
      const target = activeIndex * tabWidth + tabWidth * INDICATOR_INSET;
      indicatorX.value = withSpring(target, SpringPresets.snappy);
    }
  }, [activeIndex, tabWidth, containerWidth, indicatorX]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{translateX: indicatorX.value}],
  }));

  const handleTabPress = (tab: ProfileTab) => {
    Haptics.selection();
    onTabChange(tab);
  };

  return (
    <View
      style={[styles.container, {borderBottomColor: colors.borderCard}]}
      onLayout={onLayout}>
      {TABS.map(tab => {
        const active = activeTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            style={styles.tab}
            onPress={() => handleTabPress(tab.key)}>
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
      {containerWidth > 0 && (
        <Animated.View
          style={[
            styles.indicator,
            {backgroundColor: colors.accentAmber, width: indicatorWidth},
            indicatorStyle,
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.xl,
    marginHorizontal: spacing.lg,
    position: 'relative',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  tabText: {
    fontSize: 15,
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2.5,
    borderRadius: 2,
  },
});
