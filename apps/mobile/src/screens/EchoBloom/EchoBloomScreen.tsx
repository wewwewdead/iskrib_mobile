import React, {useCallback, useEffect, useMemo} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated from 'react-native-reanimated';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {BloomCenter} from '../../components/EchoBloom/BloomCenter';
import {
  EchoCard,
  type EchoCardKind,
} from '../../components/EchoBloom/EchoCard';
import {useEchoBloomData} from '../../hooks/useEchoBloomData';
import {useEchoesSummary} from '../../hooks/useEchoesSummary';
import {useAuth} from '../../features/auth/AuthProvider';
import {Haptics} from '../../lib/haptics';
import {logBloomEvent} from '../../lib/echoBloom';
import {markBloomSeen} from '../../lib/echoBloomLocalState';
import {
  useSpringEntrance,
  useSpringFadeIn,
  useSpringPress,
} from '../../lib/springs';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts, typeScale} from '../../theme/typography';
import {radii, shadows, spacing} from '../../theme/spacing';
import type {JournalItem, RelatedConfidence} from '../../lib/api/mobileApi';
import type {RootStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EchoBloom'>;

// Stable, module-scope delay constants — see `useSpringEntrance` dep array
// in src/lib/springs.ts. Inline arithmetic in a parent re-render would
// restart the spring.
const DELAY_ECHO_1 = 400;
const DELAY_ECHO_2 = 560;
const DELAY_YOUR_ECHO = 720;
const DELAY_PROMPT_SIBLING = 860;
const DELAY_CAPTION = 920;
const DELAY_CTA = 1080;
const CARD_HAPTIC_OFFSET = 80;

function captionFor(
  confidence: RelatedConfidence,
  hasCompanion: boolean,
): string {
  if (!hasCompanion) {
    return 'Your thought is out in the world.';
  }
  switch (confidence) {
    case 'high':
      return 'Your thought found an echo.';
    case 'medium':
    case 'low':
      return 'Your thought found something nearby.';
    case 'none':
    default:
      return 'Your thought found something.';
  }
}

export function EchoBloomScreen({navigation, route}: Props) {
  const {journalId} = route.params;
  const {user} = useAuth();
  const {colors} = useTheme();
  const {width: screenWidth} = useWindowDimensions();

  const {center, echoes, yourEcho, promptSibling, confidence} =
    useEchoBloomData(journalId, user?.id);

  // Raw (unfiltered) /related count — we mark Bloom as seen against
  // this number, which is the same number the feed chip reads via
  // useEchoesSummary. Using the cross-author-filtered `echoes` count
  // here would make the chip's delta detection drift out of sync.
  const echoesSummary = useEchoesSummary(journalId);

  const echoPrimary = echoes[0] ?? null;
  const echoSecondary = echoes[1] ?? null;

  const captionStyle = useSpringFadeIn(DELAY_CAPTION);
  const ctaStyle = useSpringEntrance(DELAY_CTA, 16, 0.98);
  const {
    animatedStyle: primaryPressStyle,
    onPressIn: primaryPressIn,
    onPressOut: primaryPressOut,
  } = useSpringPress(0.97);

  useEffect(() => {
    Haptics.success();
    logBloomEvent('center', 'reveal');
  }, []);

  // Mark this journal as "bloom seen" once the /related query has
  // resolved (isLoading false). The raw server count becomes the new
  // baseline for future new-resonance detection on the feed chip.
  useEffect(() => {
    if (echoesSummary.isLoading) return;
    void markBloomSeen(journalId, echoesSummary.count);
  }, [journalId, echoesSummary.isLoading, echoesSummary.count]);

  useEffect(() => {
    if (!echoPrimary) return;
    const id = setTimeout(() => {
      Haptics.softTap();
      logBloomEvent('echo', 'reveal');
    }, DELAY_ECHO_1 + CARD_HAPTIC_OFFSET);
    return () => clearTimeout(id);
  }, [echoPrimary]);

  useEffect(() => {
    if (!echoSecondary) return;
    const id = setTimeout(() => {
      Haptics.softTap();
    }, DELAY_ECHO_2 + CARD_HAPTIC_OFFSET);
    return () => clearTimeout(id);
  }, [echoSecondary]);

  useEffect(() => {
    if (!yourEcho) return;
    const id = setTimeout(() => {
      Haptics.softTap();
      logBloomEvent('your_echo', 'reveal');
    }, DELAY_YOUR_ECHO + CARD_HAPTIC_OFFSET);
    return () => clearTimeout(id);
  }, [yourEcho]);

  useEffect(() => {
    if (!promptSibling) return;
    const id = setTimeout(() => {
      Haptics.softTap();
      logBloomEvent('prompt_sibling', 'reveal');
    }, DELAY_PROMPT_SIBLING + CARD_HAPTIC_OFFSET);
    return () => clearTimeout(id);
  }, [promptSibling]);

  const openCompanion = useCallback(
    (kind: EchoCardKind, post: JournalItem) => {
      logBloomEvent(kind, 'tap');
      navigation.replace('PostDetail', {journalId: post.id});
    },
    [navigation],
  );

  const handleContinue = useCallback(() => {
    logBloomEvent('center', 'continue');
    Haptics.milestone();
    // V3 — pass the just-published journal as the parent of the new draft.
    // The editor fetches its title and shows a "Continuing from …" strip,
    // and the save flow persists parent_journal_id on publish so the
    // thread chain becomes visible via /journal/:id/thread.
    navigation.replace('JournalEditor', {
      mode: 'create',
      parentJournalId: journalId,
    });
  }, [journalId, navigation]);

  const handleOpenPublished = useCallback(() => {
    logBloomEvent('center', 'open');
    navigation.replace('PostDetail', {journalId});
  }, [navigation, journalId]);

  const handleDismiss = useCallback(() => {
    logBloomEvent('center', 'dismiss');
    navigation.goBack();
  }, [navigation]);

  const rowCardWidth = useMemo(() => {
    const horizontal = spacing.xl * 2;
    const gap = spacing.md;
    return Math.max(
      140,
      Math.floor((screenWidth - horizontal - gap) / 2),
    );
  }, [screenWidth]);

  const fullCardWidth = Math.min(screenWidth - spacing.xl * 2, 480);

  const hasAnyEcho = Boolean(echoPrimary);
  const hasYourEcho = Boolean(yourEcho);
  const hasPromptSibling = Boolean(promptSibling);
  const hasCompanion = hasAnyEcho || hasYourEcho || hasPromptSibling;
  const captionText = captionFor(confidence, hasCompanion);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safe, {backgroundColor: colors.bgPrimary}]}>
      <Pressable
        accessibilityLabel="Dismiss"
        accessibilityRole="button"
        onPress={handleDismiss}
        hitSlop={12}
        style={styles.dismiss}>
        <Text style={[styles.dismissIcon, {color: colors.textMuted}]}>×</Text>
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {hasAnyEcho ? (
          <View style={styles.topRow}>
            {echoSecondary ? (
              <EchoCard
                kind="echo"
                label="An echo"
                journal={echoSecondary}
                delay={DELAY_ECHO_2}
                width={rowCardWidth}
                onPress={() => openCompanion('echo', echoSecondary)}
              />
            ) : null}
            {echoPrimary ? (
              <EchoCard
                kind="echo"
                label="An echo"
                journal={echoPrimary}
                delay={DELAY_ECHO_1}
                width={echoSecondary ? rowCardWidth : fullCardWidth}
                onPress={() => openCompanion('echo', echoPrimary)}
              />
            ) : null}
          </View>
        ) : null}

        <View style={styles.centerWrap}>
          <BloomCenter journal={center} containerWidth={screenWidth} />
        </View>

        <Animated.Text
          style={[
            styles.caption,
            captionStyle,
            {
              color: colors.textSecondary,
              fontFamily: fonts.serif.italic,
            },
          ]}>
          {captionText}
        </Animated.Text>

        {hasYourEcho && yourEcho ? (
          <View style={styles.companionWrap}>
            <EchoCard
              kind="your_echo"
              label="From your writing"
              journal={yourEcho}
              delay={DELAY_YOUR_ECHO}
              width={fullCardWidth}
              onPress={() => openCompanion('your_echo', yourEcho)}
            />
          </View>
        ) : null}

        {hasPromptSibling && promptSibling ? (
          <View style={styles.companionWrap}>
            <EchoCard
              kind="prompt_sibling"
              label="Answering the same prompt"
              journal={promptSibling}
              delay={DELAY_PROMPT_SIBLING}
              width={fullCardWidth}
              onPress={() => openCompanion('prompt_sibling', promptSibling)}
            />
          </View>
        ) : null}

        <Animated.View style={[styles.ctaWrap, ctaStyle]}>
          <Animated.View style={primaryPressStyle}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue this thought"
              onPress={handleContinue}
              onPressIn={primaryPressIn}
              onPressOut={primaryPressOut}
              style={[
                styles.primaryCta,
                {backgroundColor: colors.accentGold},
                shadows(colors).button,
              ]}>
              <Text
                style={[
                  styles.primaryCtaLabel,
                  {color: colors.textOnAccent},
                ]}>
                Continue this thought
              </Text>
            </Pressable>
          </Animated.View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open published post"
            onPress={handleOpenPublished}
            hitSlop={8}
            style={styles.secondaryCta}>
            <Text
              style={[
                styles.secondaryCtaLabel,
                {color: colors.textSecondary},
              ]}>
              Open post
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  dismiss: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  dismissIcon: {
    fontSize: 30,
    lineHeight: 32,
    includeFontPadding: false,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl + spacing.md,
    paddingBottom: spacing.xxxl,
  },
  topRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'stretch',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  centerWrap: {
    marginBottom: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
    width: '100%',
  },
  caption: {
    ...typeScale.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  companionWrap: {
    marginBottom: spacing.xl,
    alignItems: 'center',
    width: '100%',
  },
  ctaWrap: {
    marginTop: spacing.md,
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
  },
  primaryCta: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    minHeight: 48,
    minWidth: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaLabel: {
    ...typeScale.button,
  },
  secondaryCta: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  secondaryCtaLabel: {
    ...typeScale.buttonSmall,
  },
});
