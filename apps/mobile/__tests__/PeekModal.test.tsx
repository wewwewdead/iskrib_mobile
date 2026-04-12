import React from 'react';
import renderer from 'react-test-renderer';
import type {JournalItem} from '../src/lib/api/mobileApi';

// Override the global reanimated mock from jest.setup.js with a simpler
// manual one that stubs exactly what PeekModal imports. The global mock
// (reanimated/mock) has a known issue with createSerializable on the
// current version that breaks any test importing Animated or the hook
// APIs directly.
jest.mock('react-native-reanimated', () => {
  const {createElement} = require('react');
  const {View} = require('react-native');
  const identity = (target: unknown) => target;
  return {
    __esModule: true,
    default: {
      View: (props: Record<string, unknown>) => createElement(View, props),
    },
    View: (props: Record<string, unknown>) => createElement(View, props),
    useSharedValue: (initial: unknown) => ({value: initial}),
    useAnimatedStyle: (fn: () => unknown) => {
      try {
        return fn();
      } catch {
        return {};
      }
    },
    withSpring: identity,
    withTiming: identity,
    withDelay: (_delay: number, value: unknown) => value,
    Easing: {
      out: () => (n: number) => n,
      cubic: (n: number) => n,
      quad: (n: number) => n,
      ease: (n: number) => n,
      inOut: () => (n: number) => n,
    },
    useReducedMotion: () => false,
  };
});

// Mocks BEFORE importing PeekModal. Jest hoists jest.mock() calls to the
// top of the file, but the import order still matters for referenced
// variables inside the factory.

const mockUseQuery = jest.fn();
const mockViewMutate = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => ({mutate: mockViewMutate}),
}));

const mockAddBreadcrumb = jest.fn();
jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: (...args: unknown[]) => mockAddBreadcrumb(...args),
}));

jest.mock('../src/features/auth/AuthProvider', () => ({
  useAuth: () => ({user: {id: 'user-abc'}}),
}));

jest.mock('../src/theme/ThemeProvider', () => ({
  useTheme: () => ({
    colors: {
      bgPrimary: '#FAF9F6',
      bgElevated: '#FFFFFF',
      bgSecondary: '#F3F1ED',
      borderCard: '#E5E0D8',
      textPrimary: '#1A1612',
      textSecondary: '#6B6560',
      textHeading: '#12100D',
      textMuted: '#A8A29E',
      accentGold: '#C4943E',
    },
  }),
}));

jest.mock('../src/lib/content/LexicalRenderer', () => {
  const {createElement} = require('react');
  return {
    LexicalRenderer: (props: {content: string}) =>
      createElement('LexicalRenderer', {content: props.content}),
  };
});

jest.mock('../src/components/Avatar', () => {
  const {createElement} = require('react');
  return {
    Avatar: (props: Record<string, unknown>) => createElement('Avatar', props),
  };
});

jest.mock('../src/components/NetworkImage', () => {
  const {createElement} = require('react');
  return {
    NetworkImage: (props: Record<string, unknown>) =>
      createElement('NetworkImage', props),
  };
});

jest.mock('../src/components/icons', () => {
  const {createElement} = require('react');
  return {
    XIcon: (props: Record<string, unknown>) => createElement('XIcon', props),
  };
});

import {PeekModal} from '../src/components/PeekModal/PeekModal';

const makePost = (overrides: Partial<JournalItem> = {}): JournalItem =>
  ({
    id: 'post-1',
    title: 'Test post',
    content: null,
    preview_text: 'A short preview of the post body.',
    users: {id: 'author-1', name: 'Author Name'},
    ...overrides,
  }) as JournalItem;

const mountWithPost = (
  post: JournalItem | null,
  onClose: jest.Mock = jest.fn(),
  onOpenFull: jest.Mock = jest.fn(),
) => {
  let tree: renderer.ReactTestRenderer;
  renderer.act(() => {
    tree = renderer.create(
      <PeekModal post={post} onClose={onClose} onOpenFull={onOpenFull} />,
    );
  });
  return {tree: tree!, onClose, onOpenFull};
};

