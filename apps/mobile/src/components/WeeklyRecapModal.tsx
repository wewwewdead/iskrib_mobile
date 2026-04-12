import React, {useEffect} from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useTheme} from '../theme/ThemeProvider';
import {fonts} from '../theme/typography';
import {spacing, radii, shadows} from '../theme/spacing';
import {FireIcon, PenIcon, HeartIcon, EyeIcon, TypeIcon} from './icons';
import {Avatar} from './Avatar';
import {useAnimatedCounter} from '../hooks/useAnimatedCounter';
import {getOverallEncouragement} from '../lib/recapCopy';
import {successHaptic, tapHaptic} from '../lib/haptics';
import type {WeeklyRecapData} from '../lib/api/analyticsApi';

interface WeeklyRecapModalProps {
  visible: boolean;
  recap: WeeklyRecapData;
  streakCount?: number;
  onDismiss: () => void;
  onNavigateToPost: (journalId: string) => void;
  onNavigateToProfile: (userId: string, username?: string) => void;
}

function fmt(n: number): string {
  if (!n || n === 0) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function StatTile({
  icon,
  value,
  label,
  index,
  accentColor,
  bgColor,
  textColor,
  mutedColor,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  index: number;
  accentColor: string;
  bgColor: string;
  textColor: string;
  mutedColor: string;
}) {
  const displayValue = useAnimatedCounter(value, 900 + index * 50);

  return (
    <View style={[styles.tile, {backgroundColor: bgColor}]}>
      {icon}
      <Text style={[styles.tileValue, {color: textColor}]}>
        {fmt(displayValue)}
      </Text>
      <Text style={[styles.tileLabel, {color: mutedColor}]}>{label}</Text>
    </View>
  );
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export function WeeklyRecapModal({
  visible,
  recap,
  streakCount = 0,
  onDismiss,
  onNavigateToPost,
  onNavigateToProfile,
}: WeeklyRecapModalProps) {
  const {colors, scaledType} = useTheme();
  const personal = recap.personal;
  const group = recap.group;
  const bestPost = personal?.best_post;
  const mostActive = group?.most_active_writer;
  const mostReacted = group?.most_reacted_post;
  const hasCommunity = !!(mostActive?.name || mostReacted?.title);

  useEffect(() => {
    if (visible) {
      successHaptic();
    }
  }, [visible]);

  const handlePostPress = (journalId: string) => {
    tapHaptic();
    onDismiss();
    setTimeout(() => onNavigateToPost(journalId), 300);
  };

  const handleProfilePress = (userId: string, username?: string) => {
    tapHaptic();
    onDismiss();
    setTimeout(() => onNavigateToProfile(userId, username), 300);
  };

  const tiles = [
    {icon: <PenIcon size={16} color={colors.accentAmber} />, value: personal?.posts_written ?? 0, label: 'POSTS'},
    {icon: <TypeIcon size={16} color={colors.accentAmber} />, value: personal?.total_words ?? 0, label: 'WORDS'},
    {icon: <HeartIcon size={16} color={colors.accentAmber} />, value: personal?.reactions_received ?? 0, label: 'REACTIONS'},
    {icon: <EyeIcon size={16} color={colors.accentAmber} />, value: personal?.views_received ?? 0, label: 'VIEWS'},
  ];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {backgroundColor: colors.bgElevated, maxHeight: SCREEN_HEIGHT * 0.85},
            shadows(colors).modal,
          ]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.scrollContent}>
            {/* Title */}
            <Text style={[styles.title, {color: colors.accentAmber}]}>
              Weekly Recap
            </Text>

            {/* Encouragement */}
            <Text style={[styles.encouragement, {color: colors.textSecondary}]}>
              {getOverallEncouragement(personal, streakCount)}
            </Text>

            {/* Stat tiles 2x2 */}
            <View style={styles.tilesGrid}>
              {tiles.map((tile, i) => (
                <StatTile
                  key={tile.label}
                  icon={tile.icon}
                  value={tile.value}
                  label={tile.label}
                  index={i}
                  accentColor={colors.accentAmber}
                  bgColor={colors.bgSecondary}
                  textColor={colors.textHeading}
                  mutedColor={colors.textMuted}
                />
              ))}
            </View>

            {/* Best post */}
            {bestPost?.title && (
              <Pressable
                style={({pressed}) => [
                  styles.bestPost,
                  {backgroundColor: colors.bgSecondary, opacity: pressed ? 0.8 : 1},
                ]}
                onPress={() => handlePostPress(bestPost.journal_id)}>
                <View style={styles.bestPostBadge}>
                  <FireIcon size={14} color={colors.accentAmber} />
                  <Text style={[styles.bestPostBadgeText, {color: colors.accentAmber}]}>
                    Best post this week
                  </Text>
                </View>
                <Text
                  style={[styles.bestPostTitle, {color: colors.textPrimary}]}
                  numberOfLines={1}>
                  {bestPost.title}
                </Text>
                <Text style={[styles.bestPostStats, {color: colors.textMuted}]}>
                  {bestPost.reaction_count ?? 0} reactions{' \u00B7 '}
                  {bestPost.view_count ?? 0} views
                </Text>
              </Pressable>
            )}

            {/* Community highlights */}
            {hasCommunity && (
              <View style={[styles.communitySection, {borderTopColor: colors.borderLight}]}>
                <Text style={[styles.communityLabel, {color: colors.textMuted}]}>
                  THIS WEEK ON ISKRIB
                </Text>

                {mostActive && mostActive.name && (
                  <Pressable
                    style={({pressed}) => [
                      styles.communityRow,
                      {backgroundColor: pressed ? colors.bgSecondary : 'transparent'},
                    ]}
                    onPress={() =>
                      handleProfilePress(mostActive.user_id, mostActive.username)
                    }>
                    <Avatar
                      uri={mostActive.avatar}
                      name={mostActive.name}
                      size={28}
                    />
                    <Text style={[styles.communityText, {color: colors.textPrimary}]}>
                      <Text style={styles.communityBold}>{mostActive.name}</Text>
                      {' \u2014 '}{mostActive.post_count} posts
                    </Text>
                  </Pressable>
                )}

                {mostReacted && mostReacted.title && (
                  <Pressable
                    style={({pressed}) => [
                      styles.communityRow,
                      {backgroundColor: pressed ? colors.bgSecondary : 'transparent'},
                    ]}
                    onPress={() => handlePostPress(mostReacted.journal_id)}>
                    <Avatar
                      uri={mostReacted.author_avatar}
                      name={mostReacted.author_name}
                      size={28}
                    />
                    <View style={styles.communityTextWrap}>
                      <Text
                        style={[styles.communityText, {color: colors.textPrimary}]}
                        numberOfLines={1}>
                        <Text style={styles.communityBold}>{mostReacted.title}</Text>
                      </Text>
                      <Text style={[styles.communitySubtext, {color: colors.textMuted}]}>
                        by {mostReacted.author_name} {'\u2014'} {mostReacted.reaction_count ?? 0} reactions
                      </Text>
                    </View>
                  </Pressable>
                )}
              </View>
            )}

            {/* Dismiss */}
            <Pressable
              style={[styles.dismissBtn, {backgroundColor: colors.accentAmber}]}
              onPress={() => {
                tapHaptic();
                onDismiss();
              }}>
              <Text style={[styles.dismissText, {color: colors.textOnAccent}]}>
                Got it!
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  card: {
    borderRadius: radii.hero,
    width: '100%',
    overflow: 'hidden',
  },
  scrollContent: {
    padding: spacing.xxl,
    gap: spacing.lg,
  },
  title: {
    fontFamily: fonts.heading.bold,
    fontSize: 22,
    textAlign: 'center',
  },
  encouragement: {
    fontFamily: fonts.serif.italic,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    width: '48%',
    flexGrow: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  tileValue: {
    fontFamily: fonts.heading.bold,
    fontSize: 22,
  },
  tileLabel: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 10,
    letterSpacing: 1,
  },
  bestPost: {
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  bestPostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bestPostBadgeText: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  bestPostTitle: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 14,
  },
  bestPostStats: {
    fontFamily: fonts.ui.regular,
    fontSize: 12,
  },
  communitySection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  communityLabel: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 10,
    letterSpacing: 1,
  },
  communityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
  },
  communityText: {
    fontFamily: fonts.ui.regular,
    fontSize: 13,
    flex: 1,
  },
  communityBold: {
    fontFamily: fonts.ui.semiBold,
  },
  communityTextWrap: {
    flex: 1,
    gap: 2,
  },
  communitySubtext: {
    fontFamily: fonts.ui.regular,
    fontSize: 12,
  },
  dismissBtn: {
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dismissText: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 15,
  },
});
