import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query';
import {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {CompositeScreenProps} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {PostCard} from '../../components/PostCard/PostCard';
import {PostCardSkeleton} from '../../components/SkeletonLoader';
import {ScreenEntrance} from '../../components/ScreenEntrance';
import {CommentModal} from '../../components/Comments';
import {RepostModal} from '../../components/RepostModal';
import {PeekModal} from '../../components/PeekModal/PeekModal';
import {PeekHint} from '../../components/PeekModal/PeekHint';
import {usePeekModal} from '../../hooks/usePeekModal';
import {SearchInput} from '../../components/SearchInput';
import {SearchResultsView} from '../../components/SearchResultsView';
import {FeedTabBar, type FeedTab} from '../../components/FeedTabBar';
import {DailyPromptCard} from '../../components/DailyPromptCard';
import {EmptyState} from '../../components/EmptyState';
import {WeeklyRecapModal} from '../../components/WeeklyRecapModal';
import {WeeklyRecapCard} from '../../components/WeeklyRecapCard';
import {Chip} from '../../components/Chip';
import {WritingPresenceBar} from '../../components/WritingPresenceBar';
import {SpringFAB} from '../../components/SpringFAB';
import {PenIcon} from '../../components/icons';
import {usePresence} from '../../hooks/usePresence';
import {analyticsApi} from '../../lib/api/analyticsApi';
import type {WeeklyRecapData} from '../../lib/api/analyticsApi';
import {useAuth} from '../../features/auth/AuthProvider';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts} from '../../theme/typography';
import {spacing} from '../../theme/spacing';
import {
  mobileApi,
  type CursorPage,
  type JournalItem,
} from '../../lib/api/mobileApi';
import {socialApi} from '../../lib/api/socialApi';
import {queryClient} from '../../lib/queryClient';
import {useBookmarkMutation} from '../../hooks/useSocialMutations';
import {useSearch} from '../../hooks/useSearch';
import {VERTICAL_CARD_LIST_PROPS} from '../../lib/listPerformance';
import {
  getJournalCardData,
  getNextCursor,
  getNextOffset,
} from '../../lib/utils/journalHelpers';
import type {MainTabParamList, RootStackParamList} from '../../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

const PAGE_SIZE = 10;

