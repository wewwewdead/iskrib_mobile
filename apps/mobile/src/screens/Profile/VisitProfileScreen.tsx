import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import {
  Blur,
  Canvas,
  Image as SkiaImage,
  useImage,
} from '@shopify/react-native-skia';
import {useQuery} from '@tanstack/react-query';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {ScreenEntrance} from '../../components/ScreenEntrance';
import {useAuth} from '../../features/auth/AuthProvider';
import {useTheme} from '../../theme/ThemeProvider';
import {mobileApi} from '../../lib/api/mobileApi';
import {socialApi} from '../../lib/api/socialApi';
import {useFollowMutation} from '../../hooks/useFollowMutation';
import {ProfileHeroSection} from './ProfileHeroSection';
import {ProfileTabBar, type ProfileTab} from './ProfileTabBar';
import {ProfileWritingsTab} from './ProfileWritingsTab';
import {ProfileStoriesTab} from './ProfileStoriesTab';
import {ProfileOpinionsTab} from './ProfileOpinionsTab';
import {ProfileMediaTab} from './ProfileMediaTab';
import {PrimaryButton} from '../../components/PrimaryButton';
import {
  parseProfileBackground,
  cssAngleToGradientPoints,
  safeGradientProps,
} from '../../lib/utils/profileBackground';
import type {RootStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'VisitProfile'>;

const PROFILE_BACKDROP_BLUR_SIGMA = 22;
const PROFILE_BACKDROP_IMAGE_OPACITY = 0.65;

export function VisitProfileScreen({route, navigation}: Props) {
  const {userId} = route.params;
  const {user} = useAuth();
  const {colors} = useTheme();
  const [activeTab, setActiveTab] = useState<ProfileTab>('writings');

  // Self-redirect guard
  useEffect(() => {
    if (userId === user?.id) {
      navigation.replace('Main', {screen: 'Profile'} as any);
    }
  }, [userId, user?.id, navigation]);

  const userDataQuery = useQuery({
    queryKey: ['profile', userId],
    enabled: Boolean(userId) && userId !== user?.id,
    queryFn: () => mobileApi.getUserData(userId),
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });

  const streakQuery = useQuery({
    queryKey: ['streak', userId],
    enabled: Boolean(userId) && userId !== user?.id,
    queryFn: () => mobileApi.getStreak(userId),
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

  // Set header title dynamically
  useEffect(() => {
    if (profile?.name) {
      navigation.setOptions({title: profile.name});
    }
  }, [profile?.name, navigation]);

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

  const onFollowersPress = useCallback(() => {
    navigation.navigate('FollowList', {userId, tab: 'followers'});
  }, [navigation, userId]);

  const onFollowingPress = useCallback(() => {
    navigation.navigate('FollowList', {userId, tab: 'following'});
  }, [navigation, userId]);

  const followsQuery = useQuery({
    queryKey: ['followsData', userId],
    enabled: Boolean(userId) && userId !== user?.id,
    queryFn: () => socialApi.getFollowsData(userId),
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });

  const isFollowing = followsQuery.data?.isFollowing ?? false;
  const followMutation = useFollowMutation(userId);

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

  const onToggleFollow = useCallback(() => {
    followMutation.mutate();
  }, [followMutation]);

  const followButton = useMemo(
    () => (
      <PrimaryButton
        label={followMutation.isPending ? '...' : isFollowing ? 'Following' : 'Follow'}
        onPress={onToggleFollow}
        kind={isFollowing ? 'secondary' : 'primary'}
        loading={followMutation.isPending}
      />
    ),
    [followMutation.isPending, isFollowing, onToggleFollow],
  );

  const headerComponent = useMemo(
    () => (
      <View>
        <ProfileHeroSection
          profile={profile}
          streak={streak}
          longestStreak={longestStreak}
          onFollowersPress={onFollowersPress}
          onFollowingPress={onFollowingPress}
          actionButton={followButton}
        />
        <ProfileTabBar activeTab={activeTab} onTabChange={setActiveTab} />
        <View style={styles.tabSpacer} />
      </View>
    ),
    [
      activeTab,
      followButton,
      longestStreak,
      onFollowersPress,
      onFollowingPress,
      profile,
      streak,
    ],
  );

  const screenEntranceTier = Platform.OS === 'android' ? 'feed' : 'hero';

  if (userId === user?.id) {
    return null;
  }

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

      <ScreenEntrance tier={screenEntranceTier}>
        {activeTab === 'writings' ? (
          <ProfileWritingsTab
            userId={userId}
            headerComponent={headerComponent}
          />
        ) : activeTab === 'stories' ? (
          <ProfileStoriesTab
            userId={userId}
            headerComponent={headerComponent}
          />
        ) : activeTab === 'opinions' ? (
          <ProfileOpinionsTab
            userId={userId}
            headerComponent={headerComponent}
          />
        ) : activeTab === 'media' ? (
          <ProfileMediaTab
            userId={userId}
            headerComponent={headerComponent}
          />
        ) : (
          <ProfileStoriesTab
            userId={userId}
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
