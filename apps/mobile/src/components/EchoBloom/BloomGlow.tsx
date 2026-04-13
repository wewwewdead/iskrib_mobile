import React from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
import Animated, {
  useAnimatedProps,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {Circle, Defs, RadialGradient, Stop} from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface BloomGlowProps {
  size: number;
  color: string;
  opacity: SharedValue<number>;
  gradientId?: string;
  style?: StyleProp<ViewStyle>;
}

export function BloomGlow({
  size,
  color,
  opacity,
  gradientId = 'bloomGlowRadial',
  style,
}: BloomGlowProps) {
  const center = size / 2;
  const animatedProps = useAnimatedProps(() => ({
    opacity: opacity.value,
  }));

  return (
    <View
      pointerEvents="none"
      style={[styles.container, {width: size, height: size}, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient
            id={gradientId}
            cx="50%"
            cy="50%"
            rx="50%"
            ry="50%"
            fx="50%"
            fy="50%">
            <Stop offset="0%" stopColor={color} stopOpacity="0.85" />
            <Stop offset="40%" stopColor={color} stopOpacity="0.32" />
            <Stop offset="100%" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <AnimatedCircle
          cx={center}
          cy={center}
          r={center}
          fill={`url(#${gradientId})`}
          animatedProps={animatedProps}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