export function HomeFeedScreen({navigation}: Props) {
  const {user} = useAuth();
  const {colors} = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [feedTab, setFeedTab] = useState<FeedTab>('all');
  const [commentModal, setCommentModal] = useState<{postId: string; receiverId?: string; commentCount: number} | null>(null);
  const [repostModal, setRepostModal] = useState<{journalId: string; title?: string; authorName?: string; authorAvatar?: string} | null>(null);
  const [showRecap, setShowRecap] = useState(false);
  const [recapData, setRecapData] = useState<WeeklyRecapData | null>(null);
  const {query, setQuery, activeTab, setActiveTab, isSearching, normalizedQuery, users, journals} = useSearch();
  const {usersWritingNow} = usePresence();
  const flatListRef = useRef<FlatList>(null);

  // Peek modal state. Per-screen hook (not shared via Context). Stacked-
  // modal guard passes the latest commentModal/repostModal state every
  // render so the hook's internal ref reads the current value.
  const {peekPost, peekSourceRect, openPeek, closePeek} = usePeekModal({
    isOtherModalOpen: !!commentModal || !!repostModal,
  });

  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      if (navigation.isFocused()) {
        flatListRef.current?.scrollToOffset({offset: 0, animated: true});
      }
    });
    return unsubscribe;
  }, [navigation]);

  const recapQuery = useQuery({
    queryKey: ['weekly-recap'],
    queryFn: () => analyticsApi.getWeeklyRecap(),
    staleTime: 60 * 60 * 1000,
  });

  const streakQuery = useQuery({
    queryKey: ['streak', user?.id],
    queryFn: () => mobileApi.getStreak(user?.id ?? ''),
    enabled: !!user?.id,
    staleTime: 60 * 60 * 1000,
  });

  useEffect(() => {
    if (recapQuery.data?.recap?.personal && !showRecap && !recapData) {
      setRecapData(recapQuery.data.recap);
      setShowRecap(true);
    }
  }, [recapData, recapQuery.data, showRecap]);

  const feedQuery = useInfiniteQuery({
    queryKey: ['feed', user?.id],
    enabled: feedTab === 'all',
    queryFn: ({pageParam}) =>
      mobileApi.getJournals(pageParam ?? null, PAGE_SIZE, user?.id),
    initialPageParam: null as string | null,
    getNextPageParam: lastPage => getNextCursor(lastPage, PAGE_SIZE),
  });

  const followingQuery = useInfiniteQuery({
    queryKey: ['feed-following', user?.id],
    enabled: feedTab === 'following',
    queryFn: ({pageParam}) =>
      mobileApi.getFollowingFeed(pageParam ?? null, PAGE_SIZE),
    initialPageParam: null as string | null,
    getNextPageParam: lastPage => getNextCursor(lastPage, PAGE_SIZE),
  });

  const forYouQuery = useInfiniteQuery({
    queryKey: ['feed-foryou', user?.id],
    enabled: feedTab === 'foryou',
    queryFn: ({pageParam}) =>
      mobileApi.getForYouFeed((pageParam as number) ?? 0, PAGE_SIZE),
    initialPageParam: 0 as number,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      getNextOffset(lastPage, (lastPageParam as number) ?? 0, PAGE_SIZE),
  });

  const activeQuery = feedTab === 'following' ? followingQuery : feedTab === 'foryou' ? forYouQuery : feedQuery;

  const reactionMutation = useMutation({
    mutationFn: async ({
      journalId,
      receiverId,
      reactionType,
    }: {
      journalId: string;
      receiverId: string;
      reactionType: string;
    }) => {
      return socialApi.toggleReaction({journalId, receiverId, reactionType});
    },
    onMutate: async ({journalId, reactionType}) => {
      await queryClient.cancelQueries({queryKey: ['feed']});
      const prev = queryClient.getQueryData<{pages: CursorPage<JournalItem>[]}>(
        ['feed', user?.id],
      );
      if (prev) {
        queryClient.setQueryData<{pages: CursorPage<JournalItem>[]}>(
          ['feed', user?.id],
          old => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map(page => ({
                ...page,
                data: page.data.map(item => {
                  if (item.id !== journalId) return item;
                  const removing = item.user_reaction === reactionType;
                  const currentCount =
                    (item.reaction_count?.[0]?.count ??
                      item.like_count?.[0]?.count ??
                      item.likes_count ??
                      0) as number;
                  const delta = removing ? -1 : item.user_reaction ? 0 : 1;
                  return {
                    ...item,
                    user_reaction: removing ? null : reactionType,
                    has_liked: removing ? false : true,
                    like_count: [{count: Math.max(0, currentCount + delta)}],
                  };
                }),
              })),
            };
          },
        );
      }
      return {prev};
    },
    onError: (_err, vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['feed', user?.id], context.prev);
      }
      setReactionErrorPostId(vars.journalId);
    },
    onSettled: () => {
      queryClient.invalidateQueries({queryKey: ['feed']});
    },
  });

  // Track which post had a reaction error (for shake animation)
  const [reactionErrorPostId, setReactionErrorPostId] = useState<string | null>(null);

  // Clear reaction error after animation plays
  useEffect(() => {
    if (reactionErrorPostId) {
      const timer = setTimeout(() => setReactionErrorPostId(null), 500);
      return () => clearTimeout(timer);
    }
  }, [reactionErrorPostId]);

  const bookmarkMutation = useBookmarkMutation(['feed', user?.id]);

  const handleReact = (journalId: string, receiverId: string, reactionType: string) => {
    reactionMutation.mutate({journalId, receiverId, reactionType});
  };

  const handleComment = (journalId: string, receiverId?: string, commentCount?: number) => {
    setCommentModal({postId: journalId, receiverId, commentCount: commentCount ?? 0});
  };

  const handleBookmark = (journalId: string) => {
    bookmarkMutation.mutate(journalId);
  };

  const handleRepost = (journalId: string, title?: string, authorName?: string, authorAvatar?: string) => {
    setRepostModal({journalId, title, authorName, authorAvatar});
  };

  const handleAuthorPress = (item: JournalItem) => {
    const authorId = item.users?.id ?? item.user_id;
    if (!authorId) return;
    if (authorId === user?.id) {
      navigation.navigate('Main', {screen: 'Profile'} as any);
    } else {
      navigation.navigate('VisitProfile', {
        userId: authorId,
        username: item.users?.username ?? undefined,
      });
    }
  };

  const posts = useMemo(
    () =>
      activeQuery.data?.pages
        .flatMap(page => page.data ?? [])
        .filter(item => item.status !== 'draft') ?? [],
    [activeQuery.data?.pages],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await activeQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safe, {backgroundColor: colors.bgPrimary}]}
      edges={['top']}>
      <ScreenEntrance tier="feed">
      {/* Branded header */}
      <View
        style={[
          styles.header,
          {borderBottomColor: colors.borderCard},
        ]}>
        <View style={styles.brandRow}>
          <Text style={[styles.brandText, {color: colors.textHeading}]}>
            iskrib
          </Text>
          <Chip
            label="Opinions"
            active
            onPress={() => navigation.navigate('OpinionsFeed')}
          />
        </View>
        <SearchInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search users or posts..."
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>

      {isSearching ? (
        <SearchResultsView
          activeTab={activeTab}
          onTabChange={setActiveTab}
          users={users}
          journals={journals}
          normalizedQuery={normalizedQuery}
          onUserPress={(id, username) =>
            navigation.navigate('VisitProfile', {userId: id, username})
          }
          onPostPress={id =>
            navigation.navigate('PostDetail', {journalId: id})
          }
          onAuthorPress={handleAuthorPress}
          onReact={handleReact}
          onComment={handleComment}
          onBookmark={handleBookmark}
          onRepost={handleRepost}
          onEmbeddedPress={id =>
            navigation.navigate('PostDetail', {journalId: id})
          }
        />
      ) : (
        <>
          {/* Feed tab bar */}
          <FeedTabBar activeTab={feedTab} onTabChange={setFeedTab} />

          {/* Feed */}
          <FlatList
            ref={flatListRef}
            data={posts}
            {...VERTICAL_CARD_LIST_PROPS}
            onRefresh={onRefresh}
            refreshing={refreshing}
            onEndReachedThreshold={0.25}
            onEndReached={() => {
              if (activeQuery.hasNextPage && !activeQuery.isFetchingNextPage) {
                activeQuery.fetchNextPage();
              }
            }}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <>
                {feedTab === 'all' ? <PeekHint /> : null}
                {feedTab === 'all' ? <DailyPromptCard onWrite={(promptId, promptText) => navigation.navigate('JournalEditor', {mode: 'create', promptId, promptText})} /> : null}
                {feedTab === 'all' && recapQuery.data?.recap && (
                  <WeeklyRecapCard
                    recap={recapQuery.data.recap}
                    onNavigateToPost={(journalId) =>
                      navigation.navigate('PostDetail', {journalId})
                    }
                    onNavigateToProfile={(userId, username) =>
                      navigation.navigate('VisitProfile', {userId, username})
                    }
                  />
                )}
                <WritingPresenceBar
                  users={usersWritingNow}
                  onUserPress={userId =>
                    navigation.navigate('VisitProfile', {userId})
                  }
                />
              </>
            }
            ListEmptyComponent={
              activeQuery.isLoading ? (
                <View style={styles.skeletonList}>
                  <PostCardSkeleton />
                  <PostCardSkeleton />
                  <PostCardSkeleton />
                </View>
              ) : (
                <EmptyState
                  title={feedTab === 'following' ? 'No posts from people you follow' : feedTab === 'foryou' ? 'No recommendations yet' : 'No posts yet'}
                  subtitle={feedTab === 'following' ? 'Follow writers to see their posts here.' : 'Pull to refresh or create your first journal post.'}
                />
              )
            }
            ListFooterComponent={
              activeQuery.isFetchingNextPage ? (
                <View style={styles.loadingMore}>
                  <PostCardSkeleton />
                </View>
              ) : null
            }
            keyExtractor={item => item.id}
            renderItem={({item}) => {
              const cardData = getJournalCardData(item);

              const receiverId = item.user_id ?? item.users?.id ?? '';

              const isRepost = !!item.is_repost;
              const repostSource = isRepost ? item.repost_source : null;
              const repostSourcePreview = repostSource?.preview_text || '';

              return (
                <PostCard
                  title={item.title || 'Untitled Post'}
                  bodyPreview={cardData.previewText || 'No preview text available.'}
                  authorName={item.users?.name || 'Unknown author'}
                  authorAvatar={item.users?.image_url}
                  authorBadge={item.users?.badge as 'legend' | 'og' | undefined}
                  bannerImage={cardData.bannerImage}
                  postType={item.post_type ?? undefined}
                  readingTime={cardData.readingTime}
                  likeCount={cardData.likeCount}
                  commentCount={cardData.commentCount}
                  bookmarkCount={cardData.bookmarkCount}
                  viewCount={item.views}
                  userReaction={item.user_reaction}
                  isBookmarked={!!item.has_bookmarked}
                  onReact={type => handleReact(item.id, receiverId, type)}
                  reactionError={reactionErrorPostId === item.id}
                  onComment={() => handleComment(item.id, receiverId, cardData.commentCount)}
                  onBookmark={() => handleBookmark(item.id)}
                  onRepost={() => handleRepost(item.id, item.title ?? undefined, item.users?.name ?? undefined, item.users?.image_url ?? undefined)}
                  onPress={() =>
                    navigation.navigate('PostDetail', {journalId: item.id})
                  }
                  onLongPress={rect => openPeek(item, rect)}
                  shareId={item.id}
                  onAuthorPress={() => handleAuthorPress(item)}
                  isRepost={isRepost}
                  repostCaption={item.repost_caption}
                  repostSourceTitle={repostSource?.title}
                  repostSourcePreview={repostSourcePreview}
                  repostSourceAuthorName={repostSource?.users?.name}
                  repostSourceAuthorAvatar={repostSource?.users?.image_url}
                  promptId={item.prompt_id}
                  promptText={item.writing_prompts?.prompt_text}
                  onEmbeddedPress={repostSource ? () => navigation.navigate('PostDetail', {journalId: repostSource.id}) : undefined}
                />
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </>
      )}

      {/* Peek modal — rendered unconditionally, internal null-guard handles
          the visible state. onOpenFull fires navigate FIRST then dismisses
          the peek in the same frame so the nav push masks the modal close
          (one fluid motion per the CEO plan cherry-pick #4). sourceRect
          lets the entry animation anchor on the long-pressed card. */}
      <PeekModal
        post={peekPost}
        sourceRect={peekSourceRect}
        onClose={closePeek}
        onOpenFull={id => {
          navigation.navigate('PostDetail', {journalId: id});
          closePeek();
        }}
      />

      {commentModal && (
        <CommentModal
          visible
          postId={commentModal.postId}
          receiverId={commentModal.receiverId}
          commentCount={commentModal.commentCount}
          onClose={() => setCommentModal(null)}
        />
      )}

      {repostModal && (
        <RepostModal
          visible
          sourceJournalId={repostModal.journalId}
          title={repostModal.title}
          authorName={repostModal.authorName}
          authorAvatar={repostModal.authorAvatar}
          onClose={() => setRepostModal(null)}
        />
      )}

      {recapData && (
        <WeeklyRecapModal
          visible={showRecap}
          recap={recapData}
          streakCount={streakQuery.data?.currentStreak ?? 0}
          onDismiss={() => setShowRecap(false)}
          onNavigateToPost={(journalId) => {
            setShowRecap(false);
            navigation.navigate('PostDetail', {journalId});
          }}
          onNavigateToProfile={(userId, username) => {
            setShowRecap(false);
            navigation.navigate('VisitProfile', {userId, username});
          }}
        />
      )}

      {/* FAB Write Button — breathing + spring press */}
      <SpringFAB onPress={() => navigation.navigate('JournalEditor', {mode: 'create'})}>
        <PenIcon size={22} color={colors.textOnAccent} />
      </SpringFAB>
      </ScreenEntrance>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandText: {
    fontFamily: fonts.brand.semiBold,
    fontSize: 24,
    letterSpacing: 1,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  separator: {
    height: spacing.md,
  },
  skeletonList: {
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  loadingMore: {
    paddingTop: spacing.md,
  },
});
