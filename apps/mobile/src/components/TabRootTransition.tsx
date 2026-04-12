import React, {useEffect, type ReactNode} from 'react';
import {View, type StyleProp, type ViewStyle} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {SpringPresets} from '../lib/springs';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

const FLEX: ViewStyle = {flex: 1};
const HIDDEN_OPACITY = 0.92;
const HIDDEN_TRANSLATE_Y = 8;
const HIDDEN_SCALE = 0.995;
const OPACITY_DURATION_MS = 140;

export function TabRootTransition({children, style}: Props) {
  const isFocused = useIsFocused();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(reduceMotion ? 1 : HIDDEN_OPACITY);
  const translateY = useSharedValue(reduceMotion ? 0 : HIDDEN_TRANSLATE_Y);
  const scale = useSharedValue(reduceMotion ? 1 : HIDDEN_SCALE);

  useEffect(() => {
    cancelAnimation(opacity);
    cancelAnimation(translateY);
    cancelAnimation(scale);

    if (reduceMotion) {
      opacity.value = 1;
      translateY.value = 0;
      scale.value = 1;
      return;
    }

    if (isFocused) {
      opacity.value = HIDDEN_OPACITY;
      translateY.value = HIDDEN_TRANSLATE_Y;
      scale.value = HIDDEN_SCALE;

      opacity.value = withTiming(1, {
        duration: OPACITY_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      });
      translateY.value = withSpring(0, SpringPresets.gentle);
      scale.value = withSpring(1, SpringPresets.gentle);
      return;
    }

    opacity.value = HIDDEN_OPACITY;
    translateY.value = HIDDEN_TRANSLATE_Y;
    scale.value = HIDDEN_SCALE;
  }, [isFocused, opacity, reduceMotion, scale, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      {translateY: translateY.value},
      {scale: scale.value},
    ],
  }));

  if (reduceMotion) {
    return <View style={[FLEX, style]}>{children}</View>;
  }

  return (
    <Animated.View style={[FLEX, style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}
