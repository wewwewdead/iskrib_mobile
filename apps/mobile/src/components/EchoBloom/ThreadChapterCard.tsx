import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {ThreadJournalEntry} from '../../lib/api/mobileApi';
import {NetworkImage} from '../NetworkImage';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts, typeScale} from '../../theme/typography';
import {radii, shadows, spacing} from '../../theme/spacing';
import {
  formatElapsedSinceParent,
  toRomanNumeral,
} from '../../lib/utils/threadTime';

// ═══════════════════════════════════════════════════════════════════
// ThreadChapterCard — thread row card for ThreadScreen.
//
// Reads the thread chain like a private book: each card is a chapter,
// opening with a Roman numeral marginalia and (when the post isn't
// the root) a serif italic label telling the reader how long it was
// before the writer came back to this thought. A short gold hairline
// echoes CurrentPostCard's printer's rules at lower intensity.
//
// Layout:
//   - Left column (conditional): 72×72 thumbnail, only when the post
//     has an image. Omitted entirely otherwise — no empty box.
//   - Right column: meta row (numeral · elapsed), gold rule, title
//     (Lexend Deca Bold), preview (Lora serif, 2 lines).
//
// Performance:
//   - NetworkImage with disableFadeIn (per its own perf note for card
//     rows; avoids opacity animation thrashing on fast scroll).
//   - Fixed dimensions → no layout-shift work per frame.
//   - React.memo wraps the export so in-window sibling mounts don't
//     re-render visible cards.
// ═══════════════════════════════════════════════════════════════════

interface ThreadChapterCardProps {
  journal: ThreadJournalEntry;
  chapterNumber: number;
  parentCreatedAt?: string;
  onPress: () => void;
}

function ThreadChapterCardImpl({
  journal,
  chapterNumber,
  parentCreatedAt,
  onPress,
}: ThreadChapterCardProps) {
  const {colors, scaledType} = useTheme();

  const title = journal.title?.trim() || 'Untitled';
  const preview = journal.preview_text?.trim() ?? '';
  const thumbnail = journal.thumbnail_url ?? null;

  const numeral = toRomanNumeral(chapterNumber);
  const elapsed = formatElapsedSinceParent(journal.created_at, parentCreatedAt);

  const accessibilityLabel = elapsed
    ? `Chapter ${numeral}, ${elapsed}: ${title}`
    : `Chapter ${numeral}: ${title}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.bgCard,
          borderColor: colors.borderCard,
        },
        shadows(colors).card,
      ]}>
      {thumbnail ? (
        <NetworkImage
          uri={thumbnail}
          accessibilityLabel={`${title} thumbnail`}
          style={[styles.thumbnail, {borderColor: colors.borderCard}]}
          resizeMode="cover"
          disableFadeIn
        />
      ) : null}

      <View style={styles.content}>
        <View style={styles.metaRow}>
          <Text
            style={[
              styles.numeral,
              {
                color: colors.accentGold,
                fontFamily: fonts.serif.italic,
              },
            ]}>
            {numeral}
          </Text>
          {elapsed ? (
            <>
              <Text
                style={[
                  styles.metaDot,
                  {color: colors.textMuted},
                ]}>
                ·
              </Text>
              <Text
                style={[
                  styles.elapsed,
                  {
                    color: colors.textMuted,
                    fontFamily: fonts.serif.italic,
                  },
                ]}
                numberOfLines={1}>
                {elapsed}
              </Text>
            </>
          ) : null}
        </View>

        <View
          style={[
            styles.rule,
            {backgroundColor: colors.accentGold},
          ]}
        />

        <Text
          style={[
            styles.title,
            {
              color: colors.textHeading,
              fontFamily: fonts.heading.bold,
              fontSize: scaledType.cardTitle.fontSize,
              lineHeight: scaledType.cardTitle.lineHeight,
            },
          ]}
          numberOfLines={2}>
          {title}
        </Text>

        {preview ? (
          <Text
            style={[
              styles.preview,
              {
                color: colors.textBody,
                fontFamily: fonts.serif.regular,
              },
            ]}
            numberOfLines={2}>
            {preview}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export const ThreadChapterCard = React.memo(ThreadChapterCardImpl);

const THUMBNAIL_SIZE = 72;

const styles = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  numeral: {
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: 1,
  },
  metaDot: {
    fontSize: 13,
    lineHeight: 14,
  },
  elapsed: {
    fontSize: 12,
    lineHeight: 14,
    flexShrink: 1,
  },
  rule: {
    width: 24,
    height: 1,
    opacity: 0.4,
    marginTop: 4,
    marginBottom: spacing.sm,
  },
  title: {
    ...typeScale.cardTitle,
    letterSpacing: -0.1,
  },
  preview: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
});
