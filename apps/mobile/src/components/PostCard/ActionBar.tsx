import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Pressable, Share, StyleSheet, Text, View} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  useReducedMotion,
} from 'react-native-reanimated';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts} from '../../theme/typography';
import {spacing} from '../../theme/spacing';
import {HeartIcon, CommentIcon, BookmarkIcon, RepostIcon, EyeIcon, ShareIcon, PinIcon, LockIcon, UnlockIcon} from '../icons';
import {getReactionEmoji} from '../../lib/reactions';
import {SpringPresets} from '../../lib/springs';
import {Haptics} from '../../lib/haptics';
import {Sounds} from '../../lib/sounds';
import {ReactionPicker} from './ReactionPicker';

interface ActionBarProps {
  likeCount: number;
  commentCount: number;
  bookmarkCount?: number;
  viewCount?: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  userReaction?: string | null;
  reactionError?: boolean;
  onLike?: () => void;
  onComment?: () => void;
  onBookmark?: () => void;
  onRepost?: () => void;
  onReact?: (type: string) => void;
  shareTitle?: string;
  shareId?: string;
  isPinned?: boolean;
  onPin?: () => void;
  showPinAction?: boolean;
  privacy?: string;
  onTogglePrivacy?: () => void;
  showPrivacyAction?: boolean;
}

