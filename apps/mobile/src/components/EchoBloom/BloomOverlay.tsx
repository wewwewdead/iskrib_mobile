import React, {useEffect} from 'react';
import {BackHandler, Platform, StyleSheet, View} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {useSpringFadeIn} from '../../lib/springs';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts} from '../../theme/typography';
import {spacing} from '../../theme/spacing';
import {BloomGlow} from './BloomGlow';

const GLOW_DIAMETER = 320;

export function BloomOverlay() {
  const {colors, isDark} = useTheme();
  const reduceMotion = useReducedMotion();
  const bgOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const glowOpacity = useSharedValue(reduceMotion ? 0.5 : 0);
  const captionStyle = useSpringFadeIn(260);

  useEffect(() => {
    if (reduceMotion) {
      bgOpacity.value = 1;
      glowOpacity.value = 0.5;
      return;
    }
    bgOpacity.value = withTiming(1, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    });
    glowOpacity.value = withSequence(
      withTiming(0.28, {duration: 180, easing: Easing.out(Easing.cubic)}),
      withTiming(0.78, {duration: 340, easing: Easing.out(Easing.cubic)}),
      withTiming(0.55, {duration: 420, easing: Easing.inOut(Easing.ease)}),
    );
  }, [bgOpacity, glowOpacity, reduceMotion]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const bgAnimatedStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const glowColor = isDark ? colors.accentAmber : colors.accentGold;

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      pointerEvents="auto"
      style={[
        StyleSheet.absoluteFill,
        styles.container,
        bgAnimatedStyle,
        {backgroundColor: colors.bgPrimary},
      ]}>
      <View style={styles.center}>
        <BloomGlow
          size={GLOW_DIAMETER}
          color={glowColor}
          opacity={glowOpacity}
          gradientId="bloomOverlayGlow"
        />
        <Animated.Text
          accessibilityRole="text"
          style={[
            styles.caption,
            captionStyle,
            {
              color: colors.textSecondary,
              fontFamily: fonts.serif.italic,
            },
          ]}>
          Releasing your thought…
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    position: 'absolute',
    bottom: -80,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
});
