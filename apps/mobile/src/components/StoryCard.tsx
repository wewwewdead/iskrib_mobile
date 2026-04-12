import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Animated from 'react-native-reanimated';
import {useTheme} from '../theme/ThemeProvider';
import {fonts} from '../theme/typography';
import {spacing, radii, shadows} from '../theme/spacing';
import {useSpringPress} from '../lib/springs';
import {Avatar} from './Avatar';
import {NetworkImage} from './NetworkImage';
import {BookIcon, HeartIcon, EyeIcon} from './icons';
import type {StoryItem} from '../lib/api/storyApi';

// Status colors are now theme tokens — see tokens.ts

interface StoryCardProps {
  story: StoryItem;
  onPress: () => void;
}

export function StoryCard({story, onPress}: StoryCardProps) {
  const {colors} = useTheme();
  const s = shadows(colors);
  const status = (story.status || 'ongoing').toString();
  const statusColorMap: Record<string, {text: string; bg: string}> = {
    ongoing: {text: colors.statusOngoing, bg: colors.statusOngoingBg},
    completed: {text: colors.statusCompleted, bg: colors.statusCompletedBg},
    hiatus: {text: colors.statusHiatus, bg: colors.statusHiatusBg},
  };
  const statusStyle = statusColorMap[status] || statusColorMap.ongoing;
  const tags = (story.tags || []).slice(0, 3);
  const {animatedStyle: pressStyle, onPressIn, onPressOut} = useSpringPress(0.98);

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View
        style={[
          styles.card,
          {backgroundColor: colors.bgCard, borderColor: colors.borderCard},
          s.card,
          pressStyle,
        ]}>
      {/* Cover Image */}
      <View style={[styles.coverContainer, {backgroundColor: colors.bgSecondary}]}>
        {story.cover_url ? (
          <NetworkImage
            uri={story.cover_url}
            style={styles.coverImage}
            resizeMode="cover"
            accessibilityLabel={`${story.title} cover image`}
          />
        ) : (
          <View style={styles.coverPlaceholder}>
            <BookIcon size={32} color={colors.textFaint} />
          </View>
        )}
        {/* Status Badge */}
        <View style={[styles.statusBadge, {backgroundColor: statusStyle.bg}]}>
          <Text style={[styles.statusText, {color: statusStyle.text}]}>{status}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={[styles.title, {color: colors.textHeading}]} numberOfLines={2}>
          {story.title}
        </Text>

        {/* Author */}
        <View style={styles.authorRow}>
          <Avatar uri={story.users?.image_url} name={story.users?.name} size={18} />
          <Text style={[styles.authorName, {color: colors.textSecondary}]} numberOfLines={1}>
            {story.users?.name || 'Unknown'}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <HeartIcon size={12} color={colors.textMuted} />
            <Text style={[styles.statText, {color: colors.textMuted}]}>
              {(story.vote_count || 0).toLocaleString()}
            </Text>
          </View>
          <View style={styles.stat}>
            <EyeIcon size={12} color={colors.textMuted} />
            <Text style={[styles.statText, {color: colors.textMuted}]}>
              {(story.read_count || 0).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Tags */}
        {tags.length > 0 && (
          <View style={styles.tagsRow}>
            {tags.map(tag => (
              <View key={tag} style={[styles.tag, {backgroundColor: colors.bgPill}]}>
                <Text style={[styles.tagText, {color: colors.accentSage}]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  coverContainer: {
    aspectRatio: 3 / 4,
    width: '100%',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  statusText: {
    fontSize: 10,
    fontFamily: fonts.ui.semiBold,
    textTransform: 'capitalize',
  },
  info: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  title: {
    fontSize: 14,
    fontFamily: fonts.ui.semiBold,
    lineHeight: 19,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  authorName: {
    fontSize: 12,
    fontFamily: fonts.ui.regular,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    fontSize: 11,
    fontFamily: fonts.ui.regular,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 2,
  },
  tag: {
    borderRadius: radii.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 10,
    fontFamily: fonts.ui.medium,
  },
});
