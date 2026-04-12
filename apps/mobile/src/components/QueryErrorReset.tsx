import React from 'react';
import {StyleSheet, View} from 'react-native';
import {EmptyState} from './EmptyState';
import {PrimaryButton} from './PrimaryButton';
import {queryClient} from '../lib/queryClient';
import type {QueryKey} from '@tanstack/react-query';

type Props = {
  isError: boolean;
  children: React.ReactNode;
  queryKey: QueryKey;
};

export function QueryErrorReset({isError, children, queryKey}: Props) {
  if (!isError) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <EmptyState
        title="We hit a snag"
        subtitle="Tap below to try again"
        action={
          <View
            accessibilityRole="button"
            accessibilityLabel="Retry loading content">
            <PrimaryButton
              label="Retry"
              onPress={() => queryClient.resetQueries({queryKey})}
            />
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
});
