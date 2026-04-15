import React, {useCallback, useMemo} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import {useInfiniteQuery} from '@tanstack/react-query';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {mobileApi} from '../../lib/api/mobileApi';
import {
  buildThreadTree,
  countThreadBranches,
  flattenThreadTree,
  spineThroughJournal,
  type ThreadTreeNode,
} from '../../lib/threadTree';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts, typeScale} from '../../theme/typography';
import {radii, shadows, spacing} from '../../theme/spacing';
import type {RootStackParamList} from '../../navigation/types';

// ═══════════════════════════════════════════════════════════════════
// ThreadPanel — thread surface on Post Detail, paginated inline.
//
// Rendering rules:
//   - Renders null when the tree has < 2 posts (not a thread).
//   - Fetches PAGE_SIZE rows at a time via useInfiniteQuery. The user
//     controls how deep they go via the "Load more" button at the
//     bottom — no implicit clamping.
//   - Uses buildThreadTree + spineThroughJournal to get the linear
//     spine through the current post, so branching threads still
//     render a sensible "main line".
//
// Cache key is scoped to 'journal-thread-panel' so it doesn't collide
// with ThreadScreen's own useInfiniteQuery keyed on 'journal-thread'
// (different page sizes).
// ═══════════════════════════════════════════════════════════════════

const PAGE_SIZE = 5;

interface ThreadPanelProps {
  journalId: string;
}

