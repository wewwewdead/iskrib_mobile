/**
 * WritingPresenceBar — shows who's currently writing on Iskrib.
 *
 * Benji Taylor philosophy: presence. The feed should feel alive — like a
 * writing community that's breathing. Avatars pulse gently. The bar
 * collapses to zero height when nobody is writing (no "0 writing now").
 * Springs in/out on connection state changes.
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Animated from 'react-native-reanimated';
import {useTheme} from '../theme/ThemeProvider';
import {fonts} from '../theme/typography';
import {spacing} from '../theme/spacing';
import {useSpringEntry} from '../lib/springs';

interface PresenceUser {
  userId: string;
  username: string;
  avatarUrl: string | null;
}

interface WritingPresenceBarProps {
  users: PresenceUser[];
  onUserPress?: (userId: string) => void;
}

function PresenceAvatar({
  user,
  index,
  onPress,
}: {
  user: PresenceUser;
  index: number;
  onPress?: () => void;
}) {
  const {colors} = useTheme();
  // Staggered fade-in instead of synchronized breathing — each avatar enters sequentially
  const entryStyle = useSpringEntry(index * 200);

  const initial = (user.username || '?')[0].toUpperCase();
  const bgColors = [colors.accentGold, colors.accentSage, colors.statEngagement, colors.accentAmber];
  const bgColor = bgColors[index % bgColors.length];

  return (
    <Pressable onPress={onPress} hitSlop={12}>
      <Animated.View
        style={[
          styles.avatar,
          {
            backgroundColor: bgColor,
            borderColor: colors.bgSecondary,
            marginLeft: index === 0 ? 0 : -8,
          },
          entryStyle,
        ]}>
        <Text style={styles.avatarText}>{initial}</Text>
      </Animated.View>
    </Pressable>
  );
}

export function WritingPresenceBar({users, onUserPress}: WritingPresenceBarProps) {
  const {colors} = useTheme();

  if (users.length === 0) {
    return null;
  }

  const names = users.map(u => u.username);
  let label: string;
  if (names.length === 1) {
    label = `${names[0]} is writing...`;
  } else if (names.length === 2) {
    label = `${names[0]} & ${names[1]} are writing...`;
  } else {
    label = `${names[0]}, ${names[1]} & ${names.length - 2} more are writing...`;
  }

  return (
    <View
      style={[styles.container, {backgroundColor: colors.bgSecondary}]}
      accessibilityLabel={label}>
      <View style={styles.avatarsStack}>
        {users.slice(0, 5).map((user, index) => (
          <PresenceAvatar
            key={user.userId}
            user={user}
            index={index}
            onPress={() => onUserPress?.(user.userId)}
          />
        ))}
      </View>
      <Text style={[styles.label, {color: colors.textMuted}]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  avatarsStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 10,
    color: '#FFFFFF',
  },
  label: {
    fontFamily: fonts.ui.regular,
    fontSize: 12,
    flex: 1,
  },
});
