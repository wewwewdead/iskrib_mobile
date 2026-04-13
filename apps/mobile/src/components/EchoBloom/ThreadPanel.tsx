import React, {useCallback} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {mobileApi, type ThreadJournalEntry} from '../../lib/api/mobileApi';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts, typeScale} from '../../theme/typography';
import {radii, shadows, spacing} from '../../theme/spacing';
import type {RootStackParamList} from '../../navigation/types';

// ═══════════════════════════════════════════════════════════════════
// ThreadPanel — shows the explicit parent-child thread chain for a
// journal. Powered ONLY by /journal/:id/thread (find_journal_thread
// recursive CTE on parent_journal_id).
//
// Rendering rules:
//   - Renders null when the thread has 0 or 1 posts (a single post
//     is not a "thread" — showing it would be meaningless noise).
//   - Each entry is rendered as a vertically-stacked chain with a
//     connector rule between rows and the current post highlighted.
//   - Tap any entry to jump to that post's detail.
//
// No fabrication, no speculative labels: the data comes from a
// recursive SQL walk over a real column. If parent_journal_id is null
// everywhere, the chain has one entry, and this component renders
// nothing.
// ═══════════════════════════════════════════════════════════════════

interface ThreadPanelProps {
  journalId: string;
}

function ThreadPanelImpl({journalId}: ThreadPanelProps) {
  const {colors, scaledType} = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const {data, isLoading} = useQuery({
    queryKey: ['journal-thread', journalId],
    queryFn: () => mobileApi.getJournalThread(journalId),
    enabled: Boolean(journalId),
    staleTime: 60 * 1000, // 1 minute
  });

  const chain = data?.posts ?? [];
  const currentIndex = chain.findIndex(entry => entry.id === journalId);

  const openEntry = useCallback(
    (entry: ThreadJournalEntry) => {
      if (entry.id === journalId) return;
      navigation.push('PostDetail', {journalId: entry.id});
    },
    [journalId, navigation],
  );

  if (isLoading || chain.length < 2) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, scaledType.h3, {color: colors.textHeading}]}>
          Thread
        </Text>
        <Text
          style={[
            styles.subtitle,
            {color: colors.textMuted, fontFamily: fonts.serif.italic},
          ]}>
          {chain.length} posts in this thread
        </Text>
      </View>

      <View style={styles.chainWrap}>
        {chain.map((entry, index) => {
          const isCurrent = entry.id === journalId;
          const authorName = entry.users?.name || 'Unknown';
          const title = entry.title?.trim() || 'Untitled';
          const isBeforeCurrent = currentIndex >= 0 && index < currentIndex;
          const indexLabel = isCurrent
            ? 'This post'
            : isBeforeCurrent
              ? 'Earlier'
              : 'Later';

          return (
            <View key={entry.id}>
              {index > 0 ? (
                <View
                  style={[
                    styles.connector,
                    {backgroundColor: colors.borderCard},
                  ]}
                />
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${indexLabel}: ${title} by ${authorName}`}
                disabled={isCurrent}
                onPress={() => openEntry(entry)}
                style={[
                  styles.entry,
                  {
                    backgroundColor: isCurrent
                      ? `${colors.accentGold}14`
                      : colors.bgCard,
                    borderColor: isCurrent
                      ? `${colors.accentGold}55`
                      : colors.borderCard,
                  },
                  shadows(colors).cardSm,
                ]}>
                <Text
                  style={[
                    styles.indexLabel,
                    {
                      color: isCurrent
                        ? colors.accentGold
                        : colors.textMuted,
                    },
                  ]}>
                  {indexLabel}
                </Text>
                <Text
                  style={[
                    styles.entryTitle,
                    {color: colors.textHeading, fontFamily: fonts.heading.bold},
                  ]}
                  numberOfLines={2}>
                  {title}
                </Text>
                <Text
                  style={[
                    styles.entryAuthor,
                    {color: colors.textMuted, fontFamily: fonts.ui.regular},
                  ]}
                  numberOfLines={1}>
                  {authorName}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export const ThreadPanel = React.memo(ThreadPanelImpl);

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
  chainWrap: {
    gap: 0,
  },
  connector: {
    width: 2,
    height: spacing.md,
    marginLeft: spacing.xl,
  },
  entry: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.md,
    gap: 4,
  },
  indexLabel: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  entryTitle: {
    fontSize: 14,
    lineHeight: 19,
    marginTop: 2,
  },
  entryAuthor: {
    fontSize: 11,
    lineHeight: 14,
    marginTop: 2,
  },
});
