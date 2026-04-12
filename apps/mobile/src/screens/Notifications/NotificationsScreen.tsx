import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useMutation, useQuery} from '@tanstack/react-query';
import {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {CompositeScreenProps} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Avatar} from '../../components/Avatar';
import {EmptyState} from '../../components/EmptyState';
import {TabRootTransition} from '../../components/TabRootTransition';
import {BellIcon, HeartIcon, CommentIcon, RepostIcon, UserIcon, ReplyIcon} from '../../components/icons';
import {useAuth} from '../../features/auth/AuthProvider';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts, typeScale} from '../../theme/typography';
import {spacing, radii} from '../../theme/spacing';
import {mobileApi, type NotificationItem} from '../../lib/api/mobileApi';
import {getReactionEmoji} from '../../lib/reactions';
import {socialApi} from '../../lib/api/socialApi';
import {queryClient} from '../../lib/queryClient';
import type {MainTabParamList, RootStackParamList} from '../../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Notifications'>,
  NativeStackScreenProps<RootStackParamList>
>;

const formatRelativeDate = (value?: string): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
};

const formatTitle = (item: NotificationItem): string => {
  if (item.message) return item.message;
  const name = item.users?.name || 'Someone';
  switch (item.type) {
    case 'like': return `${name} liked your post`;
    case 'reaction': {
      const emoji = getReactionEmoji(item.reaction_type);
      return emoji ? `${name} reacted ${emoji} to your post` : `${name} reacted to your post`;
    }
    case 'comment': return `${name} commented on your post`;
    case 'repost': return `${name} reposted your post`;
    case 'reply': return `${name} replied to your comment`;
    case 'opinion_reply': return `${name} replied to your opinion`;
    case 'follow': return `${name} followed you`;
    case 'mention': return `${name} mentioned you`;
    case 'match': return `${name} matched with you`;
    case 'hottest_post': return 'Your post is trending!';
    case 'hottest_post_replaced': return 'Your post is no longer trending';
    default: return 'Notification';
  }
};

const formatContext = (item: NotificationItem): string => {
  const title = item.journals?.title?.trim();
  if (title) return title;
  const opinion = item.opinions?.opinion?.trim();
  if (opinion) return opinion.length > 100 ? `${opinion.slice(0, 97)}...` : opinion;
  return '';
};

const getSource = (item: NotificationItem): 'journal' | 'opinion' => {
  return item.source === 'opinion' || item.opinion_id ? 'opinion' : 'journal';
};

function NotifIcon({type, reactionType, color}: {type?: string; reactionType?: string; color: string}) {
  if (type === 'reaction') {
    const emoji = getReactionEmoji(reactionType);
    if (emoji) return <Text style={{fontSize: 13}}>{emoji}</Text>;
    return <HeartIcon size={14} color={color} filled />;
  }
  switch (type) {
    case 'like': return <HeartIcon size={14} color={color} filled />;
    case 'comment':
    case 'mention': return <CommentIcon size={14} color={color} />;
    case 'reply':
    case 'opinion_reply': return <ReplyIcon size={14} color={color} />;
    case 'repost': return <RepostIcon size={14} color={color} />;
    case 'follow': return <UserIcon size={14} color={color} />;
    default: return <BellIcon size={14} color={color} />;
  }
}

