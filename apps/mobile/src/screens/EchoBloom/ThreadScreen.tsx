import React, {useCallback, useMemo} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useInfiniteQuery} from '@tanstack/react-query';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {mobileApi} from '../../lib/api/mobileApi';
import {
  buildThreadTree,
  countThreadBranches,
  flattenThreadTree,
  type ThreadTreeNode,
} from '../../lib/threadTree';
import {CurrentPostCard} from '../../components/EchoBloom/CurrentPostCard';
import {ThreadChapterCard} from '../../components/EchoBloom/ThreadChapterCard';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts, typeScale} from '../../theme/typography';
import {spacing} from '../../theme/spacing';
import type {RootStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Thread'>;

// ═══════════════════════════════════════════════════════════════════
// ThreadScreen — full-screen view of a parent/child thread.
//
// Data path:
//   GET /journal/:id/thread  → flat rows, ordered (depth, created_at)
//   buildThreadTree          → real nested tree with sibling order
//   flattenThreadTree        → pre-order list for FlatList rendering
//
// Each row is indented by `node.depth * INDENT_PX` and the left gutter
// draws a connector elbow (├ or └) plus, for every ancestor depth that
// still has more siblings to render below this row, a vertical rule.
//
// No fabricated relationships — the tree is built strictly from the
// parent_journal_id pointers returned by the RPC.
// ═══════════════════════════════════════════════════════════════════

const INDENT_PX = 20;
const GUTTER_COLUMN = 18;

type RenderItem = {
  node: ThreadTreeNode;
  // For each ancestor depth (0..depth-1), true if that ancestor still
  // has more siblings after this row. We draw a vertical rule in that
  // column. Length === node.depth.
  ancestorHasMore: boolean[];
  // 1-based position in pre-order traversal — used as the chapter
  // numeral on ThreadChapterCard ("I", "II", "III"…).
  chapterNumber: number;
  // ISO timestamp of the parent node's created_at. Undefined for the
  // root. ThreadChapterCard turns this into "a week later" marginalia.
  parentCreatedAt?: string;
};

function buildRenderItems(root: ThreadTreeNode | null): RenderItem[] {
  if (!root) return [];
  const out: RenderItem[] = [];

  const visit = (
    node: ThreadTreeNode,
    ancestorHasMore: boolean[],
    parentCreatedAt?: string,
  ) => {
    out.push({
      node,
      ancestorHasMore,
      chapterNumber: out.length + 1,
      parentCreatedAt,
    });
    node.children.forEach((child, idx) => {
      const childIsLast = idx === node.children.length - 1;
      // The column for THIS node's depth stays "has more" if this
      // iteration isn't the last sibling at our depth.
      const nextAncestors = [...ancestorHasMore, !childIsLast];
      visit(child, nextAncestors, node.journal.created_at ?? undefined);
    });
  };

  visit(root, []);
  return out;
}

const PAGE_SIZE = 5;

export function ThreadScreen({route, navigation}: Props) {
  const {journalId} = route.params;
  const {colors, scaledType} = useTheme();

  const {
    data,
    error,
    isLoading,
    isError,
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
      const loaded = allPages.reduce((n, p) => n + p.posts.length, 0);
      return loaded;
    },
    staleTime: 60 * 1000,
  });

  const allPosts = useMemo(
    () => (data?.pages ?? []).flatMap(p => p.posts),
    [data],
  );

  const tree = useMemo(() => buildThreadTree(allPosts), [allPosts]);
  const renderItems = useMemo(() => buildRenderItems(tree), [tree]);
  const flatNodes = useMemo(
    () => (tree ? flattenThreadTree(tree) : []),
    [tree],
  );
  const branchCount = useMemo(
    () => (tree ? countThreadBranches(tree) : 0),
    [tree],
  );

  const openNode = useCallback(
    (node: ThreadTreeNode) => {
      // Current post is clickable too — push PostDetail for it so the
      // reader lands on the full body + comments for the card they
      // just tapped on the "You are here" marker.
      navigation.push('PostDetail', {journalId: node.journal.id});
    },
    [navigation],
  );

  const subtitle = useMemo(() => {
    const count = flatNodes.length;
    const base = count === 1 ? '1 post' : `${count} posts`;
    if (branchCount <= 0) return base;
    const branchLabel = branchCount === 1 ? '1 branch' : `${branchCount} branches`;
    return `${base} · ${branchLabel}`;
  }, [branchCount, flatNodes.length]);

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.safe, {backgroundColor: colors.bgPrimary}]}
        edges={['left', 'right']}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accentGold} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !tree || flatNodes.length === 0) {
    // Branch on HTTP status so the empty state is honest about WHY the
    // thread isn't showing. A 403/404 from someone blocking the OP or
    // the post being removed reads nothing like "not part of a thread".
    const status = (error as {status?: number} | null)?.status;
    const message =
      status === 404
        ? 'This post is no longer available.'
        : status === 403
          ? "You don't have access to this thread."
          : isError
            ? "Couldn't load this thread. Pull down to retry."
            : "This post isn't part of a thread.";
    return (
      <SafeAreaView
        style={[styles.safe, {backgroundColor: colors.bgPrimary}]}
        edges={['left', 'right']}>
        <View style={styles.loading}>
          <Text style={[styles.emptyText, {color: colors.textMuted}]}>
            {message}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safe, {backgroundColor: colors.bgPrimary}]}
      edges={['left', 'right']}>
      <FlatList
        data={renderItems}
        keyExtractor={item => item.node.journal.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text
              style={[
                styles.title,
                scaledType.h1,
                {color: colors.textHeading},
              ]}>
              Thread
            </Text>
            <Text
              style={[
                styles.subtitle,
                {
                  color: colors.textMuted,
                  fontFamily: fonts.serif.italic,
                },
              ]}>
              {subtitle}
            </Text>
            {tree.hasEarlierGap || (tree.droppedCount ?? 0) > 0 ? (
              <View
                style={[
                  styles.gapBanner,
                  {
                    backgroundColor: colors.bgSecondary,
                    borderColor: colors.borderCard,
                  },
                ]}>
                <Text
                  style={[
                    styles.gapBannerText,
                    {color: colors.textMuted, fontFamily: fonts.ui.regular},
                  ]}>
                  Some earlier posts in this thread are unavailable.
                </Text>
              </View>
            ) : null}
          </View>
        }
        ListFooterComponent={
          hasNextPage ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View more posts in this thread"
              onPress={() => {
                if (!isFetchingNextPage) fetchNextPage();
              }}
              disabled={isFetchingNextPage}
              style={styles.footer}>
              {isFetchingNextPage ? (
                <ActivityIndicator color={colors.accentGold} />
              ) : (
                <Text
                  style={[
                    styles.footerLabel,
                    {color: colors.accentGold, fontFamily: fonts.ui.semiBold},
                  ]}>
                  View more
                </Text>
              )}
            </Pressable>
          ) : null
        }
        renderItem={({item}) => (
          <ThreadRow
            item={item}
            isCurrent={item.node.journal.id === journalId}
            onPress={() => openNode(item.node)}
          />
        )}
      />
    </SafeAreaView>
  );
}