function ThreadPanelImpl({journalId}: ThreadPanelProps) {
  const {colors, scaledType} = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const {
    data,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['journal-thread', journalId],
    queryFn: ({pageParam}) =>
      mobileApi.getJournalThread(journalId, {
        limit: PAGE_SIZE,
        offset: pageParam,
      }),
    enabled: Boolean(journalId),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.reduce((n, p) => n + p.posts.length, 0);
    },
    staleTime: 60 * 1000,
  });

  const allPosts = useMemo(
    () => (data?.pages ?? []).flatMap(p => p.posts),
    [data],
  );

  const tree = useMemo(() => buildThreadTree(allPosts), [allPosts]);
  const spine = useMemo(
    () => (tree ? spineThroughJournal(tree, journalId) : []),
    [tree, journalId],
  );
  const totalNodes = useMemo(
    () => (tree ? flattenThreadTree(tree).length : 0),
    [tree],
  );
  const branchCount = useMemo(
    () => (tree ? countThreadBranches(tree) : 0),
    [tree],
  );
  // totalCount from the latest loaded page — used for the subtitle so
  // the user sees the full size even before they've loaded every page.
  const serverTotal = useMemo(() => {
    const pages = data?.pages ?? [];
    if (pages.length === 0) return totalNodes;
    return pages[pages.length - 1].totalCount || totalNodes;
  }, [data, totalNodes]);

  const openEntry = useCallback(
    (node: ThreadTreeNode) => {
      if (node.journal.id === journalId) return;
      // ThreadPanel renders on PostDetail. Tapping another row in the
      // same thread is a LATERAL move inside the chain, not a new
      // drill-in — so replace the current PostDetail instead of pushing.
      // Keeps the back button anchored to where the user started reading,
      // and prevents recursive stack bloat when the user walks through a
      // long chain (thread → detail → panel → detail → panel …).
      navigation.replace('PostDetail', {journalId: node.journal.id});
    },
    [journalId, navigation],
  );

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading || !tree || serverTotal < 2) return null;

  // Hoisted out of the map below — both are invariant across iterations.
  const currentIdx = spine.findIndex(n => n.journal.id === journalId);

  const subtitle = (() => {
    const base = serverTotal === 1 ? '1 post in this thread' : `${serverTotal} posts in this thread`;
    if (branchCount <= 0) return base;
    const branchLabel = branchCount === 1 ? '1 branch' : `${branchCount} branches`;
    return `${base} · ${branchLabel}`;
  })();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, scaledType.h3, {color: colors.textHeading}]}>
          Thread
        </Text>
        <Text
          style={[
            styles.subtitle,
            {color: colors.textMuted, fontFamily: fonts.serif.italic},
          ]}>
          {subtitle}
        </Text>
        {tree.hasEarlierGap || (tree.droppedCount ?? 0) > 0 ? (
          <Text
            style={[
              styles.gapNote,
              {color: colors.textMuted, fontFamily: fonts.ui.regular},
            ]}>
            Some earlier posts in this thread are unavailable.
          </Text>
        ) : null}
      </View>

      <View style={styles.chainWrap}>
        {spine.map((node, index) => {
          const isCurrent = node.journal.id === journalId;
          const authorName = node.journal.users?.name || 'Unknown';
          const title = node.journal.title?.trim() || 'Untitled';
          const isBeforeCurrent = currentIdx >= 0 && index < currentIdx;
          const indexLabel = isCurrent
            ? 'This post'
            : isBeforeCurrent
              ? 'Earlier'
              : 'Later';

          return (
            <View key={node.journal.id}>
              {index > 0 ? (
                <View
                  style={[
                    styles.connector,
                    {backgroundColor: colors.borderCard},
                  ]}
                />
              ) : null}
              {isCurrent ? (
                // Current post: structurally identical to its siblings.
                // One single design move — the title is rendered in
                // accentGold. No label slot (labeling the post you're
                // already reading is redundant); content vertical-
                // centers inside a minHeight that matches siblings so
                // the chain's rhythm stays intact. Not Pressable.
                <View
                  accessibilityRole="text"
                  accessibilityLabel={`Current post: ${title}${
                    authorName && authorName !== 'Unknown'
                      ? ` by ${authorName}`
                      : ''
                  }`}
                  style={[
                    styles.currentEntry,
                    {
                      backgroundColor: colors.bgCard,
                      borderColor: colors.borderCard,
                    },
                    shadows(colors).cardSm,
                  ]}>
                  <Text
                    style={[
                      styles.entryTitle,
                      {color: colors.accentGold, fontFamily: fonts.heading.bold},
                    ]}
                    numberOfLines={2}>
                    {title}
                  </Text>
                  <Text
                    style={[
                      styles.entryAuthor,
                      {color: colors.textMuted, fontFamily: fonts.ui.regular},
                    ]}
                    numberOfLines={1}>
                    {authorName}
                  </Text>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${indexLabel}: ${title} by ${authorName}`}
                  onPress={() => openEntry(node)}
                  style={[
                    styles.entry,
                    {
                      backgroundColor: colors.bgCard,
                      borderColor: colors.borderCard,
                    },
                    shadows(colors).cardSm,
                  ]}>
                  <Text
                    style={[
                      styles.indexLabel,
                      {color: colors.textMuted},
                    ]}>
                    {indexLabel}
                  </Text>
                  <Text
                    style={[
                      styles.entryTitle,
                      {color: colors.textHeading, fontFamily: fonts.heading.bold},
                    ]}
                    numberOfLines={2}>
                    {title}
                  </Text>
                  <Text
                    style={[
                      styles.entryAuthor,
                      {color: colors.textMuted, fontFamily: fonts.ui.regular},
                    ]}
                    numberOfLines={1}>
                    {authorName}
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>

      {hasNextPage ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Load more posts in this thread"
          onPress={handleLoadMore}
          disabled={isFetchingNextPage}
          hitSlop={8}
          style={styles.loadMoreCta}>
          {isFetchingNextPage ? (
            <ActivityIndicator color={colors.accentGold} />
          ) : (
            <Text
              style={[
                styles.loadMoreLabel,
                {color: colors.accentGold, fontFamily: fonts.ui.semiBold},
              ]}>
              Load more
            </Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

export const ThreadPanel = React.memo(ThreadPanelImpl);

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl,
  },
  header: {
    marginBottom: spacing.md,
    gap: 2,
  },
  title: {
    ...typeScale.h3,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  gapNote: {
    marginTop: spacing.xs,
    fontSize: 12,
    lineHeight: 17,
  },
  chainWrap: {
    gap: 0,
  },
  connector: {
    width: 2,
    height: spacing.md,
    marginLeft: spacing.xl,
  },
  entry: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.md,
    gap: 4,
  },
  currentEntry: {
    // Structurally identical to `entry` — same radius, same border,
    // same padding. The ONLY design move for "this post" lives in the
    // JSX: the title is rendered in accentGold. Content centers
    // vertically so the missing label slot doesn't shorten the card
    // and break the chain's rhythm.
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.md,
    gap: 4,
    minHeight: 76,
    justifyContent: 'center',
  },
  indexLabel: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  entryTitle: {
    fontSize: 14,
    lineHeight: 19,
    marginTop: 2,
  },
  entryAuthor: {
    fontSize: 11,
    lineHeight: 14,
    marginTop: 2,
  },
  loadMoreCta: {
    alignSelf: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    minHeight: 36,
    justifyContent: 'center',
  },
  loadMoreLabel: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.3,
  },
});
