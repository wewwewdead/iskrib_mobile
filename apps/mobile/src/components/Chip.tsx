import React from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import {useTheme} from '../theme/ThemeProvider';
import {fonts} from '../theme/typography';
import {spacing, radii} from '../theme/spacing';
import {Haptics} from '../lib/haptics';

interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
}

export function Chip({label, active, onPress}: ChipProps) {
  const {colors} = useTheme();

  return (
    <Pressable
      onPress={() => {
        Haptics.selection();
        onPress?.();
      }}
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.accentAmber : colors.bgPill,
          borderColor: active ? colors.accentAmber : colors.borderLight,
        },
      ]}>
      <Text
        style={[
          styles.label,
          {
            color: active ? colors.textOnAccent : colors.textSecondary,
          },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
  },
  label: {
    fontSize: 13,
    fontFamily: fonts.ui.medium,
  },
});
