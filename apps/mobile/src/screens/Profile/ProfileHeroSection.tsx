import React, {useMemo} from 'react';
import {Pressable, Share, StyleSheet, Text, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Avatar} from '../../components/Avatar';
import {NetworkImage} from '../../components/NetworkImage';
import {PrimaryButton} from '../../components/PrimaryButton';
import {FireIcon, SettingsIcon, ShareIcon} from '../../components/icons';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts} from '../../theme/typography';
import {spacing, radii} from '../../theme/spacing';
import {
  parseProfileBackground,
  cssAngleToGradientPoints,
  safeGradientProps,
} from '../../lib/utils/profileBackground';

interface ProfileHeroProps {
  profile: {
    id: string;
    name?: string;
    username?: string;
    bio?: string;
    image_url?: string;
    badge?: string;
    profile_layout?: any;
    followers_count?: number;
    following_count?: number;
    posts_count?: number;
    background?: Record<string, string> | null;
    profile_font_color?: string | null;
    dominant_colors?: string | null;
    secondary_colors?: string | null;
  } | null;
  streak?: number;
  longestStreak?: number;
  email?: string;
  onEditProfile?: () => void;
  onSettingsPress?: () => void;
  onFollowersPress: () => void;
  onFollowingPress: () => void;
  actionButton?: React.ReactNode;
}

