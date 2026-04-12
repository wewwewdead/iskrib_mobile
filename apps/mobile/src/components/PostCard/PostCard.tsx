import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts, typeScale} from '../../theme/typography';
import {spacing, radii, shadows} from '../../theme/spacing';
import {Avatar} from '../Avatar';
import {NetworkImage} from '../NetworkImage';
import {BadgeCheckIcon, LightbulbIcon, PenIcon, RepostIcon} from '../icons';
import {ActionBar} from './ActionBar';
import type {PeekSourceRect} from '../../hooks/usePeekModal';

interface PostCardProps {
  title: string;
  bodyPreview: string;
  authorName: string;
  authorAvatar?: string | null;
  authorBadge?: 'legend' | 'og' | null;
  bannerImage?: string | null;
  bannerContent?: React.ReactNode;
  postType?: string;
  readingTime?: string;
  likeCount: number;
  commentCount: number;
  bookmarkCount?: number;
  viewCount?: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  userReaction?: string | null;
  onPress?: () => void;
  /**
   * Long-press handler. Called after the 400ms hold threshold is hit.
   * If measurement succeeds, the first argument is a window-coordinate
   * rectangle of the outer card View (used by PeekModal for a FLIP
   * anchored growth transition). If measurement is unavailable (jest
   * environment, ref not attached, accessibility rotor action), the
   * argument is undefined and the consumer should fall back to its
   * default behavior.
   */
  onLongPress?: (sourceRect?: PeekSourceRect) => void;
  onLike?: () => void;
  onComment?: () => void;
  onBookmark?: () => void;
  onRepost?: () => void;
  onReact?: (type: string) => void;
  reactionError?: boolean;
  shareId?: string;
  onAuthorPress?: () => void;
  isRepost?: boolean;
  repostCaption?: string | null;
  repostSourceTitle?: string | null;
  repostSourcePreview?: string | null;
  repostSourceAuthorName?: string | null;
  repostSourceAuthorAvatar?: string | null;
  onEmbeddedPress?: () => void;
  promptId?: string | null;
  promptText?: string | null;
  isPinned?: boolean;
  onPin?: () => void;
  showPinAction?: boolean;
  privacy?: string;
  onTogglePrivacy?: () => void;
  showPrivacyAction?: boolean;
  onEdit?: () => void;
  showEditAction?: boolean;
}

