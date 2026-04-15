/**
 * PeekModal — hold-to-peek reading modal.
 *
 * Renders the full post body without pushing a navigation stack. Feed
 * scroll position stays intact beneath. "Open full →" is the commit path
 * to PostDetailScreen; everything else dismisses and returns to the feed.
 *
 * Animation: RN <Modal animationType="none"> + Reanimated-driven opacity
 * and scale via useSpringEntry('gentle', 0.96). This avoids the known
 * double-animate issue where RN Modal's fade fights a Reanimated spring
 * on Android (see office hours Feasibility Risk #2).
 *
 * Content resolution (in order):
 *   1. If post.content is populated, render directly. Zero network.
 *   2. Else fetch via getJournalContent(id) keyed by user.id + post.id.
 *      Show skeleton while loading.
 *   3. If fetch fails OR returns empty content, fall back to post.preview_text
 *      plus an "Open full →" CTA.
 *
 * Repost handling: if post.is_repost, read content from post.repost_source
 * (the original post body), not the repost caption.
 */
import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import {useMutation, useQuery} from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Avatar} from '../Avatar';
import {NetworkImage} from '../NetworkImage';
import {XIcon} from '../icons';
import {LexicalRenderer} from '../../lib/content/LexicalRenderer';
import {useAuth} from '../../features/auth/AuthProvider';
import {SpringPresets} from '../../lib/springs';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts, typeScale} from '../../theme/typography';
import {spacing, radii, shadows} from '../../theme/spacing';
import {mobileApi, type JournalItem} from '../../lib/api/mobileApi';
import type {PeekSourceRect} from '../../hooks/usePeekModal';

interface PeekModalProps {
  post: JournalItem | null;
  /**
   * Window-coordinate rectangle of the PostCard that triggered the peek.
   * When provided, the entry animation uses a FLIP transition anchored
   * on the source card's center — the modal starts smaller and positioned
   * over the card, then springs out to its natural centered position.
   *
   * When absent (e.g., VoiceOver rotor action with no press location),
   * the entry falls back to the default layered animation.
   */
  sourceRect?: PeekSourceRect | null;
  onClose: () => void;
  onOpenFull: (id: string) => void;
}

// FLIP mode initial values. Uniform scale so content proportions aren't
// distorted — the peek modal is ~3.5x taller than a typical feed card,
// a non-uniform scale would squish content vertically during the entry.
const FLIP_INITIAL_SCALE = 0.4;

// Fallback mode initial values (when no sourceRect is provided).
const FALLBACK_INITIAL_SCALE = 0.93;
const FALLBACK_INITIAL_TRANSLATE_Y = 14;

/**
 * Returns the post whose content should render inside peek. For a repost,
 * that's the source post; otherwise, the post itself.
 */
function resolveTargetPost(post: JournalItem): JournalItem {
  if (post.is_repost && post.repost_source) {
    return post.repost_source;
  }
  return post;
}

/**
 * A post needs a fallback fetch if its content is null, empty, or
 * whitespace-only.
 */
function needsFetch(post: JournalItem): boolean {
  return !post.content || post.content.trim() === '';
}

function safeSentryBreadcrumb(message: string, data?: Record<string, unknown>) {
  try {
    Sentry.addBreadcrumb({
      category: 'peek',
      message,
      level: 'warning',
      data,
    });
  } catch {
    // Sentry may not be initialized yet (cold-start race). Swallow.
  }
}

