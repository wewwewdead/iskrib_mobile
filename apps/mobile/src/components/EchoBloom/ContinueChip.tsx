import React, {useCallback} from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, {Path} from 'react-native-svg';
import {useSpringPress} from '../../lib/springs';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts} from '../../theme/typography';
import {radii, spacing} from '../../theme/spacing';
import {Haptics} from '../../lib/haptics';

// ═══════════════════════════════════════════════════════════════════
// ContinueChip — feed/card affordance that opens the editor with the
// card's journal as the parent, so the writer can continue an older
// thought into a new thread member.
//
// Intentionally sibling-shaped to EchoesChip (same pill geometry,
// same spring press, same haptic) so the two chips sit flush next
// to each other. Uses accentSage instead of accentGold to read as
// a distinct "grow / continue" action, per DESIGN.md.
//
// Thin by design: the parent screen owns navigation and knows which
// posts belong to the current user (server enforces same-author
// threading). The chip itself has no data dependency.
// ═══════════════════════════════════════════════════════════════════

interface ContinueChipProps {
  onPress: () => void;
}

function ContinueChipImpl({onPress}: ContinueChipProps) {
  const {colors} = useTheme();
  const {animatedStyle: pressStyle, onPressIn, onPressOut} =
    useSpringPress(0.95);

  const handlePress = useCallback(() => {
    Haptics.tap();
    onPress();
  }, [onPress]);

  const tint = colors.accentSage;

  return (
    <Animated.View style={pressStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue this post as a new thread entry"
        hitSlop={6}
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[
          styles.chip,
          {
            backgroundColor: `${tint}14`,
            borderColor: `${tint}55`,
          },
        ]}>
        <Svg width={14} height={14} viewBox="0 0 14 14">
          {/* A forward-branching glyph: a short horizontal stem that
              splits upward at the tip, reading as "continue + grow".
              Kept 2px stroke to echo EchoesChip's circle weight. */}
          <Path
            d="M2 9 H8"
            stroke={tint}
            strokeWidth={1.4}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M8 9 L11 6"
            stroke={tint}
            strokeWidth={1.4}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M8 9 L11 12"
            stroke={tint}
            strokeWidth={1.4}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
        <Text
          style={[
            styles.label,
            {color: tint, fontFamily: fonts.ui.semiBold},
          ]}>
          Continue
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export const ContinueChip = React.memo(ContinueChipImpl);

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
  label: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.4,
  },
});