export function NotificationsScreen({navigation}: Props) {
  const {session} = useAuth();
  const {colors, scaledType} = useTheme();
  const isLoggedIn = !!session?.access_token;
  const userId = session?.user.id ?? '';

  const myProfileQuery = useQuery({
    queryKey: ['profile', userId],
    enabled: Boolean(userId),
    queryFn: () => mobileApi.getUserData(userId),
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });
  const myProfile = myProfileQuery.data?.userData?.[0];

  const notificationsQuery = useQuery({
    queryKey: ['notifications', userId],
    enabled: isLoggedIn,
    queryFn: () => mobileApi.getNotifications(null, 20),
  });

  const unreadCountQuery = useQuery({
    queryKey: ['notification-count', userId],
    enabled: Boolean(isLoggedIn && userId),
    queryFn: () => socialApi.getNotificationsCount(userId),
    staleTime: 60 * 1000,
    refetchOnMount: false,
  });

  const markReadMutation = useMutation({
    mutationFn: (args: {notifId: string; source: 'journal' | 'opinion'}) =>
      socialApi.markNotificationRead(args.notifId, args.source),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['notifications', userId]});
      queryClient.invalidateQueries({queryKey: ['notification-count', userId]});
    },
  });

  const items = notificationsQuery.data?.data ?? [];
  const unreadCount = unreadCountQuery.data?.count ?? 0;

  const handlePress = (item: NotificationItem) => {
    if (!item.read) {
      markReadMutation.mutate({notifId: item.id, source: getSource(item)});
    }

    // Opinion notifications → OpinionDetail
    if (item.source === 'opinion' || item.opinion_id) {
      const oid = item.opinion_id ?? item.opinions?.id;
      if (oid) {
        navigation.navigate('OpinionDetail', {
          opinionId: oid,
          parentOpinion: item.opinions ? {
            id: item.opinions.id ?? oid,
            opinion: item.opinions.opinion,
            user_id: item.opinions.user_id,
            created_at: item.opinions.created_at,
            users: myProfile ? {id: userId, name: myProfile.name, image_url: myProfile.image_url} : undefined,
          } : undefined,
        });
        return;
      }
    }

    // Follow notifications → VisitProfile
    if (item.type === 'follow' && item.sender_id) {
      navigation.navigate('VisitProfile', {userId: item.sender_id});
      return;
    }

    // Journal notifications → PostDetail (prefer repost target)
    const jid = item.repost_journal_id || item.journal_id;
    if (jid) {
      navigation.navigate('PostDetail', {journalId: jid});
    }
  };

  const renderItem = ({item}: {item: NotificationItem}) => {
    const subtitle = formatContext(item);
    const isUnread = !item.read;

    return (
      <Pressable
        onPress={() => handlePress(item)}
        style={[
          styles.card,
          {
            backgroundColor: isUnread ? colors.bgSelection : colors.bgCard,
            borderColor: colors.borderCard,
          },
        ]}>
        <View style={styles.avatarWrap}>
          <Avatar
            uri={item.users?.image_url}
            name={item.users?.name ?? undefined}
            size={40}
          />
          <View
            style={[
              styles.iconBadge,
              {backgroundColor: colors.bgElevated, borderColor: colors.borderLight},
            ]}>
            <NotifIcon type={item.type} reactionType={item.reaction_type} color={colors.accentAmber} />
          </View>
        </View>

        <View style={styles.textSection}>
          <Text
            style={[
              styles.cardTitle,
              {color: colors.textPrimary},
              isUnread && styles.unreadTitle,
            ]}
            numberOfLines={2}>
            {formatTitle(item)}
          </Text>
          {!!subtitle && (
            <Text
              style={[styles.cardSubtitle, {color: colors.textMuted}]}
              numberOfLines={1}>
              {subtitle}
            </Text>
          )}
          <Text style={[styles.timestamp, {color: colors.textFaint}]}>
            {formatRelativeDate(item.created_at)}
          </Text>
        </View>

        {isUnread && (
          <View style={[styles.unreadDot, {backgroundColor: colors.accentAmber}]} />
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.bgPrimary}]} edges={['top']}>
      <TabRootTransition style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, scaledType.h1, {color: colors.textHeading}]}>
            Notifications
          </Text>
          {unreadCount > 0 && (
            <View style={[styles.countBadge, {backgroundColor: colors.accentAmber}]}>
              <Text style={[styles.countText, {color: colors.textOnAccent}]}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {!isLoggedIn ? (
          <EmptyState title="Sign in" subtitle="Log in to see your notifications" />
        ) : notificationsQuery.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.loaderColor} />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            onRefresh={() => notificationsQuery.refetch()}
            refreshing={false}
            ListEmptyComponent={
              <EmptyState
                icon={<BellIcon size={36} color={colors.textFaint} />}
                title="All caught up"
                subtitle="No notifications yet"
              />
            }
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  title: {
    ...typeScale.h1,
  },
  countBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  countText: {
    fontFamily: fonts.ui.bold,
    fontSize: 12,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxxl,
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
  avatarWrap: {
    position: 'relative',
  },
  iconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textSection: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontFamily: fonts.ui.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  unreadTitle: {
    fontFamily: fonts.ui.semiBold,
  },
  cardSubtitle: {
    fontFamily: fonts.ui.regular,
    fontSize: 13,
  },
  timestamp: {
    fontFamily: fonts.ui.regular,
    fontSize: 12,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
