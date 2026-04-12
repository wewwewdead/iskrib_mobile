import React from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts, typeScale} from '../../theme/typography';
import {spacing, radii, shadows} from '../../theme/spacing';
import {NetworkImage} from '../NetworkImage';
import {HORIZONTAL_CARD_LIST_PROPS} from '../../lib/listPerformance';
import {mobileApi} from '../../lib/api/mobileApi';
import {extractBannerImage} from '../../lib/utils/journalHelpers';
import type {RootStackParamList} from '../../navigation/types';

interface RelatedPostsProps {
  journalId: string;
}

export function RelatedPosts({journalId}: RelatedPostsProps) {
  const {colors, scaledType} = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const {data, isLoading} = useQuery({
    queryKey: ['related-posts', journalId],
    queryFn: () => mobileApi.getRelatedPosts(journalId),
    enabled: Boolean(journalId),
  });

  const posts = data?.data ?? [];

  if (isLoading || posts.length < 2) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, scaledType.h3, {color: colors.textHeading}]}>
        Related Posts
      </Text>
      <FlatList
        horizontal
        data={posts}
        {...HORIZONTAL_CARD_LIST_PROPS}
        keyExtractor={item => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        renderItem={({item}) => {
          const image = extractBannerImage(item.content, item.images);
          return (
            <Pressable
              onPress={() =>
                navigation.push('PostDetail', {journalId: item.id})
              }
              style={[
                styles.card,
                {
                  backgroundColor: colors.bgCard,
                  borderColor: colors.borderCard,
                },
                shadows(colors).cardSm,
              ]}>
              {image && (
                <NetworkImage
                  uri={image}
                  style={styles.cardImage}
                  resizeMode="cover"
                  accessibilityLabel={`${item.title || 'Related post'} cover image`}
                />
              )}
              <View style={styles.cardContent}>
                <Text
                  style={[styles.cardTitle, {color: colors.textHeading}]}
                  numberOfLines={2}>
                  {item.title || 'Untitled'}
                </Text>
                <Text
                  style={[styles.cardAuthor, {color: colors.textMuted}]}
                  numberOfLines={1}>
                  {item.users?.name || 'Unknown'}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl,
  },
  title: {
    ...typeScale.h3,
    marginBottom: spacing.md,
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
});
