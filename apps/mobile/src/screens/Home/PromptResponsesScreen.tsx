import React, {useMemo} from 'react';
import {FlatList, StyleSheet, View} from 'react-native';
import {useInfiniteQuery} from '@tanstack/react-query';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {PostCard} from '../../components/PostCard/PostCard';
import {EmptyState} from '../../components/EmptyState';
import {ScreenEntrance} from '../../components/ScreenEntrance';
import {useAuth} from '../../features/auth/AuthProvider';
import {useTheme} from '../../theme/ThemeProvider';
import {VERTICAL_CARD_LIST_PROPS} from '../../lib/listPerformance';
import {mobileApi} from '../../lib/api/mobileApi';
import {getJournalCardData} from '../../lib/utils/journalHelpers';
import {spacing} from '../../theme/spacing';
import type {RootStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PromptResponses'>;

export function PromptResponsesScreen({route, navigation}: Props) {
  const {promptId} = route.params;
  const {user} = useAuth();
  const {colors} = useTheme();

  const query = useInfiniteQuery({
    queryKey: ['prompt-responses', promptId],
    queryFn: ({pageParam}) => mobileApi.getPromptResponses(promptId, pageParam ?? null),
    initialPageParam: null as string | null,
    getNextPageParam: lastPage => lastPage.before ?? undefined,
  });

  const responses = useMemo(
    () => query.data?.pages.flatMap(p => p.responses ?? []) ?? [],
    [query.data?.pages],
  );

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.bgPrimary}]} edges={['top']}>
      <ScreenEntrance tier="feed">
      <FlatList
        data={responses}
        {...VERTICAL_CARD_LIST_PROPS}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        onEndReachedThreshold={0.3}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
        }}
        ListEmptyComponent={
          query.isLoading ? null : <EmptyState title="No responses yet" />
        }
        renderItem={({item}) => {
          const cardData = getJournalCardData(item);
          return (
            <PostCard
              title={item.title || 'Untitled'}
              bodyPreview={cardData.previewText}
              authorName={item.users?.name || 'Unknown'}
              authorAvatar={item.users?.image_url}
              likeCount={cardData.likeCount}
              commentCount={cardData.commentCount}
              bookmarkCount={cardData.bookmarkCount}
              viewCount={item.views}
              bannerImage={cardData.bannerImage}
              readingTime={cardData.readingTime}
              shareId={item.id}
              onPress={() => navigation.navigate('PostDetail', {journalId: item.id})}
              onAuthorPress={() => {
                const authorId = item.users?.id ?? item.user_id;
                if (authorId && authorId !== user?.id) {
                  navigation.navigate('VisitProfile', {userId: authorId});
                }
              }}
              onReact={() => {}}
              onComment={() => {}}
              onBookmark={() => {}}
              onRepost={() => {}}
            />
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      </ScreenEntrance>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  list: {paddingHorizontal: spacing.lg, paddingBottom: 100},
  separator: {height: spacing.md},
});
