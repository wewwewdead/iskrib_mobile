import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useMutation, useQuery} from '@tanstack/react-query';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Avatar} from '../../components/Avatar';
import {BadgeCheckIcon, RepostIcon, XIcon} from '../../components/icons';
import {CommentThread, formatRelativeDate} from '../../components/Comments';
import {buildVisibleCommentThread, type CommentThreadItem} from '../../components/Comments/CommentThread';
import {ActionBar} from '../../components/PostCard/ActionBar';
import {PrimaryButton} from '../../components/PrimaryButton';
import {SkeletonLoader} from '../../components/SkeletonLoader';
import {NetworkImage} from '../../components/NetworkImage';
import {LexicalRenderer} from '../../lib/content/LexicalRenderer';
import {ImageViewerModal} from '../../components/ImageViewerModal';
import {EchoesSection} from '../../components/EchoBloom/EchoesSection';
import {ThreadPanel} from '../../components/EchoBloom/ThreadPanel';
import {ScreenEntrance} from '../../components/ScreenEntrance';
import {useAuth} from '../../features/auth/AuthProvider';
import {useTheme} from '../../theme/ThemeProvider';
import {useComments} from '../../hooks/useComments';
import {fonts, typeScale} from '../../theme/typography';
import {spacing, radii} from '../../theme/spacing';
import {mobileApi} from '../../lib/api/mobileApi';
import {socialApi} from '../../lib/api/socialApi';
import {queryClient} from '../../lib/queryClient';
import {extractPlainText, resolveLikeCount} from '../../lib/utils/journalHelpers';
import type {RootStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PostDetail'>;

const toCount = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const resolveCount = (
  aggregate: Array<{count?: number}> | undefined,
  fallback?: number,
): number => {
  return toCount(aggregate?.[0]?.count) ?? toCount(fallback) ?? 0;
};

const extractBannerImage = (content: string | null | undefined): string | null => {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    const findImage = (node: any): string | null => {
      if (node.type === 'image' && node.src) return node.src;
      if (node.children) {
        for (const child of node.children) {
          const found = findImage(child);
          if (found) return found;
        }
      }
      return null;
    };
    return findImage(parsed.root ?? parsed);
  } catch {
    return null;
  }
};

