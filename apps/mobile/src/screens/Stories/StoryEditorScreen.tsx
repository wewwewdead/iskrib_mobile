import React, {useEffect, useMemo, useState} from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useMutation, useQuery} from '@tanstack/react-query';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Screen} from '../../components/Screen';
import {PrimaryButton} from '../../components/PrimaryButton';
import {storyApi, type StoryPrivacy, type StoryStatus} from '../../lib/api/storyApi';
import {useAuth} from '../../features/auth/AuthProvider';
import {queryClient} from '../../lib/queryClient';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts} from '../../theme/typography';
import type {RootStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'StoryEditor'>;

const TAG_SUGGESTIONS = [
  'Fantasy',
  'Romance',
  'Sci-Fi',
  'Mystery',
  'Thriller',
  'Horror',
  'Adventure',
  'Drama',
  'Comedy',
  'Poetry',
];

export function StoryEditorScreen({route, navigation}: Props) {
  const {colors} = useTheme();
  const storyId = route.params?.storyId;
  const isEdit = Boolean(storyId);
  const {session} = useAuth();
  const isLoggedIn = !!session?.access_token;

  const storyQuery = useQuery({
    queryKey: ['story-editor', storyId],
    enabled: isEdit && !!storyId,
    queryFn: () => storyApi.getStoryById(storyId ?? ''),
  });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<StoryStatus>('ongoing');
  const [privacy, setPrivacy] = useState<StoryPrivacy>('public');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (storyQuery.data) {
      setTitle(storyQuery.data.title || '');
      setDescription(storyQuery.data.description || '');
      setStatus((storyQuery.data.status as StoryStatus) || 'ongoing');
      setPrivacy((storyQuery.data.privacy as StoryPrivacy) || 'public');
      setTags(Array.isArray(storyQuery.data.tags) ? storyQuery.data.tags : []);
    }
  }, [storyQuery.data]);

  const canSave = useMemo(() => title.trim().length > 0, [title]);

  const createMutation = useMutation({
    mutationFn: () =>
      storyApi.createStory({
        title,
        description,
        status,
        privacy,
        tags,
      }),
    onSuccess: data => {
      queryClient.invalidateQueries({queryKey: ['stories-dashboard']});
      queryClient.invalidateQueries({queryKey: ['stories-browser']});
      navigation.replace('StoryChapterManager', {storyId: data.id});
    },
    onError: error => {
      Alert.alert(
        'Failed to create story',
        error instanceof Error ? error.message : 'Unknown error',
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      storyApi.updateStory(storyId ?? '', {
        title,
        description,
        status,
        privacy,
        tags,
      }),
    onSuccess: data => {
      queryClient.invalidateQueries({queryKey: ['story', data.id]});
      queryClient.invalidateQueries({queryKey: ['stories-dashboard']});
      queryClient.invalidateQueries({queryKey: ['stories-browser']});
      navigation.replace('StoryChapterManager', {storyId: data.id});
    },
    onError: error => {
      Alert.alert(
        'Failed to update story',
        error instanceof Error ? error.message : 'Unknown error',
      );
    },
  });

  const addTag = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      return;
    }
    if (tags.includes(trimmed)) {
      setTagInput('');
      return;
    }
    if (tags.length >= 10) {
      return;
    }
    setTags(current => [...current, trimmed]);
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTags(current => current.filter(item => item !== tag));
  };

  const onSave = () => {
    if (!isLoggedIn) {
      Alert.alert('Login required', 'Sign in to save stories.');
      return;
    }

    if (isEdit) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, {color: colors.textPrimary}]}>{isEdit ? 'Edit Story' : 'New Story'}</Text>

        <Text style={[styles.label, {color: colors.textPrimary}]}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          maxLength={200}
          placeholder="Give your story a title"
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            {
              borderColor: colors.borderLight,
              backgroundColor: colors.bgElevated,
              color: colors.textPrimary,
            },
          ]}
        />

        <Text style={[styles.label, {color: colors.textPrimary}]}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          maxLength={2000}
          multiline
          placeholder="What is your story about?"
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            styles.multiline,
            {
              borderColor: colors.borderLight,
              backgroundColor: colors.bgElevated,
              color: colors.textPrimary,
            },
          ]}
        />

        <Text style={[styles.label, {color: colors.textPrimary}]}>Status</Text>
        <View style={styles.choiceRow}>
          {(['ongoing', 'completed', 'hiatus'] as StoryStatus[]).map(item => (
            <PrimaryButton
              key={item}
              label={item}
              onPress={() => setStatus(item)}
              kind={status === item ? 'primary' : 'secondary'}
            />
          ))}
        </View>

        <Text style={[styles.label, {color: colors.textPrimary}]}>Privacy</Text>
        <View style={styles.choiceRow}>
          {(['public', 'private'] as StoryPrivacy[]).map(item => (
            <PrimaryButton
              key={item}
              label={item}
              onPress={() => setPrivacy(item)}
              kind={privacy === item ? 'primary' : 'secondary'}
            />
          ))}
        </View>

        <Text style={[styles.label, {color: colors.textPrimary}]}>{`Tags (${tags.length}/10)`}</Text>
        <View style={styles.tagsWrap}>
          {tags.map(tag => (
            <Pressable
              key={tag}
              onPress={() => removeTag(tag)}
              style={[
                styles.tagPill,
                {backgroundColor: colors.bgSecondary, borderColor: colors.borderLight},
              ]}>
              <Text style={[styles.tagText, {color: colors.textPrimary}]}>{`#${tag} ×`}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={tagInput}
          onChangeText={setTagInput}
          onSubmitEditing={() => addTag(tagInput)}
          placeholder="Add tag and press enter"
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            {
              borderColor: colors.borderLight,
              backgroundColor: colors.bgElevated,
              color: colors.textPrimary,
            },
          ]}
        />
        <View style={styles.tagsWrap}>
          {TAG_SUGGESTIONS.filter(tag => !tags.includes(tag))
            .slice(0, 8)
            .map(tag => (
              <Pressable
                key={tag}
                onPress={() => addTag(tag)}
                style={[
                  styles.suggestion,
                  {borderColor: colors.borderLight, backgroundColor: colors.bgElevated},
                ]}>
                <Text style={[styles.suggestionText, {color: colors.textMuted}]}>{`+ ${tag}`}</Text>
              </Pressable>
            ))}
        </View>

        <PrimaryButton
          label={isEdit ? 'Save Story' : 'Create Story'}
          onPress={onSave}
          disabled={!canSave}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.heading.bold,
  },
  label: {
    fontSize: 14,
    fontFamily: fonts.ui.semiBold,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: {
    fontSize: 12,
  },
  suggestion: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  suggestionText: {
    fontSize: 12,
  },
});
