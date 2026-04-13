import React, {useCallback, useEffect} from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Svg, {Circle} from 'react-native-svg';
import {useSpringPress} from '../../lib/springs';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts} from '../../theme/typography';
import {radii, spacing} from '../../theme/spacing';
import {Haptics} from '../../lib/haptics';
import {useEchoesSummary} from '../../hooks/useEchoesSummary';
import {useEchoesPulseState} from '../../hooks/useEchoesPulseState';
import type {RootStackParamList} from '../../navigation/types';

// ═══════════════════════════════════════════════════════════════════
// EchoesChip — feed/card affordance that opens Echo Bloom for a journal.
//
// Rendering rules (every rule is backed by real data):
//   1. Renders nothing until `useEchoesSummary` confirms the server
//      returned `confidence !== 'none'` with ≥1 post. No chip = no
//      claim of intelligence.
//   2. The count is the server's post count after confidence-tier
//      capping. Not a fabricated number.
//   3. The "pulse" animation is driven by `useEchoesPulseState`, which
//      compares the server's current count to a locally-stored
//      `lastSeenCount[journalId]` — a real delta, not a decorative
//      animation. Pulse ends permanently once the user opens Bloom
//      for this journal.
//
// Tap → `navigation.push('EchoBloom', {journalId})`. The Bloom screen
// marks the journal as seen on mount, which silences the pulse.
// ═══════════════════════════════════════════════════════════════════

interface EchoesChipProps {
  journalId: string;
}

const PULSE_DURATION_MS = 1400;

function EchoesChipImpl({journalId}: EchoesChipProps) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {colors} = useTheme();
  const reduceMotion = useReducedMotion();
  const {hasEchoes, count} = useEchoesSummary(journalId);
  const {shouldPulse} = useEchoesPulseState(journalId, count);
  const {animatedStyle: pressStyle, onPressIn, onPressOut} =
    useSpringPress(0.95);

  const pulseGlow = useSharedValue(0);

  useEffect(() => {
    if (!hasEchoes || !shouldPulse || reduceMotion) {
      pulseGlow.value = 0;
      return;
    }
    pulseGlow.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: PULSE_DURATION_MS / 2,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0, {
          duration: PULSE_DURATION_MS / 2,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      false,
    );
  }, [hasEchoes, shouldPulse, reduceMotion, pulseGlow]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + pulseGlow.value * 0.6,
    transform: [{scale: 1 + pulseGlow.value * 0.08}],
  }));

  const handlePress = useCallback(() => {
    Haptics.tap();
    navigation.push('EchoBloom', {journalId});
  }, [journalId, navigation]);

  if (!hasEchoes) return null;

  const label = count === 1 ? '1 echo' : `${count} echoes`;
  const glowColor = colors.accentGold;

  return (
    <Animated.View style={pressStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}. Open Echo Bloom for this post.`}
        hitSlop={6}
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[
          styles.chip,
          {
            backgroundColor: `${glowColor}14`,
            borderColor: `${glowColor}55`,
          },
        ]}>
        <Animated.View style={[styles.iconWrap, pulseStyle]}>
          <Svg width={14} height={14} viewBox="0 0 14 14">
            <Circle
              cx={7}
              cy={7}
              r={6}
              stroke={glowColor}
              strokeWidth={1.1}
              fill="none"
              opacity={0.45}
            />
            <Circle
              cx={7}
              cy={7}
              r={3}
              stroke={glowColor}
              strokeWidth={1.2}
              fill="none"
            />
            <Circle cx={7} cy={7} r={1} fill={glowColor} />
          </Svg>
        </Animated.View>
        <Text
          style={[
            styles.label,
            {color: glowColor, fontFamily: fonts.ui.semiBold},
          ]}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export const EchoesChip = React.memo(EchoesChipImpl);

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingLeft: spacing.sm,
    paddingRight: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
    gap: 6,
  },
  iconWrap: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.4,
  },
});
