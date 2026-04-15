import React, {useCallback} from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {PostCard} from './PostCard/PostCard';
import {useTheme} from '../theme/ThemeProvider';
import {HORIZONTAL_CARD_LIST_PROPS} from '../lib/listPerformance';
import {getJournalCardData} from '../lib/utils/journalHelpers';
import {typeScale} from '../theme/typography';
import {spacing} from '../theme/spacing';
import type {JournalItem} from '../lib/api/mobileApi';
import type {PeekSourceRect} from '../hooks/usePeekModal';
import type {RootStackParamList} from '../navigation/types';

interface InterestSectionProps {
  name: string;
  journals: JournalItem[];
  onPostPress: (journalId: string) => void;
  /**
   * Optional long-press handler for peek. When omitted, long-press is
   * inactive on the cards in this section. ExploreScreen owns the
   * usePeekModal instance and passes openPeek through this prop so all
   * InterestSections on the screen share one peek modal (no stacking).
   * Receives an optional window-coordinate rect from PostCard's own
   * measurement — used for the FLIP anchored-growth entry animation.
   */
  onLongPressPost?: (post: JournalItem, sourceRect?: PeekSourceRect) => void;
}

export function InterestSection({
  name,
  journals,
  onPostPress,
  onLongPressPost,
}: InterestSectionProps) {
  const {colors, scaledType} = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Stable callback — one instance per InterestSection instead of one
  // per rendered card. Lets React.memo actually do its job on PostCard
  // when the horizontal FlatList recycles rows on scroll.
  const handleContinue = useCallback(
    (journalId: string) => {
      navigation.navigate('JournalEditor', {
        mode: 'create',
        parentJournalId: journalId,
      });
    },
    [navigation],
  );

  if (!journals || journals.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, scaledType.h3, {color: colors.textHeading}]}>{name}</Text>
      <FlatList
        data={journals}
        horizontal
        {...HORIZONTAL_CARD_LIST_PROPS}
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.scroll}
        renderItem={({item}) => {
          const cardData = getJournalCardData(item);
          return (
            <View style={styles.cardWrap}>
              <PostCard
                title={item.title || 'Untitled'}
                bodyPreview={cardData.previewText}
                authorName={item.users?.name || 'Unknown'}
                authorAvatar={item.users?.image_url}
                bannerImage={cardData.bannerImage}
                readingTime={cardData.readingTime}
                likeCount={cardData.likeCount}
                commentCount={cardData.commentCount}
                bookmarkCount={cardData.bookmarkCount}
                viewCount={item.views}
                onPress={() => onPostPress(item.id)}
                onLongPress={
                  onLongPressPost
                    ? rect => onLongPressPost(item, rect)
                    : undefined
                }
                shareId={item.id}
                journalId={item.id}
                rootJournalId={item.root_journal_id}
                showThreadPreview
                parentJournalId={item.parent_journal_id}
                showContinueAction
                onContinue={handleContinue}
                onReact={() => {}}
                onComment={() => {}}
                onBookmark={() => {}}
                onRepost={() => {}}
                onAuthorPress={() => {}}
              />
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {marginBottom: spacing.xl},
  title: {...typeScale.h3, marginBottom: spacing.sm},
  scroll: {gap: spacing.md},
  cardWrap: {width: 280},
});