export function PeekModal({
  post,
  sourceRect,
  onClose,
  onOpenFull,
}: PeekModalProps) {
  const {colors, isDark} = useTheme();
  const {user} = useAuth();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const {width: screenW, height: screenH} = useWindowDimensions();

  const visible = post !== null;
  const targetPost = post ? resolveTargetPost(post) : null;
  const shouldFetch = !!targetPost && needsFetch(targetPost);

  // react-query owns the fetch. Keying by user.id prevents cross-account
  // cache leakage. Keying by post.id makes the fetch race safe — a new
  // peek with a different post id discards the old query automatically.
  const contentQuery = useQuery({
    queryKey: ['journal', targetPost?.id, user?.id],
    queryFn: async () => {
      if (!targetPost) {
        throw new Error('No target post for peek content fetch');
      }
      return mobileApi.getJournalById(targetPost.id, user?.id);
    },
    enabled: shouldFetch,
    staleTime: 60 * 1000, // 1 minute — peek twice within a minute reuses cache
  });

  // Fire addViews once per peek-open. Mirrors PostDetailScreen so peek
  // counts as real engagement. Server dedupes (response has `counted`),
  // so peek→open-full won't double-count.
  const viewMutation = useMutation({
    mutationFn: (journalId: string) => mobileApi.addViews(journalId),
  });
  const viewedPostIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!visible || !targetPost) {
      viewedPostIdRef.current = null;
      return;
    }
    if (viewedPostIdRef.current === targetPost.id) {
      return;
    }
    viewedPostIdRef.current = targetPost.id;
    viewMutation.mutate(targetPost.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, targetPost?.id]);

  // Log fetch errors to Sentry as breadcrumbs. This happens inside the
  // component body so it fires on every render where the query is in
  // error state — we rely on Sentry's own dedup for breadcrumb spam.
  if (contentQuery.isError && targetPost) {
    safeSentryBreadcrumb('peek fetch error, falling back to preview_text', {
      postId: targetPost.id,
      error: String(contentQuery.error),
    });
  }

  // Entry animation — three layered motions for a premium feel, with an
  // optional FLIP (First-Last-Invert-Play) mode when a sourceRect is
  // provided. The FLIP makes the modal appear to "grow from the card
  // the user pressed" rather than from an abstract screen-centered
  // starting position.
  //
  //   LAYER 1 — Backdrop (the veil)
  //     opacity 0 → 1 via withTiming(250ms, easeOut cubic). Timing (not
  //     spring) because a backdrop is conceptually a state change, not
  //     a physical object. Finishes first so the stage is set.
  //
  //   LAYER 2 — Card wrapper (the physical surface)
  //     FLIP mode (sourceRect present):
  //       scale       FLIP_INITIAL_SCALE → 1.00  (anchored growth)
  //       translateX  (sourceCX - screenCX) → 0  (aligns with card)
  //       translateY  (sourceCY - screenCY) → 0
  //       opacity     0 → 1
  //     Fallback mode (no sourceRect):
  //       scale       FALLBACK_INITIAL_SCALE → 1.00  (subtle settle)
  //       translateX  0 → 0                          (no horizontal move)
  //       translateY  FALLBACK_INITIAL_TRANSLATE_Y → 0
  //       opacity     0 → 1
  //     All via SpringPresets.gentle, all starting at t=0.
  //
  //   LAYER 3 — Content stagger (the "internal life")
  //     opacity    0 → 1
  //     translateY 6 → 0
  //     Both via SpringPresets.gentle with an 80ms delay, so the content
  //     reveals just after the card lands. Same in both modes.
  //
  // Reduce-motion short-circuits every layer to final values. Haptic
  // still fires (from usePeekModal.openPeek, unaffected by reduce-motion).

  // Compute FLIP start position. Memoized on sourceRect (+ screen size
  // for rotation). If sourceRect is null/undefined, returns fallback
  // start values.
  const initialTransform = React.useMemo(() => {
    if (!sourceRect) {
      return {
        scale: FALLBACK_INITIAL_SCALE,
        translateX: 0,
        translateY: FALLBACK_INITIAL_TRANSLATE_Y,
      };
    }
    const sourceCenterX = sourceRect.x + sourceRect.width / 2;
    const sourceCenterY = sourceRect.y + sourceRect.height / 2;
    return {
      scale: FLIP_INITIAL_SCALE,
      translateX: sourceCenterX - screenW / 2,
      translateY: sourceCenterY - screenH / 2,
    };
  }, [sourceRect, screenW, screenH]);

  const backdropOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const scale = useSharedValue(reduceMotion ? 1 : initialTransform.scale);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const translateX = useSharedValue(
    reduceMotion ? 0 : initialTransform.translateX,
  );
  const translateY = useSharedValue(
    reduceMotion ? 0 : initialTransform.translateY,
  );
  const contentOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const contentTranslateY = useSharedValue(reduceMotion ? 0 : 6);

  React.useEffect(() => {
    if (!visible) {
      // Reset to the next open's starting position. The next open may
      // have a different sourceRect, so initialTransform could have
      // recalculated — using its current value keeps this in sync.
      backdropOpacity.value = reduceMotion ? 1 : 0;
      scale.value = reduceMotion ? 1 : initialTransform.scale;
      opacity.value = reduceMotion ? 1 : 0;
      translateX.value = reduceMotion ? 0 : initialTransform.translateX;
      translateY.value = reduceMotion ? 0 : initialTransform.translateY;
      contentOpacity.value = reduceMotion ? 1 : 0;
      contentTranslateY.value = reduceMotion ? 0 : 6;
      return;
    }
    if (reduceMotion) {
      backdropOpacity.value = 1;
      scale.value = 1;
      opacity.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      contentOpacity.value = 1;
      contentTranslateY.value = 0;
      return;
    }
    // Snap shared values to the FLIP start position FIRST (instant),
    // then kick off the spring. This guarantees the spring interpolates
    // from the current sourceRect's starting position, not whatever the
    // shared value happened to be from a previous render.
    scale.value = initialTransform.scale;
    translateX.value = initialTransform.translateX;
    translateY.value = initialTransform.translateY;
    opacity.value = 0;
    contentOpacity.value = 0;
    contentTranslateY.value = 6;

    // Layer 1 — backdrop
    backdropOpacity.value = withTiming(1, {
      duration: 250,
      easing: Easing.out(Easing.cubic),
    });
    // Layer 2 — card wrapper
    scale.value = withSpring(1, SpringPresets.gentle);
    opacity.value = withSpring(1, SpringPresets.gentle);
    translateX.value = withSpring(0, SpringPresets.gentle);
    translateY.value = withSpring(0, SpringPresets.gentle);
    // Layer 3 — content stagger (80ms delay)
    contentOpacity.value = withDelay(
      80,
      withSpring(1, SpringPresets.gentle),
    );
    contentTranslateY.value = withDelay(
      80,
      withSpring(0, SpringPresets.gentle),
    );
  }, [
    visible,
    reduceMotion,
    initialTransform,
    backdropOpacity,
    scale,
    opacity,
    translateX,
    translateY,
    contentOpacity,
    contentTranslateY,
  ]);

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const animatedSurfaceStyle = useAnimatedStyle(() => ({
    transform: [
      {translateX: translateX.value},
      {translateY: translateY.value},
      {scale: scale.value},
    ],
    opacity: opacity.value,
  }));

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{translateY: contentTranslateY.value}],
  }));

  if (!post || !targetPost) {
    return null;
  }

  // Backdrop opacity is darker in dark mode to maintain perceptual contrast
  // over the dark bgPrimary.
  const backdropBg = isDark ? 'rgba(0,0,0,0.70)' : 'rgba(0,0,0,0.55)';

  // Resolve content source. If content is populated, use it. If not,
  // use the fetched content. If neither, fall back to preview_text.
  const fetchedContent = contentQuery.data?.journal?.content;
  const resolvedContent =
    targetPost.content && targetPost.content.trim() !== ''
      ? targetPost.content
      : fetchedContent && fetchedContent.trim() !== ''
      ? fetchedContent
      : null;

  const isFetching = shouldFetch && contentQuery.isFetching && !resolvedContent;
  const isError = shouldFetch && contentQuery.isError && !resolvedContent;
  const fetchSucceededButEmpty =
    shouldFetch &&
    contentQuery.isSuccess &&
    !resolvedContent;
  const showFallback = isError || fetchSucceededButEmpty;

  const title = targetPost.title || 'Untitled post';
  const previewText = targetPost.preview_text || '';
  const authorName = targetPost.users?.name || 'Unknown author';
  const authorAvatar = targetPost.users?.image_url;
  const bannerImage = targetPost.thumbnail_url || targetPost.images?.[0] || null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}>
      {/* Backdrop — layer 1 of the entry animation. Opacity springs via
          withTiming so the veil reads as a state change, not a moving
          object. The Pressable inside fills the Animated.View and owns
          the dismiss gesture. */}
      <Animated.View
        style={[
          styles.backdrop,
          {backgroundColor: backdropBg},
          animatedBackdropStyle,
        ]}>
        <Pressable
          testID="peek-backdrop"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
      </Animated.View>

      {/* Animated surface (contains header + body) */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.surfaceWrap,
          {paddingTop: insets.top + spacing.md},
          animatedSurfaceStyle,
        ]}>
        <View
          style={[
            styles.surface,
            {
              backgroundColor: colors.bgElevated,
              borderColor: colors.borderCard,
            },
            shadows(colors).modal,
          ]}
          accessibilityViewIsModal
          importantForAccessibility="yes">
          {/* Header bar — deliberately subdued so title dominates attention */}
          <View style={styles.header}>
            <Pressable
              testID="peek-close"
              onPress={onClose}
              hitSlop={12}
              accessibilityLabel="Close peek"
              accessibilityRole="button">
              <XIcon size={20} color={colors.textSecondary} />
            </Pressable>
            <Pressable
              testID="peek-open-full"
              onPress={() => onOpenFull(post.id)}
              hitSlop={8}
              accessibilityLabel="Open full post with comments"
              accessibilityRole="button">
              <Text style={[styles.openFull, {color: colors.accentGold}]}>
                Open full →
              </Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}>
            {/* Layer 3 — content stagger. Wraps every child of the scroll
                area so the author chip, title, hero, and body all reveal
                together, ~80ms after the card surface lands. */}
            <Animated.View style={[styles.contentStack, animatedContentStyle]}>
            {/* Author chip */}
            <View style={styles.authorRow}>
              <Avatar uri={authorAvatar} name={authorName} size={24} />
              <Text
                style={[styles.authorName, {color: colors.textSecondary}]}
                numberOfLines={1}>
                {authorName}
              </Text>
            </View>

            {/* Title */}
            <Text
              style={[styles.title, {color: colors.textHeading}]}
              accessibilityRole="header">
              {title}
            </Text>

            {/* Hero image */}
            {bannerImage ? (
              <NetworkImage
                uri={bannerImage}
                accessibilityLabel={`${title} banner image`}
                style={styles.hero}
                resizeMode="cover"
              />
            ) : null}

            {/* Body content — resolved from populated, fetched, or fallback */}
            {resolvedContent ? (
              <View testID="peek-body-content">
                <LexicalRenderer content={resolvedContent} />
              </View>
            ) : isFetching ? (
              <View testID="peek-skeleton" style={styles.skeleton}>
                <View
                  style={[
                    styles.skeletonLine,
                    {backgroundColor: colors.bgSecondary},
                  ]}
                />
                <View
                  style={[
                    styles.skeletonLine,
                    styles.skeletonLineShort,
                    {backgroundColor: colors.bgSecondary},
                  ]}
                />
                <View
                  style={[
                    styles.skeletonLine,
                    {backgroundColor: colors.bgSecondary},
                  ]}
                />
              </View>
            ) : showFallback ? (
              <View testID="peek-fallback">
                {previewText ? (
                  <Text
                    style={[styles.previewFallback, {color: colors.textPrimary}]}>
                    {previewText}
                  </Text>
                ) : (
                  <Text
                    style={[styles.previewFallback, {color: colors.textMuted}]}>
                    Couldn’t load this post. Tap “Open full →” to read it in
                    full.
                  </Text>
                )}
              </View>
            ) : null}
            </Animated.View>
          </ScrollView>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  surfaceWrap: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  surface: {
    flex: 1,
    borderRadius: radii.hero,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  openFull: {
    fontFamily: fonts.ui.semiBold,
    fontSize: typeScale.button.fontSize,
    lineHeight: typeScale.button.lineHeight,
    letterSpacing: 0.3,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  contentStack: {
    gap: spacing.md,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  authorName: {
    fontFamily: fonts.ui.medium,
    fontSize: typeScale.ui.fontSize,
    lineHeight: typeScale.ui.lineHeight,
    flexShrink: 1,
  },
  title: {
    fontFamily: fonts.heading.semiBold,
    fontSize: typeScale.h2.fontSize,
    lineHeight: typeScale.h2.lineHeight,
  },
  hero: {
    width: '100%',
    height: 180,
    borderRadius: radii.md,
  },
  skeleton: {
    gap: spacing.sm,
  },
  skeletonLine: {
    height: 14,
    borderRadius: radii.xs,
  },
  skeletonLineShort: {
    width: '75%',
  },
  previewFallback: {
    fontFamily: fonts.serif?.regular ?? fonts.ui.regular,
    fontSize: typeScale.body.fontSize,
    lineHeight: typeScale.body.lineHeight,
  },
});