describe('PeekModal', () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockViewMutate.mockReset();
    mockAddBreadcrumb.mockReset();

    // Default: idle query — useful when content is populated on the post.
    mockUseQuery.mockReturnValue({
      data: undefined,
      isFetching: false,
      isError: false,
      isSuccess: false,
      error: null,
    });
  });

  // [TEST #15] Renders null when post is null.
  it('renders nothing when post is null', () => {
    const {tree} = mountWithPost(null);
    expect(tree.toJSON()).toBeNull();
    expect(mockViewMutate).not.toHaveBeenCalled();
  });

  it('fires addViews exactly once per peek-open, keyed by post id', () => {
    const post = makePost({content: 'Full body'});
    mountWithPost(post);
    expect(mockViewMutate).toHaveBeenCalledTimes(1);
    expect(mockViewMutate).toHaveBeenCalledWith('post-1');
  });

  // [TEST #16] Renders LexicalRenderer with post.content when populated.
  it('renders LexicalRenderer with populated content (zero network)', () => {
    const post = makePost({content: 'Full post body content'});
    const {tree} = mountWithPost(post);

    // LexicalRenderer is mounted with the populated content.
    const lexical = tree.root.findByType(
      'LexicalRenderer' as unknown as React.ComponentType,
    );
    expect(lexical.props.content).toBe('Full post body content');

    // No skeleton, no fallback.
    expect(tree.root.findAllByProps({testID: 'peek-skeleton'}).length).toBe(0);
    expect(tree.root.findAllByProps({testID: 'peek-fallback'}).length).toBe(0);

    // useQuery should still be called, but with enabled: false because
    // shouldFetch is false when content is populated.
    expect(mockUseQuery).toHaveBeenCalled();
    const queryArg = mockUseQuery.mock.calls[0][0];
    expect(queryArg.enabled).toBe(false);
    expect(queryArg.queryKey).toEqual(['journal', 'post-1', 'user-abc']);
  });

  // [TEST #17] Triggers fetch path when post.content is null.
  it('enables the fetch query when content is null', () => {
    const post = makePost({content: null});
    mockUseQuery.mockReturnValue({
      data: undefined,
      isFetching: true,
      isError: false,
      isSuccess: false,
      error: null,
    });

    mountWithPost(post);

    const queryArg = mockUseQuery.mock.calls[0][0];
    expect(queryArg.enabled).toBe(true);
  });

  // [TEST #18] Empty-string content is treated the same as null (triggers fetch).
  it('enables the fetch query when content is empty string', () => {
    const post = makePost({content: ''});
    mockUseQuery.mockReturnValue({
      data: undefined,
      isFetching: true,
      isError: false,
      isSuccess: false,
      error: null,
    });

    mountWithPost(post);

    const queryArg = mockUseQuery.mock.calls[0][0];
    expect(queryArg.enabled).toBe(true);
  });

  // [TEST #19] Shows skeleton while the fetch is in flight.
  it('shows the skeleton while the query is fetching', () => {
    const post = makePost({content: null});
    mockUseQuery.mockReturnValue({
      data: undefined,
      isFetching: true,
      isError: false,
      isSuccess: false,
      error: null,
    });

    const {tree} = mountWithPost(post);

    // Skeleton present (use >= 1 because RTR 19 can return duplicate matches
    // for testID props — one for the function component, one for the host
    // output).
    expect(
      tree.root.findAllByProps({testID: 'peek-skeleton'}).length,
    ).toBeGreaterThanOrEqual(1);

    // No LexicalRenderer mounted during fetch.
    expect(
      tree.root.findAllByType(
        'LexicalRenderer' as unknown as React.ComponentType,
      ).length,
    ).toBe(0);

    expect(tree.root.findAllByProps({testID: 'peek-fallback'}).length).toBe(0);
  });

  // [TEST #20] Replaces skeleton with LexicalRenderer on successful fetch.
  it('renders LexicalRenderer with fetched content on query success', () => {
    const post = makePost({content: null});
    mockUseQuery.mockReturnValue({
      data: {journal: {id: 'post-1', title: 'Test post', content: 'Fetched body'}},
      isFetching: false,
      isError: false,
      isSuccess: true,
      error: null,
    });

    const {tree} = mountWithPost(post);

    const lexical = tree.root.findByType(
      'LexicalRenderer' as unknown as React.ComponentType,
    );
    expect(lexical.props.content).toBe('Fetched body');
    expect(tree.root.findAllByProps({testID: 'peek-skeleton'}).length).toBe(0);
  });

  // [TEST #21] [CRITICAL — 2am Friday test] Falls back to preview_text on
  // fetch error and logs a Sentry breadcrumb.
  it('falls back to preview_text on query error', () => {
    const post = makePost({content: null, preview_text: 'Preview fallback text'});
    mockUseQuery.mockReturnValue({
      data: undefined,
      isFetching: false,
      isError: true,
      isSuccess: false,
      error: new Error('Network error'),
    });

    const {tree} = mountWithPost(post);

    const fallback = tree.root.findByProps({testID: 'peek-fallback'});
    const fallbackTexts = fallback.findAllByType('Text' as any);
    const combined = fallbackTexts.map(t => t.children.join('')).join(' ');
    expect(combined).toContain('Preview fallback text');

    // No LexicalRenderer, no skeleton.
    expect(
      tree.root.findAllByProps({testID: 'peek-body-content'}).length,
    ).toBe(0);
    expect(tree.root.findAllByProps({testID: 'peek-skeleton'}).length).toBe(0);

    // Sentry breadcrumb fired.
    expect(mockAddBreadcrumb).toHaveBeenCalled();
  });

  // [TEST #21b] Fetch succeeds but returns empty content — same fallback.
  it('falls back to preview_text when fetch returns empty content', () => {
    const post = makePost({content: null, preview_text: 'Preview fallback'});
    mockUseQuery.mockReturnValue({
      data: {journal: {id: 'post-1', title: 'T', content: ''}},
      isFetching: false,
      isError: false,
      isSuccess: true,
      error: null,
    });

    const {tree} = mountWithPost(post);

    expect(
      tree.root.findAllByProps({testID: 'peek-fallback'}).length,
    ).toBeGreaterThanOrEqual(1);
    // And no LexicalRenderer should be mounted.
    expect(
      tree.root.findAllByType(
        'LexicalRenderer' as unknown as React.ComponentType,
      ).length,
    ).toBe(0);
  });

  // [TEST #22] [CRITICAL — fetch-race test] Discards stale query when
  // post.id changes. Verified via the query key: a new post remounts the
  // PeekModal (visible:true->false->true pattern) and useQuery sees a new
  // key, so react-query discards the old result automatically.
  it('keys useQuery by user.id and post.id (fetch-race guard)', () => {
    const post = makePost({id: 'post-1', content: null});
    mountWithPost(post);

    const queryArg = mockUseQuery.mock.calls[0][0];
    expect(queryArg.queryKey).toEqual(['journal', 'post-1', 'user-abc']);
  });

  // [TEST #24] Peek of a repost card reads content from repost_source.
  it('renders content from repost_source when post.is_repost is true', () => {
    const post = makePost({
      id: 'repost-1',
      is_repost: true,
      content: null,
      repost_source: {
        id: 'original-1',
        title: 'Original title',
        content: 'Original body content',
      } as JournalItem,
    });

    const {tree} = mountWithPost(post);

    const lexical = tree.root.findByType(
      'LexicalRenderer' as unknown as React.ComponentType,
    );
    expect(lexical.props.content).toBe('Original body content');
  });

  // [TEST #30] "Open full →" fires onOpenFull with post.id (not repost
  // source id — the caller handles repost navigation).
  it('fires onOpenFull with post.id when Open full is tapped', () => {
    const post = makePost({content: 'body'});
    const {tree, onOpenFull} = mountWithPost(post);

    const openFull = tree.root.findByProps({testID: 'peek-open-full'});
    renderer.act(() => {
      openFull.props.onPress();
    });

    expect(onOpenFull).toHaveBeenCalledWith('post-1');
  });

  // [TEST #26] Tap backdrop fires onClose.
  it('fires onClose when backdrop is tapped', () => {
    const post = makePost({content: 'body'});
    const {tree, onClose} = mountWithPost(post);

    const backdrop = tree.root.findByProps({testID: 'peek-backdrop'});
    renderer.act(() => {
      backdrop.props.onPress();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // [TEST #27] Tap close button fires onClose.
  it('fires onClose when the close button is tapped', () => {
    const post = makePost({content: 'body'});
    const {tree, onClose} = mountWithPost(post);

    const close = tree.root.findByProps({testID: 'peek-close'});
    renderer.act(() => {
      close.props.onPress();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // [TEST #28] Close button has accessible label.
  it('declares an accessibilityLabel on the close button', () => {
    const post = makePost({content: 'body'});
    const {tree} = mountWithPost(post);

    const close = tree.root.findByProps({testID: 'peek-close'});
    expect(close.props.accessibilityLabel).toBe('Close peek');
  });

  // [TEST #29] Accepting a sourceRect prop doesn't break rendering —
  // the FLIP entry animation reads the rect inside useMemo, but the
  // test-time reanimated mock stubs out withSpring and the actual
  // transform values never matter here. This just verifies the prop
  // is plumbed through without a crash.
  it('renders without error when given a sourceRect', () => {
    const post = makePost({content: 'body'});
    let tree: renderer.ReactTestRenderer;
    renderer.act(() => {
      tree = renderer.create(
        <PeekModal
          post={post}
          sourceRect={{x: 10, y: 20, width: 300, height: 180}}
          onClose={jest.fn()}
          onOpenFull={jest.fn()}
        />,
      );
    });
    // LexicalRenderer still mounts with the content.
    const lexical = tree!.root.findByType(
      'LexicalRenderer' as unknown as React.ComponentType,
    );
    expect(lexical.props.content).toBe('body');
  });
});
