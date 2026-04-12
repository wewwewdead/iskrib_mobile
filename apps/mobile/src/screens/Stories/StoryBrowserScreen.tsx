import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useInfiniteQuery} from '@tanstack/react-query';
import {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {CompositeScreenProps, useFocusEffect} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Screen} from '../../components/Screen';
import {PrimaryButton} from '../../components/PrimaryButton';
import {StoryCard} from '../../components/StoryCard';
import {storyApi, type StoryItem, type StoryStatus} from '../../lib/api/storyApi';
import {useAuth} from '../../features/auth/AuthProvider';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts} from '../../theme/typography';
import {spacing} from '../../theme/spacing';
import type {MainTabParamList, RootStackParamList} from '../../navigation/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_GAP = spacing.sm;
const CARD_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - CARD_GAP) / 2;

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Stories'>,
  NativeStackScreenProps<RootStackParamList>
>;

const STATUS_FILTERS: Array<{label: string; value: StoryStatus | null}> = [
  {label: 'All', value: null},
  {label: 'Ongoing', value: 'ongoing'},
  {label: 'Completed', value: 'completed'},
  {label: 'Hiatus', value: 'hiatus'},
];

const getNextCursor = (lastPage: {data: StoryItem[]; hasMore?: boolean}) => {
  if (!lastPage?.hasMore || !Array.isArray(lastPage.data) || lastPage.data.length === 0) {
    return undefined;
  }
  return lastPage.data[lastPage.data.length - 1]?.created_at;
};

export function StoryBrowserScreen({navigation}: Props) {
  const {colors} = useTheme();
  const {session} = useAuth();
  const isLoggedIn = !!session?.access_token;
  const [statusFilter, setStatusFilter] = useState<StoryStatus | null>(null);

  const storiesQuery = useInfiniteQuery({
    queryKey: ['stories-browser', statusFilter],
    queryFn: ({pageParam}) =>
      storyApi.getStories({
        status: statusFilter,
        before: pageParam ?? null,
        limit: 12,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: lastPage => getNextCursor(lastPage),
  });

  useFocusEffect(
    useCallback(() => {
      storiesQuery.refetch();
    }, [statusFilter]),
  );

  const stories = useMemo(
    () => storiesQuery.data?.pages.flatMap(page => page.data ?? []) ?? [],
    [storiesQuery.data?.pages],
  );

  // Pair stories into rows of 2 for the grid
  const rows = useMemo(() => {
    const result: Array<[StoryItem, StoryItem | null]> = [];
    for (let i = 0; i < stories.length; i += 2) {
      result.push([stories[i], stories[i + 1] ?? null]);
    }
    return result;
  }, [stories]);

  const listHeader = useMemo(() => (
    <View style={styles.listHeader}>
      <View style={styles.header}>
        <Text style={[styles.pageTitle, {color: colors.textPrimary}]}>Stories</Text>
        <View style={styles.headerActions}>
          {isLoggedIn ? (
            <>
              <PrimaryButton
                label="Library"
                onPress={() => navigation.navigate('StoryLibrary')}
                kind="secondary"
              />
              <PrimaryButton
                label="My Stories"
                onPress={() => navigation.navigate('StoryDashboard')}
                kind="secondary"
              />
              <PrimaryButton
                label="Write"
                onPress={() => navigation.navigate('StoryEditor', {})}
              />
            </>
          ) : (
            <Text style={[styles.hint, {color: colors.textMuted}]}>Log in to create and manage stories.</Text>
          )}
        </View>
      </View>

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map(filter => (
          <Pressable
            key={filter.label}
            onPress={() => setStatusFilter(filter.value)}
            style={[
              styles.filterChip,
              {
                borderColor: statusFilter === filter.value ? colors.accentAmber : colors.borderLight,
                backgroundColor: statusFilter === filter.value ? colors.accentAmber : colors.bgElevated,
              },
            ]}>
            <Text
              style={[
                styles.filterText,
                {
                  color: statusFilter === filter.value ? '#FFFFFF' : colors.textMuted,
                  fontFamily: statusFilter === filter.value ? fonts.ui.bold : fonts.ui.regular,
                },
              ]}>
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {storiesQuery.isLoading && (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accentAmber} />
          <Text style={[styles.hint, {color: colors.textMuted}]}>Loading stories...</Text>
        </View>
      )}
    </View>
  ), [colors, isLoggedIn, statusFilter, storiesQuery.isLoading, navigation]);

  return (
    <Screen scroll={false} padded={false}>
      <FlatList
        data={rows}
        keyExtractor={item => item[0].id}
        onEndReachedThreshold={0.3}
        onEndReached={() => {
          if (storiesQuery.hasNextPage && !storiesQuery.isFetchingNextPage) {
            storiesQuery.fetchNextPage();
          }
        }}
        contentContainerStyle={styles.gridContent}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          storiesQuery.isLoading ? null : (
            <Text style={[styles.hint, {color: colors.textMuted, paddingHorizontal: spacing.lg}]}>No stories found.</Text>
          )
        }
        renderItem={({item: [left, right]}) => (
          <View style={styles.gridRow}>
            <View style={styles.cardWrapper}>
              <StoryCard
                story={left}
                onPress={() => navigation.navigate('StoryDetail', {storyId: left.id})}
              />
            </View>
            {right ? (
              <View style={styles.cardWrapper}>
                <StoryCard
                  story={right}
                  onPress={() => navigation.navigate('StoryDetail', {storyId: right.id})}
                />
              </View>
            ) : (
              <View style={styles.cardWrapper} />
            )}
          </View>
        )}
        ListFooterComponent={
          storiesQuery.isFetchingNextPage ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator color={colors.accentAmber} />
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listHeader: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  header: {
    gap: 8,
  },
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 24,
    fontFamily: fonts.heading.bold,
  },
  hint: {
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterText: {
    fontSize: 13,
  },
  gridContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  gridRow: {
    flexDirection: 'row',
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
  cardWrapper: {
    width: CARD_WIDTH,
  },
  loading: {
    marginTop: 18,
    gap: 8,
    alignItems: 'center',
  },
  loadingMore: {
    paddingVertical: 10,
  },
});
