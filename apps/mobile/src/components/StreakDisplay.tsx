import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {FireIcon} from './icons';
import {useTheme} from '../theme/ThemeProvider';
import {fonts} from '../theme/typography';
import {spacing, radii} from '../theme/spacing';

interface StreakDisplayProps {
  currentStreak?: number;
  longestStreak?: number;
}

export function StreakDisplay({currentStreak, longestStreak}: StreakDisplayProps) {
  const {colors} = useTheme();

  if (!currentStreak && !longestStreak) return null;

  return (
    <View style={[styles.container, {backgroundColor: `${colors.accentAmber}1A`, borderColor: `${colors.accentAmber}33`}]}>
      <View style={styles.row}>
        <FireIcon size={20} color={colors.accentAmber} />
        <View style={styles.info}>
          <Text style={[styles.current, {color: colors.accentAmber}]}>{currentStreak ?? 0} day streak</Text>
          {longestStreak != null && longestStreak > 0 && (
            <Text style={[styles.longest, {color: colors.textMuted}]}>
              Longest: {longestStreak} days
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  info: {gap: 2},
  current: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 14,
  },
  longest: {
    fontFamily: fonts.ui.regular,
    fontSize: 11,
  },
});
