import React from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  type TextInputProps,
} from 'react-native';
import {useTheme} from '../theme/ThemeProvider';
import {fonts} from '../theme/typography';
import {spacing, radii} from '../theme/spacing';
import {SearchIcon, XIcon} from './icons';

interface SearchInputProps extends Omit<TextInputProps, 'style'> {
  containerStyle?: any;
  value?: string;
  onChangeText?: (text: string) => void;
}

export function SearchInput({
  containerStyle,
  value,
  onChangeText,
  ...props
}: SearchInputProps) {
  const {colors} = useTheme();

  return (
    <View
      style={[
        styles.container,
        {backgroundColor: colors.bgSecondary, borderColor: colors.borderLight},
        containerStyle,
      ]}>
      <SearchIcon size={18} color={colors.textMuted} />
      <TextInput
        style={[styles.input, {color: colors.textPrimary}]}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        {...props}
      />
      {value && value.length > 0 && onChangeText && (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <XIcon size={16} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    height: 44,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.ui.regular,
    padding: 0,
  },
});
