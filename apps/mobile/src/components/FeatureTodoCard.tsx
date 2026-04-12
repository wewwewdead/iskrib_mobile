import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {useTheme} from '../theme/ThemeProvider';
import {fonts} from '../theme/typography';

type FeatureTodoCardProps = {
  title: string;
  description: string;
};

export function FeatureTodoCard({ title, description }: FeatureTodoCardProps) {
  const {colors} = useTheme();
  return (
    <View
      style={[
        styles.card,
        {backgroundColor: colors.bgElevated, borderColor: colors.borderLight},
      ]}>
      <Text style={[styles.title, {color: colors.textPrimary}]}>{title}</Text>
      <Text style={[styles.description, {color: colors.textMuted}]}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontFamily: 'LexendDeca-Bold',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
});