export function ProfileHeroSection({
  profile,
  streak,
  longestStreak,
  email,
  onEditProfile,
  onSettingsPress,
  onFollowersPress,
  onFollowingPress,
  actionButton,
}: ProfileHeroProps) {
  const {colors} = useTheme();
  const bgColor = profile?.profile_layout?.backgroundColor ?? colors.accentAmber;

  const parsedBg = useMemo(
    () => parseProfileBackground(profile?.background),
    [profile?.background],
  );

  const gradientProps = parsedBg.type === 'gradient'
    ? safeGradientProps(parsedBg.colors, parsedBg.locations)
    : null;

  const hasCustomBg = parsedBg.type === 'gradient' || parsedBg.type === 'image' || !!profile?.profile_layout?.backgroundColor;
  const fontColor = hasCustomBg ? (profile?.profile_font_color || null) : null;
  const nameColor = fontColor || colors.textHeading;
  const mutedColor = fontColor ? `${fontColor}99` : colors.textMuted;
  const secondaryColor = fontColor ? `${fontColor}CC` : colors.textSecondary;
  const iconColor = fontColor ? `${fontColor}CC` : 'rgba(255,255,255,0.8)';
  const shareIconColor = fontColor ? `${fontColor}CC` : colors.textSecondary;

  const onShareProfile = async () => {
    const username = profile?.username || profile?.name || 'user';
    try {
      await Share.share({
        message: `Check out @${username} on iskrib!\nhttps://iskrib-v3-server-production.up.railway.app/share/u/${encodeURIComponent(username)}`,
      });
    } catch {
      // User cancelled
    }
  };

  return (
    <View>
      {/* Background header */}
      {gradientProps ? (
        <LinearGradient
          colors={gradientProps.colors}
          locations={gradientProps.locations}
          {...cssAngleToGradientPoints(parsedBg.type === 'gradient' ? parsedBg.angle : 180)}
          style={styles.headerBg}>
          {onSettingsPress && (
            <Pressable
              style={styles.settingsBtn}
              onPress={onSettingsPress}
              hitSlop={12}>
              <SettingsIcon size={22} color={iconColor} />
            </Pressable>
          )}
        </LinearGradient>
      ) : parsedBg.type === 'image' ? (
        <View style={styles.headerBg}>
          <NetworkImage
            uri={parsedBg.uri}
            style={styles.headerBgImage}
            resizeMode="cover"
            accessibilityLabel="Profile header background image"
            disableFadeIn
          />
          {onSettingsPress && (
            <Pressable
              style={styles.settingsBtn}
              onPress={onSettingsPress}
              hitSlop={12}>
              <SettingsIcon size={22} color={iconColor} />
            </Pressable>
          )}
        </View>
      ) : (
        <View style={[styles.headerBg, {backgroundColor: bgColor}]}>
          {onSettingsPress && (
            <Pressable
              style={styles.settingsBtn}
              onPress={onSettingsPress}
              hitSlop={12}>
              <SettingsIcon size={22} color={iconColor} />
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.profileContent}>
        {/* Avatar + Stats row */}
        <View style={styles.avatarStatsRow}>
          <View style={styles.avatarWrap}>
            <Avatar
              uri={profile?.image_url}
              name={profile?.name}
              size={80}
              badge={profile?.badge as any}
            />
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, {color: nameColor}]}>
                {profile?.posts_count ?? 0}
              </Text>
              <Text style={[styles.statLabel, {color: mutedColor}]}>
                Posts
              </Text>
            </View>
            <Pressable style={styles.statItem} onPress={onFollowersPress}>
              <Text style={[styles.statNumber, {color: nameColor}]}>
                {profile?.followers_count ?? 0}
              </Text>
              <Text style={[styles.statLabel, {color: mutedColor}]}>
                Followers
              </Text>
            </Pressable>
            <Pressable style={styles.statItem} onPress={onFollowingPress}>
              <Text style={[styles.statNumber, {color: nameColor}]}>
                {profile?.following_count ?? 0}
              </Text>
              <Text style={[styles.statLabel, {color: mutedColor}]}>
                Following
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Name row */}
        <View style={styles.nameSection}>
          <Text style={[styles.name, {color: nameColor}]}>
            {profile?.name || email || 'User'}
          </Text>
          {profile?.username ? (
            <Text style={[styles.username, {color: mutedColor}]}>
              @{profile.username}
            </Text>
          ) : null}

          <View style={styles.badgeRow}>
            {profile?.badge ? (
              <View
                style={[
                  styles.badgePill,
                  {
                    backgroundColor:
                      profile.badge === 'legend'
                        ? 'rgba(255,215,0,0.15)'
                        : 'rgba(155,89,255,0.15)',
                    borderColor:
                      profile.badge === 'legend'
                        ? colors.badgeLegendBorder
                        : colors.badgeOGBorder,
                  },
                ]}>
                <Text
                  style={[
                    styles.badgeText,
                    {
                      color:
                        profile.badge === 'legend'
                          ? colors.badgeLegendBorder
                          : colors.badgeOGBorder,
                    },
                  ]}>
                  {profile.badge.toUpperCase()}
                </Text>
              </View>
            ) : null}

            {streak != null && streak > 0 ? (
              <View style={[styles.streakBadge, {backgroundColor: `${colors.accentAmber}1F`}]}>
                <FireIcon size={14} color={colors.accentAmber} />
                <Text style={[styles.streakText, {color: colors.accentAmber}]}>
                  {streak}{longestStreak != null && longestStreak > streak ? ` / ${longestStreak}` : ''}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Bio */}
        {profile?.bio ? (
          <Text style={[styles.bio, {color: secondaryColor}]}>
            {profile.bio}
          </Text>
        ) : null}

        {/* Action row */}
        <View style={styles.actionRow}>
          <View style={styles.editBtn}>
            {onEditProfile ? (
              <PrimaryButton
                label="Edit Profile"
                onPress={onEditProfile}
                kind="secondary"
              />
            ) : actionButton ? (
              actionButton
            ) : null}
          </View>
          <Pressable
            style={[styles.shareBtn, {borderColor: colors.borderLight}]}
            onPress={onShareProfile}
            hitSlop={8}>
            <ShareIcon size={18} color={shareIconColor} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBg: {
    height: 140,
    borderBottomLeftRadius: radii.hero,
    borderBottomRightRadius: radii.hero,
    overflow: 'hidden',
  },
  headerBgImage: {
    ...StyleSheet.absoluteFillObject,
  },
  settingsBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileContent: {
    marginTop: -40,
    paddingHorizontal: spacing.lg,
  },
  avatarStatsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.lg,
  },
  avatarWrap: {
    // Slight overlap with header
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: spacing.xs,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 18,
  },
  statLabel: {
    fontFamily: fonts.ui.regular,
    fontSize: 11,
    marginTop: 2,
  },
  nameSection: {
    marginTop: spacing.md,
    gap: spacing.xxs,
  },
  name: {
    fontFamily: fonts.heading.bold,
    fontSize: 20,
  },
  username: {
    fontFamily: fonts.ui.regular,
    fontSize: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  badgePill: {
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
  },
  badgeText: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 10,
    letterSpacing: 1,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  streakText: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 12,
    // color set dynamically
  },
  bio: {
    fontFamily: fonts.serif.regular,
    fontSize: 14,
    lineHeight: 22,
    marginTop: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  editBtn: {
    flex: 1,
  },
  shareBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
