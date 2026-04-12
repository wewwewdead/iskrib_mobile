import React from 'react';
import {Alert, Pressable, StyleSheet, Text, View} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {mobileApi, type JournalItem} from '../lib/api/mobileApi';
import {useAuth} from '../features/auth/AuthProvider';
import {useTogglePinMutation, useReorderPinMutation} from '../hooks/usePinMutation';
import {useTheme} from '../theme/ThemeProvider';
import {fonts} from '../theme/typography';
import {spacing, radii, shadows} from '../theme/spacing';
import {PinIcon, ChevronUpIcon, ChevronDownIcon, PenIcon, XIcon} from './icons';
import {NetworkImage} from './NetworkImage';
import type {RootStackParamList} from '../navigation/types';

interface PinnedPostsSectionProps {
  userId: string;
  isOwnProfile: boolean;
}

export function PinnedPostsSection({userId, isOwnProfile}: PinnedPostsSectionProps) {
  const {colors} = useTheme();
  const {user} = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const s = shadows(colors);

  const {data: pinnedData, isLoading} = useQuery({
    queryKey: isOwnProfile ? ['pinnedJournals'] : ['visitedPinnedJournals', userId],
    queryFn: () =>
      isOwnProfile
        ? mobileApi.getPinnedJournals()
        : mobileApi.getVisitedPinnedJournals(userId, user?.id),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const pinMutation = useTogglePinMutation();
  const reorderMutation = useReorderPinMutation();

  const pins: (JournalItem & {pin_position?: number})[] = pinnedData?.data ?? [];

  if (isLoading) {
    return (
      <View style={[styles.container, {backgroundColor: colors.bgCard, borderColor: colors.borderCard}, s.card]}>
        <View style={[styles.header, {borderBottomColor: colors.borderCard}]}>
          <PinIcon size={14} color={colors.accentAmber} filled />
          <Text style={[styles.heading, {color: colors.textHeading}]}>Pinned</Text>
        </View>
        <View style={styles.skeletonRow}>
          {[1, 2, 3].map(i => (
            <View key={i} style={[styles.skeletonCard, {backgroundColor: colors.bgSecondary}]} />
          ))}
        </View>
      </View>
    );
  }

  if (pins.length === 0) return null;

  const handlePress = (journal: JournalItem) => {
    navigation.navigate('PostDetail', {journalId: journal.id});
  };

  const handleUnpin = (journalId: string) => {
    Alert.alert('Unpin post', 'Remove this post from your pinned section?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Unpin', style: 'destructive', onPress: () => pinMutation.mutate(journalId)},
    ]);
  };

  const handleReorder = (journalId: string, direction: 'up' | 'down') => {
    reorderMutation.mutate({journalId, direction});
  };

  const handleEdit = (journalId: string) => {
    navigation.navigate('JournalEditor', {mode: 'edit', journalId});
  };

  return (
    <View style={[styles.container, {backgroundColor: colors.bgCard, borderColor: colors.borderCard}, s.card]}>
      <View style={[styles.header, {borderBottomColor: colors.borderCard}]}>
        <PinIcon size={14} color={colors.accentAmber} filled />
        <Text style={[styles.heading, {color: colors.textHeading}]}>Pinned</Text>
      </View>

      <View style={styles.cardsRow}>
        {pins.map((journal, index) => (
          <Pressable
            key={journal.id}
            style={({pressed}) => [
              styles.pinnedCard,
              {backgroundColor: colors.bgPrimary, borderColor: colors.borderCard},
              pressed && {opacity: 0.85},
            ]}
            onPress={() => handlePress(journal)}
          >
            {/* Pin badge */}
            <View style={[styles.pinBadge, {backgroundColor: colors.accentAmber + '20'}]}>
              <PinIcon size={10} color={colors.accentAmber} filled />
            </View>

            {/* Thumbnail */}
            {journal.thumbnail_url ? (
              <View style={[styles.thumbWrap, {backgroundColor: colors.bgSecondary}]}>
                <NetworkImage
                  uri={journal.thumbnail_url}
                  style={styles.thumb}
                  resizeMode="cover"
                  accessibilityLabel={journal.title || 'Pinned post thumbnail'}
                  disableFadeIn
                />
              </View>
            ) : (
              <View style={[styles.thumbWrap, styles.noThumb, {backgroundColor: colors.bgSecondary}]}>
                <PinIcon size={20} color={colors.textMuted} />
              </View>
            )}

            {/* Title + preview */}
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, {color: colors.textPrimary}]} numberOfLines={2}>
                {journal.title || 'Untitled'}
              </Text>
              {journal.preview_text ? (
                <Text style={[styles.cardSnippet, {color: colors.textMuted}]} numberOfLines={2}>
                  {journal.preview_text}
                </Text>
              ) : null}
            </View>

            {/* Reorder + Unpin (own profile only) */}
            {isOwnProfile && (
              <View style={[styles.cardActions, {borderTopColor: colors.borderCard}]}>
                <View style={styles.arrowRow}>
                  {index > 0 && (
                    <Pressable
                      style={[styles.arrowBtn, {borderColor: colors.borderCard}]}
                      onPress={event => {
                        event.stopPropagation();
                        handleReorder(journal.id, 'up');
                      }}
                      hitSlop={6}
                    >
                      <ChevronUpIcon size={12} color={colors.textMuted} />
                    </Pressable>
                  )}
                  {index < pins.length - 1 && (
                    <Pressable
                      style={[styles.arrowBtn, {borderColor: colors.borderCard}]}
                      onPress={event => {
                        event.stopPropagation();
                        handleReorder(journal.id, 'down');
                      }}
                      hitSlop={6}
                    >
                      <ChevronDownIcon size={12} color={colors.textMuted} />
                    </Pressable>
                  )}
                </View>
                <View style={styles.ownerActions}>
                  {!journal.is_repost && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Edit pinned post"
                      style={[styles.iconBtn, {borderColor: colors.borderCard}]}
                      onPress={event => {
                        event.stopPropagation();
                        handleEdit(journal.id);
                      }}
                      hitSlop={6}
                    >
                      <PenIcon size={11} color={colors.textMuted} />
                    </Pressable>
                  )}
                  <Pressable
                    style={[styles.unpinBtn, {borderColor: colors.borderCard}]}
                    onPress={event => {
                      event.stopPropagation();
                      handleUnpin(journal.id);
                    }}
                    hitSlop={6}
                  >
                    <XIcon size={10} color={colors.textMuted} />
                    <Text style={[styles.unpinText, {color: colors.textMuted}]}>Unpin</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  heading: {
    fontFamily: fonts.serif.bold,
    fontSize: 16,
    lineHeight: 20,
  },
  cardsRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  pinnedCard: {
    flex: 1,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    position: 'relative',
  },
  pinBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  thumbWrap: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  noThumb: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  cardBody: {
    padding: spacing.sm,
    gap: 2,
  },
  cardTitle: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 12,
    lineHeight: 16,
  },
  cardSnippet: {
    fontFamily: fonts.ui.regular,
    fontSize: 10,
    lineHeight: 14,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  arrowRow: {
    flexDirection: 'row',
    gap: 4,
  },
  ownerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  arrowBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unpinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  unpinText: {
    fontFamily: fonts.ui.medium,
    fontSize: 10,
  },
  skeletonRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  skeletonCard: {
    flex: 1,
    height: 120,
    borderRadius: radii.lg,
  },
});
