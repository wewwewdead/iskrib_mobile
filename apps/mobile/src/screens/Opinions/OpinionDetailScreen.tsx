import React, {useEffect, useMemo, useState} from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {OpinionCard} from '../../components/OpinionCard';
import {PrimaryButton} from '../../components/PrimaryButton';
import {ScreenEntrance} from '../../components/ScreenEntrance';
import {useAuth} from '../../features/auth/AuthProvider';
import {useTheme} from '../../theme/ThemeProvider';
import {opinionsApi} from '../../lib/api/opinionsApi';
import {queryClient} from '../../lib/queryClient';
import {fonts} from '../../theme/typography';
import {spacing, radii} from '../../theme/spacing';
import type {RootStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'OpinionDetail'>;

export function OpinionDetailScreen({route, navigation}: Props) {
  const {opinionId, parentOpinion} = route.params;
  const {user, session} = useAuth();
  const {colors} = useTheme();
  const isLoggedIn = !!session?.access_token;
  const [replyText, setReplyText] = useState('');
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, e => {
      setKeyboardInset(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const repliesQuery = useInfiniteQuery({
    queryKey: ['opinion-replies', opinionId],
    queryFn: ({pageParam}) => opinionsApi.getOpinionReplies(opinionId, pageParam ?? null),
    initialPageParam: null as string | null,
    getNextPageParam: lastPage => {
      if (!lastPage.hasMore) return undefined;
      return lastPage.data?.[lastPage.data.length - 1]?.id;
    },
  });

  const replies = useMemo(
    () => repliesQuery.data?.pages.flatMap(p => p.data ?? []) ?? [],
    [repliesQuery.data?.pages],
  );

  const replyMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Please log in.');
      return opinionsApi.addOpinionReply(opinionId, user.id, opinionId, replyText.trim());
    },
    onSuccess: () => {
      setReplyText('');
      queryClient.invalidateQueries({queryKey: ['opinion-replies', opinionId]});
    },
    onError: e => Alert.alert('Error', e instanceof Error ? e.message : 'Failed'),
  });

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.bgPrimary}]} edges={['top']}>
      <View style={[styles.flex, {paddingBottom: keyboardInset}]}>
        <ScreenEntrance tier="hero" style={styles.flex}>
          <FlatList
            data={replies}
            style={styles.flex}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            onEndReachedThreshold={0.3}
            onEndReached={() => {
              if (repliesQuery.hasNextPage && !repliesQuery.isFetchingNextPage) repliesQuery.fetchNextPage();
            }}
            ListHeaderComponent={
              parentOpinion ? (
                <View style={styles.headerSection}>
                  <OpinionCard
                    opinion={{...parentOpinion, users: parentOpinion.users ?? undefined}}
                    onAuthorPress={() => {
                      const authorId = parentOpinion.users?.id ?? parentOpinion.user_id;
                      if (authorId && authorId !== user?.id) {
                        navigation.navigate('VisitProfile', {userId: authorId, username: parentOpinion.users?.username});
                      }
                    }}
                  />
                  <Text style={[styles.repliesLabel, {color: colors.textMuted}]}>
                    Replies
                  </Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              repliesQuery.isLoading ? null : (
                <Text style={[styles.emptyText, {color: colors.textMuted}]}>No replies yet.</Text>
              )
            }
            renderItem={({item}) => (
              <OpinionCard
                opinion={item}
                onPress={() => navigation.push('OpinionDetail', {opinionId: item.id, parentOpinion: item})}
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
        </ScreenEntrance>

        {isLoggedIn ? (
          <View style={[styles.inputRow, {backgroundColor: colors.bgElevated, borderTopColor: colors.borderCard}]}>
            <TextInput
              value={replyText}
              onChangeText={setReplyText}
              placeholder="Write a reply..."
              placeholderTextColor={colors.textFaint}
              style={[styles.input, {backgroundColor: colors.bgSecondary, borderColor: colors.borderCard, color: colors.textPrimary}]}
              maxLength={280}
              multiline
            />
            <PrimaryButton
              label="Reply"
              onPress={() => replyMutation.mutate()}
              disabled={replyText.trim().length === 0 || replyMutation.isPending}
              loading={replyMutation.isPending}
            />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  flex: {flex: 1},
  list: {padding: spacing.lg, paddingBottom: 100},
  headerSection: {marginBottom: spacing.lg},
  repliesLabel: {fontFamily: fonts.ui.semiBold, fontSize: 13, marginTop: spacing.lg, marginBottom: spacing.xs},
  separator: {height: spacing.md},
  emptyText: {fontFamily: fonts.ui.regular, fontSize: 14, textAlign: 'center', paddingVertical: spacing.xl},
  inputRow: {
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fonts.ui.regular,
    fontSize: 14,
    minHeight: 44,
  },
});
