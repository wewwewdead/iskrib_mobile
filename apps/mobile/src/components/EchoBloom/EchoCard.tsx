import React, {memo} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';
import type {JournalItem} from '../../lib/api/mobileApi';
import {Avatar} from '../Avatar';
import {NetworkImage} from '../NetworkImage';
import {BadgeCheckIcon} from '../icons';
import {useSpringEntrance, useSpringPress} from '../../lib/springs';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts, typeScale} from '../../theme/typography';
import {radii, shadows, spacing} from '../../theme/spacing';

export type EchoCardKind = 'echo' | 'your_echo' | 'prompt_sibling';

// Similarity thresholds match the server's confidence tiers
// (`discoveryService.js` / `echo_bloom.sql`): ≥0.60 is the "high" tier
// which we label "Mirror" — the related post is so close it reads as a
// reflection of the source. Below that the post is still related but
// reads as a thematic companion, which we label "Echo". Anything below
// the floor won't reach this card because the server already filters it.
const MIRROR_SIMILARITY_THRESHOLD = 0.6;

interface EchoCardProps {
  kind: EchoCardKind;
  label: string;
  journal: JournalItem;
  delay: number;
  width?: number;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  /**
   * When set on an `echo`-kind card, overrides the hardcoded `label`
   * with "Mirror" for very high similarity (≥0.60) or "Echo" for
   * everything below, so the writer can tell at a glance whether the
   * related post closely reflects their own thought or is a looser
   * companion. Ignored for `your_echo` / `prompt_sibling` — those have
   * relational labels that aren't about similarity.
   */
  similarity?: number;
}

function resolveLabel(
  kind: EchoCardKind,
  fallback: string,
  similarity?: number,
): string {
  if (kind !== 'echo' || typeof similarity !== 'number') return fallback;
  return similarity >= MIRROR_SIMILARITY_THRESHOLD ? 'Mirror' : 'Echo';
}

function EchoCardImpl({
  kind,
  label,
  journal,
  delay,
  width,
  onPress,
  style,
  similarity,
}: EchoCardProps) {
  const {colors, scaledType} = useTheme();
  const entryStyle = useSpringEntrance(delay, 24, 0.96);
  const {animatedStyle: pressStyle, onPressIn, onPressOut} = useSpringPress(0.96);

  const authorName = journal.users?.name || 'Unknown';
  const authorAvatar = journal.users?.image_url ?? null;
  const authorBadge = (journal.users?.badge ?? null) as
    | 'legend'
    | 'og'
    | null;
  const title = journal.title?.trim() || 'Untitled';
  const thumbnail = journal.thumbnail_url ?? null;
  const displayLabel = resolveLabel(kind, label, similarity);

  return (
    <Animated.View style={[entryStyle, style, width ? {width} : null]}>
      <Animated.View style={pressStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${displayLabel}: ${title} by ${authorName}`}
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
          {thumbnail ? (
            <NetworkImage
              uri={thumbnail}
              accessibilityLabel={`${title} thumbnail`}
              style={styles.thumbnail}
              resizeMode="cover"
              disableFadeIn
            />
          ) : null}
          <View style={styles.body}>
            <Text style={[styles.label, {color: colors.accentGold}]}>
              {displayLabel}
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
            <View style={styles.authorRow}>
              <Avatar
                uri={authorAvatar}
                name={authorName}
                size={20}
                badge={authorBadge}
              />
              <Text
                style={[
                  styles.authorName,
                  {
                    fontFamily: fonts.ui.medium,
                    color: colors.textSecondary,
                  },
                ]}
                numberOfLines={1}>
                {authorName}
              </Text>
              {authorBadge ? (
                <BadgeCheckIcon size={12} badge={authorBadge} />
              ) : null}
            </View>
          </View>
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
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: 100,
  },
  body: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  label: {
    ...typeScale.label,
  },
  title: {
    marginTop: 2,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  authorName: {
    fontSize: 11,
    lineHeight: 14,
    flexShrink: 1,
  },
});
