import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Animated from 'react-native-reanimated';
import {useTheme} from '../theme/ThemeProvider';
import {fonts} from '../theme/typography';
import {spacing, radii, shadows} from '../theme/spacing';
import {useSpringPress} from '../lib/springs';
import {NetworkImage} from './NetworkImage';
import {BookIcon, HeartIcon, EyeIcon} from './icons';
import type {StoryItem} from '../lib/api/storyApi';

// Status colors are now theme tokens — see tokens.ts

interface StoryListItemProps {
  story: StoryItem;
  onPress: () => void;
  rightAction?: React.ReactNode;
}

export function StoryListItem({story, onPress, rightAction}: StoryListItemProps) {
  const {colors} = useTheme();
  const s = shadows(colors);
  const status = (story.status || 'ongoing').toString();
  const statusColorMap: Record<string, {text: string; bg: string}> = {
    ongoing: {text: colors.statusOngoing, bg: colors.statusOngoingBg},
    completed: {text: colors.statusCompleted, bg: colors.statusCompletedBg},
    hiatus: {text: colors.statusHiatus, bg: colors.statusHiatusBg},
  };
  const statusStyle = statusColorMap[status] || statusColorMap.ongoing;
  const {animatedStyle: pressStyle, onPressIn, onPressOut} = useSpringPress(0.98);

  return (
    <Animated.View style={[styles.container, {backgroundColor: colors.bgCard, borderColor: colors.borderCard}, s.cardSm, pressStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={styles.touchable}>
        {/* Cover Thumbnail */}
        <View style={[styles.cover, {backgroundColor: colors.bgSecondary}]}>
          {story.cover_url ? (
            <NetworkImage
              uri={story.cover_url}
              style={styles.coverImage}
              resizeMode="cover"
              accessibilityLabel={`${story.title} cover image`}
            />
          ) : (
            <View style={styles.coverPlaceholder}>
              <BookIcon size={20} color={colors.textFaint} />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={[styles.title, {color: colors.textHeading}]} numberOfLines={1}>
            {story.title}
          </Text>

          <View style={styles.metaRow}>
            <Text style={[styles.authorText, {color: colors.textSecondary}]} numberOfLines={1}>
              {story.users?.name || 'Unknown'}
            </Text>
            <View style={[styles.statusBadge, {backgroundColor: statusStyle.bg}]}>
              <Text style={[styles.statusText, {color: statusStyle.text}]}>{status}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <HeartIcon size={11} color={colors.textMuted} />
              <Text style={[styles.statText, {color: colors.textMuted}]}>
                {(story.vote_count || 0).toLocaleString()}
              </Text>
            </View>
            <View style={styles.stat}>
              <EyeIcon size={11} color={colors.textMuted} />
              <Text style={[styles.statText, {color: colors.textMuted}]}>
                {(story.read_count || 0).toLocaleString()}
              </Text>
            </View>
            {(story.chapters?.length ?? 0) > 0 && (
              <Text style={[styles.statText, {color: colors.textMuted}]}>
                {story.chapters!.length} ch.
              </Text>
            )}
          </View>
        </View>
      </Pressable>

      {rightAction && <View style={styles.actions}>{rightAction}</View>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  touchable: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
  },
  cover: {
    width: 60,
    height: 80,
    borderRadius: radii.md,
    overflow: 'hidden',
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
  info: {
    flex: 1,
    gap: spacing.xs,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontFamily: fonts.ui.semiBold,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  authorText: {
    fontSize: 12,
    fontFamily: fonts.ui.regular,
    flexShrink: 1,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  statusText: {
    fontSize: 10,
    fontFamily: fonts.ui.semiBold,
    textTransform: 'capitalize',
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
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
});
