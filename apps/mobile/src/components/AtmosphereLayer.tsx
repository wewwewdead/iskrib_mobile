/**
 * AtmosphereLayer — visual overlay that makes the editor feel alive.
 *
 * Three layers activate at increasing flow depths:
 *   Level 1+: Background warmth (color interpolation from cream toward amber)
 *   Level 2+: Edge vignette (LinearGradient darkening at screen edges)
 *   Level 3+: Ambient glow (SVG radial gradient spots, warm gold)
 *
 * All overlay layers use pointerEvents="none" so they never intercept touches.
 * Respects useReducedMotion — transitions become immediate.
 */
import React from 'react';
import {StyleSheet, View, useWindowDimensions} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  interpolateColor,
  type SharedValue,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Svg, {Defs, RadialGradient, Stop, Ellipse} from 'react-native-svg';
import {useTheme} from '../theme/ThemeProvider';

// Atmosphere warm endpoints (not in the token system — custom for this feature)
const LIGHT_BG_END = '#F0E4D0';
const DARK_BG_END = '#1A1610';

const VIGNETTE_HEIGHT = 60;
const VIGNETTE_SIDE_WIDTH = 20;
const GLOW_RADIUS_X = 200;
const GLOW_RADIUS_Y = 120;

interface AtmosphereLayerProps {
  warmth: SharedValue<number>;
  flowLevel: SharedValue<number>;
  enabled: boolean;
}

export function AtmosphereLayer({warmth, flowLevel, enabled}: AtmosphereLayerProps) {
  const {isDark, colors} = useTheme();
  const {width: screenWidth, height: screenHeight} = useWindowDimensions();

  // Mirror isDark and bgPrimary into shared values so worklets read fresh data
  const isDarkSV = useDerivedValue(() => (isDark ? 1 : 0));
  const bgStart = colors.bgPrimary;

  // Layer 1: Background warmth
  const backgroundStyle = useAnimatedStyle(() => {
    const dark = isDarkSV.value === 1;
    if (!enabled) return {backgroundColor: bgStart};
    const bg = interpolateColor(
      warmth.value,
      [0, 1],
      dark ? [bgStart, DARK_BG_END] : [bgStart, LIGHT_BG_END],
    );
    return {backgroundColor: bg};
  });

  // Layer 2: Vignette opacity
  const vignetteStyle = useAnimatedStyle(() => {
    if (!enabled) return {opacity: 0};
    // Vignette starts appearing at flowLevel 2 (value >= 1.5 due to withTiming)
    const show = flowLevel.value >= 1.5 ? 1 : 0;
    return {opacity: show * warmth.value * 0.6};
  });

  // Layer 3: Glow opacity
  const glowStyle = useAnimatedStyle(() => {
    if (!enabled) return {opacity: 0};
    // Glow appears at flowLevel 3 (value >= 2.5 due to withTiming)
    const show = flowLevel.value >= 2.5 ? 1 : 0;
    return {opacity: show * warmth.value * 0.12};
  });

  const vignetteTopColors = isDark
    ? ['rgba(0,0,0,0.12)', 'transparent']
    : ['rgba(0,0,0,0.07)', 'transparent'];

  const vignetteSideColors = isDark
    ? ['rgba(0,0,0,0.08)', 'transparent']
    : ['rgba(0,0,0,0.04)', 'transparent'];

  const glowCenterColor = isDark
    ? 'rgba(212,168,83,0.08)'
    : 'rgba(196,148,62,0.06)';

  return (
    <>
      {/* Layer 1: Background warmth — this is the container background */}
      <Animated.View style={[StyleSheet.absoluteFill, backgroundStyle]} />

      {/* Layer 2: Edge vignette */}
      <Animated.View
        style={[StyleSheet.absoluteFill, vignetteStyle]}
        pointerEvents="none">
        {/* Top vignette */}
        <LinearGradient
          colors={vignetteTopColors}
          start={{x: 0, y: 0}}
          end={{x: 0, y: 1}}
          style={[styles.vignetteTop, {width: screenWidth}]}
        />
        {/* Bottom vignette */}
        <LinearGradient
          colors={vignetteTopColors}
          start={{x: 0, y: 1}}
          end={{x: 0, y: 0}}
          style={[styles.vignetteBottom, {width: screenWidth}]}
        />
        {/* Left vignette */}
        <LinearGradient
          colors={vignetteSideColors}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={[styles.vignetteLeft, {height: screenHeight}]}
        />
        {/* Right vignette */}
        <LinearGradient
          colors={vignetteSideColors}
          start={{x: 1, y: 0}}
          end={{x: 0, y: 0}}
          style={[styles.vignetteRight, {height: screenHeight}]}
        />
      </Animated.View>

      {/* Layer 3: Ambient glow spots */}
      <Animated.View
        style={[StyleSheet.absoluteFill, glowStyle]}
        pointerEvents="none">
        {/* Top-center glow */}
        <Svg
          width={GLOW_RADIUS_X * 2}
          height={GLOW_RADIUS_Y * 2}
          style={[
            styles.glowSpot,
            {
              top: 0,
              left: (screenWidth - GLOW_RADIUS_X * 2) / 2,
            },
          ]}>
          <Defs>
            <RadialGradient id="topGlow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor={glowCenterColor} />
              <Stop offset="100%" stopColor="transparent" />
            </RadialGradient>
          </Defs>
          <Ellipse
            cx={GLOW_RADIUS_X}
            cy={GLOW_RADIUS_Y}
            rx={GLOW_RADIUS_X}
            ry={GLOW_RADIUS_Y}
            fill="url(#topGlow)"
          />
        </Svg>
        {/* Bottom-center glow (dimmer) */}
        <Svg
          width={GLOW_RADIUS_X * 2}
          height={GLOW_RADIUS_Y * 2}
          style={[
            styles.glowSpot,
            {
              bottom: 0,
              left: (screenWidth - GLOW_RADIUS_X * 2) / 2,
              opacity: 0.7,
            },
          ]}>
          <Defs>
            <RadialGradient id="bottomGlow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor={glowCenterColor} />
              <Stop offset="100%" stopColor="transparent" />
            </RadialGradient>
          </Defs>
          <Ellipse
            cx={GLOW_RADIUS_X}
            cy={GLOW_RADIUS_Y}
            rx={GLOW_RADIUS_X}
            ry={GLOW_RADIUS_Y}
            fill="url(#bottomGlow)"
          />
        </Svg>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  vignetteTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: VIGNETTE_HEIGHT,
  },
  vignetteBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: VIGNETTE_HEIGHT,
  },
  vignetteLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: VIGNETTE_SIDE_WIDTH,
  },
  vignetteRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: VIGNETTE_SIDE_WIDTH,
  },
  glowSpot: {
    position: 'absolute',
  },
});
