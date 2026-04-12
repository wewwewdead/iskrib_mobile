import React from 'react';
import renderer from 'react-test-renderer';
import {QueryErrorReset} from '../src/components/QueryErrorReset';
import {Text} from 'react-native';

// Mock the queryClient module
jest.mock('../src/lib/queryClient', () => ({
  queryClient: {
    resetQueries: jest.fn(),
  },
}));

// Mock the ThemeProvider so useTheme works without context
jest.mock('../src/theme/ThemeProvider', () => ({
  useTheme: () => ({
    theme: 'dark',
    isDark: true,
    colors: {
      textPrimary: '#FFFFFF',
      textSecondary: '#AAAAAA',
      textMuted: '#888888',
      bgPrimary: '#111111',
      bgSecondary: '#222222',
      bgCard: '#333333',
      borderLight: '#444444',
      borderCard: '#555555',
      accentAmber: '#FFB300',
      accentDark: '#333333',
      danger: '#FF4444',
      iconDefault: '#999999',
    },
    toggleTheme: jest.fn(),
    setTheme: jest.fn(),
  }),
  ThemeProvider: ({children}: {children: React.ReactNode}) => children,
}));

describe('QueryErrorReset', () => {
  it('renders children when isError is false', () => {
    let tree: renderer.ReactTestRenderer;
    renderer.act(() => {
      tree = renderer.create(
        <QueryErrorReset isError={false} queryKey={['test']}>
          <Text testID="child">Hello</Text>
        </QueryErrorReset>,
      );
    });

    const instance = tree!.root;
    // Text with testID="child" should be present — findAll may return the
    // component instance AND the host node, so just verify at least one exists
    const children = instance.findAllByProps({testID: 'child'});
    expect(children.length).toBeGreaterThanOrEqual(1);
    // Verify the actual text content
    const textNode = children.find(n => n.props.children === 'Hello');
    expect(textNode).toBeTruthy();
  });

  it('renders error state with retry button when isError is true', () => {
    let tree: renderer.ReactTestRenderer;
    renderer.act(() => {
      tree = renderer.create(
        <QueryErrorReset isError={true} queryKey={['test']}>
          <Text testID="child">Should not appear</Text>
        </QueryErrorReset>,
      );
    });

    const instance = tree!.root;

    // Children should NOT be rendered
    const children = instance.findAllByProps({testID: 'child'});
    expect(children.length).toBe(0);

    // Should have a button with accessibility label
    const retryButton = instance.findByProps({
      accessibilityLabel: 'Retry loading content',
    });
    expect(retryButton).toBeTruthy();
  });

  it('shows "We hit a snag" title in error state', () => {
    let tree: renderer.ReactTestRenderer;
    renderer.act(() => {
      tree = renderer.create(
        <QueryErrorReset isError={true} queryKey={['test']}>
          <Text>child</Text>
        </QueryErrorReset>,
      );
    });

    const json = tree!.toJSON();
    const jsonStr = JSON.stringify(json);
    expect(jsonStr).toContain('We hit a snag');
    expect(jsonStr).toContain('Tap below to try again');
  });
});
