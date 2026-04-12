import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type AccessibilityRole,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {RichEditor} from 'react-native-pell-rich-editor';
import ImageCropPicker, {type Image as CropPickerImage} from 'react-native-image-crop-picker';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {AtmosphereLayer} from '../../components/AtmosphereLayer';
import {EditorToolbar} from '../../components/EditorToolbar';
import {LinkInsertModal} from '../../components/LinkInsertModal';
import {ReadingTimeBar} from '../../components/ReadingTimeBar';
import {SaveIndicator} from '../../components/SaveIndicator';
import {Toast} from '../../components/Toast';
import {
  FireIcon,
  LightbulbIcon,
  LockIcon,
  UnlockIcon,
} from '../../components/icons';
import {useFlowAtmosphere} from '../../hooks/useFlowAtmosphere';
import {mobileApi} from '../../lib/api/mobileApi';
import {htmlToLexicalJson, lexicalToHtml, stripHtmlToPlainText} from '../../lib/content/htmlToLexical';
import {emitGlobalToast} from '../../lib/globalToast';
import {Haptics} from '../../lib/haptics';
import {queryClient} from '../../lib/queryClient';
import {SpringPresets, useSpringEntrance, useSpringPress} from '../../lib/springs';
import type {RootStackParamList} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeProvider';
import {radii, spacing} from '../../theme/spacing';
import {fonts} from '../../theme/typography';

const WRITING_MILESTONES = [100, 250, 500, 1000];
const WORD_COUNT_DEBOUNCE_MS = 120;
const MAX_EDITOR_IMAGE_BATCH = 10;
const IMAGE_INSERT_DELAY_MS = 80;
const FALLBACK_IMAGE_WIDTH = 1200;
const FALLBACK_IMAGE_HEIGHT = 800;
const EXIT_DELAY_MS = 900;
const DOCKED_TOOLBAR_OFFSET = 72;
const EDIT_PUBLISH_INVALIDATION_KEYS: ReadonlyArray<readonly unknown[]> = [
  ['journal'],
  ['profileWritings'],
  ['pinnedJournals'],
  ['visitedPinnedJournals'],
  ['feed'],
  ['feed-following'],
  ['feed-foryou'],
  ['explore-hottest-monthly'],
  ['explore-interests'],
  ['search-journals'],
  ['bookmarks'],
  ['prompt-responses'],
  ['related-posts'],
  ['drafts'],
];

type Props = NativeStackScreenProps<RootStackParamList, 'JournalEditor'>;
type ToastTone = 'success' | 'error' | 'info';

interface EditorToastState {
  id: number;
  message: string;
  type: ToastTone;
  duration: number;
}

interface SpringChipProps {
  children: React.ReactNode;
  onPress: () => void;
  backgroundColor: string;
  pressedBackgroundColor: string;
  borderColor: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
}

function delay(ms: number) {
  return new Promise<void>(resolve => {
    setTimeout(() => resolve(), ms);
  });
}

function isCropPickerCancelled(error: unknown): boolean {
  return !!error
    && typeof error === 'object'
    && 'code' in error
    && (error as {code?: string}).code === 'E_PICKER_CANCELLED';
}

function ensureUploadUri(path: string): string {
  if (Platform.OS === 'ios' && !path.startsWith('file://')) {
    return `file://${path}`;
  }
  return path;
}

function resolveCropFilename(image: CropPickerImage, index: number): string {
  if (image.filename?.trim()) return image.filename;

  const pathSegments = image.path.split(/[\\/]/).filter(Boolean);
  const candidate = pathSegments[pathSegments.length - 1];
  if (candidate) return candidate;

  const extension = image.mime === 'image/png' ? 'png' : 'jpg';
  return `journal-image-${Date.now()}-${index}.${extension}`;
}

function resolveImageDimensions(w: number, h: number) {
  const width = Number.isFinite(w) && w > 0 ? Math.round(w) : FALLBACK_IMAGE_WIDTH;
  const height = Number.isFinite(h) && h > 0 ? Math.round(h) : FALLBACK_IMAGE_HEIGHT;
  return {width, height};
}

