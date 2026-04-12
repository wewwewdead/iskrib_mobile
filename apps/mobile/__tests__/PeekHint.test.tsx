import React from 'react';
import renderer from 'react-test-renderer';

// Mock useQuery before importing PeekHint. We drive the test by controlling
// what useQuery returns per scenario.
const mockUseQuery = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

const mockInvalidateQueries = jest.fn();
jest.mock('../src/lib/queryClient', () => ({
  queryClient: {
    invalidateQueries: (...args: unknown[]) => mockInvalidateQueries(...args),
  },
}));

// Mock AsyncStorage with manual overrides (the global jest.setup.js mock
// persists a store across tests, which interferes with per-test isolation).
const mockSetItem = jest.fn().mockResolvedValue(undefined);
const mockGetItem = jest.fn().mockResolvedValue(null);
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: (...args: unknown[]) => mockSetItem(...args),
    getItem: (...args: unknown[]) => mockGetItem(...args),
  },
}));

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
}));

// haptics imports react-native-haptic-feedback which needs a native module.
// Stub it out.
jest.mock('../src/lib/haptics', () => ({
  tapHaptic: jest.fn(),
}));

jest.mock('../src/theme/ThemeProvider', () => ({
  useTheme: () => ({
    colors: {
      bgSecondary: '#F3F1ED',
      borderCard: '#E5E0D8',
      textSecondary: '#6B6560',
      textMuted: '#A8A29E',
      accentGold: '#C4943E',
    },
  }),
}));

jest.mock('../src/components/icons', () => {
  const {createElement} = require('react');
  return {
    XIcon: (props: Record<string, unknown>) => createElement('XIcon', props),
  };
});

import {PeekHint} from '../src/components/PeekModal/PeekHint';
import {PEEK_HINT_SEEN_KEY} from '../src/components/PeekModal/PeekHint';

const mount = () => {
  let tree: renderer.ReactTestRenderer;
  renderer.act(() => {
    tree = renderer.create(<PeekHint />);
  });
  return tree!;
};

describe('PeekHint', () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockInvalidateQueries.mockReset();
    mockSetItem.mockClear();
    mockGetItem.mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // [TEST #31] Renders null when PEEK_HINT_SEEN_KEY === 'true'.
  it('renders null when useQuery returns true (already seen)', () => {
    mockUseQuery.mockReturnValue({data: 'true'});
    const tree = mount();
    expect(tree.toJSON()).toBeNull();
  });

  // [TEST #31b] Renders null while query is still loading (data === undefined).
  it('renders null while useQuery data is undefined (loading)', () => {
    mockUseQuery.mockReturnValue({data: undefined});
    const tree = mount();
    expect(tree.toJSON()).toBeNull();
  });

  // [TEST #32] Renders the banner when useQuery returns null (unset).
  it('renders the banner when useQuery returns null (unset)', () => {
    mockUseQuery.mockReturnValue({data: null});
    const tree = mount();
    expect(tree.toJSON()).not.toBeNull();

    const hint = tree.root.findAllByProps({testID: 'peek-hint'});
    expect(hint.length).toBeGreaterThanOrEqual(1);
  });

  // [TEST #33] Auto-dismisses after 10s: writes the key and invalidates
  // the query.
  it('auto-dismisses after 10 seconds via the setTimeout path', () => {
    mockUseQuery.mockReturnValue({data: null});
    mount();

    // Fast-forward past the 10s auto-dismiss threshold.
    renderer.act(() => {
      jest.advanceTimersByTime(10_000);
    });

    expect(mockSetItem).toHaveBeenCalledWith(PEEK_HINT_SEEN_KEY, 'true');
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['peekHintSeen'],
    });
  });

  // [TEST #34] X tap writes the key and invalidates the query.
  it('X tap writes the key and invalidates the query', () => {
    mockUseQuery.mockReturnValue({data: null});
    const tree = mount();

    const dismissButton = tree.root.findByProps({testID: 'peek-hint-dismiss'});
    renderer.act(() => {
      dismissButton.props.onPress();
    });

    expect(mockSetItem).toHaveBeenCalledWith(PEEK_HINT_SEEN_KEY, 'true');
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['peekHintSeen'],
    });
  });

  // [TEST #35] CRITICAL: external dismiss. usePeekModal writes the key and
  // invalidates the query; PeekHint's useQuery re-runs and returns 'true',
  // which causes the component to render null on the next render. We
  // simulate this via mockUseQuery returning 'true' on re-render.
  it('hides on next render when external key write happens', () => {
    // First render: banner visible.
    mockUseQuery.mockReturnValue({data: null});
    let tree: renderer.ReactTestRenderer;
    renderer.act(() => {
      tree = renderer.create(<PeekHint />);
    });
    expect(tree!.toJSON()).not.toBeNull();

    // Simulate external invalidation: useQuery now returns 'true'.
    mockUseQuery.mockReturnValue({data: 'true'});
    renderer.act(() => {
      tree!.update(<PeekHint />);
    });

    expect(tree!.toJSON()).toBeNull();
  });
});