interface ThreadRowProps {
  item: RenderItem;
  isCurrent: boolean;
  onPress: () => void;
}

function ThreadRowComponent({item, isCurrent, onPress}: ThreadRowProps) {
  const {colors} = useTheme();
  const {node, ancestorHasMore, chapterNumber, parentCreatedAt} = item;

  // For each ancestor depth, draw a vertical rule if that ancestor
  // still has more children to render below this row.
  const gutters: React.ReactNode[] = [];
  for (let i = 0; i < node.depth; i++) {
    const isElbowColumn = i === node.depth - 1;
    const showVerticalRule = ancestorHasMore[i] === true;
    gutters.push(
      <View
        key={`g-${i}`}
        style={[
          styles.gutter,
          {width: GUTTER_COLUMN},
        ]}>
        {showVerticalRule && !isElbowColumn ? (
          <View
            style={[
              styles.verticalRule,
              {backgroundColor: colors.borderLight},
            ]}
          />
        ) : null}
        {isElbowColumn ? (
          <View style={styles.elbowWrap}>
            <View
              style={[
                styles.elbowVertical,
                {
                  backgroundColor: colors.borderLight,
                  height: node.isLastChildOfParent ? '50%' : '100%',
                },
              ]}
            />
            <View
              style={[
                styles.elbowHorizontal,
                {backgroundColor: colors.borderLight},
              ]}
            />
          </View>
        ) : null}
      </View>,
    );
  }

  // Current post gets its own fully-designed card — bookmark ribbon,
  // printer's ornaments, double-rule frame, gold aura. The gutter still
  // renders on the left so the tree structure remains visible. Tapping
  // it opens PostDetail for the same journal (full body + comments).
  if (isCurrent) {
    return (
      <View style={[styles.row, styles.currentRow]}>
        <View style={styles.gutterRow}>{gutters}</View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`You are here: ${node.journal.title?.trim() || 'Untitled'}. Tap to open the full post.`}
          onPress={onPress}
          style={styles.currentCardSlot}>
          <CurrentPostCard journal={node.journal} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <View style={styles.gutterRow}>{gutters}</View>
      <View style={styles.chapterCardSlot}>
        <ThreadChapterCard
          journal={node.journal}
          chapterNumber={chapterNumber}
          parentCreatedAt={parentCreatedAt}
          onPress={onPress}
        />
      </View>
    </View>
  );
}

const ThreadRow = React.memo(ThreadRowComponent);

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typeScale.body,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  footer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  footerLabel: {
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0.3,
  },
  header: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: 4,
  },
  gapBanner: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
  },
  gapBannerText: {
    fontSize: 12,
    lineHeight: 17,
  },
  title: {
    ...typeScale.h1,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: spacing.md,
  },
  currentRow: {
    // Extra breathing room above and below the fancy card so its
    // ribbon and its gold aura don't crowd neighboring rows.
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    alignItems: 'flex-start',
  },
  currentCardSlot: {
    flex: 1,
  },
  gutterRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  gutter: {
    position: 'relative',
  },
  verticalRule: {
    position: 'absolute',
    left: GUTTER_COLUMN / 2 - 1,
    top: 0,
    bottom: 0,
    width: 2,
  },
  elbowWrap: {
    position: 'absolute',
    left: GUTTER_COLUMN / 2 - 1,
    top: 0,
    bottom: 0,
    width: 2,
    alignItems: 'flex-start',
  },
  elbowVertical: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 2,
  },
  elbowHorizontal: {
    position: 'absolute',
    left: 0,
    top: '50%',
    width: INDENT_PX - 2,
    height: 2,
  },
  chapterCardSlot: {
    flex: 1,
  },
});
