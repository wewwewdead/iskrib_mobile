import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useMutation, useQuery} from '@tanstack/react-query';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Screen} from '../../components/Screen';
import {PrimaryButton} from '../../components/PrimaryButton';
import {StoryCommentModal} from '../../components/Comments/StoryCommentModal';
import {storyApi} from '../../lib/api/storyApi';
import {LexicalRenderer} from '../../lib/content/LexicalRenderer';
import type {ParagraphPressInfo} from '../../lib/content/LexicalRenderer';
import {useAuth} from '../../features/auth/AuthProvider';
import {queryClient} from '../../lib/queryClient';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts} from '../../theme/typography';
import type {RootStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'StoryChapterReader'>;

export function StoryChapterReaderScreen({route, navigation}: Props) {
  const {colors} = useTheme();
  const {storyId, chapterId, scrollPosition: initialScrollPosition} = route.params;
  const {session} = useAuth();
  const isLoggedIn = !!session?.access_token;
  const [activeParagraph, setActiveParagraph] = useState<(ParagraphPressInfo & {preview: string}) | null>(null);

  // Scroll restoration refs
  const scrollViewRef = useRef<ScrollView>(null);
  const targetScrollRef = useRef<number | null>(initialScrollPosition ?? null);
  const hasRestoredRef = useRef(false);
  const viewportHeightRef = useRef(0);
  const lastScrollRatioRef = useRef(0);

  const chapterQuery = useQuery({
    queryKey: ['story-chapter', storyId, chapterId],
    queryFn: () => storyApi.getChapter(storyId, chapterId),
  });

  const commentCountsQuery = useQuery({
    queryKey: ['chapter-comment-counts', chapterId],
    queryFn: () => storyApi.getChapterCommentCounts(chapterId),
  });

  // Fetch saved progress as fallback if no scrollPosition was passed
  const progressQuery = useQuery({
    queryKey: ['reading-progress', storyId],
    queryFn: () => storyApi.getReadingProgress(storyId),
    enabled: isLoggedIn && targetScrollRef.current == null,
  });

  // Set target scroll from API progress if we don't have one from navigation
  useEffect(() => {
    if (
      targetScrollRef.current == null &&
      !hasRestoredRef.current &&
      progressQuery.data?.chapter_id === chapterId &&
      progressQuery.data?.scroll_position != null
    ) {
      targetScrollRef.current = progressQuery.data.scroll_position;
    }
  }, [progressQuery.data, chapterId]);

  const progressMutation = useMutation({
    mutationFn: (position: number) =>
      storyApi.saveReadingProgress(storyId, chapterId, position),
    onSuccess: () => {
      // Keep the story query's reading_progress in sync
      queryClient.invalidateQueries({queryKey: ['story', storyId]});
    },
  });

  const handleParagraphPress = useCallback((info: ParagraphPressInfo) => {
    setActiveParagraph({...info, preview: info.fingerprint});
  }, []);

  // Capture viewport height
  const onReaderLayout = useCallback((e: {nativeEvent: {layout: {height: number}}}) => {
    viewportHeightRef.current = e.nativeEvent.layout.height;
  }, []);

  // Restore scroll position once content renders
  const onContentSizeChange = useCallback((_w: number, contentHeight: number) => {
    if (hasRestoredRef.current || targetScrollRef.current == null) return;
    const viewport = viewportHeightRef.current;
    if (viewport <= 0 || contentHeight <= viewport) return;

    const scrollable = contentHeight - viewport;
    const targetY = targetScrollRef.current * scrollable;
    scrollViewRef.current?.scrollTo({y: targetY, animated: false});
    hasRestoredRef.current = true;
  }, []);

  // Save progress on scroll end
  const onScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const {contentOffset, contentSize, layoutMeasurement} = event.nativeEvent;
      const scrollable = Math.max(0, contentSize.height - layoutMeasurement.height);
      const ratio = scrollable > 0 ? Math.min(1, contentOffset.y / scrollable) : 0;
      lastScrollRatioRef.current = ratio;
      if (isLoggedIn) {
        progressMutation.mutate(ratio);
      }
    },
    [isLoggedIn, progressMutation],
  );

  // Save progress before navigating to another chapter
  const navigateToChapter = useCallback(
    (nextChapterId: string) => {
      if (isLoggedIn && lastScrollRatioRef.current > 0) {
        progressMutation.mutate(lastScrollRatioRef.current);
      }
      navigation.replace('StoryChapterReader', {
        storyId,
        chapterId: nextChapterId,
      });
    },
    [isLoggedIn, storyId, navigation, progressMutation],
  );

  return (
    <Screen scroll={false}>
      {chapterQuery.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accentAmber} />
          <Text style={[styles.meta, {color: colors.textMuted}]}>Loading chapter...</Text>
        </View>
      ) : !chapterQuery.data ? (
        <Text style={[styles.error, {color: colors.danger}]}>Chapter not found.</Text>
      ) : (
        <View style={styles.container}>
          <Text style={[styles.title, {color: colors.textPrimary}]}>
            {`Ch. ${chapterQuery.data.chapter_number || '?'}: ${chapterQuery.data.title}`}
          </Text>

          <ScrollView
            ref={scrollViewRef}
            style={[
              styles.reader,
              {borderColor: colors.borderLight, backgroundColor: colors.bgElevated},
            ]}
            contentContainerStyle={styles.readerContent}
            onLayout={onReaderLayout}
            onContentSizeChange={onContentSizeChange}
            onMomentumScrollEnd={onScrollEnd}
            onScrollEndDrag={onScrollEnd}
            scrollEventThrottle={16}>
            <LexicalRenderer
              content={chapterQuery.data?.content}
              onParagraphPress={handleParagraphPress}
              paragraphCommentCounts={commentCountsQuery.data}
            />
          </ScrollView>

          <View style={styles.navRow}>
            {chapterQuery.data.prev_chapter ? (
              <PrimaryButton
                label={`Prev: ${chapterQuery.data.prev_chapter.title}`}
                onPress={() => navigateToChapter(chapterQuery.data?.prev_chapter?.id || '')}
                kind="secondary"
              />
            ) : (
              <View />
            )}
            {chapterQuery.data.next_chapter ? (
              <PrimaryButton
                label={`Next: ${chapterQuery.data.next_chapter.title}`}
                onPress={() => navigateToChapter(chapterQuery.data?.next_chapter?.id || '')}
              />
            ) : (
              <View />
            )}
          </View>
        </View>
      )}

      <StoryCommentModal
        visible={activeParagraph !== null}
        chapterId={chapterId}
        paragraphIndex={activeParagraph?.paragraphIndex ?? 0}
        paragraphFingerprint={activeParagraph?.fingerprint ?? ''}
        paragraphPreview={activeParagraph?.preview}
        onClose={() => setActiveParagraph(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  container: {
    flex: 1,
    gap: 8,
  },
  title: {
    fontSize: 21,
    fontFamily: fonts.heading.bold,
  },
  meta: {
    fontSize: 13,
  },
  error: {},
  reader: {
    borderWidth: 1,
    borderRadius: 12,
    flex: 1,
    minHeight: 200,
  },
  readerContent: {
    padding: 12,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
});
