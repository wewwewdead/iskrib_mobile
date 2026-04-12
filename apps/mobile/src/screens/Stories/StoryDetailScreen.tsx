import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Screen} from '../../components/Screen';
import {PrimaryButton} from '../../components/PrimaryButton';
import {Avatar} from '../../components/Avatar';
import {NetworkImage} from '../../components/NetworkImage';
import {BookIcon, HeartIcon, EyeIcon, BookmarkIcon} from '../../components/icons';
import {storyApi} from '../../lib/api/storyApi';
import {useAuth} from '../../features/auth/AuthProvider';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts} from '../../theme/typography';
import {spacing, radii} from '../../theme/spacing';
import type {RootStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'StoryDetail'>;

export function StoryDetailScreen({route, navigation}: Props) {
  const {colors} = useTheme();
  const statusColorMap: Record<string, {text: string; bg: string}> = {
    ongoing: {text: colors.statusOngoing, bg: colors.statusOngoingBg},
    completed: {text: colors.statusCompleted, bg: colors.statusCompletedBg},
    hiatus: {text: colors.statusHiatus, bg: colors.statusHiatusBg},
  };
  const {storyId} = route.params;
  const {session} = useAuth();
  const isLoggedIn = !!session?.access_token;
  const currentUserId = session?.user?.id;
  const queryClient = useQueryClient();

  const storyQuery = useQuery({
    queryKey: ['story', storyId],
    queryFn: () => storyApi.getStoryById(storyId),
  });

  const voteMutation = useMutation({
    mutationFn: () => storyApi.toggleVote(storyId),
    onMutate: async () => {
      await queryClient.cancelQueries({queryKey: ['story', storyId]});
      const previous = queryClient.getQueryData(['story', storyId]);
      queryClient.setQueryData(['story', storyId], (old: any) => {
        if (!old) return old;
        const wasVoted = !!old.has_voted;
        return {
          ...old,
          has_voted: !wasVoted,
          vote_count: (old.vote_count || 0) + (wasVoted ? -1 : 1),
        };
      });
      return {previous};
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['story', storyId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({queryKey: ['story', storyId]});
      queryClient.invalidateQueries({queryKey: ['stories-browser']});
    },
  });

  const libraryMutation = useMutation({
    mutationFn: () => storyApi.toggleLibrary(storyId),
    onMutate: async () => {
      await queryClient.cancelQueries({queryKey: ['story', storyId]});
      const previous = queryClient.getQueryData(['story', storyId]);
      queryClient.setQueryData(['story', storyId], (old: any) => {
        if (!old) return old;
        return {...old, in_library: !old.in_library};
      });
      return {previous};
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['story', storyId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({queryKey: ['story', storyId]});
      queryClient.invalidateQueries({queryKey: ['stories-library']});
    },
  });

  const onToggleVote = () => {
    if (!isLoggedIn) {
      Alert.alert('Login required', 'Sign in to vote on stories.');
      return;
    }
    voteMutation.mutate();
  };

  const onToggleLibrary = () => {
    if (!isLoggedIn) {
      Alert.alert('Login required', 'Sign in to save stories to library.');
      return;
    }
    libraryMutation.mutate();
  };

  if (storyQuery.isLoading) {
    return (
      <Screen>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accentAmber} />
          <Text style={[styles.hint, {color: colors.textMuted}]}>Loading story...</Text>
        </View>
      </Screen>
    );
  }

  if (!storyQuery.data) {
    return (
      <Screen>
        <Text style={[styles.hint, {color: colors.danger}]}>Story not found.</Text>
      </Screen>
    );
  }

  const story = storyQuery.data;
  const chapters = story.chapters ?? [];
  const publishedChapters = chapters.filter(c => c.status === 'published');
  const status = (story.status || 'ongoing').toString();
  const statusEntry = statusColorMap[status] || statusColorMap.ongoing;
  const isOwner = currentUserId && story.users?.id === currentUserId;
  const totalWords = chapters.reduce((sum, c) => sum + (c.word_count || 0), 0);
  const tags = story.tags || [];

  // Reading CTA
  const progressChapterId = story.reading_progress?.chapter_id;
  const firstPublished = publishedChapters[0];
  const readingLabel = progressChapterId ? 'Continue Reading' : 'Start Reading';
  const readChapterId = progressChapterId || firstPublished?.id;

  return (
    <Screen>
      {/* Hero Cover */}
      <View style={[styles.coverContainer, {backgroundColor: colors.bgSecondary}]}>
        {story.cover_url ? (
          <NetworkImage
            uri={story.cover_url}
            style={styles.coverImage}
            resizeMode="cover"
            accessibilityLabel={`${story.title} cover image`}
          />
        ) : (
          <View style={styles.coverPlaceholder}>
            <BookIcon size={48} color={colors.textFaint} />
          </View>
        )}
      </View>

      {/* Title */}
      <Text style={[styles.title, {color: colors.textHeading}]}>{story.title}</Text>

      {/* Author Row */}
      <Pressable
        style={styles.authorRow}
        onPress={() => story.users?.id && navigation.navigate('VisitProfile', {userId: story.users.id})}>
        <Avatar uri={story.users?.image_url} name={story.users?.name} size={24} />
        <Text style={[styles.authorName, {color: colors.textSecondary}]}>
          {story.users?.name || 'Unknown author'}
        </Text>
      </Pressable>

      {/* Status & Stats Row */}
      <View style={styles.badgeRow}>
        <View style={[styles.statusBadge, {backgroundColor: statusEntry.bg}]}>
          <Text style={[styles.statusText, {color: statusEntry.text}]}>{status}</Text>
        </View>
        <Text style={[styles.statText, {color: colors.textMuted}]}>
          {chapters.length} {chapters.length === 1 ? 'chapter' : 'chapters'}
        </Text>
        {totalWords > 0 && (
          <Text style={[styles.statText, {color: colors.textMuted}]}>
            {totalWords.toLocaleString()} words
          </Text>
        )}
        <View style={styles.stat}>
          <HeartIcon size={12} color={colors.textMuted} />
          <Text style={[styles.statText, {color: colors.textMuted}]}>{(story.vote_count || 0).toLocaleString()}</Text>
        </View>
        <View style={styles.stat}>
          <EyeIcon size={12} color={colors.textMuted} />
          <Text style={[styles.statText, {color: colors.textMuted}]}>{(story.read_count || 0).toLocaleString()}</Text>
        </View>
      </View>

      {/* Tags */}
      {tags.length > 0 && (
        <View style={styles.tagsRow}>
          {tags.map(tag => (
            <View key={tag} style={[styles.tag, {backgroundColor: colors.bgPill}]}>
              <Text style={[styles.tagText, {color: colors.accentSage}]}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        {readChapterId && (
          <View style={{flex: 1}}>
            <PrimaryButton
              label={readingLabel}
              onPress={() => navigation.navigate('StoryChapterReader', {
                storyId,
                chapterId: readChapterId,
                scrollPosition: progressChapterId === readChapterId ? story.reading_progress?.scroll_position : undefined,
              })}
            />
          </View>
        )}
        <Pressable
          onPress={onToggleVote}
          style={[styles.iconBtn, {borderColor: story.has_voted ? colors.danger : colors.borderLight, backgroundColor: colors.bgElevated}]}>
          <HeartIcon size={18} color={story.has_voted ? colors.danger : colors.textMuted} filled={story.has_voted} />
        </Pressable>
        <Pressable
          onPress={onToggleLibrary}
          style={[styles.iconBtn, {borderColor: story.in_library ? colors.accentAmber : colors.borderLight, backgroundColor: colors.bgElevated}]}>
          <BookmarkIcon size={18} color={story.in_library ? colors.accentAmber : colors.textMuted} filled={story.in_library} />
        </Pressable>
      </View>

      {/* Owner Actions */}
      {isOwner && (
        <View style={styles.actionRow}>
          <View style={{flex: 1}}>
            <PrimaryButton
              label="Manage Chapters"
              onPress={() => navigation.navigate('StoryChapterManager', {storyId})}
              kind="secondary"
            />
          </View>
          <View style={{flex: 1}}>
            <PrimaryButton
              label="Edit Story"
              onPress={() => navigation.navigate('StoryEditor', {storyId})}
              kind="secondary"
            />
          </View>
        </View>
      )}

      {/* About */}
      {!!story.description && (
        <View style={[styles.section, {borderColor: colors.borderLight, backgroundColor: colors.bgElevated}]}>
          <Text style={[styles.sectionTitle, {color: colors.textHeading}]}>About</Text>
          <Text style={[styles.description, {color: colors.textPrimary}]}>{story.description}</Text>
        </View>
      )}

      {/* Chapters List */}
      <View style={[styles.section, {borderColor: colors.borderLight, backgroundColor: colors.bgElevated}]}>
        <Text style={[styles.sectionTitle, {color: colors.textHeading}]}>
          Chapters ({chapters.length})
        </Text>
        {chapters.length === 0 ? (
          <Text style={[styles.hint, {color: colors.textMuted}]}>No chapters yet.</Text>
        ) : (
          chapters.map((chapter, idx) => (
            <Pressable
              key={chapter.id}
              onPress={() =>
                navigation.navigate('StoryChapterReader', {storyId, chapterId: chapter.id})
              }
              style={({pressed}) => [
                styles.chapterItem,
                idx > 0 && {borderTopWidth: 1, borderTopColor: colors.borderLight},
                pressed && styles.chapterPressed,
              ]}>
              <View style={[styles.chapterNumber, {backgroundColor: colors.bgSecondary}]}>
                <Text style={[styles.chapterNumberText, {color: colors.textMuted}]}>
                  {chapter.chapter_number || idx + 1}
                </Text>
              </View>
              <View style={styles.chapterInfo}>
                <Text style={[styles.chapterTitle, {color: colors.textPrimary}]} numberOfLines={1}>
                  {chapter.title}
                </Text>
                <Text style={[styles.chapterMeta, {color: colors.textMuted}]}>
                  {(chapter.status || 'draft').toString()}
                  {chapter.word_count ? ` \u2022 ${chapter.word_count.toLocaleString()} words` : ''}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  hint: {
    fontSize: 14,
  },
  coverContainer: {
    width: '100%',
    height: 200,
    borderRadius: radii.xl,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.ui.bold,
    marginTop: spacing.md,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  authorName: {
    fontSize: 14,
    fontFamily: fonts.ui.medium,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  statusText: {
    fontSize: 11,
    fontFamily: fonts.ui.semiBold,
    textTransform: 'capitalize',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    fontSize: 12,
    fontFamily: fonts.ui.regular,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    borderRadius: radii.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 12,
    fontFamily: fonts.ui.medium,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.ui.bold,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: fonts.ui.regular,
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  chapterPressed: {
    opacity: 0.75,
  },
  chapterNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterNumberText: {
    fontSize: 13,
    fontFamily: fonts.ui.bold,
  },
  chapterInfo: {
    flex: 1,
    gap: 2,
  },
  chapterTitle: {
    fontSize: 14,
    fontFamily: fonts.ui.semiBold,
  },
  chapterMeta: {
    fontSize: 12,
    fontFamily: fonts.ui.regular,
  },
});
