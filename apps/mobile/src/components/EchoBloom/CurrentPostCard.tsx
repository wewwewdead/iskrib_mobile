import React, {useEffect} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, {Circle, Line, Path} from 'react-native-svg';
import type {ThreadJournalEntry} from '../../lib/api/mobileApi';
import {NetworkImage} from '../NetworkImage';
import {SpringPresets, useSpringEntry} from '../../lib/springs';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts} from '../../theme/typography';
import {radii, shadows, spacing} from '../../theme/spacing';
import {BloomGlow} from './BloomGlow';

// ═══════════════════════════════════════════════════════════════════
// CurrentPostCard — the "you are here" card in ThreadScreen.
//
// Aesthetic: warm literary salon, hand-set book page. Every element
// is a real typographic primitive — printer's fleurons, double-rule
// frames, marginalia italics, a bookmark ribbon. No decorative noise,
// no random gradients, no emoji.
//
// Motion is strictly one-shot (the card mounts, everything animates
// in, then stops). DESIGN.md reserves continuous animations for the
// FAB — so the gold aura pulses once and settles.
// ═══════════════════════════════════════════════════════════════════

interface CurrentPostCardProps {
  journal: ThreadJournalEntry;
}

const GLOW_SIZE = 360;

function CurrentPostCardImpl({journal}: CurrentPostCardProps) {
  const {colors, isDark, scaledType} = useTheme();
  const reduceMotion = useReducedMotion();

  // Card body springs in from a subtle settle (not a pop) — this is
  // a contemplative card, not a celebratory one.
  const cardEntry = useSpringEntry(0, 'gentle', 0.94);

  const glowOpacity = useSharedValue(reduceMotion ? 0.55 : 0);
  const ribbonY = useSharedValue(reduceMotion ? 0 : -18);
  const ribbonOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const ornamentOpacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;

    // 1. Glow (t≈60): one-shot pulse, settles at 0.55.
    glowOpacity.value = withDelay(
      60,
      withSequence(
        withTiming(0.3, {duration: 220, easing: Easing.out(Easing.cubic)}),
        withTiming(0.88, {duration: 360, easing: Easing.out(Easing.cubic)}),
        withTiming(0.55, {duration: 520, easing: Easing.inOut(Easing.ease)}),
      ),
    );

    // 2. Ribbon (t≈180): slides down from behind the card edge.
    ribbonOpacity.value = withDelay(
      180,
      withTiming(1, {duration: 300, easing: Easing.out(Easing.cubic)}),
    );
    ribbonY.value = withDelay(
      180,
      withSpring(0, {
        ...SpringPresets.bouncy,
        damping: 14,
        stiffness: 180,
      }),
    );

    // 3. Ornaments (t≈420): quietest element, last to arrive.
    ornamentOpacity.value = withDelay(
      420,
      withTiming(1, {duration: 520, easing: Easing.out(Easing.ease)}),
    );
  }, [reduceMotion, glowOpacity, ribbonY, ribbonOpacity, ornamentOpacity]);

  const ribbonStyle = useAnimatedStyle(() => ({
    transform: [{translateY: ribbonY.value}],
    opacity: ribbonOpacity.value,
  }));

  const ornamentStyle = useAnimatedStyle(() => ({
    opacity: ornamentOpacity.value,
  }));

  const title = journal.title?.trim() || 'Untitled';
  const preview = journal.preview_text?.trim() ?? '';
  const authorName = journal.users?.name || '';
  // `thumbnail_url` is set server-side to `parseData.firstImage?.src`
  // (see uploadService.js:340) — it IS the first image in the post,
  // not a separately chosen thumbnail. Safe to treat as such.
  const heroImage = journal.thumbnail_url ?? null;

  const gold = isDark ? colors.accentAmber : colors.accentGold;
  // Derive the double-rule border colors from the active gold token so
  // Universe and Custom palettes drive the book frame (instead of the
  // hardcoded dark-mode amber we'd get from a baked-in rgba literal).
  // Alpha hex: 0x7A≈0.48, 0x8C≈0.55, 0x38≈0.22, 0x47≈0.28.
  const outerBorder = isDark ? `${gold}7A` : `${gold}8C`;
  const innerBorder = isDark ? `${gold}38` : `${gold}47`;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {/* Gold aura behind the card — a one-shot pulse drives the
          opacity via shared value, then holds at 0.55. The View
          wrapping it uses negative insets so the glow bleeds beyond
          the card bounds and feels like warm light, not a gradient
          fill. */}
      <View style={styles.glowLayer} pointerEvents="none">
        <BloomGlow
          size={GLOW_SIZE}
          color={gold}
          opacity={glowOpacity}
          gradientId="current-post-aura"
        />
      </View>

      {/* Bookmark ribbon — a small gold tab floats above the card
          with a triangular tail tucking into the top rule. Position
          absolute so it doesn't eat row height. */}
      <Animated.View
        style={[styles.ribbonWrap, ribbonStyle]}
        pointerEvents="none">
        <View
          style={[
            styles.ribbon,
            {backgroundColor: gold},
            shadows(colors).cardSm,
          ]}>
          <Text
            style={[
              styles.ribbonText,
              {color: colors.textOnAccent, fontFamily: fonts.ui.semiBold},
            ]}>
            YOU ARE HERE
          </Text>
        </View>
        <Svg width={14} height={8} viewBox="0 0 14 8" style={styles.ribbonTail}>
          <Path d="M0 0 L14 0 L7 8 Z" fill={gold} />
        </Svg>
      </Animated.View>

      {/* Double-rule card — outer border + inner border + 5px gutter
          between them. Classic printed-book frame. */}
      <Animated.View
        accessibilityRole="text"
        accessibilityLabel={`Current post: ${title}${
          authorName ? ` by ${authorName}` : ''
        }`}
        style={[
          cardEntry,
          styles.outerBorder,
          {
            backgroundColor: colors.bgElevated,
            borderColor: outerBorder,
          },
          shadows(colors).elevated,
        ]}>
        <View style={[styles.innerBorder, {borderColor: innerBorder}]}>
          {/* Top fleuron */}
          <Animated.View style={[styles.ornamentWrap, ornamentStyle]}>
            <Fleuron color={gold} />
          </Animated.View>

          {/* Marginalia label */}
          <Text
            style={[
              styles.label,
              {
                color: gold,
                fontFamily: fonts.serif.italic,
              },
            ]}>
            You are here
          </Text>

          {/* Decorative divider */}
          <Animated.View style={[styles.dividerWrap, ornamentStyle]}>
            <DiamondDivider color={gold} />
          </Animated.View>

          {/* Book plate — the post's first image, framed with a thin
              gold hairline so it reads like an engraving set into the
              page between the chapter heading and its first line. Only
              rendered when the post actually has an image. */}
          {heroImage ? (
            <View
              style={[
                styles.plateFrame,
                {
                  borderColor: outerBorder,
                  backgroundColor: colors.bgPrimary,
                },
              ]}>
              <NetworkImage
                uri={heroImage}
                accessibilityLabel={`${title} cover image`}
                style={styles.plateImage}
                resizeMode="cover"
                disableFadeIn
              />
            </View>
          ) : null}

          {/* Title — the chapter opening */}
          <Text
            style={[
              styles.title,
              {
                color: colors.textHeading,
                fontFamily: fonts.heading.bold,
                fontSize: scaledType.h2.fontSize,
                lineHeight: (scaledType.h2.lineHeight ?? 28) + 2,
              },
            ]}>
            {title}
          </Text>

          {/* Preview — body of the page */}
          {preview ? (
            <Text
              numberOfLines={5}
              style={[
                styles.preview,
                {
                  color: colors.textBody,
                  fontFamily: fonts.serif.regular,
                },
              ]}>
              {preview}
            </Text>
          ) : null}

          {/* Closing fleuron */}
          <Animated.View
            style={[styles.ornamentWrap, styles.ornamentBottom, ornamentStyle]}>
            <Fleuron color={gold} />
          </Animated.View>

          {/* Signature — right-aligned like the author's own hand */}
          {authorName ? (
            <Text
              style={[
                styles.signature,
                {
                  color: colors.textMuted,
                  fontFamily: fonts.serif.italic,
                },
              ]}>
              {`\u2014 ${authorName}`}
            </Text>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

export const CurrentPostCard = React.memo(CurrentPostCardImpl);

// ─────────────────────────────────────────────────────────────────────
// Fleuron — printer's flourish: two short gold rules flanking a filled
// diamond, with tiny endpoint dots. Small, unambiguously typographic.
// ─────────────────────────────────────────────────────────────────────
function Fleuron({color}: {color: string}) {
  return (
    <Svg width={64} height={12} viewBox="0 0 64 12">
      <Circle cx={2} cy={6} r={1.1} fill={color} />
      <Line x1={6} y1={6} x2={26} y2={6} stroke={color} strokeWidth={0.8} />
      <Path d="M32 1.5 L36.5 6 L32 10.5 L27.5 6 Z" fill={color} />
      <Line x1={38} y1={6} x2={58} y2={6} stroke={color} strokeWidth={0.8} />
      <Circle cx={62} cy={6} r={1.1} fill={color} />
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────
// DiamondDivider — thin rule broken by an OPEN diamond outline. Lighter
// than the fleuron; a quieter accent between label and title.
// ─────────────────────────────────────────────────────────────────────
function DiamondDivider({color}: {color: string}) {
  return (
    <Svg width={144} height={10} viewBox="0 0 144 10">
      <Line
        x1={0}
        y1={5}
        x2={62}
        y2={5}
        stroke={color}
        strokeWidth={0.6}
        strokeOpacity={0.5}
      />
      <Path
        d="M72 1 L76 5 L72 9 L68 5 Z"
        stroke={color}
        strokeWidth={0.9}
        fill="none"
      />
      <Line
        x1={82}
        y1={5}
        x2={144}
        y2={5}
        stroke={color}
        strokeWidth={0.6}
        strokeOpacity={0.5}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: {
    // Reserve space for the ribbon that floats above the card. The
    // ribbon is absolutely positioned inside this padding so the row
    // height stays bounded even though the ribbon visually extends up.
    paddingTop: 26,
    alignItems: 'center',
  },
  glowLayer: {
    position: 'absolute',
    top: -60,
    left: 0,
    right: 0,
    bottom: -20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ribbonWrap: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  ribbon: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.sm,
  },
  ribbonText: {
    fontSize: 9.5,
    lineHeight: 11,
    letterSpacing: 1.6,
  },
  ribbonTail: {
    marginTop: -1,
  },
  outerBorder: {
    width: '100%',
    borderRadius: radii.hero,
    borderWidth: 1,
    padding: 5,
  },
  innerBorder: {
    borderRadius: radii.hero - 5,
    borderWidth: 0.5,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  ornamentWrap: {
    marginTop: 0,
  },
  ornamentBottom: {
    marginTop: spacing.md,
  },
  dividerWrap: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  plateFrame: {
    // Engraving-plate container: a thin gold hairline + inset so the
    // image reads like something set into the page rather than pasted
    // on top. Full width of the inner card, aspect-ratio locks the
    // height so layout stays predictable across image sizes.
    width: '100%',
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 3,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  plateImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radii.sm,
  },
  label: {
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.2,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  title: {
    textAlign: 'center',
    marginTop: 2,
  },
  preview: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  signature: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: spacing.sm,
    alignSelf: 'flex-end',
  },
});
