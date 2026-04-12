import React, {useCallback, useMemo, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {CompositeScreenProps} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {NetworkImage} from '../../components/NetworkImage';
import {ScreenEntrance} from '../../components/ScreenEntrance';
import {useAuth} from '../../features/auth/AuthProvider';
import {useTheme} from '../../theme/ThemeProvider';
import {mobileApi} from '../../lib/api/mobileApi';
import {ProfileHeroSection} from './ProfileHeroSection';
import {ProfileTabBar, type ProfileTab} from './ProfileTabBar';
import {ProfileWritingsTab} from './ProfileWritingsTab';
import {ProfileStoriesTab} from './ProfileStoriesTab';
import {ProfileOpinionsTab} from './ProfileOpinionsTab';
import {ProfileMediaTab} from './ProfileMediaTab';
import {BookmarkIcon, PenIcon, BarChartIcon} from '../../components/icons';
import {GlassCard} from '../../components/GlassCard';
import {fonts} from '../../theme/typography';
import {spacing, radii} from '../../theme/spacing';
import {
  parseProfileBackground,
  cssAngleToGradientPoints,
  safeGradientProps,
} from '../../lib/utils/profileBackground';
import type {MainTabParamList, RootStackParamList} from '../../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Profile'>,
  NativeStackScreenProps<RootStackParamList>
>;

const PROFILE_BACKDROP_BLUR_RADIUS = 24;

export function ProfileScreen({navigation}: Props) {
  const {user} = useAuth();
  const {colors} = useTheme();
  const [activeTab, setActiveTab] = useState<ProfileTab>('writings');

  const userDataQuery = useQuery({
    queryKey: ['profile', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => mobileApi.getUserData(user?.id ?? ''),
  });

  const streakQuery = useQuery({
    queryKey: ['streak', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => mobileApi.getStreak(user?.id ?? ''),
  });

  const rawProfile = userDataQuery.data?.userData?.[0] ?? null;
  const profile = rawProfile
    ? {
        ...rawProfile,
        followers_count: userDataQuery.data?.followerCount ?? 0,
        following_count: userDataQuery.data?.followingCount ?? 0,
        posts_count: userDataQuery.data?.postsCount ?? 0,
      }
    : null;
  const streak = streakQuery.data?.currentStreak;
  const longestStreak = streakQuery.data?.longestStreak;

  const parsedBg = useMemo(
    () => parseProfileBackground(profile?.background),
    [profile?.background],
  );

  const onSettingsPress = useCallback(() => {
    navigation.navigate('Settings');
  }, [navigation]);

  const onEditProfile = useCallback(() => {
    navigation.navigate('EditProfile');
  }, [navigation]);

  const onFollowersPress = useCallback(() => {
    if (user?.id) {
      navigation.navigate('FollowList', {userId: user.id, tab: 'followers'});
    }
  }, [navigation, user?.id]);

  const onFollowingPress = useCallback(() => {
    if (user?.id) {
      navigation.navigate('FollowList', {userId: user.id, tab: 'following'});
    }
  }, [navigation, user?.id]);

  const backdropElement = useMemo(() => {
    if (parsedBg.type === 'gradient') {
      const gp = safeGradientProps(parsedBg.colors, parsedBg.locations);
      if (!gp) return null;
      const {start, end} = cssAngleToGradientPoints(parsedBg.angle);
      return (
        <LinearGradient
          colors={gp.colors}
          locations={gp.locations}
          start={start}
          end={end}
          style={[StyleSheet.absoluteFill, styles.backdrop]}
        />
      );
    }
    if (parsedBg.type === 'image') {
      const dominantArr = profile?.dominant_colors
        ? profile.dominant_colors.split(',').map(c => c.trim())
        : null;
      const secondaryArr = profile?.secondary_colors
        ? profile.secondary_colors.split(',').map(c => c.trim())
        : null;
      const overlay = safeGradientProps(
        dominantArr && secondaryArr ? [...dominantArr, ...secondaryArr] : null,
      );
      return (
        <View style={[StyleSheet.absoluteFill, styles.backdrop]}>
          {overlay && (
            <LinearGradient
              colors={overlay.colors}
              style={StyleSheet.absoluteFill}
            />
          )}
          <NetworkImage
            uri={parsedBg.uri}
            blurRadius={PROFILE_BACKDROP_BLUR_RADIUS}
            style={styles.backdropImage}
            resizeMode="cover"
            accessibilityLabel="Profile background image"
          />
        </View>
      );
    }
    return null;
  }, [parsedBg, profile?.dominant_colors, profile?.secondary_colors]);

  if (userDataQuery.isLoading) {
    return (
      <SafeAreaView style={[styles.safe, {backgroundColor: colors.bgPrimary}]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.loaderColor} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const headerComponent = (
    <View>
      <ProfileHeroSection
        profile={profile}
        streak={streak}
        longestStreak={longestStreak}
        email={user?.email}
        onEditProfile={onEditProfile}
        onSettingsPress={onSettingsPress}
        onFollowersPress={onFollowersPress}
        onFollowingPress={onFollowingPress}
      />
      {/* Quick links */}
      <View style={styles.quickLinks}>
        <Pressable
          onPress={() => navigation.navigate('Bookmarks')}
          style={({pressed}) => [styles.quickLinkWrap, pressed && styles.quickLinkPressed]}
          accessibilityRole="button"
          accessibilityLabel="Bookmarks">
          <GlassCard borderRadius={radii.xl} padding={spacing.sm} style={styles.quickLinkTile}>
            <BookmarkIcon size={20} color={colors.accentAmber} />
            <Text style={[styles.quickLinkLabel, {color: colors.textSecondary}]}>Bookmarks</Text>
          </GlassCard>
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate('Drafts')}
          style={({pressed}) => [styles.quickLinkWrap, pressed && styles.quickLinkPressed]}
          accessibilityRole="button"
          accessibilityLabel="Drafts">
          <GlassCard borderRadius={radii.xl} padding={spacing.sm} style={styles.quickLinkTile}>
            <PenIcon size={20} color={colors.accentAmber} />
            <Text style={[styles.quickLinkLabel, {color: colors.textSecondary}]}>Drafts</Text>
          </GlassCard>
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate('Analytics')}
          style={({pressed}) => [styles.quickLinkWrap, pressed && styles.quickLinkPressed]}
          accessibilityRole="button"
          accessibilityLabel="Analytics">
          <GlassCard borderRadius={radii.xl} padding={spacing.sm} style={styles.quickLinkTile}>
            <BarChartIcon size={20} color={colors.accentAmber} />
            <Text style={[styles.quickLinkLabel, {color: colors.textSecondary}]}>Analytics</Text>
          </GlassCard>
        </Pressable>
      </View>
      <ProfileTabBar activeTab={activeTab} onTabChange={setActiveTab} />
      <View style={styles.tabSpacer} />
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safe, {backgroundColor: colors.bgPrimary}]}
      edges={['top']}>
      {backdropElement}

      <ScreenEntrance tier="hero">
        {activeTab === 'writings' ? (
          <ProfileWritingsTab
            userId={user?.id ?? ''}
            headerComponent={headerComponent}
          />
        ) : activeTab === 'stories' ? (
          <ProfileStoriesTab
            userId={user?.id ?? ''}
            headerComponent={headerComponent}
          />
        ) : activeTab === 'opinions' ? (
          <ProfileOpinionsTab
            userId={user?.id ?? ''}
            headerComponent={headerComponent}
            isOwnProfile
            userProfile={rawProfile}
          />
        ) : activeTab === 'media' ? (
          <ProfileMediaTab
            userId={user?.id ?? ''}
            headerComponent={headerComponent}
            isOwnProfile
          />
        ) : (
          <ProfileStoriesTab
            userId={user?.id ?? ''}
            headerComponent={headerComponent}
          />
        )}
      </ScreenEntrance>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLinks: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  quickLinkWrap: {
    flex: 1,
  },
  quickLinkTile: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72,
  },
  quickLinkPressed: {
    opacity: 0.7,
    transform: [{scale: 0.97}],
  },
  quickLinkLabel: {
    fontFamily: fonts.ui.medium,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  tabSpacer: {
    height: 12,
  },
  backdrop: {
    opacity: 0.15,
    transform: [{scale: 1.4}],
  },
  backdropImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
  },
});
