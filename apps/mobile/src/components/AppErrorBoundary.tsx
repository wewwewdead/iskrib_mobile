import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Sentry from '@sentry/react-native';
import {useTheme} from '../theme/ThemeProvider';
import {fonts} from '../theme/typography';

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string | null;
};

// Functional fallback so we can use the useTheme hook inside a class component boundary.
function ErrorFallback({
  errorMessage,
  onRetry,
}: {
  errorMessage: string | null;
  onRetry: () => void;
}) {
  const {colors} = useTheme();
  return (
    <View
      style={[styles.container, {backgroundColor: colors.bgPrimary}]}>
      <Text style={[styles.title, {color: colors.textPrimary}]}>Something went wrong</Text>
      <Text style={[styles.body, {color: colors.textMuted}]}>
        The app hit an unexpected runtime error. Try again or restart the app.
      </Text>
      {!!errorMessage && __DEV__ && (
        <Text style={[styles.errorText, {color: colors.danger}]}>{errorMessage}</Text>
      )}
      <Pressable
        onPress={onRetry}
        style={({pressed}) => [
          styles.button,
          {backgroundColor: colors.accentAmber},
          pressed && styles.buttonPressed,
        ]}>
        <Text style={[styles.buttonText, {color: '#FFFFFF'}]}>Try again</Text>
      </Pressable>
    </View>
  );
}

export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
    errorMessage: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Unexpected error',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Keep crash context visible in development while showing a user-safe fallback.
    console.error('[AppErrorBoundary] Unhandled runtime error', error);
    Sentry.captureException(error, {extra: {componentStack: errorInfo.componentStack}});
  }

  private onRetry = () => {
    this.setState({
      hasError: false,
      errorMessage: null,
    });
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <ErrorFallback
        errorMessage={this.state.errorMessage}
        onRetry={this.onRetry}
      />
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.heading.bold,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 340,
  },
  errorText: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 340,
  },
  button: {
    marginTop: 4,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontFamily: fonts.ui.bold,
    fontSize: 14,
  },
});
