import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {Avatar} from '../Avatar';
import {ReplyIcon} from '../icons';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts, typeScale} from '../../theme/typography';
import {spacing} from '../../theme/spacing';
import type {Palette} from '../../theme/tokens';
import type {JournalComment} from '../../lib/api/socialApi';

export const formatRelativeDate = (value: string | undefined): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'});
};

export type CommentThreadProps = {
  comment: JournalComment;
  replyCount: number;
  isExpanded: boolean;
  isLoadingReplies: boolean;
  isLoggedIn: boolean;
  onReply: (commentId: string, userName: string) => void;
  onToggleReplies: (commentId: string) => void;
  colors: Palette;
  depth: number;
};

export type CommentThreadItem = {
  comment: JournalComment;
  depth: number;
  replyCount: number;
  isExpanded: boolean;
  isLoadingReplies: boolean;
};

export function buildVisibleCommentThread(
  comments: JournalComment[],
  fetchedReplies: Record<string, JournalComment[]>,
  expandedReplies: Set<string>,
  loadingReplies: Set<string>,
): CommentThreadItem[] {
  const items: CommentThreadItem[] = [];
  const localReplies = new Map<string, JournalComment[]>();

  comments.forEach(comment => {
    if (!comment.parent_id) {
      return;
    }

    const siblings = localReplies.get(comment.parent_id) ?? [];
    siblings.push(comment);
    localReplies.set(comment.parent_id, siblings);
  });

  const visit = (comment: JournalComment, depth: number) => {
    const replies = fetchedReplies[comment.id] ?? localReplies.get(comment.id) ?? [];
    const isExpanded = expandedReplies.has(comment.id);

    items.push({
      comment,
      depth,
      replyCount: comment.reply_count ?? replies.length,
      isExpanded,
      isLoadingReplies: loadingReplies.has(comment.id),
    });

    if (!isExpanded) {
      return;
    }

    replies.forEach(reply => visit(reply, depth + 1));
  };

  comments.filter(comment => !comment.parent_id).forEach(comment => visit(comment, 0));

  return items;
}

export function CommentThread({
  comment,
  replyCount,
  isExpanded,
  isLoggedIn,
  onReply,
  onToggleReplies,
  colors,
  depth,
}: CommentThreadProps) {
  const {scaledType} = useTheme();
  const userName = comment.users?.name || 'User';

  const avatarSize = depth === 0 ? 28 : 24;
  const bodyPaddingLeft = depth === 0 ? 36 : 32;

  return (
    <View>
      <View style={[styles.commentCard, {borderTopColor: colors.borderCard}]}>
        <View style={styles.commentHeader}>
          <Avatar
            uri={(comment.users as any)?.image_url}
            name={comment.users?.name}
            size={avatarSize}
          />
          <View style={styles.commentMeta}>
            <Text style={[styles.commentAuthor, {color: colors.textPrimary}]}>
              {userName}
            </Text>
            <Text style={[styles.commentTime, {color: colors.textFaint}]}>
              {formatRelativeDate(comment.created_at)}
            </Text>
          </View>
        </View>
        <Text style={[styles.commentBody, scaledType.bodySmall, {color: colors.textSecondary, paddingLeft: bodyPaddingLeft}]}>
          {comment.comment || ''}
        </Text>
        <View style={[styles.commentActions, {paddingLeft: bodyPaddingLeft}]}>
          {isLoggedIn && (
            <Pressable
              style={styles.actionButton}
              onPress={() => onReply(comment.id, userName)}>
              <ReplyIcon size={14} color={colors.textMuted} />
              <Text style={[styles.actionText, {color: colors.textMuted}]}>
                Reply
              </Text>
            </Pressable>
          )}
          {replyCount > 0 && (
            <Pressable
              style={styles.actionButton}
              onPress={() => onToggleReplies(comment.id)}>
              <Text style={[styles.actionText, {color: colors.accentGold}]}>
                {isExpanded ? 'Hide replies' : `Show ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  commentCard: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  commentMeta: {
    flex: 1,
  },
  commentAuthor: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 13,
  },
  commentTime: {
    fontFamily: fonts.ui.regular,
    fontSize: 11,
  },
  commentBody: {
    ...typeScale.bodySmall,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  actionText: {
    fontFamily: fonts.ui.medium,
    fontSize: 12,
  },
});
