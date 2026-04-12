import React, {useMemo} from 'react';
import {FlatList, StyleSheet, View} from 'react-native';
import {useInfiniteQuery} from '@tanstack/react-query';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {OpinionCard} from '../../components/OpinionCard';
import {EmptyState} from '../../components/EmptyState';
import {useAuth} from '../../features/auth/AuthProvider';
import {opinionsApi} from '../../lib/api/opinionsApi';
import {spacing} from '../../theme/spacing';
import type {RootStackParamList} from '../../navigation/types';

interface ProfileOpinionsTabProps {
  userId: string;
  headerComponent?: React.ReactElement;
  isOwnProfile?: boolean;
  userProfile?: {
    id: string;
    name?: string;
    username?: string;
    image_url?: string;
    badge?: string;
  } | null;
}

export function ProfileOpinionsTab({userId, headerComponent, isOwnProfile, userProfile}: ProfileOpinionsTabProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {user} = useAuth();

  const query = useInfiniteQuery({
    queryKey: ['profileOpinions', userId],
    queryFn: ({pageParam}) =>
      isOwnProfile
        ? opinionsApi.getMyOpinions(pageParam ?? null)
        : opinionsApi.getUserOpinions(userId, pageParam ?? null),
    initialPageParam: null as string | null,
    getNextPageParam: lastPage => {
      if (!lastPage.hasMore) return undefined;
      return lastPage.data?.[lastPage.data.length - 1]?.id;
    },
  });

  const opinions = useMemo(() => {
    const items = query.data?.pages.flatMap(p => p.data ?? []) ?? [];
    if (isOwnProfile && userProfile) {
      return items.map(item => ({
        ...item,
        users: item.users?.name ? item.users : {
          id: userProfile.id,
          name: userProfile.name,
          username: userProfile.username,
          image_url: userProfile.image_url,
          badge: userProfile.badge,
        },
      }));
    }
    return items;
  }, [query.data?.pages, isOwnProfile, userProfile]);

  return (
    <FlatList
      data={opinions}
      keyExtractor={item => item.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.list}
      ListHeaderComponent={headerComponent}
      onEndReachedThreshold={0.3}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
      }}
      ListEmptyComponent={
        query.isLoading ? null : (
          <EmptyState title="No opinions yet" />
        )
      }
      renderItem={({item}) => (
        <OpinionCard
          opinion={item}
          onPress={() => navigation.navigate('OpinionDetail', {opinionId: item.id, parentOpinion: item})}
          onAuthorPress={() => {
            const authorId = item.users?.id ?? item.user_id;
            if (authorId && authorId !== user?.id) {
              navigation.navigate('VisitProfile', {userId: authorId, username: item.users?.username});
            }
          }}
        />
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  list: {paddingHorizontal: spacing.lg, paddingBottom: 100},
  separator: {height: spacing.md},
});
