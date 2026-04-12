/**
 * SpringFAB — Floating action button with personality.
 *
 * Benji Taylor philosophy: even idle elements should feel alive.
 * The FAB breathes gently when idle, scales down with spring on press,
 * and bounces back. Haptic feedback on tap.
 */
import React from 'react';
import {Pressable, StyleSheet, ViewStyle} from 'react-native';
import Animated from 'react-native-reanimated';
import {useBreathing, useSpringPress} from '../lib/springs';
import {Haptics} from '../lib/haptics';
import {shadows} from '../theme/spacing';
import {useTheme} from '../theme/ThemeProvider';

interface SpringFABProps {
  onPress: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function SpringFAB({onPress, children, style}: SpringFABProps) {
  const {colors} = useTheme();
  const breathingStyle = useBreathing(1.02, 2000);
  const {animatedStyle: pressStyle, onPressIn, onPressOut} = useSpringPress(0.9);

  const handlePress = () => {
    Haptics.tap();
    onPress();
  };

  return (
    <Animated.View style={[styles.wrapper, breathingStyle]}>
      <Pressable
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel="Write new journal">
        <Animated.View
          style={[
            styles.fab,
            {backgroundColor: colors.accentAmber},
            shadows(colors).elevated,
            style,
            pressStyle,
          ]}>
          {children}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 24,
    right: 16,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
