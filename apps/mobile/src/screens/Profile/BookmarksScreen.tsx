import React, {useMemo} from 'react';
import {ActivityIndicator, FlatList, StyleSheet, Text, View} from 'react-native';
import {useInfiniteQuery} from '@tanstack/react-query';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Screen} from '../../components/Screen';
import {PostCard} from '../../components/PostCard/PostCard';
import {EmptyState} from '../../components/EmptyState';
import {useTheme} from '../../theme/ThemeProvider';
import {VERTICAL_CARD_LIST_PROPS} from '../../lib/listPerformance';
import {mobileApi} from '../../lib/api/mobileApi';
import {formatReadingMinutes} from '../../lib/utils/journalHelpers';
import {fonts} from '../../theme/typography';
import {spacing} from '../../theme/spacing';
import type {RootStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Bookmarks'>;

export function BookmarksScreen({navigation}: Props) {
  const {colors} = useTheme();

  const bookmarksQuery = useInfiniteQuery({
    queryKey: ['bookmarks'],
    queryFn: ({pageParam}) =>
      mobileApi.getBookmarks({limit: 10, before: pageParam ?? null}),
    initialPageParam: null as string | null,
    getNextPageParam: lastPage => {
      if (!lastPage?.hasMore || !lastPage.bookmarks?.length) return undefined;
      return lastPage.bookmarks[lastPage.bookmarks.length - 1]?.created_at;
    },
  });

  const bookmarks = useMemo(
    () => bookmarksQuery.data?.pages.flatMap(page => page.bookmarks ?? []) ?? [],
    [bookmarksQuery.data?.pages],
  );

  const totalCount = bookmarksQuery.data?.pages[0]?.totalBookmarks;

  return (
    <Screen scroll={false}>
      <Text style={[styles.title, {color: colors.textPrimary}]}>
        Bookmarks{totalCount != null ? ` (${totalCount})` : ''}
      </Text>

      {bookmarksQuery.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accentAmber} />
        </View>
      ) : (
        <FlatList
          data={bookmarks}
          {...VERTICAL_CARD_LIST_PROPS}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          onEndReachedThreshold={0.3}
          onEndReached={() => {
            if (bookmarksQuery.hasNextPage && !bookmarksQuery.isFetchingNextPage) {
              bookmarksQuery.fetchNextPage();
            }
          }}
          ListEmptyComponent={
            <EmptyState
              title="No bookmarks yet"
              subtitle="Bookmark posts from the feed to save them here."
            />
          }
          renderItem={({item}) => {
            const journal = item.journals;
            if (!journal) return null;

            const likeCount =
              journal.like_count?.[0]?.count ?? 0;
            const commentCount =
              journal.comment_count?.[0]?.count ?? 0;
            const bookmarkCount =
              journal.bookmark_count?.[0]?.count ?? 0;

            return (
              <PostCard
                title={journal.title || 'Untitled'}
                bodyPreview={journal.preview_text || ''}
                authorName={journal.users?.name || 'Unknown'}
                authorAvatar={journal.users?.image_url}
                authorBadge={journal.users?.badge as 'legend' | 'og' | undefined}
                bannerImage={journal.thumbnail_url}
                postType={journal.post_type}
                readingTime={
                  typeof journal.reading_time === 'number' && journal.reading_time > 0
                    ? formatReadingMinutes(journal.reading_time)
                    : typeof journal.reading_time === 'string'
                    ? journal.reading_time
                    : undefined
                }
                likeCount={likeCount}
                commentCount={commentCount}
                bookmarkCount={bookmarkCount}
                isBookmarked={item.has_bookmarked}
                shareId={journal.id}
                onPress={() =>
                  navigation.navigate('PostDetail', {journalId: journal.id})
                }
                onAuthorPress={() =>
                  journal.user_id
                    ? navigation.navigate('VisitProfile', {userId: journal.user_id})
                    : undefined
                }
              />
            );
          }}
          ListFooterComponent={
            bookmarksQuery.isFetchingNextPage ? (
              <View style={styles.loading}>
                <ActivityIndicator color={colors.accentAmber} />
              </View>
            ) : null
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontFamily: fonts.heading.bold,
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: 14,
  },
  loading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  listContent: {
    gap: spacing.md,
  },
});
