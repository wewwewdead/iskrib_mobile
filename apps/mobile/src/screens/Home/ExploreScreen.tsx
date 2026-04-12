import React, {useState} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useQuery, useMutation} from '@tanstack/react-query';
import {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {CompositeScreenProps} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {PostCard} from '../../components/PostCard/PostCard';
import {PostCardSkeleton} from '../../components/SkeletonLoader';
import {ScreenEntrance} from '../../components/ScreenEntrance';
import {CommentModal} from '../../components/Comments';
import {RepostModal} from '../../components/RepostModal';
import {SearchInput} from '../../components/SearchInput';
import {SearchResultsView} from '../../components/SearchResultsView';
import {InterestSection} from '../../components/InterestSection';
import {PeekModal} from '../../components/PeekModal/PeekModal';
import {usePeekModal} from '../../hooks/usePeekModal';
import {EmptyState} from '../../components/EmptyState';
import {FireIcon} from '../../components/icons';
import {NetworkImage} from '../../components/NetworkImage';
import {useAuth} from '../../features/auth/AuthProvider';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts, typeScale} from '../../theme/typography';
import {spacing, radii} from '../../theme/spacing';
import {
  mobileApi,
  type JournalItem,
} from '../../lib/api/mobileApi';
import {socialApi} from '../../lib/api/socialApi';
import {queryClient} from '../../lib/queryClient';
import {useBookmarkMutation} from '../../hooks/useSocialMutations';
import {useSearch} from '../../hooks/useSearch';
import {
  getJournalCardData,
  extractBannerImage,
  resolveCount,
  resolveLikeCount,
} from '../../lib/utils/journalHelpers';
import type {MainTabParamList, RootStackParamList} from '../../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Explore'>,
  NativeStackScreenProps<RootStackParamList>
>;

const getHotScore = (journal: JournalItem): number => {
  if (typeof journal.hot_score === 'number') return journal.hot_score;
  const likes = resolveLikeCount(journal);
  const comments = resolveCount(journal.comment_count, journal.comments_count);
  const bookmarks = resolveCount(journal.bookmark_count);
  return likes + comments * 2 + bookmarks * 3;
};

