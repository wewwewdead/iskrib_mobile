import React, {memo} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';
import type {JournalItem} from '../../lib/api/mobileApi';
import {useSpringEntrance, useSpringPress} from '../../lib/springs';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts, typeScale} from '../../theme/typography';
import {radii, shadows, spacing} from '../../theme/spacing';

export type EchoCardKind = 'echo' | 'your_echo' | 'prompt_sibling';

interface EchoCardProps {
  kind: EchoCardKind;
  label: string;
  journal: JournalItem;
  delay: number;
  width?: number;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

function EchoCardImpl({
  label,
  journal,
  delay,
  width,
  onPress,
  style,
}: EchoCardProps) {
  const {colors, scaledType} = useTheme();
  const entryStyle = useSpringEntrance(delay, 24, 0.96);
  const {animatedStyle: pressStyle, onPressIn, onPressOut} = useSpringPress(0.96);

  const authorName = journal.users?.name || 'Unknown';
  const title = journal.title?.trim() || 'Untitled';

  return (
    <Animated.View style={[entryStyle, style, width ? {width} : null]}>
      <Animated.View style={pressStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${title} by ${authorName}`}
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={[
            styles.card,
            {
              backgroundColor: colors.bgCard,
              borderColor: colors.borderCard,
            },
            shadows(colors).cardSm,
          ]}>
          <Text style={[styles.label, {color: colors.accentGold}]}>
            {label}
          </Text>
          <Text
            style={[
              styles.title,
              {
                fontFamily: fonts.heading.bold,
                fontSize: scaledType.cardTitle.fontSize,
                lineHeight: scaledType.cardTitle.lineHeight,
                color: colors.textHeading,
              },
            ]}
            numberOfLines={2}>
            {title}
          </Text>
          <Text
            style={[
              styles.author,
              {
                fontFamily: fonts.ui.regular,
                color: colors.textMuted,
              },
            ]}
            numberOfLines={1}>
            {authorName}
          </Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

export const EchoCard = memo(EchoCardImpl);

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  label: {
    ...typeScale.label,
  },
  title: {
    marginTop: 2,
  },
  author: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
  },
});
