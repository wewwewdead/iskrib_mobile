import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Blur,
  Canvas,
  Image as SkiaImage,
  useImage,
} from '@shopify/react-native-skia';
import {useQuery} from '@tanstack/react-query';
import {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {CompositeScreenProps} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {TabRootTransition} from '../../components/TabRootTransition';
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

const PROFILE_BACKDROP_BLUR_SIGMA = 22;
const PROFILE_BACKDROP_IMAGE_OPACITY = 0.65;

export function ProfileScreen({navigation}: Props) {
  const {user} = useAuth();
  const {colors} = useTheme();
  const [activeTab, setActiveTab] = useState<ProfileTab>('writings');

  const userDataQuery = useQuery({
    queryKey: ['profile', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => mobileApi.getUserData(user?.id ?? ''),
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });

  const streakQuery = useQuery({
    queryKey: ['streak', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => mobileApi.getStreak(user?.id ?? ''),
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });

  const rawProfile = userDataQuery.data?.userData?.[0] ?? null;
  const profile = useMemo(
    () =>
      rawProfile
        ? {
            ...rawProfile,
            followers_count: userDataQuery.data?.followerCount ?? 0,
            following_count: userDataQuery.data?.followingCount ?? 0,
            posts_count: userDataQuery.data?.postsCount ?? 0,
          }
        : null,
    [
      rawProfile,
      userDataQuery.data?.followerCount,
      userDataQuery.data?.followingCount,
      userDataQuery.data?.postsCount,
    ],
  );
  const streak = streakQuery.data?.currentStreak;
  const longestStreak = streakQuery.data?.longestStreak;

  const parsedBg = useMemo(
    () => parseProfileBackground(profile?.background),
    [profile?.background],
  );

  const backdropImageUri = parsedBg.type === 'image' ? parsedBg.uri : null;
  const skBackdropImage = useImage(backdropImageUri);
  const [backdropSize, setBackdropSize] = useState({width: 0, height: 0});

  const onBackdropLayout = useCallback((e: LayoutChangeEvent) => {
    const {width, height} = e.nativeEvent.layout;
    setBackdropSize(prev =>
      prev.width === width && prev.height === height
        ? prev
        : {width, height},
    );
  }, []);

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

  const onBookmarksPress = useCallback(() => {
    navigation.navigate('Bookmarks');
  }, [navigation]);

  const onDraftsPress = useCallback(() => {
    navigation.navigate('Drafts');
  }, [navigation]);

  const onAnalyticsPress = useCallback(() => {
    navigation.navigate('Analytics');
  }, [navigation]);

  const imageBackdropGradient = useMemo(() => {
    const dominantArr = profile?.dominant_colors
      ? profile.dominant_colors.split(',').map(color => color.trim())
      : null;
    const secondaryArr = profile?.secondary_colors
      ? profile.secondary_colors.split(',').map(color => color.trim())
      : null;

    return (
      safeGradientProps(
        dominantArr && secondaryArr ? [...dominantArr, ...secondaryArr] : null,
      ) ?? {
        colors: [colors.bgElevated, colors.bgPrimary],
        locations: undefined,
      }
    );
  }, [
    colors.bgElevated,
    colors.bgPrimary,
    profile?.dominant_colors,
    profile?.secondary_colors,
  ]);

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
          style={[StyleSheet.absoluteFill, styles.backdropGradient]}
        />
      );
    }
    if (parsedBg.type === 'image') {
      return (
        <View
          style={StyleSheet.absoluteFill}
          onLayout={onBackdropLayout}
          pointerEvents="none">
          <LinearGradient
            colors={imageBackdropGradient.colors}
            locations={imageBackdropGradient.locations}
            style={[StyleSheet.absoluteFill, styles.backdropColorWash]}
          />
          {skBackdropImage && backdropSize.width > 0 ? (
            <Canvas style={StyleSheet.absoluteFill}>
              <SkiaImage
                image={skBackdropImage}
                x={0}
                y={0}
                width={backdropSize.width}
                height={backdropSize.height}
                fit="cover"
                opacity={PROFILE_BACKDROP_IMAGE_OPACITY}>
                <Blur blur={PROFILE_BACKDROP_BLUR_SIGMA} />
              </SkiaImage>
            </Canvas>
          ) : null}
        </View>
      );
    }
    return null;
  }, [
    backdropSize.height,
    backdropSize.width,
    imageBackdropGradient.colors,
    imageBackdropGradient.locations,
    onBackdropLayout,
    parsedBg,
    skBackdropImage,
  ]);

  const headerComponent = useMemo(
    () => (
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
        <View style={styles.quickLinks}>
          <Pressable
            onPress={onBookmarksPress}
            style={({pressed}) => [styles.quickLinkWrap, pressed && styles.quickLinkPressed]}
            accessibilityRole="button"
            accessibilityLabel="Bookmarks">
            <GlassCard borderRadius={radii.xl} padding={spacing.sm} style={styles.quickLinkTile}>
              <BookmarkIcon size={20} color={colors.accentAmber} />
              <Text style={[styles.quickLinkLabel, {color: colors.textSecondary}]}>Bookmarks</Text>
            </GlassCard>
          </Pressable>
          <Pressable
            onPress={onDraftsPress}
            style={({pressed}) => [styles.quickLinkWrap, pressed && styles.quickLinkPressed]}
            accessibilityRole="button"
            accessibilityLabel="Drafts">
            <GlassCard borderRadius={radii.xl} padding={spacing.sm} style={styles.quickLinkTile}>
              <PenIcon size={20} color={colors.accentAmber} />
              <Text style={[styles.quickLinkLabel, {color: colors.textSecondary}]}>Drafts</Text>
            </GlassCard>
          </Pressable>
          <Pressable
            onPress={onAnalyticsPress}
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
    ),
    [
      activeTab,
      colors.accentAmber,
      colors.textSecondary,
      longestStreak,
      onAnalyticsPress,
      onBookmarksPress,
      onDraftsPress,
      onEditProfile,
      onFollowersPress,
      onFollowingPress,
      onSettingsPress,
      profile,
      streak,
      user?.email,
    ],
  );

  if (userDataQuery.isLoading) {
    return (
      <SafeAreaView style={[styles.safe, {backgroundColor: colors.bgPrimary}]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.loaderColor} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safe, {backgroundColor: colors.bgPrimary}]}
      edges={['top']}>
      {backdropElement}
      <TabRootTransition style={styles.content}>
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
      </TabRootTransition>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
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
  backdropGradient: {
    opacity: 0.22,
    transform: [{scale: 1.3}],
  },
  backdropColorWash: {
    opacity: 0.18,
  },
});