export function PostDetailScreen({route, navigation}: Props) {
  const {user, session} = useAuth();
  const {colors, scaledType} = useTheme();
  const {journalId} = route.params;
  const isLoggedIn = !!session?.access_token;
  const [repostCaption, setRepostCaption] = useState('');
  const [showRepost, setShowRepost] = useState(false);
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const flatListRef = useRef<FlatList<CommentThreadItem>>(null);
  const inputRef = useRef<TextInput>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onReplyActivated = useCallback(() => {
    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current);
    }

    focusTimerRef.current = setTimeout(() => {
      inputRef.current?.focus();
      flatListRef.current?.scrollToEnd({animated: true});
    }, 100);
  }, []);

  useEffect(() => {
    return () => {
      if (focusTimerRef.current) {
        clearTimeout(focusTimerRef.current);
      }
    };
  }, []);

  const detailQuery = useQuery({
    queryKey: ['journal', journalId, user?.id],
    queryFn: () => mobileApi.getJournalById(journalId, user?.id),
  });

  const receiverId = (detailQuery.data?.journal?.user_id ?? detailQuery.data?.journal?.users?.id) || undefined;

  const {
    comments,
    isLoading: commentsLoading,
    commentInput,
    setCommentInput,
    replyingTo,
    setReplyingTo,
    expandedReplies,
    fetchedReplies,
    loadingReplies,
    handleReply,
    handleToggleReplies,
    submitComment,
    isSubmitting,
  } = useComments(journalId, receiverId, onReplyActivated);

  const reactionMutation = useMutation({
    mutationFn: async (reactionType: string) => {
      const journal = detailQuery.data?.journal;
      const rid = journal?.user_id ?? journal?.users?.id;
      if (!journal?.id || !rid) throw new Error('Missing journal data.');
      return socialApi.toggleReaction({
        journalId: journal.id,
        receiverId: rid,
        reactionType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['journal', journalId]});
      queryClient.invalidateQueries({queryKey: ['feed']});
    },
    onError: e => Alert.alert('Reaction failed', e instanceof Error ? e.message : 'Error'),
  });

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      return socialApi.toggleBookmark({journalId});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['journal', journalId]});
      queryClient.invalidateQueries({queryKey: ['feed']});
    },
    onError: e => Alert.alert('Bookmark failed', e instanceof Error ? e.message : 'Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return mobileApi.deleteJournal(journalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['feed']});
      queryClient.invalidateQueries({queryKey: ['profileWritings']});
      // Deleting a thread member leaves stale rows in every thread
      // cache that referenced it. All three thread query namespaces
      // use different prefixes so we invalidate each explicitly.
      queryClient.invalidateQueries({queryKey: ['journal-thread']});
      queryClient.invalidateQueries({queryKey: ['journal-thread-preview']});
      queryClient.invalidateQueries({queryKey: ['journal-thread-panel']});
      navigation.goBack();
    },
    onError: e => Alert.alert('Delete failed', e instanceof Error ? e.message : 'Error'),
  });

  const handleDelete = () => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate()},
    ]);
  };

  const repostMutation = useMutation({
    mutationFn: async () => {
      return socialApi.createRepost({
        sourceJournalId: journalId,
        caption: repostCaption.trim() || undefined,
      });
    },
    onSuccess: () => {
      setRepostCaption('');
      setShowRepost(false);
      Alert.alert('Reposted', 'Post was reposted to your feed.');
      queryClient.invalidateQueries({queryKey: ['feed']});
    },
    onError: e => Alert.alert('Repost failed', e instanceof Error ? e.message : 'Error'),
  });

  const viewMutation = useMutation({
    mutationFn: () => mobileApi.addViews(journalId),
  });

  useEffect(() => {
    if (journalId) {
      viewMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journalId]);

  const journal = detailQuery.data?.journal;
  const likeCount = journal ? resolveLikeCount(journal) : 0;
  const commentCount = resolveCount(journal?.comment_count, journal?.comments_count);
  const bookmarkCount = resolveCount(journal?.bookmark_count);
  const viewCount = journal?.views ?? 0;
  const bannerImage = useMemo(() => extractBannerImage(journal?.content), [journal?.content]);
  const isRepost = !!journal?.is_repost;
  const repostSource = isRepost ? journal?.repost_source : null;
  const repostSourcePreview = repostSource?.preview_text
    || (repostSource?.content ? extractPlainText(repostSource.content).slice(0, 200) : '');
  const visibleComments = useMemo(
    () =>
      buildVisibleCommentThread(
        comments,
        fetchedReplies,
        expandedReplies,
        loadingReplies,
      ),
    [comments, expandedReplies, fetchedReplies, loadingReplies],
  );

  if (detailQuery.isLoading) {
    return (
      <SafeAreaView style={[styles.safe, {backgroundColor: colors.bgPrimary}]}>
        <View style={styles.loadingContainer}>
          <SkeletonLoader height={200} borderRadius={0} />
          <View style={styles.contentPadding}>
            <SkeletonLoader width="70%" height={24} />
            <SkeletonLoader width="40%" height={16} style={{marginTop: 12}} />
            <SkeletonLoader width="100%" height={16} style={{marginTop: 20}} />
            <SkeletonLoader width="100%" height={16} style={{marginTop: 8}} />
            <SkeletonLoader width="60%" height={16} style={{marginTop: 8}} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (detailQuery.isError) {
    return (
      <SafeAreaView style={[styles.safe, {backgroundColor: colors.bgPrimary}]}>
        <View style={styles.contentPadding}>
          <Text style={[styles.errorText, {color: colors.danger}]}>
            Unable to load this post.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const headerComponent = (
    <>
      {!isRepost && bannerImage ? (
        <Pressable onPress={() => setViewerImage(bannerImage)}>
          <NetworkImage
            uri={bannerImage}
            style={styles.banner}
            resizeMode="cover"
            accessibilityLabel="Post banner image"
          />
        </Pressable>
      ) : null}

      <View style={styles.contentPadding}>
        {isRepost ? (
          <View style={styles.repostBadge}>
            <RepostIcon size={14} color={colors.textFaint} />
            <Text style={[styles.repostBadgeText, {color: colors.textFaint}]}>
              <Text style={[styles.repostBadgeName, {color: colors.textSecondary}]}>
                {journal?.users?.name || 'Someone'}
              </Text>
              {' reposted'}
            </Text>
          </View>
        ) : (
          <Text style={[styles.title, {color: colors.textHeading}]}>
            {journal?.title || 'Untitled Post'}
          </Text>
        )}

        <Pressable
          style={styles.authorRow}
          onPress={() => {
            const authorId = journal?.users?.id ?? journal?.user_id;
            if (!authorId) return;
            if (authorId === user?.id) {
              navigation.navigate('Main', {screen: 'Profile'} as any);
            } else {
              navigation.navigate('VisitProfile', {
                userId: authorId,
                username: journal?.users?.username ?? undefined,
              });
            }
          }}>
          <Avatar
            uri={journal?.users?.image_url ?? undefined}
            name={journal?.users?.name ?? undefined}
            size={36}
            badge={journal?.users?.badge as 'legend' | 'og' | undefined}
          />
          <View style={styles.authorInfo}>
            <View style={styles.authorNameRow}>
              <Text style={[styles.authorName, {color: colors.textPrimary}]}>
                {journal?.users?.name || 'Unknown author'}
              </Text>
              {journal?.users?.badge ? (
                <BadgeCheckIcon size={16} badge={journal.users.badge as 'legend' | 'og'} />
              ) : null}
            </View>
            <Text style={[styles.dateText, {color: colors.textMuted}]}>
              {formatRelativeDate(journal?.created_at)}
            </Text>
          </View>
        </Pressable>

        {isRepost && journal?.repost_caption ? (
          <Text style={[styles.repostCaptionText, {color: colors.textPrimary}]}>
            {journal.repost_caption}
          </Text>
        ) : null}

        {journal?.user_id === user?.id && (
          <View style={styles.deleteRow}>
            <Pressable onPress={handleDelete} hitSlop={8}>
              <Text style={[styles.deleteText, {color: colors.danger}]}>Delete Post</Text>
            </Pressable>
          </View>
        )}

        <ActionBar
          likeCount={likeCount}
          commentCount={commentCount}
          bookmarkCount={bookmarkCount}
          viewCount={viewCount}
          isLiked={journal?.has_liked}
          isBookmarked={journal?.has_bookmarked}
          userReaction={journal?.user_reaction}
          onReact={type => reactionMutation.mutate(type)}
          onComment={() => flatListRef.current?.scrollToEnd({animated: true})}
          onBookmark={() => bookmarkMutation.mutate()}
          onRepost={() => setShowRepost(!showRepost)}
          shareId={journal?.id}
          shareTitle={journal?.title ?? undefined}
        />

        {showRepost && (
          <View style={[styles.repostSection, {backgroundColor: colors.bgSecondary, borderColor: colors.borderLight}]}>
            <TextInput
              value={repostCaption}
              onChangeText={setRepostCaption}
              placeholder="Add an optional caption"
              placeholderTextColor={colors.textFaint}
              style={[styles.commentInput, {backgroundColor: colors.bgElevated, borderColor: colors.borderCard, color: colors.textPrimary}]}
              maxLength={280}
              multiline
            />
            <PrimaryButton
              label={repostMutation.isPending ? 'Reposting...' : 'Repost to feed'}
              onPress={() => repostMutation.mutate()}
              disabled={repostMutation.isPending}
            />
          </View>
        )}

        <View style={[styles.divider, {backgroundColor: colors.borderLight}]} />

        {isRepost ? (
          repostSource ? (
            <Pressable
              style={[styles.embeddedCard, {borderColor: colors.borderLight}]}
              onPress={() => navigation.push('PostDetail', {journalId: repostSource.id})}>
              <View style={styles.embeddedAuthorRow}>
                <Avatar
                  uri={repostSource.users?.image_url ?? undefined}
                  name={repostSource.users?.name ?? undefined}
                  size={28}
                  badge={repostSource.users?.badge as 'legend' | 'og' | undefined}
                />
                <Text style={[styles.embeddedAuthorName, {color: colors.textPrimary}]}>
                  {repostSource.users?.name || 'Unknown author'}
                </Text>
              </View>
              {repostSource.title ? (
                <Text style={[styles.embeddedTitle, {color: colors.textHeading}]}>
                  {repostSource.title}
                </Text>
              ) : null}
              {repostSourcePreview ? (
                <Text style={[styles.embeddedPreview, scaledType.bodySmall, {color: colors.textSecondary}]} numberOfLines={3}>
                  {repostSourcePreview}
                </Text>
              ) : null}
            </Pressable>
          ) : (
            <View style={[styles.embeddedCard, {borderColor: colors.borderLight}]}>
              <Text style={[styles.repostUnavailable, {color: colors.textMuted}]}>
                This post is no longer available
              </Text>
            </View>
          )
        ) : (
          <JournalBody content={journal?.content} journalId={journalId} onImagePress={setViewerImage} />
        )}

        <View style={[styles.divider, {backgroundColor: colors.borderLight}]} />

        <Text style={[styles.sectionTitle, scaledType.h3, {color: colors.textHeading}]}>
          Comments ({commentCount})
        </Text>
      </View>
    </>
  );

  const footerComponent = (
    <View style={styles.contentPadding}>
      {isLoggedIn ? (
        <View style={styles.commentInputRow}>
          {replyingTo && (
            <View style={[styles.replyBanner, {backgroundColor: colors.bgSecondary}]}>
              <Text style={[styles.replyBannerText, {color: colors.textPrimary}]}>
                Replying to {replyingTo.userName}
              </Text>
              <Pressable onPress={() => setReplyingTo(null)} hitSlop={8}>
                <XIcon size={16} color={colors.textMuted} />
              </Pressable>
            </View>
          )}
          <TextInput
            ref={inputRef}
            value={commentInput}
            onChangeText={setCommentInput}
            placeholder={replyingTo ? `Reply to ${replyingTo.userName}...` : 'Write a comment...'}
            placeholderTextColor={colors.textFaint}
            style={[
              styles.commentInput,
              {
                backgroundColor: colors.bgSecondary,
                borderColor: colors.borderCard,
                color: colors.textPrimary,
              },
            ]}
            maxLength={200}
            multiline
          />
          <PrimaryButton
            label={isSubmitting ? 'Posting...' : 'Post'}
            onPress={submitComment}
            disabled={commentInput.trim().length === 0 || isSubmitting}
          />
        </View>
      ) : null}

      <View style={styles.bottomSpacer} />
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.bgPrimary}]}>
      <ScreenEntrance tier="hero">
        <FlatList
          ref={flatListRef}
          data={visibleComments}
          keyExtractor={item => item.comment.id}
          style={styles.scroll}
          contentContainerStyle={styles.commentsListContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={headerComponent}
          renderItem={({item}) => (
            <View style={styles.commentRowWrap}>
              <View
                style={
                  item.depth > 0
                    ? [
                        styles.threadIndent,
                        {
                          marginLeft: Math.min(item.depth, 4) * 20,
                          borderLeftColor: colors.borderLight,
                        },
                      ]
                    : undefined
                }>
                <CommentThread
                  comment={item.comment}
                  replyCount={item.replyCount}
                  isExpanded={item.isExpanded}
                  isLoadingReplies={item.isLoadingReplies}
                  isLoggedIn={isLoggedIn}
                  onReply={handleReply}
                  onToggleReplies={handleToggleReplies}
                  colors={colors}
                  depth={item.depth}
                />
                {item.isExpanded && item.isLoadingReplies ? (
                  <View style={styles.replyLoading}>
                    <ActivityIndicator size="small" color={colors.loaderColor} />
                  </View>
                ) : null}
              </View>
            </View>
          )}
          ListEmptyComponent={
            commentsLoading ? (
              <View style={styles.commentLoading}>
                <ActivityIndicator color={colors.loaderColor} />
              </View>
            ) : (
              <View style={styles.commentRowWrap}>
                <Text style={[styles.noComments, {color: colors.textMuted}]}>
                  No comments yet. Be the first!
                </Text>
              </View>
            )
          }
          ListFooterComponent={footerComponent}
        />
      </ScreenEntrance>
      <ImageViewerModal uri={viewerImage} onClose={() => setViewerImage(null)} />
    </SafeAreaView>
  );
}

const JournalBody = React.memo(function JournalBody({
  content,
  journalId,
  onImagePress,
}: {
  content: string | null | undefined;
  journalId: string;
  onImagePress: (uri: string) => void;
}) {
  return (
    <>
      <LexicalRenderer content={content} onImagePress={onImagePress} />
      <ThreadPanel journalId={journalId} />
      <EchoesSection journalId={journalId} />
    </>
  );
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  commentsListContent: {
    paddingBottom: spacing.xxxxl,
  },
  loadingContainer: {
    flex: 1,
  },
  contentPadding: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  banner: {
    width: '100%',
    height: 220,
  },
  title: {
    fontFamily: fonts.serif.bold,
    fontSize: 26,
    lineHeight: 34,
    marginBottom: spacing.lg,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  authorInfo: {
    flex: 1,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  authorName: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 15,
  },
  dateText: {
    fontFamily: fonts.ui.regular,
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: spacing.xl,
  },
  sectionTitle: {
    ...typeScale.h3,
    marginBottom: spacing.md,
  },
  errorText: {
    fontFamily: fonts.ui.medium,
    fontSize: 15,
    textAlign: 'center',
    marginTop: spacing.xxxl,
  },
  repostSection: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  noComments: {
    fontFamily: fonts.ui.regular,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  replyBannerText: {
    fontFamily: fonts.ui.medium,
    fontSize: 13,
  },
  commentLoading: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  commentRowWrap: {
    paddingHorizontal: spacing.lg,
  },
  threadIndent: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    paddingLeft: spacing.md,
  },
  replyLoading: {
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
  commentInputRow: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    textAlignVertical: 'top',
    minHeight: 60,
    fontFamily: fonts.ui.regular,
    fontSize: 14,
  },
  repostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
  repostBadgeText: {
    fontSize: 13,
    fontFamily: fonts.ui.regular,
  },
  repostBadgeName: {
    fontFamily: fonts.ui.semiBold,
  },
  repostCaptionText: {
    fontFamily: fonts.ui.regular,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  embeddedCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  embeddedAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  embeddedAuthorName: {
    fontSize: 14,
    fontFamily: fonts.ui.semiBold,
  },
  embeddedTitle: {
    fontFamily: fonts.serif.bold,
    fontSize: 18,
    lineHeight: 24,
  },
  embeddedPreview: {
    ...typeScale.bodySmall,
    lineHeight: 20,
  },
  repostUnavailable: {
    fontFamily: fonts.ui.regular,
    fontSize: 14,
    fontStyle: 'italic',
  },
  deleteRow: {
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
  },
  deleteText: {
    fontFamily: fonts.ui.medium,
    fontSize: 13,
  },
  bottomSpacer: {
    height: spacing.xxxxl,
  },
});
