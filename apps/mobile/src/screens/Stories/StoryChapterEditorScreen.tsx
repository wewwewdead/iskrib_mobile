import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Alert, StyleSheet, Text, TextInput} from 'react-native';
import {useMutation, useQuery} from '@tanstack/react-query';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {actions, RichEditor, RichToolbar} from 'react-native-pell-rich-editor';
import {Screen} from '../../components/Screen';
import {PrimaryButton} from '../../components/PrimaryButton';
import {storyApi} from '../../lib/api/storyApi';
import {
  extractPlainTextFromLexical,
  stripHtml,
  toLexicalFromPlainText,
} from '../../lib/content/lexical';
import {queryClient} from '../../lib/queryClient';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts} from '../../theme/typography';
import type {RootStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'StoryChapterEditor'>;

export function StoryChapterEditorScreen({route, navigation}: Props) {
  const {colors} = useTheme();
  const {storyId, chapterId} = route.params;
  const editorRef = useRef<RichEditor>(null);

  const richEditorStyle = {
    backgroundColor: colors.bgElevated,
    color: colors.textPrimary,
    caretColor: colors.accentAmber,
    contentCSSText: 'font-size: 16px; line-height: 1.5;',
  };

  const chapterQuery = useQuery({
    queryKey: ['story-chapter', storyId, chapterId],
    queryFn: () => storyApi.getChapter(storyId, chapterId),
  });

  const [chapterTitle, setChapterTitle] = useState('');
  const [html, setHtml] = useState('');

  useEffect(() => {
    if (chapterQuery.data) {
      setChapterTitle(chapterQuery.data.title || '');
      const text = extractPlainTextFromLexical(chapterQuery.data.content);
      setHtml(text);
      editorRef.current?.setContentHTML(text);
    }
  }, [chapterQuery.data]);

  const canSave = useMemo(
    () => chapterTitle.trim().length > 0 && stripHtml(html).length > 0,
    [chapterTitle, html],
  );

  const updateMutation = useMutation({
    mutationFn: (status?: string) =>
      storyApi.updateChapter(storyId, chapterId, {
        title: chapterTitle.trim() || 'Untitled Chapter',
        content: toLexicalFromPlainText(stripHtml(html)),
        status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['story', storyId]});
      queryClient.invalidateQueries({queryKey: ['story-chapter', storyId, chapterId]});
    },
    onError: error => {
      Alert.alert(
        'Save failed',
        error instanceof Error ? error.message : 'Unknown error',
      );
    },
  });

  const onSave = () => {
    updateMutation.mutate(undefined, {
      onSuccess: () => Alert.alert('Saved', 'Chapter saved.'),
    });
  };

  const onPublish = () => {
    updateMutation.mutate('published', {
      onSuccess: () => {
        Alert.alert('Published', 'Chapter published.');
        navigation.goBack();
      },
    });
  };

  return (
    <Screen>
      <Text style={[styles.title, {color: colors.textPrimary}]}>Edit Chapter</Text>
      <TextInput
        value={chapterTitle}
        onChangeText={setChapterTitle}
        placeholder="Chapter title"
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

      <RichEditor
        ref={editorRef}
        style={[
          styles.editor,
          {borderColor: colors.borderLight, backgroundColor: colors.bgElevated},
        ]}
        placeholder="Start writing your chapter..."
        initialHeight={260}
        onChange={setHtml}
        editorStyle={richEditorStyle}
      />
      <RichToolbar
        editor={editorRef}
        actions={[
          actions.setBold,
          actions.setItalic,
          actions.setUnderline,
          actions.insertBulletsList,
          actions.insertOrderedList,
        ]}
        selectedIconTint={colors.accentAmber}
        iconTint={colors.textMuted}
        style={[
          styles.toolbar,
          {borderColor: colors.borderLight, backgroundColor: colors.bgSecondary},
        ]}
      />

      <PrimaryButton
        label="Save Draft"
        onPress={onSave}
        loading={updateMutation.isPending}
        disabled={!canSave}
      />
      <PrimaryButton
        label="Publish"
        onPress={onPublish}
        kind="secondary"
        loading={updateMutation.isPending}
        disabled={!canSave}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontFamily: fonts.heading.bold,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  editor: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 260,
  },
  toolbar: {
    borderRadius: 10,
    borderWidth: 1,
  },
});