function PostCardComponent({
  title,
  bodyPreview,
  authorName,
  authorAvatar,
  authorBadge,
  bannerImage,
  bannerContent,
  postType,
  readingTime,
  likeCount,
  commentCount,
  bookmarkCount,
  viewCount,
  isLiked,
  isBookmarked,
  userReaction,
  onPress,
  onLongPress,
  onLike,
  onComment,
  onBookmark,
  onRepost,
  onReact,
  reactionError,
  shareId,
  onAuthorPress,
  isRepost,
  repostCaption,
  repostSourceTitle,
  repostSourcePreview,
  repostSourceAuthorName,
  repostSourceAuthorAvatar,
  onEmbeddedPress,
  promptId,
  promptText,
  isPinned,
  onPin,
  showPinAction,
  privacy,
  onTogglePrivacy,
  showPrivacyAction,
  onEdit,
  showEditAction,
}: PostCardProps) {
  const {colors, scaledType} = useTheme();
  const s = shadows(colors);

  const hasSource = !!(repostSourceTitle || repostSourcePreview || repostSourceAuthorName);

  // Ref on the outer View — measured only when the long-press threshold is
  // actually reached so normal taps pay zero layout work.
  const outerViewRef = React.useRef<View>(null);

  const handleLongPress = React.useCallback(() => {
    if (!onLongPress) {
      return;
    }

    const node = outerViewRef.current;
    if (!node || typeof node.measureInWindow !== 'function') {
      onLongPress();
      return;
    }

    node.measureInWindow((x, y, width, height) => {
      if (
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        Number.isFinite(width) &&
        Number.isFinite(height)
      ) {
        onLongPress({x, y, width, height});
        return;
      }

      onLongPress();
    });
  }, [onLongPress]);

  const handleAccessibilityAction = React.useCallback(
    (event: {nativeEvent: {actionName: string}}) => {
      if (event.nativeEvent.actionName === 'longpress') {
        // Rotor users have no press location — call without a rect so
        // PeekModal falls back to the default entry animation.
        onLongPress?.();
      }
    },
    [onLongPress],
  );

  return (
    <View
      ref={outerViewRef}
      style={[
        styles.card,
        {
          backgroundColor: colors.bgCard,
          borderColor: colors.borderCard,
        },
        s.card,
      ]}>
      <Pressable
        testID="post-card"
        onPress={onPress}
        onLongPress={onLongPress ? handleLongPress : undefined}
        delayLongPress={400}
        accessibilityHint={
          onLongPress ? 'Hold to preview, tap to read with comments' : undefined
        }
        accessibilityActions={
          onLongPress
            ? [{name: 'longpress', label: 'Peek post'}]
            : undefined
        }
        onAccessibilityAction={
          onLongPress ? handleAccessibilityAction : undefined
        }
        style={({pressed}) => [pressed && styles.pressed]}>
      {isRepost ? (
        <>
          {/* Repost badge header */}
          <View style={styles.repostBadge}>
            <RepostIcon size={14} color={colors.textFaint} />
            <Text style={[styles.repostBadgeText, {color: colors.textFaint}]}>
              <Text style={[styles.repostBadgeName, {color: colors.textSecondary}]}>
                {authorName}
              </Text>
              {' reposted'}
            </Text>
          </View>

          <View style={styles.content}>
            {/* Repost caption */}
            {repostCaption ? (
              <Text style={[styles.repostCaption, {color: colors.textBody}]}>
                {repostCaption}
              </Text>
            ) : null}

            {/* Embedded original post card */}
            {hasSource ? (
              <Pressable
                onPress={onEmbeddedPress}
                style={[
                  styles.embeddedCard,
                  {borderColor: colors.borderCard, backgroundColor: colors.bgPrimary},
                ]}>
                <View style={styles.embeddedAuthorRow}>
                  <Avatar
                    uri={repostSourceAuthorAvatar}
                    name={repostSourceAuthorName ?? ''}
                    size={20}
                  />
                  <Text
                    style={[styles.embeddedAuthorName, {color: colors.textSecondary}]}
                    numberOfLines={1}>
                    {repostSourceAuthorName}
                  </Text>
                </View>
                {repostSourceTitle ? (
                  <Text
                    style={[styles.embeddedTitle, scaledType.cardTitle, {color: colors.textHeading}]}
                    numberOfLines={2}>
                    {repostSourceTitle}
                  </Text>
                ) : null}
                {repostSourcePreview ? (
                  <Text
                    style={[styles.embeddedPreview, scaledType.bodySmall, {color: colors.textBody}]}
                    numberOfLines={3}>
                    {repostSourcePreview}
                  </Text>
                ) : null}
              </Pressable>
            ) : (
              <View
                style={[
                  styles.embeddedCard,
                  {borderColor: colors.borderCard, backgroundColor: colors.bgPrimary},
                ]}>
                <Text style={[styles.repostUnavailable, {color: colors.textFaint}]}>
                  This post is no longer available
                </Text>
              </View>
            )}
          </View>
        </>
      ) : (
        <>
          {bannerContent ?? (bannerImage ? (
            <NetworkImage
              uri={bannerImage}
              accessibilityLabel={`${title} banner image`}
              style={styles.banner}
              resizeMode="cover"
              disableFadeIn
            />
          ) : null)}

          <View style={styles.content}>
            {/* Author row */}
            <View style={styles.authorRow}>
              <Pressable
                style={styles.authorTouchable}
                onPress={onAuthorPress}
                disabled={!onAuthorPress}>
                <Avatar uri={authorAvatar} name={authorName} size={22} badge={authorBadge} />
                <Text
                  style={[styles.authorName, {color: colors.textSecondary}]}
                  numberOfLines={1}>
                  {authorName}
                </Text>
                {authorBadge ? <BadgeCheckIcon size={14} badge={authorBadge} /> : null}
              </Pressable>
              <View style={styles.authorMeta}>
                {postType && postType !== 'journal' ? (
                  <View style={[styles.typePill, {backgroundColor: colors.bgPill}]}>
                    <Text style={[styles.typeText, {color: colors.accentSage}]}>
                      {postType}
                    </Text>
                  </View>
                ) : null}
                {readingTime ? (
                  <View style={[styles.typePill, {backgroundColor: colors.bgPill}]}>
                    <Text style={[styles.typeText, {color: colors.accentSage}]}>
                      {readingTime}
                    </Text>
                  </View>
                ) : null}
                {showEditAction && onEdit ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Edit post"
                    hitSlop={8}
                    onPress={event => {
                      event.stopPropagation();
                      onEdit();
                    }}
                    style={({pressed}) => [
                      styles.editButton,
                      {
                        backgroundColor: colors.bgPrimary,
                        borderColor: colors.borderCard,
                      },
                      pressed && styles.editButtonPressed,
                    ]}>
                    <PenIcon size={12} color={colors.textSecondary} />
                    <Text style={[styles.editButtonText, {color: colors.textSecondary}]}>
                      Edit
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            {/* Title + Prompt Badge */}
            <View style={styles.titleRow}>
              <Text
                style={[styles.title, styles.titleText, scaledType.cardTitle, {color: colors.textHeading}]}
                numberOfLines={2}>
                {title}
              </Text>
              {promptId ? (
                <View style={[styles.promptBadge, {backgroundColor: `${colors.accentAmber}1F`}]}>
                  <LightbulbIcon size={11} color={colors.accentAmber} />
                  <Text style={[styles.promptBadgeText, {color: colors.accentAmber}]}>Prompt</Text>
                </View>
              ) : null}
            </View>

            {/* Prompt Attribution */}
            {promptText ? (
              <View style={styles.promptAttribution}>
                <LightbulbIcon size={12} color={colors.accentAmber} />
                <Text style={[styles.promptAttributionText, {color: colors.accentAmber}]} numberOfLines={1}>
                  {promptText.length > 80 ? `${promptText.substring(0, 80)}\u2026` : promptText}
                </Text>
              </View>
            ) : null}

            {/* Body preview */}
            {bodyPreview ? (
              <Text
                style={[styles.body, scaledType.bodySmall, {color: colors.textBody}]}
                numberOfLines={3}>
                {bodyPreview}
              </Text>
            ) : null}
          </View>
        </>
      )}
      </Pressable>

      <ActionBar
        likeCount={likeCount}
        commentCount={commentCount}
        bookmarkCount={bookmarkCount}
        viewCount={viewCount}
        isLiked={isLiked}
        isBookmarked={isBookmarked}
        userReaction={userReaction}
        reactionError={reactionError}
        onLike={onLike}
        onComment={onComment}
        onBookmark={onBookmark}
        onRepost={onRepost}
        onReact={onReact}
        shareTitle={title}
        shareId={shareId}
        isPinned={isPinned}
        onPin={onPin}
        showPinAction={showPinAction}
        privacy={privacy}
        onTogglePrivacy={onTogglePrivacy}
        showPrivacyAction={showPrivacyAction}
      />
    </View>
  );
}

export const PostCard = React.memo(PostCardComponent);

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.95,
    transform: [{scale: 0.98}],
  },
  banner: {
    width: '100%',
    height: 180,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  authorTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  authorName: {
    fontSize: 13,
    fontFamily: fonts.ui.medium,
    flexShrink: 1,
  },
  authorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: spacing.xs,
  },
  typePill: {
    borderRadius: radii.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  typeText: {
    fontSize: 11,
    fontFamily: fonts.ui.medium,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  editButtonPressed: {
    opacity: 0.8,
  },
  editButtonText: {
    fontSize: 11,
    fontFamily: fonts.ui.semiBold,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  title: {
    ...typeScale.cardTitle,
  },
  titleText: {
    flex: 1,
  },
  promptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  promptBadgeText: {
    fontSize: 11,
    fontFamily: fonts.ui.medium,
  },
  promptAttribution: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    opacity: 0.75,
    marginTop: -2,
  },
  promptAttributionText: {
    fontSize: 12,
    fontStyle: 'italic',
    fontFamily: fonts.ui.regular,
    flex: 1,
  },
  body: {
    ...typeScale.bodySmall,
    lineHeight: 20,
  },
  repostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  repostBadgeText: {
    fontSize: 12,
    fontFamily: fonts.ui.regular,
  },
  repostBadgeName: {
    fontFamily: fonts.ui.semiBold,
  },
  repostCaption: {
    fontFamily: fonts.ui.regular,
    fontSize: 14,
    lineHeight: 22,
  },
  embeddedCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  embeddedAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  embeddedAuthorName: {
    fontSize: 13,
    fontFamily: fonts.ui.semiBold,
  },
  embeddedTitle: {
    ...typeScale.cardTitle,
    fontSize: 15,
  },
  embeddedPreview: {
    ...typeScale.bodySmall,
    lineHeight: 20,
  },
  repostUnavailable: {
    fontFamily: fonts.ui.regular,
    fontSize: 13,
    fontStyle: 'italic',
  },
});
