import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Screen} from '../../components/Screen';
import {PrimaryButton} from '../../components/PrimaryButton';
import {storyApi} from '../../lib/api/storyApi';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts} from '../../theme/typography';
import type {RootStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'StoryChapterManager'>;

export function StoryChapterManagerScreen({route, navigation}: Props) {
  const {colors} = useTheme();
  const {storyId} = route.params;
  const queryClient = useQueryClient();

  const storyQuery = useQuery({
    queryKey: ['story', storyId],
    queryFn: () => storyApi.getStoryById(storyId),
  });

  const [newChapterTitle, setNewChapterTitle] = useState('');

  const createMutation = useMutation({
    mutationFn: () =>
      storyApi.createChapter(
        storyId,
        newChapterTitle.trim() || `Chapter ${(storyQuery.data?.chapters?.length || 0) + 1}`,
      ),
    onSuccess: data => {
      queryClient.invalidateQueries({queryKey: ['story', storyId]});
      setNewChapterTitle('');
      navigation.navigate('StoryChapterEditor', {storyId, chapterId: data.id});
    },
    onError: error => {
      Alert.alert(
        'Create chapter failed',
        error instanceof Error ? error.message : 'Unknown error',
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (chapterId: string) => storyApi.deleteChapter(storyId, chapterId),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['story', storyId]});
    },
  });

  const publishMutation = useMutation({
    mutationFn: (chapterId: string) =>
      storyApi.updateChapter(storyId, chapterId, {status: 'published'}),
    onSuccess: () => queryClient.invalidateQueries({queryKey: ['story', storyId]}),
  });

  const chapters = useMemo(
    () =>
      [...(storyQuery.data?.chapters ?? [])].sort(
        (a, b) => (a.chapter_number || 0) - (b.chapter_number || 0),
      ),
    [storyQuery.data?.chapters],
  );

  const onDelete = (chapterId: string, title: string) => {
    Alert.alert('Delete chapter', `Delete "${title}"?`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(chapterId)},
    ]);
  };

  if (storyQuery.isLoading) {
    return (
      <Screen>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accentAmber} />
          <Text style={[styles.meta, {color: colors.textMuted}]}>Loading story...</Text>
        </View>
      </Screen>
    );
  }

  if (!storyQuery.data) {
    return (
      <Screen>
        <Text style={[styles.error, {color: colors.danger}]}>Story not found.</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, {color: colors.textPrimary}]}>{storyQuery.data.title}</Text>
        <Text style={[styles.meta, {color: colors.textMuted}]}>{`${chapters.length} chapters`}</Text>

        <View
          style={[
            styles.card,
            {borderColor: colors.borderLight, backgroundColor: colors.bgElevated},
          ]}>
          <Text style={[styles.sectionTitle, {color: colors.textPrimary}]}>Create chapter</Text>
          <TextInput
            value={newChapterTitle}
            onChangeText={setNewChapterTitle}
            placeholder="Chapter title"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              {
                borderColor: colors.borderLight,
                backgroundColor: colors.bgSecondary,
                color: colors.textPrimary,
              },
            ]}
          />
          <PrimaryButton
            label="Create"
            onPress={() => createMutation.mutate()}
            loading={createMutation.isPending}
          />
        </View>

        <View
          style={[
            styles.card,
            {borderColor: colors.borderLight, backgroundColor: colors.bgElevated},
          ]}>
          <Text style={[styles.sectionTitle, {color: colors.textPrimary}]}>Manage chapters</Text>
          {chapters.length === 0 ? (
            <Text style={[styles.meta, {color: colors.textMuted}]}>No chapters yet.</Text>
          ) : (
            chapters.map(chapter => (
              <View
                key={chapter.id}
                style={[styles.chapterRow, {borderTopColor: colors.borderLight}]}>
                <Pressable
                  onPress={() =>
                    navigation.navigate('StoryChapterReader', {
                      storyId,
                      chapterId: chapter.id,
                    })
                  }
                  style={({pressed}) => [styles.chapterTouch, pressed && styles.chapterPressed]}>
                  <Text style={[styles.chapterTitle, {color: colors.textPrimary}]}>
                    {`Ch. ${chapter.chapter_number || '?'}: ${chapter.title}`}
                  </Text>
                  <Text style={[styles.chapterMeta, {color: colors.textMuted}]}>
                    {(chapter.status || 'draft').toString()}
                    {` • ${(chapter.word_count || 0).toLocaleString()} words`}
                  </Text>
                </Pressable>
                <View style={styles.actions}>
                  <PrimaryButton
                    label="Edit"
                    onPress={() =>
                      navigation.navigate('StoryChapterEditor', {
                        storyId,
                        chapterId: chapter.id,
                      })
                    }
                    kind="secondary"
                  />
                  <PrimaryButton
                    label="Publish"
                    onPress={() => publishMutation.mutate(chapter.id)}
                    kind="secondary"
                    loading={publishMutation.isPending}
                  />
                  <PrimaryButton
                    label="Delete"
                    onPress={() => onDelete(chapter.id, chapter.title)}
                    kind="danger"
                    loading={deleteMutation.isPending}
                  />
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
    paddingBottom: 20,
  },
  loading: {
    marginTop: 20,
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.heading.bold,
  },
  meta: {
    fontSize: 14,
  },
  error: {},
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  sectionTitle: {
    fontFamily: fonts.ui.bold,
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  chapterRow: {
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 8,
  },
  chapterTouch: {
    gap: 4,
  },
  chapterPressed: {
    opacity: 0.8,
  },
  chapterTitle: {
    fontFamily: fonts.ui.bold,
    fontSize: 14,
  },
  chapterMeta: {
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
