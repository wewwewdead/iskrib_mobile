import React, {useCallback, useMemo} from 'react';
import {FlatList, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {PostCard} from './PostCard/PostCard';
import {Chip} from './Chip';
import {Avatar} from './Avatar';
import {EmptyState} from './EmptyState';
import {useTheme} from '../theme/ThemeProvider';
import {fonts} from '../theme/typography';
import {typeScale} from '../theme/typography';
import {spacing} from '../theme/spacing';
import type {SearchTab} from '../hooks/useSearch';
import type {JournalItem, UserPreview} from '../lib/api/mobileApi';
import type {RootStackParamList} from '../navigation/types';
import {COMPACT_VERTICAL_LIST_PROPS} from '../lib/listPerformance';
import {
  getJournalCardData,
} from '../lib/utils/journalHelpers';

interface SearchResultsViewProps {
  activeTab: SearchTab;
  onTabChange: (tab: SearchTab) => void;
  users: UserPreview[];
  journals: JournalItem[];
  normalizedQuery: string;
  onUserPress: (id: string, username?: string) => void;
  onPostPress: (id: string) => void;
  onAuthorPress: (item: JournalItem) => void;
  onReact: (journalId: string, receiverId: string, reactionType: string) => void;
  onComment: (journalId: string, receiverId?: string, commentCount?: number) => void;
  onBookmark: (journalId: string) => void;
  onRepost: (journalId: string, title?: string, authorName?: string, authorAvatar?: string) => void;
  onEmbeddedPress: (journalId: string) => void;
}

type SearchRow =
  | {type: 'section'; id: string; title: string}
  | {type: 'user'; id: string; user: UserPreview}
  | {type: 'post'; id: string; post: JournalItem}
  | {type: 'empty'; id: 'empty'};

export function SearchResultsView({
  activeTab,
  onTabChange,
  users,
  journals,
  normalizedQuery,
  onUserPress,
  onPostPress,
  onAuthorPress,
  onReact,
  onComment,
  onBookmark,
  onRepost,
  onEmbeddedPress,
}: SearchResultsViewProps) {
  const {colors, scaledType} = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleContinue = useCallback(
    (journalId: string) => {
      navigation.navigate('JournalEditor', {
        mode: 'create',
        parentJournalId: journalId,
      });
    },
    [navigation],
  );

  const renderPostCard = (item: JournalItem) => {
    const cardData = getJournalCardData(item);
    const receiverId = item.user_id ?? item.users?.id ?? '';
    const isRepost = !!item.is_repost;
    const repostSource = isRepost ? item.repost_source : null;
    const repostSourcePreview = repostSource?.preview_text || '';

    return (
      <PostCard
        title={item.title || 'Untitled Post'}
        bodyPreview={cardData.previewText || 'No preview text available.'}
        authorName={item.users?.name || 'Unknown author'}
        authorAvatar={item.users?.image_url}
        authorBadge={item.users?.badge as 'legend' | 'og' | undefined}
        bannerImage={cardData.bannerImage}
        postType={item.post_type ?? undefined}
        readingTime={cardData.readingTime}
        likeCount={cardData.likeCount}
        commentCount={cardData.commentCount}
        bookmarkCount={cardData.bookmarkCount}
        viewCount={item.views}
        userReaction={item.user_reaction}
        isBookmarked={!!item.has_bookmarked}
        onReact={type => onReact(item.id, receiverId, type)}
        onComment={() => onComment(item.id, receiverId, cardData.commentCount)}
        onBookmark={() => onBookmark(item.id)}
        onRepost={() =>
          onRepost(
            item.id,
            item.title ?? undefined,
            item.users?.name ?? undefined,
            item.users?.image_url ?? undefined,
          )
        }
        onPress={() => onPostPress(item.id)}
        shareId={item.id}
        journalId={item.id}
        rootJournalId={item.root_journal_id}
        showThreadPreview
        parentJournalId={item.parent_journal_id}
        showContinueAction
        onContinue={handleContinue}
        onAuthorPress={() => onAuthorPress(item)}
        isRepost={isRepost}
        repostCaption={item.repost_caption}
        repostSourceTitle={repostSource?.title}
        repostSourcePreview={repostSourcePreview}
        repostSourceAuthorName={repostSource?.users?.name}
        repostSourceAuthorAvatar={repostSource?.users?.image_url}
        onEmbeddedPress={
          repostSource
            ? () => onEmbeddedPress(repostSource.id)
            : undefined
        }
      />
    );
  };

  const rows = useMemo(() => {
    const next: SearchRow[] = [];

    if (activeTab !== 'posts' && users.length > 0) {
      next.push({type: 'section', id: 'users-section', title: 'Users'});
      users.forEach(user => next.push({type: 'user', id: `user-${user.id}`, user}));
    }

    if (activeTab !== 'users' && journals.length > 0) {
      next.push({type: 'section', id: 'posts-section', title: 'Posts'});
      journals.forEach(post => next.push({type: 'post', id: `post-${post.id}`, post}));
    }

    if (next.length === 0) {
      next.push({type: 'empty', id: 'empty'});
    }

    return next;
  }, [activeTab, journals, users]);

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScrollView}
        contentContainerStyle={styles.tabRow}>
        {(['all', 'users', 'posts'] as SearchTab[]).map(tab => (
          <Chip
            key={tab}
            label={tab.charAt(0).toUpperCase() + tab.slice(1)}
            active={activeTab === tab}
            onPress={() => onTabChange(tab)}
          />
        ))}
      </ScrollView>

      <FlatList
        data={rows}
        {...COMPACT_VERTICAL_LIST_PROPS}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.results}
        keyExtractor={item => item.id}
        renderItem={({item}) => {
          switch (item.type) {
            case 'section':
              return (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, scaledType.h3, {color: colors.textHeading}]}>
                    {item.title}
                  </Text>
                </View>
              );
            case 'user': {
              const u = item.user;
              return (
                  <Pressable
                    style={[styles.userRow, {borderBottomColor: colors.borderCard}]}
                    onPress={() => onUserPress(u.id, u.username ?? undefined)}>
                    <Avatar uri={u.image_url} name={u.name ?? undefined} size={40} />
                    <View style={styles.userInfo}>
                      <Text style={[styles.userName, {color: colors.textPrimary}]}>
                        {u.name || 'Unknown'}
                      </Text>
                      {u.username && (
                        <Text style={[styles.userHandle, {color: colors.textMuted}]}>
                          @{u.username}
                        </Text>
                      )}
                    </View>
                  </Pressable>
              );
            }
            case 'post':
              return (
                <View style={styles.searchPostCard}>
                  {renderPostCard(item.post)}
                </View>
              );
            case 'empty':
              return (
                <EmptyState
                  title="No results"
                  subtitle={`Nothing found for "${normalizedQuery}"`}
                />
              );
            default:
              return null;
          }
        }}
        ItemSeparatorComponent={() => <View style={styles.resultGap} />}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tabScrollView: {
    flexGrow: 0,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    alignItems: 'center',
  },
  results: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxxl,
  },
  section: {
    marginTop: spacing.sm,
  },
  sectionTitle: {
    ...typeScale.h3,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 15,
  },
  userHandle: {
    fontFamily: fonts.ui.regular,
    fontSize: 13,
    marginTop: 2,
  },
  searchPostCard: {
    marginBottom: spacing.sm,
  },
  resultGap: {
    height: spacing.sm,
  },
});
