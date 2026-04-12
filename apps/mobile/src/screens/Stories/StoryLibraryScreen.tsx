import React, {useMemo} from 'react';
import {
  ActivityIndicator,
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

type Props = NativeStackScreenProps<RootStackParamList, 'StoryLibrary'>;

const getNext = (page: {data: StoryItem[]; hasMore?: boolean}) => {
  if (!page.hasMore || page.data.length === 0) {
    return undefined;
  }
  return page.data[page.data.length - 1]?.updated_at;
};

export function StoryLibraryScreen({navigation}: Props) {
  const {colors} = useTheme();
  const {session} = useAuth();
  const isLoggedIn = !!session?.access_token;
  const queryClient = useQueryClient();

  const libraryQuery = useInfiniteQuery({
    queryKey: ['stories-library'],
    enabled: isLoggedIn,
    queryFn: ({pageParam}) => storyApi.getMyLibrary({limit: 10, before: pageParam ?? null}),
    initialPageParam: null as string | null,
    getNextPageParam: page => getNext(page),
  });

  const toggleMutation = useMutation({
    mutationFn: (storyId: string) => storyApi.toggleLibrary(storyId),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['stories-library']});
      queryClient.invalidateQueries({queryKey: ['story']});
    },
  });

  const stories = useMemo(
    () => libraryQuery.data?.pages.flatMap(page => page.data ?? []) ?? [],
    [libraryQuery.data?.pages],
  );

  return (
    <Screen scroll={false}>
      <Text style={[styles.title, {color: colors.textPrimary}]}>My Story Library</Text>

      {!isLoggedIn ? (
        <Text style={[styles.hint, {color: colors.textMuted}]}>Login required.</Text>
      ) : libraryQuery.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accentAmber} />
          <Text style={[styles.hint, {color: colors.textMuted}]}>Loading library...</Text>
        </View>
      ) : (
        <FlatList
          data={stories}
          keyExtractor={item => item.id}
          onEndReachedThreshold={0.3}
          onEndReached={() => {
            if (libraryQuery.hasNextPage && !libraryQuery.isFetchingNextPage) {
              libraryQuery.fetchNextPage();
            }
          }}
          ListEmptyComponent={
            <Text style={[styles.hint, {color: colors.textMuted}]}>No stories in library.</Text>
          }
          renderItem={({item}) => (
            <StoryListItem
              story={item}
              onPress={() => navigation.navigate('StoryDetail', {storyId: item.id})}
              rightAction={
                <PrimaryButton
                  label="Remove"
                  onPress={() => toggleMutation.mutate(item.id)}
                  kind="secondary"
                  loading={toggleMutation.isPending}
                />
              }
            />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontFamily: fonts.heading.bold,
    marginBottom: 10,
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