function resolvePlaceholderHeight(width: number, height: number) {
  const safeWidth = width > 0 ? width : FALLBACK_IMAGE_WIDTH;
  const safeHeight = height > 0 ? height : FALLBACK_IMAGE_HEIGHT;
  const estimatedHeight = Math.round((safeHeight / safeWidth) * 320);
  return Math.max(140, Math.min(estimatedHeight, 320));
}

function buildPlaceholderImageHtml(args: {width: number; height: number; uploadId: string; accentColor: string; previewUri?: string}) {
  const {width, height} = resolveImageDimensions(args.width, args.height);
  const accent = args.accentColor;
  const placeholderHeight = resolvePlaceholderHeight(width, height);
  const fallbackBg = `background: linear-gradient(135deg, rgba(196,148,62,0.22), rgba(20,20,20,0.14)); animation: iskrib-pulse 2s ease-in-out infinite;`;
  const blurredImage = args.previewUri
    ? `<img src="${args.previewUri}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:blur(20px);-webkit-filter:blur(20px);transform:scale(1.1);" />`
    : '';
  const containerBg = args.previewUri ? '' : fallbackBg;
  return `<div id="${args.uploadId}" style="position: relative; width: 100%; max-width: 100%; margin: 8px 0; border-radius: 10px; overflow: hidden; height: ${placeholderHeight}px; ${containerBg}">` +
    blurredImage +
    `<div style="position: absolute; inset: 0; background: rgba(0,0,0,0.25);"></div>` +
    `<div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;">` +
      `<div style="width: 36px; height: 36px; border: 3px solid transparent; border-top-color: ${accent}; border-right-color: ${accent}; border-radius: 50%; animation: iskrib-spin 0.9s cubic-bezier(0.4,0,0.2,1) infinite; box-shadow: 0 0 12px rgba(196,148,62,0.3);"></div>` +
      `<div style="margin-top: 10px; font-size: 12px; line-height: 16px; color: rgba(255,255,255,0.92); letter-spacing: 0.2px; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">Uploading image…</div>` +
    `</div>` +
    `</div><br/>`;
}

function buildSwapImageScript(args: {uploadId: string; finalUrl: string; width: number; height: number}) {
  const {width, height} = resolveImageDimensions(args.width, args.height);
  return `(function(){` +
    `var el=document.getElementById('${args.uploadId}');` +
    `if(!el)return;` +
    `var img=document.createElement('img');` +
    `img.src='${args.finalUrl}';` +
    `img.alt='';` +
    `img.width=${width};` +
    `img.height=${height};` +
    `img.setAttribute('data-explicit-dimensions','true');` +
    `img.style.cssText='width:100%;max-width:100%;height:auto;border-radius:8px;margin:8px 0;display:block;';` +
    `el.replaceWith(img);` +
    `var ed=document.querySelector('[contenteditable]');` +
    `if(ed)ed.dispatchEvent(new Event('input',{bubbles:true}));` +
    `})()`;
}

function milestoneMessage(milestone: number) {
  switch (milestone) {
    case 100:
      return '100 words. The page is awake.';
    case 250:
      return '250 words. The draft has momentum.';
    case 500:
      return '500 words. Keep the line pressure.';
    case 1000:
      return '1,000 words. You are fully in the work.';
    default:
      return `${milestone} words. Keep going.`;
  }
}

function SpringChip({
  children,
  onPress,
  backgroundColor,
  pressedBackgroundColor,
  borderColor,
  disabled = false,
  style,
  accessibilityLabel,
  accessibilityRole = 'button',
}: SpringChipProps) {
  const {animatedStyle, onPressIn, onPressOut} = useSpringPress(disabled ? 1 : 0.97);

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        disabled={disabled}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({pressed}) => [
          styles.chipBase,
          style,
          {
            backgroundColor: pressed && !disabled ? pressedBackgroundColor : backgroundColor,
            borderColor,
            opacity: disabled ? 0.45 : 1,
          },
        ]}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