export function ExploreScreen({navigation}: Props) {
  const {user} = useAuth();
  const {colors, scaledType} = useTheme();
  const {query, setQuery, activeTab, setActiveTab, isSearching, normalizedQuery, users, journals} = useSearch();
  const [commentModal, setCommentModal] = useState<{
    postId: string;
    receiverId?: string;
    commentCount: number;
  } | null>(null);
  const [repostModal, setRepostModal] = useState<{
    journalId: string;
    title?: string;
    authorName?: string;
    authorAvatar?: string;
  } | null>(null);

  // Peek modal. Per-screen hook. ExploreScreen owns the instance so all
  // InterestSections below share one peek modal (no stacking). The
  // runnerRow items (plain Pressables, not PostCard) deliberately stay
  // tap-only per the plan's documented scope exclusions.
  const {peekPost, peekSourceRect, openPeek, closePeek} = usePeekModal({
    isOtherModalOpen: !!commentModal || !!repostModal,
  });

  // --- Data fetching ---

  const hottestQuery = useQuery({
    queryKey: ['explore-hottest-monthly', user?.id],
    queryFn: () => mobileApi.getHottestMonthly(5, user?.id),
    staleTime: 5 * 60 * 1000,
  });

  const interestsQuery = useQuery({
    queryKey: ['explore-interests'],
    queryFn: () => mobileApi.getInterestSections(),
    staleTime: 10 * 60 * 1000,
  });

  const interestSections = interestsQuery.data?.sections ?? [];

  const hottestPosts = hottestQuery.data?.data ?? [];
  const heroPost = hottestPosts[0] ?? null;
  const runnerPosts = hottestPosts.slice(1);

  // --- Interaction handlers ---

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
    onSettled: () => {
      queryClient.invalidateQueries({queryKey: ['explore-hottest-monthly']});
      queryClient.invalidateQueries({queryKey: ['search-journals']});
    },
  });

  const bookmarkMutation = useBookmarkMutation(['explore-hottest-monthly', user?.id]);

  const handleReact = (journalId: string, receiverId: string, reactionType: string) => {
    reactionMutation.mutate({journalId, receiverId, reactionType});
  };

  const handleBookmark = (journalId: string) => {
    bookmarkMutation.mutate(journalId);
  };

  const handleComment = (journalId: string, receiverId?: string, commentCount?: number) => {
    setCommentModal({postId: journalId, receiverId, commentCount: commentCount ?? 0});
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

  // --- Render helpers ---

  const renderPostCard = (item: JournalItem) => {
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
        onComment={() => handleComment(item.id, receiverId, cardData.commentCount)}
        onBookmark={() => handleBookmark(item.id)}
        onRepost={() =>
          handleRepost(
            item.id,
            item.title ?? undefined,
            item.users?.name ?? undefined,
            item.users?.image_url ?? undefined,
          )
        }
        onPress={() => navigation.navigate('PostDetail', {journalId: item.id})}
        shareId={item.id}
        onAuthorPress={() => handleAuthorPress(item)}
        isRepost={isRepost}
        repostCaption={item.repost_caption}
        repostSourceTitle={repostSource?.title}
        repostSourcePreview={repostSourcePreview}
        repostSourceAuthorName={repostSource?.users?.name}
        repostSourceAuthorAvatar={repostSource?.users?.image_url}
        onEmbeddedPress={
          repostSource
            ? () => navigation.navigate('PostDetail', {journalId: repostSource.id})
            : undefined
        }
      />
    );
  };

  const renderRunnerRow = (item: JournalItem, rank: number) => {
    const hotScore = getHotScore(item);
    const bannerImage = item.thumbnail_url || extractBannerImage(item.content, item.images);

    return (
      <Pressable
        key={item.id}
        style={[styles.runnerRow, {borderBottomColor: colors.borderCard}]}
        onPress={() => navigation.navigate('PostDetail', {journalId: item.id})}>
        <Text
          style={[
            styles.runnerRank,
            {color: rank <= 3 ? colors.accentGold : colors.textMuted},
          ]}>
          #{rank}
        </Text>
        {bannerImage ? (
          <NetworkImage
            uri={bannerImage}
            style={styles.runnerThumb}
            resizeMode="cover"
            accessibilityLabel={`${item.title || 'Post'} thumbnail image`}
          />
        ) : (
          <View
            style={[styles.runnerThumbPlaceholder, {backgroundColor: colors.bgCard}]}
          />
        )}
        <View style={styles.runnerInfo}>
          <Text
            style={[styles.runnerTitle, {color: colors.textPrimary}]}
            numberOfLines={2}>
            {item.title || 'Untitled Post'}
          </Text>
          <Text style={[styles.runnerAuthor, {color: colors.textMuted}]} numberOfLines={1}>
            {item.users?.name || 'Unknown'}
          </Text>
        </View>
        <View style={[styles.hotPill, {backgroundColor: 'rgba(217, 119, 6, 0.12)'}]}>
          <FireIcon size={12} color={colors.accentGold} />
          <Text style={[styles.hotPillText, {color: colors.accentGold}]}>{hotScore}</Text>
        </View>
      </Pressable>
    );
  };

  // --- Default view (hottest posts) ---

  const renderDefaultView = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.defaultContent}>
      {hottestQuery.isLoading ? (
        <View style={styles.skeletonList}>
          <PostCardSkeleton />
          <PostCardSkeleton />
          <PostCardSkeleton />
        </View>
      ) : hottestPosts.length === 0 ? (
        <EmptyState
          icon={<FireIcon size={40} color={colors.textFaint} />}
          title="No hot posts yet this month"
          subtitle="Check back soon for trending content"
        />
      ) : (
        <View>
          {/* Hero card */}
          {heroPost && (
            <View style={styles.heroSection}>
              <View>
                {renderPostCard(heroPost)}
                <View style={[styles.heroBadge, {borderColor: colors.accentGold}]}>
                  <FireIcon size={14} color={colors.accentAmber} />
                  <Text style={[styles.heroBadgeText, {color: colors.accentAmber}]}>#1 Hottest</Text>
                </View>
              </View>
            </View>
          )}

          {/* Runners */}
          {runnerPosts.length > 0 && (
            <View style={styles.runnersSection}>
              <Text style={[styles.sectionTitle, scaledType.h3, {color: colors.textHeading}]}>
                Top This Month
              </Text>
              {runnerPosts.map((post, i) => renderRunnerRow(post, i + 2))}
            </View>
          )}

          {/* Interest sections */}
          {interestSections.map((section, index) => (
            <InterestSection
              key={`${section.name}-${index}`}
              name={section.name}
              journals={section.journals}
              onPostPress={id => navigation.navigate('PostDetail', {journalId: id})}
              onLongPressPost={(post, rect) => openPeek(post, rect)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.bgPrimary}]} edges={['top']}>
      <ScreenEntrance tier="feed">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, scaledType.h1, {color: colors.textHeading}]}>Explore</Text>
          <SearchInput
            placeholder="Search users or posts..."
            value={query}
            onChangeText={setQuery}
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
          renderDefaultView()
        )}
      </View>

      {/* Peek modal — null-guarded internally. One instance for every
          InterestSection on this screen. runnerRow items are tap-only
          by design (documented scope exclusion). sourceRect enables the
          FLIP anchored-growth entry animation. */}
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
      </ScreenEntrance>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  title: {
    ...typeScale.h1,
  },
  sectionTitle: {
    ...typeScale.h3,
    marginBottom: spacing.md,
  },
  // Default view
  defaultContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxxl,
  },
  skeletonList: {
    gap: spacing.md,
  },

  // Hero
  heroSection: {
    marginBottom: spacing.xl,
  },
  heroBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  heroBadgeText: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 12,
  },

  // Runners
  runnersSection: {
    marginBottom: spacing.xl,
  },
  runnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  runnerRank: {
    fontFamily: fonts.ui.bold,
    fontSize: 16,
    width: 28,
    textAlign: 'center',
  },
  runnerThumb: {
    width: 60,
    height: 60,
    borderRadius: radii.sm,
  },
  runnerThumbPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: radii.sm,
  },
  runnerInfo: {
    flex: 1,
    gap: 2,
  },
  runnerTitle: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 14,
  },
  runnerAuthor: {
    fontFamily: fonts.ui.regular,
    fontSize: 12,
  },
  hotPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  hotPillText: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 12,
  },
});
