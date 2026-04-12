import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {FadeInUp} from 'react-native-reanimated';
import {useTheme} from '../../../theme/ThemeProvider';
import {fonts} from '../../../theme/typography';
import {spacing, radii} from '../../../theme/spacing';
import {EyeIcon, HeartIcon, CommentIcon, ChevronRightIcon} from '../../../components/icons';
import type {TopPost} from '../../../lib/api/analyticsApi';

interface Props {
  posts: TopPost[];
  onPostPress: (journalId: string) => void;
  isFirstVisit: boolean;
}

function getRankColor(rank: number, colors: ReturnType<typeof useTheme>['colors']) {
  switch (rank) {
    case 1:
      return colors.accentGold;
    case 2:
      return colors.textMuted;
    case 3:
      return colors.accentAmber + '99';
    default:
      return colors.bgSecondary;
  }
}

function getRankTextColor(rank: number, colors: ReturnType<typeof useTheme>['colors']) {
  if (rank <= 3) return '#FFFFFF';
  return colors.textMuted;
}

export const TopPostsList = React.memo(function TopPostsList({
  posts,
  onPostPress,
  isFirstVisit,
}: Props) {
  const {colors} = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, {color: colors.textHeading}]}>Top Performing</Text>
      <View style={styles.list}>
        {posts.map((post, index) => (
          <Animated.View
            key={post.journal_id}
            entering={isFirstVisit ? FadeInUp.delay(800 + index * 60).duration(300) : undefined}>
            <Pressable
              style={({pressed}) => [
                styles.postCard,
                {backgroundColor: colors.bgCard, opacity: pressed ? 0.7 : 1},
              ]}
              onPress={() => onPostPress(post.journal_id)}
              accessibilityRole="button"
              accessibilityLabel={`${post.title || 'Untitled'}, ${post.views ?? 0} views, ${post.reactions ?? 0} reactions`}>
              {/* Rank badge */}
              <View style={[styles.rankBadge, {backgroundColor: getRankColor(index + 1, colors)}]}>
                <Text style={[styles.rankText, {color: getRankTextColor(index + 1, colors)}]}>
                  {index + 1}
                </Text>
              </View>

              {/* Post info */}
              <View style={styles.postInfo}>
                <Text
                  style={[styles.postTitle, {color: colors.textPrimary}]}
                  numberOfLines={2}>
                  {post.title || 'Untitled'}
                </Text>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <EyeIcon size={12} color={colors.textMuted} />
                    <Text style={[styles.statText, {color: colors.textMuted}]}>
                      {post.views ?? 0}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <HeartIcon size={12} color={colors.textMuted} />
                    <Text style={[styles.statText, {color: colors.textMuted}]}>
                      {post.reactions ?? 0}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <CommentIcon size={12} color={colors.textMuted} />
                    <Text style={[styles.statText, {color: colors.textMuted}]}>
                      {post.comments ?? 0}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Chevron */}
              <ChevronRightIcon size={16} color={colors.textFaint} />
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.ui.bold,
    fontSize: 16,
  },
  list: {
    gap: spacing.sm,
  },
  postCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.xl,
    minHeight: 48,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontFamily: fonts.ui.bold,
    fontSize: 12,
  },
  postInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  postTitle: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  statText: {
    fontFamily: fonts.ui.regular,
    fontSize: 11,
  },
});
