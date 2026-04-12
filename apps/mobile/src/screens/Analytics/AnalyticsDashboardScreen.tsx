import React, {useCallback, useMemo, useRef, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import Animated, {FadeIn, FadeOut} from 'react-native-reanimated';
import {useTheme} from '../../theme/ThemeProvider';
import {analyticsApi} from '../../lib/api/analyticsApi';
import {EmptyState} from '../../components/EmptyState';
import {SkeletonLoader} from '../../components/SkeletonLoader';
import {PrimaryButton} from '../../components/PrimaryButton';
import {ScreenEntrance} from '../../components/ScreenEntrance';
import {ArrowLeftIcon, FireIcon, PenIcon} from '../../components/icons';
import {fonts} from '../../theme/typography';
import {spacing, radii} from '../../theme/spacing';
import type {RootStackParamList} from '../../navigation/types';

import {SegmentedRangeSelector} from './components/SegmentedRangeSelector';
import {HeroMetricCard} from './components/HeroMetricCard';
import {QuickStatsRow} from './components/QuickStatsRow';
import {StreakRing} from './components/StreakRing';
import {ActivityGrid} from './components/ActivityGrid';
import {ReactionBreakdown} from './components/ReactionBreakdown';
import {TopPostsList} from './components/TopPostsList';

type Props = NativeStackScreenProps<RootStackParamList, 'Analytics'>;

// Session-scoped first-visit tracking
let hasVisitedThisSession = false;

function computeTrend(series?: Array<{date: string; count: number}>): number | null {
  if (!series || series.length < 4) return null;
  const mid = Math.floor(series.length / 2);
  const firstHalf = series.slice(0, mid).reduce((s, d) => s + d.count, 0);
  const secondHalf = series.slice(mid).reduce((s, d) => s + d.count, 0);
  if (firstHalf === 0) return secondHalf > 0 ? 100 : null;
  const trend = ((secondHalf - firstHalf) / firstHalf) * 100;
  return trend === 0 ? null : Math.round(trend * 10) / 10;
}

export function AnalyticsDashboardScreen({navigation}: Props) {
  const {colors, scaledType} = useTheme();
  const [range, setRange] = useState<string>('30d');

  const isFirstVisit = useRef(!hasVisitedThisSession);
  React.useEffect(() => {
    hasVisitedThisSession = true;
  }, []);

  const analyticsQuery = useQuery({
    queryKey: ['analytics', range],
    queryFn: () => analyticsApi.getWriterAnalytics(range),
  });

  const data = analyticsQuery.data?.analytics;
  const summary = data?.summary;
  const topPosts = data?.top_posts ?? [];
  const streak = data?.streak;
  const hasPosts = (summary?.total_posts ?? 0) > 0;

  const trendPercent = useMemo(() => computeTrend(data?.views_series), [data?.views_series]);

  const quickStats = useMemo(
    () => [
      {label: 'Reactions', value: summary?.total_reactions ?? 0, color: colors.statReactions},
      {label: 'Comments', value: summary?.total_comments ?? 0, color: colors.statComments},
      {label: 'Bookmarks', value: summary?.total_bookmarks ?? 0, color: colors.accentSage},
      {label: 'Posts', value: summary?.total_posts ?? 0, color: 'amber'},
      {
        label: 'Engagement',
        value: Math.round((summary?.avg_engagement_rate ?? 0) * 10) / 10,
        color: colors.statEngagement,
        suffix: '%',
      },
    ],
    [summary],
  );

  const handlePostPress = useCallback(
    (journalId: string) => {
      navigation.navigate('PostDetail', {journalId});
    },
    [navigation],
  );

  const handleStartWriting = useCallback(() => {
    navigation.navigate('JournalEditor', {mode: 'create'});
  }, [navigation]);

  const isLoading = analyticsQuery.isLoading;
  const isRefetching = analyticsQuery.isFetching && !isLoading;

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.bgPrimary}]} edges={['top']}>
      <ScreenEntrance tier="hero">
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back">
            <ArrowLeftIcon size={22} color={colors.textHeading} />
          </Pressable>
          <Text style={[scaledType.h1, {color: colors.textHeading, flex: 1}]}>Analytics</Text>
          {(streak?.current_streak ?? 0) > 0 && (
            <View style={[styles.streakBadge, {backgroundColor: colors.accentAmber + '1F'}]}>
              <FireIcon size={14} color={colors.accentAmber} />
              <Text style={[styles.streakBadgeText, {color: colors.accentAmber}]}>
                {streak!.current_streak}
              </Text>
            </View>
          )}
        </View>

        {/* Range selector */}
        <SegmentedRangeSelector selected={range} onSelect={setRange} />

        {/* Content */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : !hasPosts ? (
          <EmptyState
            icon={<PenIcon size={48} color={colors.accentAmber} />}
            title="Your writing journey starts here"
            subtitle="Publish your first post to unlock analytics and track your growth as a writer."
            action={
              <PrimaryButton label="Start Writing" onPress={handleStartWriting} />
            }
          />
        ) : (
          <Animated.View
            entering={isRefetching ? FadeIn.duration(200) : undefined}
            exiting={isRefetching ? FadeOut.duration(100) : undefined}
            style={styles.dataContent}>
            {/* IMPACT */}
            <HeroMetricCard
              value={summary?.total_views ?? 0}
              label="TOTAL VIEWS"
              series={data?.views_series}
              trendPercent={trendPercent}
              isFirstVisit={isFirstVisit.current}
            />

            <QuickStatsRow stats={quickStats} isFirstVisit={isFirstVisit.current} />

            {/* CONSISTENCY */}
            {(streak?.current_streak ?? 0) > 0 && (
              <StreakRing
                currentStreak={streak!.current_streak ?? 0}
                longestStreak={streak!.longest_streak ?? 0}
                isFirstVisit={isFirstVisit.current}
              />
            )}

            {data?.publishing_frequency && data.publishing_frequency.length > 0 && (
              <ActivityGrid
                publishingFrequency={data.publishing_frequency}
                isFirstVisit={isFirstVisit.current}
              />
            )}

            {/* ENGAGEMENT */}
            {data?.reaction_breakdown && data.reaction_breakdown.length > 0 && (
              <ReactionBreakdown
                reactions={data.reaction_breakdown}
                isFirstVisit={isFirstVisit.current}
              />
            )}

            {/* BEST WORK */}
            {topPosts.length > 0 && (
              <TopPostsList
                posts={topPosts}
                onPostPress={handlePostPress}
                isFirstVisit={isFirstVisit.current}
              />
            )}
          </Animated.View>
        )}
        </ScrollView>
      </ScreenEntrance>
    </SafeAreaView>
  );
}

function LoadingSkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      <SkeletonLoader height={200} borderRadius={radii.hero} />
      <View style={styles.skeletonStatsRow}>
        {Array.from({length: 4}).map((_, i) => (
          <SkeletonLoader key={i} width={100} height={60} borderRadius={radii.xxxl} />
        ))}
      </View>
      <SkeletonLoader height={140} borderRadius={radii.xl} />
      <SkeletonLoader height={120} borderRadius={radii.xl} />
      <SkeletonLoader height={100} borderRadius={radii.xl} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  content: {
    padding: spacing.xl,
    gap: spacing.xxl,
    paddingBottom: 100,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  streakBadgeText: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 12,
  },
  dataContent: {
    gap: spacing.xxl,
  },
  skeletonContainer: {
    gap: spacing.xxl,
  },
  skeletonStatsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
