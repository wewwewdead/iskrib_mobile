/**
 * DoubleTapReaction — Honk-style reaction emoji at tap coordinates.
 *
 * Supports all 6 reaction types. The displayed emoji springs in at the
 * exact point of the double-tap, scales up with bounce, then fades out.
 */
import React from 'react';
import {StyleSheet, Text} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import {useEffect} from 'react';
import {SpringPresets} from '../lib/springs';

interface DoubleTapReactionProps {
  visible: boolean;
  x: number;
  y: number;
  /** The emoji to display. Defaults to ❤️ */
  emoji?: string;
}

export function DoubleTapReaction({
  visible,
  x,
  y,
  emoji = '\u2764\uFE0F',
}: DoubleTapReactionProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSequence(
        withSpring(1.3, SpringPresets.bouncy),
        withSpring(1, SpringPresets.gentle),
      );
      opacity.value = withSequence(
        withTiming(1, {duration: 100}),
        withDelay(1000, withTiming(0, {duration: 400})),
      );
    } else {
      scale.value = 0;
      opacity.value = 0;
    }
  }, [visible, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
    opacity: opacity.value,
  }));

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {left: x - 20, top: y - 20},
        animatedStyle,
      ]}
      pointerEvents="none">
      <Text style={styles.emoji}>{emoji}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  emoji: {
    fontSize: 28,
  },
});
