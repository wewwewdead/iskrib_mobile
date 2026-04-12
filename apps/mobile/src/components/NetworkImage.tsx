import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageProps,
  type ImageStyle,
  type StyleProp,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
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

type ImageStatus = 'loading' | 'success' | 'error';

type SharedImageFrameProps = {
  accessibilityLabel: string;
  children: React.ReactNode;
  showPlaceholder: boolean;
  showSkeleton: boolean;
  style?: StyleProp<ImageStyle>;
  status: ImageStatus;
};

const AnimatedImage = Animated.createAnimatedComponent(Image);

function useImageStatus(uri: string | null | undefined) {
  const [status, setStatus] = useState<ImageStatus>(uri ? 'loading' : 'error');

  useEffect(() => {
    setStatus(uri ? 'loading' : 'error');
  }, [uri]);

  return {status, setStatus};
}

function SharedImageFrame({
  accessibilityLabel,
  children,
  showPlaceholder,
  showSkeleton,
  style,
  status,
}: SharedImageFrameProps) {
  const {colors} = useTheme();

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
            style={styles.skeletonFill}
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

      {children}
    </View>
  );
}

function StaticNetworkImage({
  uri,
  style,
  accessibilityLabel,
  ...rest
}: Omit<Props, 'disableFadeIn'>) {
  const {status, setStatus} = useImageStatus(uri);

  const handleLoad = useCallback(() => {
    setStatus('success');
  }, [setStatus]);

  const handleError = useCallback(() => {
    setStatus('error');
  }, [setStatus]);

  const imageElement = useMemo(
    () =>
      uri ? (
        <Image
          {...rest}
          source={{uri, cache: 'force-cache'}}
          style={StyleSheet.absoluteFill}
          onLoad={handleLoad}
          onError={handleError}
          accessibilityLabel={accessibilityLabel}
        />
      ) : null,
    [accessibilityLabel, handleError, handleLoad, rest, uri],
  );

  return (
    <SharedImageFrame
      accessibilityLabel={accessibilityLabel}
      showPlaceholder={status === 'error' || !uri}
      showSkeleton={status === 'loading' && !!uri}
      status={status}
      style={style}>
      {imageElement}
    </SharedImageFrame>
  );
}

function FadingNetworkImage({
  uri,
  style,
  accessibilityLabel,
  ...rest
}: Omit<Props, 'disableFadeIn'>) {
  const {status, setStatus} = useImageStatus(uri);
  const opacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleLoad = useCallback(() => {
    setStatus('success');
    opacity.value = withTiming(1, {duration: 200});
  }, [opacity, setStatus]);

  const handleError = useCallback(() => {
    setStatus('error');
  }, [setStatus]);

  useEffect(() => {
    opacity.value = 0;
  }, [opacity, uri]);

  const imageElement = useMemo(
    () =>
      uri ? (
        <AnimatedImage
          {...rest}
          source={{uri, cache: 'force-cache'}}
          style={[StyleSheet.absoluteFill, animatedStyle]}
          onLoad={handleLoad}
          onError={handleError}
          accessibilityLabel={accessibilityLabel}
        />
      ) : null,
    [accessibilityLabel, animatedStyle, handleError, handleLoad, rest, uri],
  );

  return (
    <SharedImageFrame
      accessibilityLabel={accessibilityLabel}
      showPlaceholder={status === 'error' || !uri}
      showSkeleton={status === 'loading' && !!uri}
      status={status}
      style={style}>
      {imageElement}
    </SharedImageFrame>
  );
}

/**
 * Network image wrapper with:
 * - SkeletonLoader shimmer while loading
 * - Warm bgSecondary placeholder + faint icon on error
 * - 200ms fadeIn on success (prevents pop-in)
 * - Null URI → placeholder immediately
 */
export function NetworkImage({
  disableFadeIn,
  ...props
}: Props) {
  if (disableFadeIn) {
    return <StaticNetworkImage {...props} />;
  }

  return <FadingNetworkImage {...props} />;
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonFill: {
    flex: 1,
  },
});
