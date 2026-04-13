import React, {memo, useEffect, useMemo} from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type {JournalItem} from '../../lib/api/mobileApi';
import {extractPlainText} from '../../lib/utils/journalHelpers';
import {useSpringEntry} from '../../lib/springs';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts} from '../../theme/typography';
import {radii, shadows, spacing} from '../../theme/spacing';
import {BloomGlow} from './BloomGlow';

const GLOW_DIAMETER = 360;
const CARD_WIDTH_RATIO = 0.72;
const CARD_WIDTH_MAX = 320;
const BODY_PREVIEW_LIMIT = 160;

interface BloomCenterProps {
  journal: JournalItem | null;
  containerWidth: number;
  style?: StyleProp<ViewStyle>;
}

function BloomCenterImpl({journal, containerWidth, style}: BloomCenterProps) {
  const {colors, isDark, scaledType} = useTheme();
  const reduceMotion = useReducedMotion();
  const entryStyle = useSpringEntry(0, 'bouncy', 0.4);
  const glowOpacity = useSharedValue(reduceMotion ? 0.6 : 0);

  useEffect(() => {
    if (reduceMotion) {
      glowOpacity.value = 0.6;
      return;
    }
    glowOpacity.value = withDelay(
      120,
      withSequence(
        withTiming(0.32, {
          duration: 200,
          easing: Easing.out(Easing.cubic),
        }),
        withTiming(0.88, {
          duration: 320,
          easing: Easing.out(Easing.cubic),
        }),
        withTiming(0.6, {
          duration: 420,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
    );
  }, [glowOpacity, reduceMotion]);

  const title = journal?.title?.trim() || 'Untitled';
  const bodyPreview = useMemo(() => {
    if (!journal?.content) return '';
    const text = extractPlainText(journal.content);
    if (!text) return '';
    if (text.length <= BODY_PREVIEW_LIMIT) return text;
    return `${text.slice(0, BODY_PREVIEW_LIMIT).trimEnd()}…`;
  }, [journal?.content]);

  const cardWidth = Math.min(
    containerWidth * CARD_WIDTH_RATIO,
    CARD_WIDTH_MAX,
  );
  const glowColor = isDark ? colors.accentAmber : colors.accentGold;
  const borderColor = isDark
    ? 'rgba(212,168,83,0.38)'
    : 'rgba(196,148,62,0.35)';

  return (
    <View style={[styles.container, style]}>
      <BloomGlow
        size={GLOW_DIAMETER}
        color={glowColor}
        opacity={glowOpacity}
        gradientId="bloomCenterGlow"
        style={styles.glow}
      />
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.card,
          entryStyle,
          {
            width: cardWidth,
            backgroundColor: colors.bgElevated,
            borderColor,
          },
          shadows(colors).elevated,
        ]}>
        <Text
          style={[
            styles.title,
            scaledType.h2,
            {color: colors.textHeading},
          ]}
          numberOfLines={2}>
          {title}
        </Text>
        {bodyPreview.length > 0 && (
          <Text
            style={[
              styles.body,
              {
                fontFamily: fonts.serif.italic,
                fontSize: scaledType.body.fontSize,
                lineHeight: scaledType.body.lineHeight,
                color: colors.textSecondary,
              },
            ]}
            numberOfLines={3}>
            {bodyPreview}
          </Text>
        )}
      </Animated.View>
    </View>
  );
}

export const BloomCenter = memo(BloomCenterImpl);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
  },
  card: {
    borderRadius: radii.hero,
    borderWidth: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  title: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
  },
});
