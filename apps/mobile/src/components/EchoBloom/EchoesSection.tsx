import React, {useCallback} from 'react';
import {FlatList, Pressable, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {NetworkImage} from '../NetworkImage';
import {useEchoesSummary} from '../../hooks/useEchoesSummary';
import {Haptics} from '../../lib/haptics';
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

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Echo Bloom for this post"
        onPress={openBloom}
        hitSlop={8}
        style={styles.bloomCta}>
        <Text
          style={[
            styles.bloomCtaLabel,
            {color: colors.accentGold, fontFamily: fonts.ui.semiBold},
          ]}>
          Open in Echo Bloom →
        </Text>
      </Pressable>
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
  bloomCta: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
  },
  bloomCtaLabel: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.3,
  },
});
