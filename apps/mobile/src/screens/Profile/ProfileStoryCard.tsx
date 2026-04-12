import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {GlassCard} from '../../components/GlassCard';
import {NetworkImage} from '../../components/NetworkImage';
import {HeartIcon, BookIcon} from '../../components/icons';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts} from '../../theme/typography';
import {spacing, radii} from '../../theme/spacing';
import type {StoryItem} from '../../lib/api/storyApi';

interface ProfileStoryCardProps {
  story: StoryItem;
  onPress: () => void;
}

export function ProfileStoryCard({story, onPress}: ProfileStoryCardProps) {
  const {colors} = useTheme();
  const statusColorMap: Record<string, {bg: string; text: string}> = {
    ongoing: {bg: colors.statusOngoingBg, text: colors.statusOngoing},
    completed: {bg: colors.statusCompletedBg, text: colors.statusCompleted},
    hiatus: {bg: colors.statusHiatusBg, text: colors.statusHiatus},
  };
  const statusStyle = statusColorMap[story.status ?? ''] ?? statusColorMap.ongoing;

  return (
    <Pressable onPress={onPress}>
      <GlassCard style={styles.card}>
        {story.cover_url ? (
          <NetworkImage
            uri={story.cover_url}
            style={styles.cover}
            resizeMode="cover"
            accessibilityLabel={`${story.title} cover image`}
          />
        ) : (
          <View style={[styles.coverPlaceholder, {backgroundColor: colors.bgSecondary}]}>
            <BookIcon size={32} color={colors.textMuted} />
          </View>
        )}

        <View style={styles.body}>
          <Text
            style={[styles.title, {color: colors.textHeading}]}
            numberOfLines={2}>
            {story.title}
          </Text>

          {story.description ? (
            <Text
              style={[styles.description, {color: colors.textSecondary}]}
              numberOfLines={2}>
              {story.description}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            {story.status ? (
              <View
                style={[
                  styles.statusBadge,
                  {backgroundColor: statusStyle.bg},
                ]}>
                <Text style={[styles.statusText, {color: statusStyle.text}]}>
                  {story.status.charAt(0).toUpperCase() + story.status.slice(1)}
                </Text>
              </View>
            ) : null}

            {story.tags && story.tags.length > 0 ? (
              <View style={styles.tagsRow}>
                {story.tags.slice(0, 2).map(tag => (
                  <View
                    key={tag}
                    style={[styles.tag, {backgroundColor: colors.bgSecondary}]}>
                    <Text style={[styles.tagText, {color: colors.textMuted}]}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <HeartIcon size={14} color={colors.textMuted} />
              <Text style={[styles.statText, {color: colors.textMuted}]}>
                {story.vote_count ?? 0}
              </Text>
            </View>
            <View style={styles.statItem}>
              <BookIcon size={14} color={colors.textMuted} />
              <Text style={[styles.statText, {color: colors.textMuted}]}>
                {story.read_count ?? 0}
              </Text>
            </View>
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 0,
    overflow: 'hidden',
  },
  cover: {
    width: 100,
    height: '100%',
    minHeight: 130,
  },
  coverPlaceholder: {
    width: 100,
    minHeight: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  title: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 15,
    lineHeight: 20,
  },
  description: {
    fontFamily: fonts.serif.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  statusBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  statusText: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  tag: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  tagText: {
    fontFamily: fonts.ui.regular,
    fontSize: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.xxs,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontFamily: fonts.ui.regular,
    fontSize: 12,
  },
});