export function ActionBar({
  likeCount,
  commentCount,
  bookmarkCount,
  viewCount,
  isLiked,
  isBookmarked,
  userReaction,
  reactionError,
  onLike,
  onComment,
  onBookmark,
  onRepost,
  onReact,
  shareTitle,
  shareId,
  isPinned,
  onPin,
  showPinAction,
  privacy,
  onTogglePrivacy,
  showPrivacyAction,
}: ActionBarProps) {
  const {colors} = useTheme();
  const reduceMotion = useReducedMotion();
  const [pickerOpen, setPickerOpen] = useState(false);

  const reactionEmoji = getReactionEmoji(userReaction);
  const hasReaction = !!userReaction;

  // Track previous state for animation direction
  const prevReactionRef = useRef<string | null | undefined>(userReaction);
  const prevCountRef = useRef(likeCount);

  // Animated values
  const emojiScale = useSharedValue(hasReaction ? 1 : 0);
  const countTranslateY = useSharedValue(0);
  const countOpacity = useSharedValue(1);
  const buttonScale = useSharedValue(1);
  const shakeX = useSharedValue(0);

  // Emoji spring animation on reaction change
  useEffect(() => {
    const wasReacted = !!prevReactionRef.current;
    const isReacted = !!userReaction;

    if (!wasReacted && isReacted) {
      // Adding reaction — spring in
      Haptics.tap();
      Sounds.play('reaction');
      if (!reduceMotion) {
        emojiScale.value = 0;
        emojiScale.value = withSequence(
          withSpring(1.3, SpringPresets.bouncy),
          withSpring(1, SpringPresets.gentle),
        );
      } else {
        emojiScale.value = 1;
      }
    } else if (wasReacted && !isReacted) {
      // Removing reaction — spring out
      Haptics.softTap();
      if (!reduceMotion) {
        emojiScale.value = withSpring(0, SpringPresets.snappy);
      } else {
        emojiScale.value = 0;
      }
    } else if (wasReacted && isReacted && prevReactionRef.current !== userReaction) {
      // Changing reaction type — bounce
      Haptics.tap();
      Sounds.play('reaction');
      if (!reduceMotion) {
        emojiScale.value = withSequence(
          withSpring(1.3, SpringPresets.bouncy),
          withSpring(1, SpringPresets.gentle),
        );
      }
    }

    prevReactionRef.current = userReaction;
  }, [userReaction, reduceMotion, emojiScale]);

  // Count slide animation on count change
  useEffect(() => {
    if (likeCount !== prevCountRef.current && !reduceMotion) {
      const direction = likeCount > prevCountRef.current ? -1 : 1;
      countTranslateY.value = direction * 12;
      countOpacity.value = 0;
      countTranslateY.value = withTiming(0, {duration: 150});
      countOpacity.value = withTiming(1, {duration: 150});
    }
    prevCountRef.current = likeCount;
  }, [likeCount, reduceMotion, countTranslateY, countOpacity]);

  // Error shake animation
  useEffect(() => {
    if (reactionError && !reduceMotion) {
      Haptics.error();
      shakeX.value = withSequence(
        withTiming(-4, {duration: 50}),
        withTiming(4, {duration: 50}),
        withTiming(-4, {duration: 50}),
        withTiming(4, {duration: 50}),
        withTiming(0, {duration: 50}),
      );
    }
  }, [reactionError, reduceMotion, shakeX]);

  const emojiStyle = useAnimatedStyle(() => ({
    transform: [{scale: emojiScale.value}],
  }));

  const countStyle = useAnimatedStyle(() => ({
    transform: [{translateY: countTranslateY.value}],
    opacity: countOpacity.value,
  }));

  const buttonPressStyle = useAnimatedStyle(() => ({
    transform: [{scale: buttonScale.value}],
  }));

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{translateX: shakeX.value}],
  }));

  const handlePressIn = () => {
    if (!reduceMotion) {
      buttonScale.value = withSpring(0.92, SpringPresets.snappy);
    }
  };

  const handlePressOut = () => {
    if (!reduceMotion) {
      buttonScale.value = withSpring(1, SpringPresets.bouncy);
    }
  };

  const handleQuickTap = () => {
    if (onReact) {
      if (hasReaction) {
        onReact(userReaction!);
      } else {
        onReact('heart');
      }
    } else {
      onLike?.();
    }
  };

  const handleLongPress = () => {
    if (onReact) {
      setPickerOpen(true);
    }
  };

  const handlePickerSelect = (type: string) => {
    setPickerOpen(false);
    onReact?.(type);
  };

  return (
    <View style={styles.container}>
      <ReactionPicker
        visible={pickerOpen}
        currentReaction={userReaction}
        onSelect={handlePickerSelect}
        onClose={() => setPickerOpen(false)}
      />

      <Animated.View style={[styles.bar, {borderTopColor: colors.borderCard}, shakeStyle]}>
        {/* Reaction button with spring press */}
        <Animated.View style={buttonPressStyle}>
          <Pressable
            style={styles.action}
            onPress={handleQuickTap}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onLongPress={handleLongPress}
            delayLongPress={400}
            hitSlop={8}>
            {reactionEmoji ? (
              <Animated.Text style={[styles.reactionEmoji, emojiStyle]}>
                {reactionEmoji}
              </Animated.Text>
            ) : (
              <HeartIcon
                size={18}
                color={isLiked ? colors.danger : colors.iconDefault}
                filled={isLiked}
              />
            )}
            {likeCount > 0 && (
              <Animated.Text
                style={[
                  styles.count,
                  {color: hasReaction || isLiked ? colors.danger : colors.textMuted},
                  countStyle,
                ]}>
                {likeCount}
              </Animated.Text>
            )}
          </Pressable>
        </Animated.View>

        <Pressable style={styles.action} onPress={onComment} hitSlop={8}>
          <CommentIcon size={18} color={colors.iconDefault} />
          {commentCount > 0 && (
            <Text style={[styles.count, {color: colors.textMuted}]}>
              {commentCount}
            </Text>
          )}
        </Pressable>

        <Pressable style={styles.action} onPress={onBookmark} hitSlop={8}>
          <BookmarkIcon
            size={18}
            color={isBookmarked ? colors.accentAmber : colors.iconDefault}
            filled={isBookmarked}
          />
          {(bookmarkCount ?? 0) > 0 && (
            <Text
              style={[
                styles.count,
                {color: isBookmarked ? colors.accentAmber : colors.textMuted},
              ]}>
              {bookmarkCount}
            </Text>
          )}
        </Pressable>

        <Pressable style={styles.action} onPress={onRepost} hitSlop={8}>
          <RepostIcon size={18} color={colors.iconDefault} />
        </Pressable>

        {showPinAction && onPin && (
          <Pressable style={styles.action} onPress={onPin} hitSlop={8}>
            <PinIcon
              size={18}
              color={isPinned ? colors.accentAmber : colors.iconDefault}
              filled={isPinned}
            />
          </Pressable>
        )}

        {showPrivacyAction && onTogglePrivacy && (
          <Pressable style={styles.action} onPress={onTogglePrivacy} hitSlop={8}>
            {privacy === 'private' ? (
              <LockIcon size={18} color={colors.accentAmber} />
            ) : (
              <UnlockIcon size={18} color={colors.iconDefault} />
            )}
          </Pressable>
        )}

        {shareId && (
          <Pressable
            style={styles.action}
            onPress={() => {
              const url = `https://iskrib-v3-server-production.up.railway.app/share/post/${shareId}`;
              Share.share({message: shareTitle ? `${shareTitle}\n${url}` : url, title: shareTitle || 'Check out this post on Iskrib'});
            }}
            hitSlop={8}>
            <ShareIcon size={18} color={colors.iconDefault} />
          </Pressable>
        )}

        {(viewCount ?? 0) > 0 && (
          <View style={styles.action}>
            <EyeIcon size={18} color={colors.textMuted} />
            <Text style={[styles.count, {color: colors.textMuted}]}>
              {viewCount}
            </Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.xl,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  count: {
    fontSize: 13,
    fontFamily: fonts.ui.medium,
  },
  reactionEmoji: {
    fontSize: 18,
    lineHeight: 22,
  },
});
