import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {NetworkImage} from '../../components/NetworkImage';
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

const PROFILE_BACKDROP_BLUR_RADIUS = 24;

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
  });

  const streakQuery = useQuery({
    queryKey: ['streak', userId],
    enabled: Boolean(userId) && userId !== user?.id,
    queryFn: () => mobileApi.getStreak(userId),
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
  });

  const isFollowing = followsQuery.data?.isFollowing ?? false;
  const followMutation = useFollowMutation(userId);

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
            accessibilityLabel="Visited profile background image"
          />
        </View>
      );
    }
    return null;
  }, [parsedBg, profile?.dominant_colors, profile?.secondary_colors]);

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

  const followButton = (
    <PrimaryButton
      label={followMutation.isPending ? '...' : isFollowing ? 'Following' : 'Follow'}
      onPress={() => followMutation.mutate()}
      kind={isFollowing ? 'secondary' : 'primary'}
      loading={followMutation.isPending}
    />
  );

  const headerComponent = (
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
  );

  return (
    <SafeAreaView
      style={[styles.safe, {backgroundColor: colors.bgPrimary}]}
      edges={['top']}>
      {backdropElement}

      <ScreenEntrance tier="hero">
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
  backdrop: {
    opacity: 0.15,
    transform: [{scale: 1.4}],
  },
  backdropImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
  },
});
