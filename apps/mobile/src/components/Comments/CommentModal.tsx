import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {buildVisibleCommentThread, CommentThread, type CommentThreadItem} from './CommentThread';
import {XIcon} from '../icons';
import {PrimaryButton} from '../PrimaryButton';
import {useComments} from '../../hooks/useComments';
import {useAuth} from '../../features/auth/AuthProvider';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts, typeScale} from '../../theme/typography';
import {spacing, radii} from '../../theme/spacing';

type CommentModalProps = {
  visible: boolean;
  postId: string;
  receiverId?: string;
  commentCount?: number;
  onClose: () => void;
};

export function CommentModal({
  visible,
  postId,
  receiverId,
  commentCount,
  onClose,
}: CommentModalProps) {
  const {session} = useAuth();
  const {colors, scaledType} = useTheme();
  const isLoggedIn = !!session?.access_token;
  const flatListRef = useRef<FlatList<CommentThreadItem>>(null);
  const inputRef = useRef<TextInput>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onReplyActivated = useCallback(() => {
    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current);
    }

    focusTimerRef.current = setTimeout(() => {
      inputRef.current?.focus();
      flatListRef.current?.scrollToEnd({animated: true});
    }, 100);
  }, []);

  useEffect(() => {
    return () => {
      if (focusTimerRef.current) {
        clearTimeout(focusTimerRef.current);
      }
    };
  }, []);

  const {
    comments,
    isLoading,
    commentInput,
    setCommentInput,
    replyingTo,
    setReplyingTo,
    expandedReplies,
    fetchedReplies,
    loadingReplies,
    handleReply,
    handleToggleReplies,
    submitComment,
    isSubmitting,
  } = useComments(postId, receiverId, onReplyActivated);

  const visibleComments = useMemo(
    () =>
      buildVisibleCommentThread(
        comments,
        fetchedReplies,
        expandedReplies,
        loadingReplies,
      ),
    [comments, expandedReplies, fetchedReplies, loadingReplies],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, {backgroundColor: colors.bgPrimary}]}>
        {/* Header */}
        <View style={[styles.header, {borderBottomColor: colors.borderCard}]}>
          <Text style={[styles.headerTitle, scaledType.h3, {color: colors.textHeading}]}>
            Comments{commentCount != null ? ` (${commentCount})` : ''}
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <XIcon size={22} color={colors.textMuted} />
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}>
          {/* Comments list */}
          <FlatList
            ref={flatListRef}
            data={visibleComments}
            keyExtractor={item => item.comment.id}
            style={styles.flex}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            renderItem={({item}) => (
              <View
                style={
                  item.depth > 0
                    ? [
                        styles.threadIndent,
                        {
                          marginLeft: Math.min(item.depth, 4) * 20,
                          borderLeftColor: colors.borderLight,
                        },
                      ]
                    : undefined
                }>
                <CommentThread
                  comment={item.comment}
                  replyCount={item.replyCount}
                  isExpanded={item.isExpanded}
                  isLoadingReplies={item.isLoadingReplies}
                  isLoggedIn={isLoggedIn}
                  onReply={handleReply}
                  onToggleReplies={handleToggleReplies}
                  colors={colors}
                  depth={item.depth}
                />
                {item.isExpanded && item.isLoadingReplies ? (
                  <View style={styles.replyLoading}>
                    <ActivityIndicator size="small" color={colors.loaderColor} />
                  </View>
                ) : null}
              </View>
            )}
            ListEmptyComponent={
              isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={colors.loaderColor} />
                </View>
              ) : (
              <Text style={[styles.emptyText, {color: colors.textMuted}]}>
                No comments yet. Be the first!
              </Text>
              )
            }
          />

          {/* Input area */}
          {isLoggedIn ? (
            <View style={[styles.inputArea, {borderTopColor: colors.borderCard, backgroundColor: colors.bgPrimary}]}>
              {replyingTo && (
                <View style={[styles.replyBanner, {backgroundColor: colors.bgSecondary}]}>
                  <Text style={[styles.replyBannerText, {color: colors.textPrimary}]}>
                    Replying to {replyingTo.userName}
                  </Text>
                  <Pressable onPress={() => setReplyingTo(null)} hitSlop={8}>
                    <XIcon size={16} color={colors.textMuted} />
                  </Pressable>
                </View>
              )}
              <View style={styles.inputRow}>
                <TextInput
                  ref={inputRef}
                  value={commentInput}
                  onChangeText={setCommentInput}
                  placeholder={replyingTo ? `Reply to ${replyingTo.userName}...` : 'Write a comment...'}
                  placeholderTextColor={colors.textFaint}
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.bgSecondary,
                      borderColor: colors.borderCard,
                      color: colors.textPrimary,
                    },
                  ]}
                  maxLength={200}
                  multiline
                />
                <PrimaryButton
                  label={isSubmitting ? 'Posting...' : 'Post'}
                  onPress={submitComment}
                  disabled={commentInput.trim().length === 0 || isSubmitting}
                />
              </View>
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    ...typeScale.h3,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  loadingContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fonts.ui.regular,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: spacing.xxxl,
  },
  threadIndent: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    paddingLeft: spacing.md,
  },
  replyLoading: {
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
  inputArea: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  replyBannerText: {
    fontFamily: fonts.ui.medium,
    fontSize: 13,
  },
  inputRow: {
    gap: spacing.md,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    textAlignVertical: 'top',
    minHeight: 60,
    fontFamily: fonts.ui.regular,
    fontSize: 14,
  },
});
