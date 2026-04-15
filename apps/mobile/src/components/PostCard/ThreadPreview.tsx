import React, {useMemo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts} from '../../theme/typography';
import {radii, spacing} from '../../theme/spacing';
import {
  buildThreadTree,
  spineThroughJournal,
  type ThreadTreeNode,
} from '../../lib/threadTree';
import type {ThreadJournalEntry} from '../../lib/api/mobileApi';

// ═══════════════════════════════════════════════════════════════════
// ThreadPreview — compact "continue this thought" strip rendered on
// PostCard when the card's post is part of a thread.
//
// Shows up to MAX_INLINE neighboring posts from the thread spine,
// excluding the current card's own post (it's already the focal
// content of the card). "Earlier"/"Later" labels come from each
// neighbor's position in the spine relative to the current post.
//
// "View full thread →" is always rendered when at least one neighbor
// exists, so readers have a consistent affordance to jump into the
// full thread view regardless of how many siblings fit inline.
// Tapping any row — or the CTA — bubbles up via onViewFullThread so
// the host PostCard owns navigation.
// ═══════════════════════════════════════════════════════════════════

const MAX_INLINE = 5;

export interface ThreadPreviewProps {
  currentJournalId: string;
  posts: ThreadJournalEntry[];
  onViewFullThread: () => void;
}

function ThreadPreviewImpl({
  currentJournalId,
  posts,
  onViewFullThread,
}: ThreadPreviewProps) {
  const {colors} = useTheme();

  const {neighbors, currentIndex} = useMemo(() => {
    const tree = buildThreadTree(posts);
    if (!tree) return {neighbors: [] as ThreadTreeNode[], currentIndex: -1};

    const spine = spineThroughJournal(tree, currentJournalId);
    if (spine.length === 0) {
      // Current post isn't in the fetched page — fall back to showing
      // whatever the first page gave us, in tree order.
      return {
        neighbors: posts.map(p => ({
          journal: p,
          depth: p.depth ?? 0,
          children: [],
          isLastChildOfParent: true,
        })) as ThreadTreeNode[],
        currentIndex: -1,
      };
    }

    const idx = spine.findIndex(n => n.journal.id === currentJournalId);
    const others = spine.filter(n => n.journal.id !== currentJournalId);
    return {neighbors: others, currentIndex: idx};
  }, [posts, currentJournalId]);

  if (neighbors.length === 0) return null;

  const shown = neighbors.slice(0, MAX_INLINE);

  return (
    <View style={styles.container}>
      {shown.map((node, i) => {
        const authorName = node.journal.users?.name || 'Unknown';
        const title = node.journal.title?.trim() || 'Untitled';
        // A neighbor counts as "Earlier" if it sits before the current
        // post in the original spine. After filtering out the current
        // post, the first `currentIndex` entries are ancestors and the
        // rest are descendants — `i` from `shown.map` is the neighbor's
        // position in `neighbors`, which is exactly what we compare.
        const isEarlier = currentIndex >= 0 ? i < currentIndex : false;
        const label = isEarlier ? 'Earlier' : 'Later';

        return (
          <View key={node.journal.id}>
            {i > 0 ? (
              <View
                style={[
                  styles.connector,
                  {backgroundColor: colors.borderCard},
                ]}
              />
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${label}: ${title} by ${authorName}`}
              onPress={onViewFullThread}
              style={[
                styles.row,
                {
                  backgroundColor: colors.bgPrimary,
                  borderColor: colors.borderCard,
                },
              ]}>
              <Text
                style={[styles.label, {color: colors.textMuted}]}>
                {label}
              </Text>
              <Text
                style={[
                  styles.title,
                  {color: colors.textHeading, fontFamily: fonts.heading.bold},
                ]}
                numberOfLines={1}>
                {title}
              </Text>
              <Text
                style={[
                  styles.author,
                  {color: colors.textMuted, fontFamily: fonts.ui.regular},
                ]}
                numberOfLines={1}>
                {authorName}
              </Text>
            </Pressable>
          </View>
        );
      })}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="View full thread"
        onPress={onViewFullThread}
        hitSlop={8}
        style={styles.cta}>
        <Text
          style={[
            styles.ctaLabel,
            {color: colors.accentGold, fontFamily: fonts.ui.semiBold},
          ]}>
          View full thread →
        </Text>
      </Pressable>
    </View>
  );
}

export const ThreadPreview = React.memo(ThreadPreviewImpl);

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
    gap: 0,
  },
  connector: {
    width: 2,
    height: spacing.sm,
    marginLeft: spacing.lg,
  },
  row: {
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  label: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 13,
    lineHeight: 18,
  },
  author: {
    fontSize: 11,
    lineHeight: 14,
  },
  cta: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  ctaLabel: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.3,
  },
});
