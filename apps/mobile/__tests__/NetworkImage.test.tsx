import React from 'react';
import renderer from 'react-test-renderer';
import {NetworkImage} from '../src/components/NetworkImage';

// Mock ThemeProvider
jest.mock('../src/theme/ThemeProvider', () => ({
  useTheme: () => ({
    theme: 'dark',
    isDark: true,
    colors: {
      bgSecondary: '#222222',
      iconDefault: '#999999',
    },
  }),
}));

// Mock SkeletonLoader — must use require() inside factory to avoid out-of-scope var errors
jest.mock('../src/components/SkeletonLoader', () => {
  const {createElement} = require('react');
  return {
    SkeletonLoader: (props: Record<string, unknown>) =>
      createElement('SkeletonLoader', props),
  };
});

// Mock icons
jest.mock('../src/components/icons', () => {
  const {createElement} = require('react');
  return {
    ImageIcon: (props: Record<string, unknown>) =>
      createElement('ImageIcon', props),
  };
});

// Override the broken react-native-reanimated mock for this file
// The global mock in jest.setup.js tries to load reanimated/mock which
// transitively imports react-native-worklets native code.
jest.mock('react-native-reanimated', () => {
  const {View} = require('react-native');
  return {
    __esModule: true,
    default: {
      createAnimatedComponent: (comp: unknown) => comp,
      call: () => {},
      Value: jest.fn(),
      event: jest.fn(),
      add: jest.fn(),
      eq: jest.fn(),
      not: jest.fn(),
      set: jest.fn(),
      cond: jest.fn(),
      interpolate: jest.fn(),
      View,
      ScrollView: View,
      Image: require('react-native').Image,
      FlatList: View,
      Extrapolate: {CLAMP: 'clamp'},
    },
    createAnimatedComponent: (comp: unknown) => comp,
    useSharedValue: (init: unknown) => ({value: init}),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    withTiming: (value: unknown) => value,
    withSpring: (value: unknown) => value,
    interpolate: jest.fn(),
    Easing: {
      linear: jest.fn(),
      ease: jest.fn(),
      bezier: jest.fn().mockReturnValue(jest.fn()),
    },
  };
});

describe('NetworkImage', () => {
  it('renders skeleton loader when URI is provided (loading state)', () => {
    let tree: renderer.ReactTestRenderer;
    renderer.act(() => {
      tree = renderer.create(
        <NetworkImage
          uri="https://example.com/photo.jpg"
          accessibilityLabel="Test photo"
          style={{width: 100, height: 100}}
        />,
      );
    });

    const json = tree!.toJSON();
    const jsonStr = JSON.stringify(json);

    // Should have the skeleton loader in the tree (loading state before onLoad fires)
    expect(jsonStr).toContain('SkeletonLoader');

    // Accessibility label should reflect loading state
    const instance = tree!.root;
    const container = instance.findByProps({accessibilityLabel: 'Image loading'});
    expect(container).toBeTruthy();
  });

  it('shows placeholder when URI is null', () => {
    let tree: renderer.ReactTestRenderer;
    renderer.act(() => {
      tree = renderer.create(
        <NetworkImage
          uri={null}
          accessibilityLabel="Missing photo"
          style={{width: 100, height: 100}}
        />,
      );
    });

    const json = tree!.toJSON();
    const jsonStr = JSON.stringify(json);

    // Placeholder icon should render
    expect(jsonStr).toContain('ImageIcon');

    // No skeleton loader since there is no URI to load
    expect(jsonStr).not.toContain('SkeletonLoader');

    // Accessibility label should reflect unavailable state
    const instance = tree!.root;
    const container = instance.findByProps({
      accessibilityLabel: 'Image unavailable',
    });
    expect(container).toBeTruthy();
  });

  it('renders Image component with correct source when URI is provided', () => {
    let tree: renderer.ReactTestRenderer;
    renderer.act(() => {
      tree = renderer.create(
        <NetworkImage
          uri="https://example.com/photo.jpg"
          accessibilityLabel="Test photo"
          style={{width: 100, height: 100}}
        />,
      );
    });

    const instance = tree!.root;

    // Find the image with the correct source URI
    const images = instance.findAll(
      node =>
        node.props.source &&
        node.props.source.uri === 'https://example.com/photo.jpg',
    );
    expect(images.length).toBeGreaterThan(0);

    // Verify cache policy
    expect(images[0].props.source).toEqual({
      uri: 'https://example.com/photo.jpg',
      cache: 'force-cache',
    });
  });
});
