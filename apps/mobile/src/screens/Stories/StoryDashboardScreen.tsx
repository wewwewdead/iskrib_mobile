import React, {useMemo} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useInfiniteQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Screen} from '../../components/Screen';
import {PrimaryButton} from '../../components/PrimaryButton';
import {StoryListItem} from '../../components/StoryListItem';
import {storyApi, type StoryItem} from '../../lib/api/storyApi';
import {useAuth} from '../../features/auth/AuthProvider';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts} from '../../theme/typography';
import type {RootStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'StoryDashboard'>;

const getNext = (page: {data: StoryItem[]; hasMore?: boolean}) => {
  if (!page.hasMore || page.data.length === 0) {
    return undefined;
  }
  return page.data[page.data.length - 1]?.updated_at;
};

export function StoryDashboardScreen({navigation}: Props) {
  const {colors} = useTheme();
  const {session} = useAuth();
  const isLoggedIn = !!session?.access_token;
  const queryClient = useQueryClient();

  const myStoriesQuery = useInfiniteQuery({
    queryKey: ['stories-dashboard'],
    enabled: isLoggedIn,
    queryFn: ({pageParam}) => storyApi.getMyStories({limit: 10, before: pageParam ?? null}),
    initialPageParam: null as string | null,
    getNextPageParam: page => getNext(page),
  });

  const deleteMutation = useMutation({
    mutationFn: (storyId: string) => storyApi.deleteStory(storyId),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['stories-dashboard']});
      queryClient.invalidateQueries({queryKey: ['stories-browser']});
    },
  });

  const stories = useMemo(
    () => myStoriesQuery.data?.pages.flatMap(page => page.data ?? []) ?? [],
    [myStoriesQuery.data?.pages],
  );

  const onDelete = (storyId: string, title: string) => {
    Alert.alert('Delete story', `Delete "${title}"?`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(storyId)},
    ]);
  };

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <Text style={[styles.title, {color: colors.textPrimary}]}>My Stories</Text>
        <PrimaryButton
          label="New Story"
          onPress={() => navigation.navigate('StoryEditor', {})}
        />
      </View>

      {!isLoggedIn ? (
        <Text style={[styles.hint, {color: colors.textMuted}]}>Login required.</Text>
      ) : myStoriesQuery.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accentAmber} />
          <Text style={[styles.hint, {color: colors.textMuted}]}>Loading stories...</Text>
        </View>
      ) : (
        <FlatList
          data={stories}
          keyExtractor={item => item.id}
          onEndReachedThreshold={0.3}
          onEndReached={() => {
            if (myStoriesQuery.hasNextPage && !myStoriesQuery.isFetchingNextPage) {
              myStoriesQuery.fetchNextPage();
            }
          }}
          ListEmptyComponent={
            <Text style={[styles.hint, {color: colors.textMuted}]}>No stories yet.</Text>
          }
          renderItem={({item}) => (
            <StoryListItem
              story={item}
              onPress={() => navigation.navigate('StoryChapterManager', {storyId: item.id})}
              rightAction={
                <>
                  <PrimaryButton
                    label="Edit"
                    onPress={() => navigation.navigate('StoryEditor', {storyId: item.id})}
                    kind="secondary"
                  />
                  <PrimaryButton
                    label="Delete"
                    onPress={() => onDelete(item.id, item.title)}
                    kind="danger"
                    loading={deleteMutation.isPending}
                  />
                </>
              }
            />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.heading.bold,
  },
  hint: {
    fontSize: 14,
  },
  loading: {
    marginTop: 20,
    alignItems: 'center',
    gap: 8,
  },
});
