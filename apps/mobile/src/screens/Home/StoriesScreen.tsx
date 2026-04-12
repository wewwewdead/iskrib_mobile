import React from 'react';
import {StyleSheet, Text} from 'react-native';
import {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {FeatureTodoCard} from '../../components/FeatureTodoCard';
import {Screen} from '../../components/Screen';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts} from '../../theme/typography';
import type {MainTabParamList} from '../../navigation/types';

type Props = BottomTabScreenProps<MainTabParamList, 'Stories'>;

export function StoriesScreen(_: Props) {
  const {colors} = useTheme();
  return (
    <Screen>
      <Text style={[styles.title, {color: colors.textPrimary}]}>Stories</Text>
      <FeatureTodoCard
        title="Story browser/editor"
        description="Story library, dashboard, chapter manager, reader, and chapter editor routes are planned on top of this shell."
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontFamily: fonts.heading.bold,
  },
});
