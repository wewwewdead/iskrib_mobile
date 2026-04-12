import React, {useCallback, useEffect, useState} from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useTheme} from '../theme/ThemeProvider';
import {fonts} from '../theme/typography';
import {spacing, radii} from '../theme/spacing';
import {
  FireIcon,
  PenIcon,
  HeartIcon,
  EyeIcon,
  TypeIcon,
  XIcon,
  ChevronDownIcon,
} from './icons';
import {Avatar} from './Avatar';
import {tapHaptic} from '../lib/haptics';
import type {WeeklyRecapData} from '../lib/api/analyticsApi';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface WeeklyRecapCardProps {
  recap: WeeklyRecapData;
  onNavigateToPost: (journalId: string) => void;
  onNavigateToProfile: (userId: string, username?: string) => void;
}

function getWeekKey(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff),
  );
  return `recap-dismissed-${monday.toISOString().slice(0, 10)}`;
}

function fmt(n: number): string {
  if (!n || n === 0) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export function WeeklyRecapCard({
  recap,
  onNavigateToPost,
  onNavigateToProfile,
}: WeeklyRecapCardProps) {
  const {colors, sf} = useTheme();
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [expanded, setExpanded] = useState(false);

  const weekKey = getWeekKey();
  const personal = recap.personal;
  const group = recap.group;
  const bestPost = personal?.best_post;
  const mostActive = group?.most_active_writer;
  const mostReacted = group?.most_reacted_post;

  useEffect(() => {
    AsyncStorage.getItem(weekKey).then(val => {
      setDismissed(val === 'true');
    });
  }, [weekKey]);

  const handleDismiss = useCallback(() => {
    tapHaptic();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDismissed(true);
    AsyncStorage.setItem(weekKey, 'true');
  }, [weekKey]);

  const toggleExpand = useCallback(() => {
    tapHaptic();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(v => !v);
  }, []);

  // Still loading dismiss state, or dismissed, or no data
  if (dismissed === null || dismissed) return null;
  if (
    (personal?.posts_written ?? 0) === 0 &&
    (group?.total_posts ?? 0) === 0
  ) {
    return null;
  }

  const stats = [
    {value: personal?.posts_written ?? 0, label: 'posts', Icon: PenIcon},
    {value: personal?.total_words ?? 0, label: 'words', Icon: TypeIcon},
    {value: personal?.reactions_received ?? 0, label: 'reactions', Icon: HeartIcon},
    {value: personal?.views_received ?? 0, label: 'views', Icon: EyeIcon},
  ];

  return (
    <View
      style={[
        styles.card,
        {backgroundColor: colors.bgCard, borderColor: colors.borderCard},
      ]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.label, {color: colors.accentAmber, fontSize: sf(11)}]}>
          Your Week
        </Text>
        <Pressable
          onPress={handleDismiss}
          hitSlop={8}
          accessibilityLabel="Dismiss weekly recap">
          <XIcon size={16} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Summary row — tappable to expand */}
      <Pressable style={styles.summaryRow} onPress={toggleExpand}>
        {stats.map((stat, i) => (
          <React.Fragment key={stat.label}>
            {i > 0 && (
              <View
                style={[styles.divider, {backgroundColor: colors.borderLight}]}
              />
            )}
            <View style={styles.stat}>
              <Text style={[styles.statValue, {color: colors.textHeading, fontSize: sf(17)}]}>
                {fmt(stat.value)}
              </Text>
              <Text style={[styles.statLabel, {color: colors.textMuted, fontSize: sf(11)}]}>
                {stat.label}
              </Text>
            </View>
          </React.Fragment>
        ))}
        <View
          style={[
            styles.expandIcon,
            expanded && styles.expandIconFlipped,
          ]}>
          <ChevronDownIcon size={14} color={colors.textMuted} />
        </View>
      </Pressable>

      {/* Expanded details */}
      {expanded && (
        <View style={[styles.details, {borderTopColor: colors.borderLight}]}>
          {/* Best post */}
          {bestPost?.title && (
            <Pressable
              style={({pressed}) => [
                styles.detailRow,
                {opacity: pressed ? 0.7 : 1},
              ]}
              onPress={() => {
                tapHaptic();
                onNavigateToPost(bestPost.journal_id);
              }}>
              <FireIcon size={14} color={colors.accentAmber} />
              <View style={styles.detailTextWrap}>
                <Text
                  style={[styles.detailHeading, {color: colors.textMuted, fontSize: sf(10)}]}>
                  Your best post
                </Text>
                <Text
                  style={[styles.detailText, {color: colors.textPrimary, fontSize: sf(13)}]}
                  numberOfLines={1}>
                  {bestPost.title} — {bestPost.reaction_count ?? 0} reactions
                </Text>
              </View>
            </Pressable>
          )}

          {/* Community total */}
          <View style={styles.detailRow}>
            <PenIcon size={14} color={colors.textMuted} />
            <View style={styles.detailTextWrap}>
              <Text style={[styles.detailHeading, {color: colors.textMuted, fontSize: sf(10)}]}>
                Community
              </Text>
              <Text style={[styles.detailText, {color: colors.textPrimary, fontSize: sf(13)}]}>
                {group?.total_posts ?? 0} posts written this week
              </Text>
            </View>
          </View>

          {/* Most active writer */}
          {mostActive?.name && (
            <Pressable
              style={({pressed}) => [
                styles.detailRow,
                {opacity: pressed ? 0.7 : 1},
              ]}
              onPress={() => {
                tapHaptic();
                onNavigateToProfile(mostActive.user_id, mostActive.username);
              }}>
              <Avatar
                uri={mostActive.avatar}
                name={mostActive.name}
                size={24}
              />
              <View style={styles.detailTextWrap}>
                <Text
                  style={[styles.detailHeading, {color: colors.textMuted, fontSize: sf(10)}]}>
                  Most active writer
                </Text>
                <Text
                  style={[styles.detailText, {color: colors.textPrimary, fontSize: sf(13)}]}
                  numberOfLines={1}>
                  {mostActive.name} — {mostActive.post_count} posts
                </Text>
              </View>
            </Pressable>
          )}

          {/* Most reacted post */}
          {mostReacted?.title && (
            <Pressable
              style={({pressed}) => [
                styles.detailRow,
                {opacity: pressed ? 0.7 : 1},
              ]}
              onPress={() => {
                tapHaptic();
                onNavigateToPost(mostReacted.journal_id);
              }}>
              <Avatar
                uri={mostReacted.author_avatar}
                name={mostReacted.author_name}
                size={24}
              />
              <View style={styles.detailTextWrap}>
                <Text
                  style={[styles.detailHeading, {color: colors.textMuted, fontSize: sf(10)}]}>
                  Most reacted post
                </Text>
                <Text
                  style={[styles.detailText, {color: colors.textPrimary, fontSize: sf(13)}]}
                  numberOfLines={1}>
                  {mostReacted.title} by {mostReacted.author_name} —{' '}
                  {mostReacted.reaction_count ?? 0} reactions
                </Text>
              </View>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontFamily: fonts.heading.bold,
    fontSize: 17,
  },
  statLabel: {
    fontFamily: fonts.ui.regular,
    fontSize: 11,
  },
  divider: {
    width: 1,
    height: 24,
  },
  expandIcon: {
    marginLeft: spacing.xs,
  },
  expandIconFlipped: {
    transform: [{rotate: '180deg'}],
  },
  details: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailTextWrap: {
    flex: 1,
    gap: 1,
  },
  detailHeading: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailText: {
    fontFamily: fonts.ui.regular,
    fontSize: 13,
  },
});
