import React, {useCallback, useEffect, useState} from 'react';
import {Image, StyleSheet, View, type ImageProps, type ImageStyle, type StyleProp} from 'react-native';
import Animated, {useSharedValue, withTiming, useAnimatedStyle} from 'react-native-reanimated';
import {useTheme} from '../theme/ThemeProvider';
import {SkeletonLoader} from './SkeletonLoader';
import {ImageIcon} from './icons';

type Props = Omit<ImageProps, 'source'> & {
  uri: string | null | undefined;
  style?: StyleProp<ImageStyle>;
  accessibilityLabel: string;
  /**
   * Skip the 200ms opacity fade-in on load. Recommended for image grids
   * where (a) per-image animations are perf overhead during fast scroll
   * and (b) cached image loads can race with the opacity listener and
   * leave the image stuck at opacity 0.
   */
  disableFadeIn?: boolean;
};

const AnimatedImage = Animated.createAnimatedComponent(Image);

/**
 * Network image wrapper with:
 * - SkeletonLoader shimmer while loading
 * - Warm bgSecondary placeholder + faint icon on error
 * - 200ms fadeIn on success (prevents pop-in)
 * - Null URI → placeholder immediately
 */
export function NetworkImage({
  uri,
  style,
  accessibilityLabel,
  disableFadeIn,
  ...rest
}: Props) {
  const {colors} = useTheme();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    uri ? 'loading' : 'error',
  );
  const opacity = useSharedValue(disableFadeIn ? 1 : 0);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleLoad = useCallback(() => {
    setStatus('success');
    if (!disableFadeIn) {
      opacity.value = withTiming(1, {duration: 200});
    }
  }, [disableFadeIn, opacity]);

  const handleError = useCallback(() => {
    setStatus('error');
  }, []);

  useEffect(() => {
    setStatus(uri ? 'loading' : 'error');
    opacity.value = disableFadeIn ? 1 : 0;
  }, [disableFadeIn, opacity, uri]);

  const showPlaceholder = status === 'error' || !uri;
  const showSkeleton = status === 'loading' && !!uri;

  const a11yLabel =
    status === 'loading'
      ? 'Image loading'
      : status === 'error'
        ? 'Image unavailable'
        : accessibilityLabel;

  return (
    <View
      style={[styles.container, style]}
      accessibilityLabel={a11yLabel}
      accessible>
      {showSkeleton && (
        <View style={StyleSheet.absoluteFill}>
          <SkeletonLoader
            width="100%"
            style={{flex: 1}}
          />
        </View>
      )}

      {showPlaceholder && (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.placeholder,
            {backgroundColor: colors.bgSecondary},
          ]}>
          <ImageIcon size={24} color={colors.iconDefault} />
        </View>
      )}

      {uri && (
        <AnimatedImage
          {...rest}
          source={{uri, cache: 'force-cache'}}
          style={[StyleSheet.absoluteFill, animatedStyle]}
          onLoad={handleLoad}
          onError={handleError}
          accessibilityLabel={accessibilityLabel}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
