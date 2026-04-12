import React, {useCallback, useEffect, useRef} from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  runOnJS,
  useReducedMotion,
} from 'react-native-reanimated';
import {useTheme} from '../../theme/ThemeProvider';
import {spacing, radii} from '../../theme/spacing';
import {SpringPresets} from '../../lib/springs';
import {Haptics} from '../../lib/haptics';
import {REACTION_TYPES} from '../../lib/reactions';

interface ReactionPickerProps {
  visible: boolean;
  currentReaction?: string | null;
  onSelect: (type: string) => void;
  onClose: () => void;
}

function BouncyEmoji({
  emoji,
  type,
  isActive,
  activeBg,
  onSelect,
}: {
  emoji: string;
  type: string;
  isActive: boolean;
  activeBg: string;
  onSelect: (type: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const handlePress = useCallback(() => {
    Haptics.tap();
    if (reduceMotion) {
      onSelect(type);
      return;
    }
    // Bounce then select after a short delay
    scale.value = withSequence(
      withSpring(1.4, SpringPresets.bouncy),
      withSpring(1, SpringPresets.gentle),
    );
    setTimeout(() => onSelect(type), 150);
  }, [type, onSelect, reduceMotion, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  return (
    <Pressable
      style={[styles.emojiButton, isActive && {backgroundColor: activeBg}]}
      onPress={handlePress}
      hitSlop={4}>
      <ReanimatedAnimated.Text style={[styles.emoji, animStyle]}>
        {emoji}
      </ReanimatedAnimated.Text>
    </Pressable>
  );
}

export function ReactionPicker({
  visible,
  currentReaction,
  onSelect,
  onClose,
}: ReactionPickerProps) {
  const {colors} = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, opacity, scale]);

  if (!visible) return null;

  return (
    <View style={styles.wrapper}>
      {/* Overlay to capture taps outside */}
      <Pressable style={styles.overlay} onPress={onClose} />

      <Animated.View
        style={[
          styles.picker,
          {
            backgroundColor: colors.bgElevated,
            borderColor: colors.borderCard,
            opacity,
            transform: [{scale}],
          },
        ]}>
        {REACTION_TYPES.map(reaction => {
          const isActive = currentReaction === reaction.type;
          return (
            <BouncyEmoji
              key={reaction.type}
              emoji={reaction.emoji}
              type={reaction.type}
              isActive={isActive}
              activeBg={colors.bgPill}
              onSelect={onSelect}
            />
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'flex-start',
    paddingBottom: spacing.xs,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    top: -500,
    bottom: -500,
    left: -500,
    right: -500,
  },
  picker: {
    flexDirection: 'row',
    borderRadius: radii.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    marginLeft: spacing.md,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  emojiButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 22,
  },
});
