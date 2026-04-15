import React, {useCallback, useMemo, useState} from 'react';
import {FlatList, StyleSheet, View} from 'react-native';
import {useInfiniteQuery, useMutation} from '@tanstack/react-query';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {PostCard} from '../../components/PostCard/PostCard';
import {PostCardSkeleton} from '../../components/SkeletonLoader';
import {CommentModal} from '../../components/Comments';
import {RepostModal} from '../../components/RepostModal';
import {EmptyState} from '../../components/EmptyState';
import {VERTICAL_CARD_LIST_PROPS} from '../../lib/listPerformance';
import {
  getJournalCardData,
  getNextCursor,
} from '../../lib/utils/journalHelpers';
import {mobileApi, type CursorPage, type JournalItem} from '../../lib/api/mobileApi';
import {socialApi} from '../../lib/api/socialApi';
import {queryClient} from '../../lib/queryClient';
import {useAuth} from '../../features/auth/AuthProvider';
import {useBookmarkMutation} from '../../hooks/useSocialMutations';
import {useTogglePinWithLimit} from '../../hooks/usePinMutation';
import {usePrivacyMutation} from '../../hooks/usePrivacyMutation';
import {PinnedPostsSection} from '../../components/PinnedPostsSection';
import {spacing} from '../../theme/spacing';
import type {RootStackParamList} from '../../navigation/types';

const PAGE_SIZE = 10;

interface ProfileWritingsTabProps {
  userId: string;
  headerComponent?: React.ReactElement;
}

export function ProfileWritingsTab({userId, headerComponent}: ProfileWritingsTabProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {user} = useAuth();
  const [commentModal, setCommentModal] = useState<{postId: string; receiverId?: string; commentCount: number} | null>(null);
  const [repostModal, setRepostModal] = useState<{journalId: string; title?: string; authorName?: string; authorAvatar?: string} | null>(null);

  const isOwnProfile = userId === user?.id;

  const handleContinue = useCallback(
    (journalId: string) => {
      navigation.navigate('JournalEditor', {
        mode: 'create',
        parentJournalId: journalId,
      });
    },
    [navigation],
  );

  const query = useInfiniteQuery({
    queryKey: ['profileWritings', userId],
    queryFn: ({pageParam}) =>
      isOwnProfile
        ? mobileApi.getUserJournals(userId, pageParam ?? null, PAGE_SIZE)
        : mobileApi.getVisitedUserJournals(userId, user?.id ?? '', pageParam ?? null, PAGE_SIZE),
    initialPageParam: null as string | null,
    getNextPageParam: lastPage => getNextCursor(lastPage, PAGE_SIZE),
  });

  const queryKey = ['profileWritings', userId];

  const reactionMutation = useMutation<
    {message?: string},
    Error,
    {journalId: string; receiverId: string; reactionType: string},
    {prev?: {pages: CursorPage<JournalItem>[]}}
  >({
    mutationFn: async ({journalId, receiverId, reactionType}) => {
      return socialApi.toggleReaction({journalId, receiverId, reactionType});
    },
    onMutate: async ({journalId, reactionType}) => {
      await queryClient.cancelQueries({queryKey});
      const prev = queryClient.getQueryData<{pages: CursorPage<JournalItem>[]}>(queryKey);
      if (prev) {
        queryClient.setQueryData<{pages: CursorPage<JournalItem>[]}>(queryKey, old => {
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
        });
      }
      return {prev};
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(queryKey, context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({queryKey});
    },
  });

  const bookmarkMutation = useBookmarkMutation(queryKey);
  const {togglePin, pinnedIds} = useTogglePinWithLimit();
  const privacyMutation = usePrivacyMutation(queryKey);

  const handleTogglePrivacy = (journalId: string, currentPrivacy?: string | null) => {
    const newPrivacy = currentPrivacy === 'private' ? 'public' : 'private';
    privacyMutation.mutate({journalId, privacy: newPrivacy});
  };

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

  const posts = useMemo(
    () => query.data?.pages.flatMap(page => page.data ?? []) ?? [],
    [query.data?.pages],
  );

  return (
    <>
    <FlatList
      data={posts}
      {...VERTICAL_CARD_LIST_PROPS}
      keyExtractor={item => item.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <>
          {headerComponent}
          <PinnedPostsSection userId={userId} isOwnProfile={isOwnProfile} />
        </>
      }
      onEndReachedThreshold={0.3}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) {
          query.fetchNextPage();
        }
      }}
      ListEmptyComponent={
        query.isLoading ? (
          <View style={styles.skeletons}>
            <PostCardSkeleton />
            <PostCardSkeleton />
            <PostCardSkeleton />
          </View>
        ) : (
          <EmptyState
            title="No writings yet"
            subtitle="Journal posts will appear here."
          />
        )
      }
      ListFooterComponent={
        query.isFetchingNextPage ? (
          <View style={styles.footer}>
            <PostCardSkeleton />
          </View>
        ) : null
      }
      renderItem={({item}) => {
        const cardData = getJournalCardData(item);

        const handleAuthorPress = () => {
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
            isBookmarked={!!item.has_bookmarked}
            userReaction={item.user_reaction}
            onReact={type => handleReact(item.id, receiverId, type)}
            onComment={() => handleComment(item.id, receiverId, cardData.commentCount)}
            onBookmark={() => handleBookmark(item.id)}
            onRepost={() => handleRepost(item.id, item.title ?? undefined, item.users?.name ?? undefined, item.users?.image_url ?? undefined)}
            shareId={item.id}
            journalId={item.id}
            rootJournalId={item.root_journal_id}
            showThreadPreview
            parentJournalId={item.parent_journal_id}
            showContinueAction
            onContinue={handleContinue}
            onPress={() =>
              navigation.navigate('PostDetail', {journalId: item.id})
            }
            onAuthorPress={handleAuthorPress}
            isRepost={isRepost}
            repostCaption={item.repost_caption}
            repostSourceTitle={repostSource?.title}
            repostSourcePreview={repostSourcePreview}
            repostSourceAuthorName={repostSource?.users?.name}
            repostSourceAuthorAvatar={repostSource?.users?.image_url}
            onEmbeddedPress={repostSource ? () => navigation.navigate('PostDetail', {journalId: repostSource.id}) : undefined}
            isPinned={pinnedIds.includes(item.id)}
            onPin={isOwnProfile ? () => togglePin(item.id) : undefined}
            showPinAction={isOwnProfile}
            privacy={item.privacy ?? undefined}
            onTogglePrivacy={isOwnProfile ? () => handleTogglePrivacy(item.id, item.privacy) : undefined}
            showPrivacyAction={isOwnProfile}
            showEditAction={isOwnProfile && !isRepost}
            onEdit={
              isOwnProfile && !isRepost
                ? () => navigation.navigate('JournalEditor', {mode: 'edit', journalId: item.id})
                : undefined
            }
          />
        );
      }}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
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
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  skeletons: {
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  footer: {
    paddingTop: spacing.md,
  },
  separator: {
    height: spacing.md,
  },
});
