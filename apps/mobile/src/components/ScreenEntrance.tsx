/**
 * Tier-aware screen entrance wrapper.
 *
 * Applies a single Reanimated layout animation to its child tree on mount.
 * The native-stack slide between screens stays untouched (the OS owns it at
 * 60fps). This wrapper handles only what happens AFTER the destination
 * screen mounts.
 *
 *   <ScreenEntrance tier="hero">  → fade + lift, gentle spring
 *   <ScreenEntrance tier="feed">  → fast 180ms fade, no translation
 *
 * Reanimated 4 honors `useReducedMotion()` for layout animations natively,
 * but we also short-circuit to a plain View when reduced motion is on so
 * there's zero worklet overhead in that case.
 *
 * Place this wrapper as the outermost child of the screen's root container
 * (typically inside SafeAreaView, around a FlatList/ScrollView). The wrapper
 * itself is `flex: 1` so it doesn't break layout.
 */
import React, {type ReactNode} from 'react';
import {View, type StyleProp, type ViewStyle} from 'react-native';
import Animated, {useReducedMotion} from 'react-native-reanimated';
import {feedIn, screenInHero} from '../lib/screenEntrance';

type Tier = 'hero' | 'feed';

type Props = {
  tier: Tier;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

const FLEX: ViewStyle = {flex: 1};

export function ScreenEntrance({tier, style, children}: Props) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <View style={[FLEX, style]}>{children}</View>;
  }

  const entering = tier === 'hero' ? screenInHero : feedIn;

  return (
    <Animated.View style={[FLEX, style]} entering={entering}>
      {children}
    </Animated.View>
  );
}
