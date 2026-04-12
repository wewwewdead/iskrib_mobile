import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Animated, {FadeIn, FadeInRight} from 'react-native-reanimated';
import {useTheme} from '../../../theme/ThemeProvider';
import {fonts} from '../../../theme/typography';
import {spacing, radii} from '../../../theme/spacing';

interface ReactionItem {
  type: string; // emoji
  count: number;
}

interface Props {
  reactions: ReactionItem[];
  isFirstVisit: boolean;
}

// Emoji colors resolved from theme tokens at render time

export const ReactionBreakdown = React.memo(function ReactionBreakdown({
  reactions,
  isFirstVisit,
}: Props) {
  const {colors} = useTheme();
  const maxCount = reactions[0]?.count || 1;
  const totalCount = reactions.reduce((sum, r) => sum + r.count, 0);

  return (
    <Animated.View entering={isFirstVisit ? FadeIn.delay(700).duration(400) : undefined}>
      <View style={[styles.container, {backgroundColor: colors.bgCard}]}>
        <Text style={[styles.sectionTitle, {color: colors.textHeading}]}>Reactions</Text>
        <View style={styles.list}>
          {reactions.map((reaction, index) => {
            const emojiColorMap: Record<string, string> = {
              '\u2764\ufe0f': colors.statReactions,
              '\ud83d\udd25': colors.accentAmber,
              '\ud83d\udc4f': colors.statComments,
              '\ud83d\udc4d': colors.accentSage,
            };
            const barColor = emojiColorMap[reaction.type] ?? colors.accentAmber;
            const widthPercent = Math.max(5, (reaction.count / maxCount) * 100);
            const percentage = totalCount > 0 ? Math.round((reaction.count / totalCount) * 100) : 0;

            return (
              <Animated.View
                key={reaction.type}
                entering={
                  isFirstVisit
                    ? FadeInRight.delay(700 + index * 100).duration(400)
                    : undefined
                }
                style={styles.reactionRow}>
                <Text style={styles.emoji}>{reaction.type}</Text>
                <View style={[styles.barTrack, {backgroundColor: colors.bgSecondary}]}>
                  <View
                    style={[
                      styles.barFill,
                      {backgroundColor: barColor, width: `${widthPercent}%`},
                    ]}
                  />
                </View>
                <Text style={[styles.count, {color: colors.textMuted}]}>
                  {reaction.count} ({percentage}%)
                </Text>
              </Animated.View>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontFamily: fonts.ui.bold,
    fontSize: 16,
  },
  list: {
    gap: spacing.sm,
  },
  reactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emoji: {
    fontSize: 22,
    width: 30,
    textAlign: 'center',
  },
  barTrack: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  count: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 13,
    minWidth: 72,
    textAlign: 'right',
  },
});