export function JournalEditorScreen({navigation, route}: Props) {
  const {promptId, promptText, mode, journalId} = route.params ?? {};
  const isDraftMode = mode === 'draft' && !!journalId;
  const isPublishedEditMode = mode === 'edit' && !!journalId;
  const isExistingJournalMode = (isDraftMode || isPublishedEditMode) && !!journalId;
  const {colors, isDark} = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const {warmth, flowLevel, enabled: atmosphereEnabled, toggleEnabled: toggleAtmosphere, reportTypingEvent} = useFlowAtmosphere();
  const editorRef = useRef<RichEditor>(null);
  const didSaveRef = useRef(false);
  const htmlRef = useRef('');
  const titleRef = useRef('');
  const initialHtmlRef = useRef('');
  const initialTitleRef = useRef('');
  const allowExitRef = useRef(false);
  const lastMilestoneRef = useRef(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wordCountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [title, setTitle] = useState('');
  const [_html, setHtml] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [wordCount, setWordCount] = useState(0);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [initialHtml, setInitialHtml] = useState<string | null>(isExistingJournalMode ? null : '');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('unsaved');
  const [toolbarVisible] = useState(true);
  const [toast, setToast] = useState<EditorToastState | null>(null);
  const [titleFocused, setTitleFocused] = useState(false);
  const [editorFocused, setEditorFocused] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const isPublishingRef = useRef(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const keyboardVisible = keyboardHeight > 0;
  const actionRailEntryStyle = useSpringEntrance(0, 16, 0.98);
  const promptEntryStyle = useSpringEntrance(60, 20, 0.98);
  const titleEntryStyle = useSpringEntrance(110, 18, 0.985);
  const editorEntryStyle = useSpringEntrance(150, 22, 0.99);
  const statusEntryStyle = useSpringEntrance(190, 16, 0.985);

  const titleFocusProgress = useSharedValue(0);
  const editorFocusProgress = useSharedValue(0);

  const showToast = useCallback((message: string, type: ToastTone = 'info', duration = 2200) => {
    setToast({
      id: Date.now() + Math.floor(Math.random() * 1000),
      message,
      type,
      duration,
    });
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const scheduleExit = useCallback((message: string, type: ToastTone = 'success') => {
    showToast(message, type, 2200);
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
    }
    exitTimerRef.current = setTimeout(() => {
      navigation.goBack();
    }, EXIT_DELAY_MS);
  }, [navigation, showToast]);

  const queueSaveIndicator = useCallback(() => {
    setSaveStatus('unsaved');
    if (isPublishedEditMode) {
      return;
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setSaveStatus('saving');
      saveStatusTimerRef.current = setTimeout(() => {
        setSaveStatus('saved');
        Haptics.softTap();
        saveStatusTimerRef.current = null;
      }, 800);
      saveTimerRef.current = null;
    }, 2000);
  }, [isPublishedEditMode]);

  const syncWordCount = useCallback((nextHtml: string, options?: {suppressFeedback?: boolean}) => {
    const plain = stripHtmlToPlainText(nextHtml);
    const words = plain ? plain.split(/\s+/).length : 0;
    setWordCount(words);

    const highestReached = [...WRITING_MILESTONES].reverse().find(milestone => words >= milestone) ?? 0;
    if (options?.suppressFeedback) {
      lastMilestoneRef.current = highestReached;
      return;
    }

    for (const milestone of WRITING_MILESTONES) {
      if (words >= milestone && lastMilestoneRef.current < milestone) {
        lastMilestoneRef.current = milestone;
        Haptics.milestone();
        showToast(milestoneMessage(milestone), 'success', 1800);
        break;
      }
    }
  }, [showToast]);

  const canPublish = useMemo(() => title.trim().length > 0 && wordCount > 0, [title, wordCount]);
  const canSaveDraft = useMemo(() => title.trim().length > 0 || wordCount > 0, [title, wordCount]);
  const publishButtonLabel = isPublishedEditMode
    ? (isPublishing ? 'Updating…' : 'Update')
    : (isPublishing ? 'Publishing…' : 'Publish');
  const publishAccessibilityLabel = isPublishedEditMode ? 'Update post' : 'Publish journal';
  const hasUnsavedChanges = useCallback(() => {
    return (
      titleRef.current.trim() !== initialTitleRef.current.trim()
      || htmlRef.current !== initialHtmlRef.current
    );
  }, []);
  const toastBottomOffset = keyboardVisible
    ? keyboardHeight + (toolbarVisible ? DOCKED_TOOLBAR_OFFSET : spacing.xl)
    : Math.max(insets.bottom, spacing.lg) + spacing.xl;

  useEffect(() => {
    const target = titleFocused ? 1 : 0;
    if (reduceMotion) {
      titleFocusProgress.value = target;
      return;
    }
    titleFocusProgress.value = withSpring(target, SpringPresets.gentle);
  }, [reduceMotion, titleFocusProgress, titleFocused]);

  useEffect(() => {
    const target = editorFocused || keyboardVisible ? 1 : 0;
    if (reduceMotion) {
      editorFocusProgress.value = target;
      return;
    }
    editorFocusProgress.value = withSpring(target, SpringPresets.gentle);
  }, [editorFocusProgress, editorFocused, keyboardVisible, reduceMotion]);

  const titleFocusStyle = useAnimatedStyle(() => ({
    transform: [
      {translateY: -2 * titleFocusProgress.value},
      {scale: 1 + titleFocusProgress.value * 0.008},
    ],
  }));

  const editorFocusStyle = useAnimatedStyle(() => ({
    transform: [
      {translateY: -4 * editorFocusProgress.value},
      {scale: 1 + editorFocusProgress.value * 0.005},
    ],
  }));

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, e => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const draftQuery = useQuery({
    queryKey: ['journal-content', journalId],
    queryFn: () => mobileApi.getJournalContent(journalId!),
    enabled: isExistingJournalMode,
  });

  useEffect(() => {
    if (!draftQuery.data?.journal || initialHtml !== null) return;
    const journal = draftQuery.data.journal;

    setTitle(journal.title || '');
    titleRef.current = journal.title || '';
    const draftHtml = lexicalToHtml(journal.content);
    setInitialHtml(draftHtml || '');
    initialTitleRef.current = journal.title || '';
    initialHtmlRef.current = draftHtml || '';
    setSaveStatus('saved');
    if (draftHtml) {
      setHtml(draftHtml);
      htmlRef.current = draftHtml;
      syncWordCount(draftHtml, {suppressFeedback: true});
    } else {
      setHtml('');
      htmlRef.current = '';
      syncWordCount('', {suppressFeedback: true});
    }
  }, [draftQuery.data, initialHtml, syncWordCount]);

  const handleChange = useCallback((newHtml: string) => {
    setHtml(newHtml);
    htmlRef.current = newHtml;

    // Feed typing events to the atmosphere engine (plain text length, not HTML)
    reportTypingEvent(stripHtmlToPlainText(newHtml).length);

    if (wordCountTimerRef.current) {
      clearTimeout(wordCountTimerRef.current);
    }
    wordCountTimerRef.current = setTimeout(() => {
      syncWordCount(newHtml);
      wordCountTimerRef.current = null;
    }, WORD_COUNT_DEBOUNCE_MS);

    queueSaveIndicator();
  }, [queueSaveIndicator, reportTypingEvent, syncWordCount]);

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    titleRef.current = newTitle;
    queueSaveIndicator();
  }, [queueSaveIndicator]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', event => {
      if (allowExitRef.current) {
        allowExitRef.current = false;
        return;
      }

      editorRef.current?.blurContentEditor();
      Keyboard.dismiss();

      if (didSaveRef.current) return;

      if (isPublishedEditMode) {
        if (!hasUnsavedChanges()) return;

        event.preventDefault();
        Alert.alert(
          'Discard changes?',
          'Leave without updating this post?',
          [
            {text: 'Stay', style: 'cancel'},
            {
              text: 'Discard',
              style: 'destructive',
              onPress: () => {
                allowExitRef.current = true;
                navigation.dispatch(event.data.action);
              },
            },
          ],
        );
        return;
      }

      const currentHtml = htmlRef.current;
      const currentTitle = titleRef.current.trim();
      const hasContent = stripHtmlToPlainText(currentHtml).length > 0;

      if (!currentTitle && !hasContent) return;

      const lexicalContent = htmlToLexicalJson(currentHtml);
      mobileApi.saveDraft({
        title: currentTitle || 'Untitled Draft',
        content: lexicalContent,
        draftId: isDraftMode ? journalId : undefined,
      }).then(() => {
        queryClient.invalidateQueries({queryKey: ['drafts']});
      }).catch(() => {
        Alert.alert(
          'Draft not saved',
          'Your draft may not have been saved. Copy your work before closing the app.',
        );
      });
    });

    return unsubscribe;
  }, [hasUnsavedChanges, isDraftMode, isPublishedEditMode, journalId, navigation]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
      if (wordCountTimerRef.current) clearTimeout(wordCountTimerRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  const richEditorStyle = {
    backgroundColor: 'transparent',
    color: colors.textPrimary,
    caretColor: colors.accentAmber,
    placeholderColor: colors.textMuted,
    contentCSSText: `
      font-size: 16px;
      line-height: 1.7;
      padding-bottom: 120px;
      h1 { font-size: 28px; font-weight: 700; margin: 16px 0 8px; }
      h2 { font-size: 22px; font-weight: 700; margin: 12px 0 6px; }
      h3 { font-size: 18px; font-weight: 700; margin: 8px 0 4px; }
      blockquote { border-left: 3px solid ${colors.accentAmber}; padding-left: 12px; margin: 8px 0; color: ${colors.textSecondary}; font-style: italic; }
      hr { border: none; border-top: 1px solid ${colors.borderLight}; margin: 16px 0; }
      img { max-width: 100%; border-radius: 8px; margin: 8px 0; display: block; }
      a { color: ${colors.accentAmber}; }
      @keyframes iskrib-spin { to { transform: rotate(360deg); } }
      @keyframes iskrib-pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 0.7; } }
    `,
  };

  const insertPlaceholderImage = useCallback(async (args: {width: number; height: number; uploadId: string; accentColor: string; previewUri?: string}) => {
    editorRef.current?.focusContentEditor();
    await delay(IMAGE_INSERT_DELAY_MS);
    editorRef.current?.insertHTML(buildPlaceholderImageHtml(args));
  }, []);

  const swapPlaceholderImage = useCallback((args: {uploadId: string; finalUrl: string; width: number; height: number}) => {
    editorRef.current?.injectJavascript(buildSwapImageScript(args));
  }, []);

  const removePlaceholderImage = useCallback((uploadId: string) => {
    editorRef.current?.injectJavascript(
      `(function(){var el=document.getElementById('${uploadId}');if(el){el.nextElementSibling&&el.nextElementSibling.tagName==='BR'&&el.nextElementSibling.remove();el.remove();}` +
      `var ed=document.querySelector('[contenteditable]');if(ed)ed.dispatchEvent(new Event('input',{bubbles:true}));})()`,
    );
  }, []);

  const handleImageInsert = useCallback(async () => {
    if (imageUploading) return;

    setImageUploading(true);
    try {
      const picked = await ImageCropPicker.openPicker({
        mediaType: 'photo',
        multiple: true,
        maxFiles: MAX_EDITOR_IMAGE_BATCH,
        forceJpg: true,
        compressImageQuality: 0.8,
      });
      const assets = Array.isArray(picked) ? picked : [picked];
      if (assets.length === 0) return;

      let insertedCount = 0;

      for (let index = 0; index < assets.length; index += 1) {
        let editedAsset: CropPickerImage;
        try {
          editedAsset = await ImageCropPicker.openCropper({
            path: assets[index].path,
            mediaType: 'photo',
            freeStyleCropEnabled: true,
            enableRotationGesture: true,
            cropperRotateButtonsHidden: false,
            cropperToolbarTitle: 'Edit Photo',
            cropperChooseText: 'Insert',
            cropperCancelText: 'Cancel',
            cropperChooseColor: colors.accentAmber,
            cropperCancelColor: colors.textMuted,
            cropperToolbarColor: colors.bgElevated,
            cropperToolbarWidgetColor: colors.textPrimary,
            cropperActiveWidgetColor: colors.accentAmber,
            cropperStatusBarLight: !isDark,
            cropperNavigationBarLight: !isDark,
            showCropGuidelines: true,
            showCropFrame: true,
            hideBottomControls: false,
            avoidEmptySpaceAroundImage: true,
            forceJpg: true,
            compressImageQuality: 0.8,
            includeBase64: true,
          });
        } catch (error) {
          if (isCropPickerCancelled(error)) {
            break;
          }
          throw error;
        }

        const uploadId = `img-upload-${Date.now()}-${index}`;
        const previewUri = editedAsset.data
          ? `data:image/jpeg;base64,${editedAsset.data}`
          : undefined;

        await insertPlaceholderImage({
          width: editedAsset.width,
          height: editedAsset.height,
          uploadId,
          accentColor: colors.accentAmber,
          previewUri,
        });

        try {
          const {img_url} = await mobileApi.saveJournalImage({
            uri: ensureUploadUri(editedAsset.path),
            type: editedAsset.mime || 'image/jpeg',
            name: resolveCropFilename(editedAsset, index),
          });

          swapPlaceholderImage({
            uploadId,
            finalUrl: img_url,
            width: editedAsset.width,
            height: editedAsset.height,
          });
          insertedCount += 1;
        } catch (uploadError) {
          removePlaceholderImage(uploadId);
          throw uploadError;
        }
      }

      if (insertedCount > 0) {
        showToast(
          insertedCount === 1 ? 'Image inserted.' : `${insertedCount} images inserted.`,
          'info',
          1700,
        );
      }
    } catch (e) {
      if (isCropPickerCancelled(e)) {
        return;
      }
      Haptics.error();
      Alert.alert('Image upload failed', e instanceof Error ? e.message : 'Could not upload image');
    } finally {
      setImageUploading(false);
    }
  }, [
    colors.accentAmber,
    colors.bgElevated,
    colors.textMuted,
    colors.textPrimary,
    imageUploading,
    insertPlaceholderImage,
    isDark,
    removePlaceholderImage,
    showToast,
    swapPlaceholderImage,
  ]);

  const handleLinkInsert = useCallback((linkTitle: string, url: string) => {
    editorRef.current?.insertLink(linkTitle, url);
    editorRef.current?.focusContentEditor();
    showToast('Link inserted.', 'info', 1500);
  }, [showToast]);

  const invalidateEditedJournalQueries = useCallback(async () => {
    await Promise.all(
      EDIT_PUBLISH_INVALIDATION_KEYS.map(queryKey =>
        queryClient.invalidateQueries({queryKey}),
      ),
    );
  }, []);

  const publishJournal = useCallback(() => {
    if (isPublishingRef.current) return;
    isPublishingRef.current = true;
    setIsPublishing(true);

    const lexicalContent = htmlToLexicalJson(htmlRef.current);
    const capturedTitle = titleRef.current.trim();
    const capturedPrivacy = privacy;
    const capturedPromptId = promptId;

    const runPublish = async () => {
      try {
        if (isPublishedEditMode && journalId) {
          await mobileApi.updateJournal({
            journalId,
            title: capturedTitle,
            lexicalContent,
          });
          didSaveRef.current = true;
          setSaveStatus('saved');
          initialTitleRef.current = capturedTitle;
          initialHtmlRef.current = htmlRef.current;
          await invalidateEditedJournalQueries();
          Haptics.success();
          scheduleExit('Post updated.');
          return;
        }

        didSaveRef.current = true;
        navigation.goBack();

        if (isDraftMode && journalId) {
          await mobileApi.saveDraft({
            title: capturedTitle,
            content: lexicalContent,
            draftId: journalId,
          });
          await mobileApi.publishDraft(journalId);

          queryClient.setQueryData<{data: any[]}>(['drafts'], old => {
            if (!old?.data) return old;
            return {...old, data: old.data.filter((draft: any) => draft.id !== journalId)};
          });
        } else {
          await mobileApi.saveJournal({
            title: capturedTitle,
            lexicalContent,
            privacy: capturedPrivacy,
            promptId: capturedPromptId,
          });
        }

        queryClient.invalidateQueries({queryKey: ['feed']});
        queryClient.invalidateQueries({queryKey: ['drafts']});
        Haptics.success();
        emitGlobalToast(
          isDraftMode ? 'Draft published.' : 'Journal published.',
          'success',
        );
      } catch (error) {
        setSaveStatus('error');
        Haptics.error();
        emitGlobalToast(
          error instanceof Error
            ? error.message
            : isPublishedEditMode
              ? 'Update failed'
              : 'Publish failed',
          'error',
        );
      } finally {
        isPublishingRef.current = false;
        setIsPublishing(false);
      }
    };

    runPublish();
  }, [invalidateEditedJournalQueries, isDraftMode, isPublishedEditMode, journalId, navigation, privacy, promptId, scheduleExit]);

  const handleSaveDraft = useCallback(() => {
    if (isSavingDraft || isPublishedEditMode) return;

    setIsSavingDraft(true);
    setSaveStatus('saving');
    const lexicalContent = htmlToLexicalJson(htmlRef.current);

    mobileApi.saveDraft({
      title: titleRef.current.trim() || 'Untitled Draft',
      content: lexicalContent,
      draftId: isDraftMode ? journalId : undefined,
    }).then(() => {
      didSaveRef.current = true;
      setSaveStatus('saved');
      Haptics.success();
      queryClient.invalidateQueries({queryKey: ['drafts']});
      scheduleExit('Draft saved.');
    }).catch(error => {
      setSaveStatus('error');
      Haptics.error();
      Alert.alert('Save failed', error instanceof Error ? error.message : 'Failed to save draft');
    }).finally(() => {
      setIsSavingDraft(false);
    });
  }, [isDraftMode, isPublishedEditMode, isSavingDraft, journalId, scheduleExit]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: '',
      headerRight: () => null,
      headerShadowVisible: false,
      headerStyle: {backgroundColor: colors.bgPrimary},
    });
  }, [colors.bgPrimary, navigation]);

  if (initialHtml === null) {
    return (
      <SafeAreaView style={[styles.safe, {backgroundColor: colors.bgPrimary}]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.accentAmber} size="small" />
          <Text style={[styles.loadingTitle, {color: colors.textHeading}]}>
            {isPublishedEditMode ? 'Loading post' : 'Loading draft'}
          </Text>
          <Text style={[styles.loadingText, {color: colors.textMuted}]}>
            {isPublishedEditMode
              ? 'Bringing the published version back into focus.'
              : 'Bringing the last version back into focus.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safe, {backgroundColor: atmosphereEnabled ? 'transparent' : colors.bgPrimary}]}
      edges={['top', 'left', 'right']}>
      <AtmosphereLayer warmth={warmth} flowLevel={flowLevel} enabled={atmosphereEnabled} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
        enabled={Platform.OS === 'ios'}>
        <View style={styles.flex}>
          <View style={styles.flex}>
            <Animated.View style={[styles.headerBar, actionRailEntryStyle]}>
              <SaveIndicator status={saveStatus} />
              {keyboardVisible && wordCount > 0 ? (
                <Text style={[styles.compactWordCount, {color: colors.textMuted}]}>
                  {wordCount} words · {wordCount < 200 ? '< 1' : Math.round(wordCount / 200)} min
                </Text>
              ) : null}
              <View style={styles.flex} />
              {!isPublishedEditMode ? (
                <Pressable
                  onPress={() => {
                    setPrivacy(current => current === 'public' ? 'private' : 'public');
                    Haptics.selection();
                  }}
                  style={styles.headerIconBtn}
                  accessibilityLabel={`Toggle privacy, currently ${privacy}`}>
                  {privacy === 'private'
                    ? <LockIcon size={18} color={colors.accentAmber} />
                    : <UnlockIcon size={18} color={colors.textMuted} />}
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => {
                  Haptics.tap();
                  toggleAtmosphere();
                }}
                style={styles.headerIconBtn}
                accessibilityLabel={`Toggle writing atmosphere, currently ${atmosphereEnabled ? 'on' : 'off'}`}
                accessibilityHint="When enabled, the editor background subtly changes as you write">
                <FireIcon size={18} color={atmosphereEnabled ? colors.accentGold : colors.textMuted} />
              </Pressable>
              {!isPublishedEditMode ? (
                <Pressable
                  onPress={() => {
                    Haptics.tap();
                    handleSaveDraft();
                  }}
                  disabled={!canSaveDraft || isSavingDraft}
                  style={styles.headerTextBtn}
                  accessibilityLabel="Save draft">
                  <Text
                    style={[
                      styles.saveDraftLink,
                      {color: canSaveDraft && !isSavingDraft ? colors.textSecondary : colors.textFaint},
                    ]}>
                    {isSavingDraft ? 'Saving…' : 'Save'}
                  </Text>
                </Pressable>
              ) : null}
              <SpringChip
                onPress={() => {
                  Haptics.tap();
                  publishJournal();
                }}
                disabled={!canPublish || isPublishing}
                backgroundColor={canPublish ? colors.accentAmber : colors.bgSecondary}
                pressedBackgroundColor={colors.accentGold}
                borderColor="transparent"
                accessibilityLabel={publishAccessibilityLabel}>
                <Text
                  style={[
                    styles.publishBtnText,
                    {color: canPublish ? colors.textOnAccent : colors.textFaint},
                  ]}>
                  {publishButtonLabel}
                </Text>
              </SpringChip>
            </Animated.View>

            {!keyboardVisible && promptText ? (
              <Animated.View
                style={[
                  styles.promptStrip,
                  {backgroundColor: colors.bgSecondary},
                  promptEntryStyle,
                ]}>
                <LightbulbIcon size={14} color={colors.textMuted} />
                <Text style={[styles.promptText, {color: colors.textSecondary}]}>
                  {promptText}
                </Text>
              </Animated.View>
            ) : null}

            <View style={[styles.writingSurface, {backgroundColor: atmosphereEnabled ? 'transparent' : colors.bgElevated}]}>
              <Animated.View style={[styles.titleArea, titleEntryStyle, titleFocusStyle]}>
                <TextInput
                  placeholder="Untitled"
                  placeholderTextColor={colors.textFaint}
                  value={title}
                  onChangeText={handleTitleChange}
                  onFocus={() => setTitleFocused(true)}
                  onBlur={() => setTitleFocused(false)}
                  style={[styles.titleInput, {color: colors.textHeading}]}
                />
              </Animated.View>

              <View style={[styles.dividerRow, {borderBottomColor: colors.borderLight}]}>
                <View style={styles.flex} />
                <Text style={[styles.ghostWordCount, {color: colors.textFaint}]}>
                  {wordCount > 0 ? `${wordCount} words` : ''}
                </Text>
              </View>

              <Animated.View style={[styles.editorArea, editorEntryStyle, editorFocusStyle]}>
                <RichEditor
                  ref={editorRef}
                  initialContentHTML={initialHtml}
                  style={styles.flex}
                  placeholder="Begin writing..."
                  onChange={handleChange}
                  onFocus={() => setEditorFocused(true)}
                  onBlur={() => {
                    setEditorFocused(false);
                    setKeyboardHeight(0);
                  }}
                  editorStyle={richEditorStyle}
                  useContainer={false}
                />
              </Animated.View>
            </View>

            {!keyboardVisible ? (
              <Animated.View style={[styles.bottomStrip, statusEntryStyle]}>
                <ReadingTimeBar wordCount={wordCount} />
              </Animated.View>
            ) : null}
          </View>

          <EditorToolbar
            visible={toolbarVisible}
            editorRef={editorRef}
            onPressImage={handleImageInsert}
            onPressLink={() => {
              Haptics.tap();
              setShowLinkModal(true);
            }}
            docked={keyboardVisible}
          />

          {!keyboardVisible ? <View style={{height: insets.bottom}} /> : null}
          {Platform.OS === 'android' && keyboardVisible ? (
            <View style={{height: keyboardHeight + insets.bottom}} />
          ) : null}
        </View>
      </KeyboardAvoidingView>

      <LinkInsertModal
        visible={showLinkModal}
        onDismiss={() => setShowLinkModal(false)}
        onInsert={handleLinkInsert}
      />

      {toast ? (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          visible
          bottomOffset={toastBottomOffset}
          onDismiss={dismissToast}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  chipBase: {
    minHeight: 36,
    borderRadius: radii.md,
    borderWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },

  // --- Loading ---
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  loadingTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: fonts.heading.bold,
  },
  loadingText: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    fontFamily: fonts.ui.regular,
  },

  // --- Header Bar ---
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  saveDraftLink: {
    fontFamily: fonts.ui.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  compactWordCount: {
    fontFamily: fonts.ui.regular,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  publishBtnText: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.3,
  },

  // --- Prompt Strip ---
  promptStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  promptText: {
    flex: 1,
    fontFamily: fonts.serif.italic,
    fontSize: 14,
    lineHeight: 22,
  },

  // --- Writing Surface ---
  writingSurface: {
    flex: 1,
    borderTopLeftRadius: radii.xxxl,
    borderTopRightRadius: radii.xxxl,
    overflow: 'hidden',
  },
  titleArea: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.sm,
  },
  titleInput: {
    fontSize: 28,
    lineHeight: 36,
    fontFamily: fonts.heading.bold,
    paddingVertical: 0,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.xxl,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  ghostWordCount: {
    fontFamily: fonts.ui.regular,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.3,
  },
  editorArea: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },

  // --- Bottom Strip ---
  bottomStrip: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
});
