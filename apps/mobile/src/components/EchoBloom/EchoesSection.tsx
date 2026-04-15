import React, {useCallback} from 'react';
import {FlatList, Pressable, StyleSheet, Text, View} from 'react-native';
import Animated from 'react-native-reanimated';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Svg, {Circle} from 'react-native-svg';
import {NetworkImage} from '../NetworkImage';
import {useEchoesSummary} from '../../hooks/useEchoesSummary';
import {Haptics} from '../../lib/haptics';
import {useSpringPress} from '../../lib/springs';
import {HORIZONTAL_CARD_LIST_PROPS} from '../../lib/listPerformance';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts, typeScale} from '../../theme/typography';
import {radii, shadows, spacing} from '../../theme/spacing';
import type {RelatedPostEntry} from '../../lib/api/mobileApi';
import type {RootStackParamList} from '../../navigation/types';

// ═══════════════════════════════════════════════════════════════════
// EchoesSection — Post Detail section powered by /journal/:id/related.
//
// Replaces the prior `Discovery/RelatedPosts` component. Same data
// source, honest naming, adds a "Open in Bloom →" CTA that pushes
// the full EchoBloomScreen for this journal. Shares the
// `['related-posts', journalId]` React Query key with the feed chip
// and the Echo Bloom screen — one fetch powers all three surfaces.
// ═══════════════════════════════════════════════════════════════════

interface EchoesSectionProps {
  journalId: string;
}

function EchoesSectionImpl({journalId}: EchoesSectionProps) {
  const {colors, scaledType} = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {posts, hasEchoes, isLoading, count} = useEchoesSummary(journalId);
  const {animatedStyle: bloomPressStyle, onPressIn: onBloomPressIn, onPressOut: onBloomPressOut} =
    useSpringPress(0.97);

  const openPost = useCallback(
    (post: RelatedPostEntry) => {
      navigation.push('PostDetail', {journalId: post.id});
    },
    [navigation],
  );

  const openBloom = useCallback(() => {
    Haptics.tap();
    navigation.push('EchoBloom', {journalId});
  }, [journalId, navigation]);

  if (isLoading || !hasEchoes) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, scaledType.h3, {color: colors.textHeading}]}>
          Echoes
        </Text>
        <Text
          style={[
            styles.subtitle,
            {
              color: colors.textMuted,
              fontFamily: fonts.serif.italic,
            },
          ]}>
          {count === 1 ? '1 similar post' : `${count} similar posts`}
        </Text>
      </View>

      <FlatList
        horizontal
        data={posts}
        {...HORIZONTAL_CARD_LIST_PROPS}
        keyExtractor={item => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        renderItem={({item}) => {
          const image = item.thumbnail_url;
          const authorName = item.users?.name || 'Unknown';
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Echo: ${item.title || 'Untitled'} by ${authorName}`}
              onPress={() => openPost(item)}
              style={[
                styles.card,
                {
                  backgroundColor: colors.bgCard,
                  borderColor: colors.borderCard,
                },
                shadows(colors).cardSm,
              ]}>
              {image ? (
                <NetworkImage
                  uri={image}
                  style={styles.cardImage}
                  resizeMode="cover"
                  accessibilityLabel={`${item.title || 'Echo post'} cover image`}
                />
              ) : null}
              <View style={styles.cardContent}>
                <Text
                  style={[styles.cardTitle, {color: colors.textHeading}]}
                  numberOfLines={2}>
                  {item.title || 'Untitled'}
                </Text>
                <Text
                  style={[styles.cardAuthor, {color: colors.textMuted}]}
                  numberOfLines={1}>
                  {authorName}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />

      <Animated.View style={[styles.bloomCtaWrap, bloomPressStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Echo Bloom for this post"
          onPress={openBloom}
          onPressIn={onBloomPressIn}
          onPressOut={onBloomPressOut}
          hitSlop={8}
          style={[
            styles.bloomCta,
            {
              backgroundColor: `${colors.accentGold}14`,
              borderColor: `${colors.accentGold}66`,
            },
          ]}>
          <View style={styles.bloomCtaIcon}>
            <Svg width={18} height={18} viewBox="0 0 18 18">
              <Circle
                cx={9}
                cy={9}
                r={8}
                stroke={colors.accentGold}
                strokeWidth={1.1}
                fill="none"
                opacity={0.4}
              />
              <Circle
                cx={9}
                cy={9}
                r={4.5}
                stroke={colors.accentGold}
                strokeWidth={1.25}
                fill="none"
              />
              <Circle cx={9} cy={9} r={1.4} fill={colors.accentGold} />
            </Svg>
          </View>
          <View style={styles.bloomCtaTextCol}>
            <Text
              style={[
                styles.bloomCtaLabel,
                {color: colors.accentGold, fontFamily: fonts.ui.semiBold},
              ]}>
              Open in Echo Bloom
            </Text>
            <Text
              style={[
                styles.bloomCtaHint,
                {color: colors.textMuted, fontFamily: fonts.serif.italic},
              ]}>
              Follow the echoes of this post
            </Text>
          </View>
          <Text
            style={[
              styles.bloomCtaArrow,
              {color: colors.accentGold, fontFamily: fonts.ui.semiBold},
            ]}>
            →
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

export const EchoesSection = React.memo(EchoesSectionImpl);

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl,
  },
  header: {
    marginBottom: spacing.md,
    gap: 2,
  },
  title: {
    ...typeScale.h3,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  scrollContent: {
    gap: spacing.md,
  },
  card: {
    width: 180,
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 100,
  },
  cardContent: {
    padding: spacing.md,
    gap: 4,
  },
  cardTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 13,
    lineHeight: 18,
  },
  cardAuthor: {
    fontFamily: fonts.ui.regular,
    fontSize: 11,
  },
  bloomCtaWrap: {
    marginTop: spacing.lg,
  },
  bloomCta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    gap: spacing.md,
  },
  bloomCtaIcon: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloomCtaTextCol: {
    flex: 1,
    gap: 2,
  },
  bloomCtaLabel: {
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0.3,
  },
  bloomCtaHint: {
    fontSize: 12,
    lineHeight: 16,
  },
  bloomCtaArrow: {
    fontSize: 18,
    lineHeight: 20,
    marginLeft: spacing.xs,
  },
});
