import React from 'react';
import renderer from 'react-test-renderer';
import {useInfiniteQuery, useMutation} from '@tanstack/react-query';
import {ProfileMediaTab} from '../src/screens/Profile/ProfileMediaTab';

const mockRemoveQueries = jest.fn();
const mockSetQueryData = jest.fn();
const mockInvalidateQueries = jest.fn();
let capturedInfiniteQueryOptions: Record<string, unknown> | null = null;

jest.mock('react-native', () => {
  const ReactLib = require('react');

  return {
    Platform: {
      OS: 'android',
      select: (options: Record<string, unknown>) => options.android ?? options.default,
    },
    Dimensions: {
      get: () => ({width: 390, height: 844}),
    },
    Alert: {
      alert: jest.fn(),
    },
    ActivityIndicator: (props: Record<string, unknown>) =>
      ReactLib.createElement('ActivityIndicator', props),
    Modal: ({children, visible, ...props}: Record<string, any>) =>
      visible ? ReactLib.createElement('Modal', props, children) : null,
    Pressable: ({children, ...props}: Record<string, any>) =>
      ReactLib.createElement(
        'Pressable',
        props,
        typeof children === 'function' ? children({pressed: false}) : children,
      ),
    Text: (props: Record<string, any>) => ReactLib.createElement('Text', props, props.children),
    View: (props: Record<string, any>) => ReactLib.createElement('View', props, props.children),
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      absoluteFillObject: {},
      absoluteFill: {},
      hairlineWidth: 1,
    },
    FlatList: ({
      data,
      renderItem,
      ListHeaderComponent,
      ListEmptyComponent,
      ...props
    }: Record<string, any>) => {
      const children = [];

      if (ListHeaderComponent) {
        children.push(
          ReactLib.isValidElement(ListHeaderComponent)
            ? ReactLib.cloneElement(ListHeaderComponent, {key: 'header'})
            : ListHeaderComponent,
        );
      }

      if (Array.isArray(data) && data.length > 0) {
        data.forEach((item, index) => {
          const renderedItem = renderItem({item, index});
          children.push(
            ReactLib.isValidElement(renderedItem)
              ? ReactLib.cloneElement(renderedItem, {key: item.id ?? `item-${index}`})
              : renderedItem,
          );
        });
      } else if (ListEmptyComponent) {
        children.push(
          ReactLib.isValidElement(ListEmptyComponent)
            ? ReactLib.cloneElement(ListEmptyComponent, {key: 'empty'})
            : ListEmptyComponent,
        );
      }

      return ReactLib.createElement('FlatList', props, children);
    },
  };
});

jest.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: jest.fn(),
  useMutation: jest.fn(),
}));

jest.mock('react-native-reanimated', () => {
  const {View} = require('react-native');

  return {
    __esModule: true,
    default: {
      createAnimatedComponent: (component: unknown) => component,
      View,
    },
    runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useSharedValue: (initial: unknown) => ({value: initial}),
    withSpring: (value: unknown) => value,
  };
});

jest.mock('react-native-gesture-handler', () => {
  const ReactLib = require('react');

  const makeChain = () => ({
    minDuration() {
      return this;
    },
    maxDistance() {
      return this;
    },
    onStart() {
      return this;
    },
    manualActivation() {
      return this;
    },
    onTouchesMove() {
      return this;
    },
    onUpdate() {
      return this;
    },
    onTouchesUp() {
      return this;
    },
  });

  return {
    Gesture: {
      LongPress: () => makeChain(),
      Pan: () => makeChain(),
      Simultaneous: (...gestures: unknown[]) => gestures,
    },
    GestureDetector: ({children}: Record<string, any>) =>
      ReactLib.createElement('GestureDetector', null, children),
    GestureHandlerRootView: ({children, ...props}: Record<string, any>) =>
      ReactLib.createElement('GestureHandlerRootView', props, children),
  };
});

jest.mock('../src/components/EmptyState', () => {
  const {createElement} = require('react');
  return {
    EmptyState: (props: Record<string, unknown>) => createElement('EmptyState', props),
  };
});

jest.mock('../src/components/NetworkImage', () => {
  const {createElement} = require('react');
  return {
    NetworkImage: (props: Record<string, unknown>) => createElement('NetworkImage', props),
  };
});

jest.mock('../src/components/icons', () => {
  const {createElement} = require('react');
  return {
    XIcon: (props: Record<string, unknown>) => createElement('XIcon', props),
    MoreDotsIcon: (props: Record<string, unknown>) => createElement('MoreDotsIcon', props),
    TrashIcon: (props: Record<string, unknown>) => createElement('TrashIcon', props),
  };
});

jest.mock('../src/lib/api/mobileApi', () => ({
  mobileApi: {
    getProfileMedia: jest.fn(),
    getVisitedProfileMedia: jest.fn(),
    deleteProfileMediaImage: jest.fn(),
  },
}));

jest.mock('../src/lib/queryClient', () => ({
  queryClient: {
    removeQueries: (...args: unknown[]) => mockRemoveQueries(...args),
    setQueryData: (...args: unknown[]) => mockSetQueryData(...args),
    invalidateQueries: (...args: unknown[]) => mockInvalidateQueries(...args),
  },
}));

jest.mock('../src/lib/haptics', () => ({
  Haptics: {
    tap: jest.fn(),
    selection: jest.fn(),
  },
}));

jest.mock('../src/lib/springs', () => ({
  SpringPresets: {
    snappy: {},
  },
  useSpringPress: () => ({
    animatedStyle: {},
    onPressIn: jest.fn(),
    onPressOut: jest.fn(),
  }),
}));

jest.mock('../src/theme/ThemeProvider', () => ({
  useTheme: () => ({
    colors: {
      danger: '#ef4444',
    },
  }),
}));

jest.mock('../src/theme/typography', () => ({
  fonts: {
    ui: {
      semiBold: 'System',
    },
  },
}));

jest.mock('../src/theme/spacing', () => ({
  radii: {
    pill: 999,
  },
  spacing: {
    lg: 16,
  },
}));

const mockedUseInfiniteQuery = useInfiniteQuery as jest.Mock;
const mockedUseMutation = useMutation as jest.Mock;

describe('ProfileMediaTab', () => {
  beforeEach(() => {
    capturedInfiniteQueryOptions = null;
    mockRemoveQueries.mockReset();
    mockSetQueryData.mockReset();
    mockInvalidateQueries.mockReset();
    mockedUseMutation.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    });
  });

  it('keeps previously loaded media visible and clears the query cache on unmount', () => {
    mockedUseInfiniteQuery.mockImplementation((options: Record<string, unknown>) => {
      capturedInfiniteQueryOptions = options;
      return {
        data: {
          pages: [
            {data: [{id: 'img-1', url: 'https://example.com/1.jpg'}], nextCursor: 'cursor-1'},
            {data: [{id: 'img-2', url: 'https://example.com/2.jpg'}], nextCursor: 'cursor-2'},
            {data: [{id: 'img-3', url: 'https://example.com/3.jpg'}], nextCursor: 'cursor-3'},
            {data: [{id: 'img-4', url: 'https://example.com/4.jpg'}]},
          ],
        },
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        fetchNextPage: jest.fn(),
      };
    });

    let tree: renderer.ReactTestRenderer;
    renderer.act(() => {
      tree = renderer.create(<ProfileMediaTab userId="user-1" />);
    });

    expect(capturedInfiniteQueryOptions).toMatchObject({
      queryKey: ['profileMedia', 'user-1'],
    });
    expect(capturedInfiniteQueryOptions?.maxPages).toBeUndefined();

    const flatLists = tree!.root.findAll(
      node => (node.type as unknown) === 'FlatList',
    );
    expect(flatLists[0].props.removeClippedSubviews).toBe(true);

    const gridImages = tree!.root
      .findAll(node => (node.type as unknown) === 'NetworkImage')
      .filter(node => node.props.accessibilityLabel === 'Profile media image')
      .map(node => node.props.uri);

    expect(gridImages).toEqual(
      expect.arrayContaining([
        'https://example.com/1.jpg',
        'https://example.com/4.jpg',
      ]),
    );

    renderer.act(() => {
      tree!.unmount();
    });

    expect(mockRemoveQueries).toHaveBeenCalledWith({
      queryKey: ['profileMedia', 'user-1'],
      exact: true,
    });
  });

  it('mounts the gesture viewer only after opening an image and uses viewer list perf props', () => {
    mockedUseInfiniteQuery.mockReturnValue({
      data: {
        pages: [
          {
            data: [
              {id: 'img-1', url: 'https://example.com/1.jpg'},
              {id: 'img-2', url: 'https://example.com/2.jpg'},
            ],
          },
        ],
      },
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      fetchNextPage: jest.fn(),
    });

    let tree: renderer.ReactTestRenderer;
    renderer.act(() => {
      tree = renderer.create(<ProfileMediaTab userId="user-1" />);
    });

    expect(
      tree!.root.findAll(node => (node.type as unknown) === 'GestureDetector'),
    ).toHaveLength(0);

    const tilePressable = tree!.root.findAll(
      node =>
        (node.type as unknown) === 'Pressable' &&
        node.props.accessibilityLabel == null &&
        typeof node.props.onPress === 'function',
    )[0];

    renderer.act(() => {
      tilePressable.props.onPress();
    });

    expect(
      tree!.root.findAll(node => (node.type as unknown) === 'GestureDetector'),
    ).toHaveLength(1);

    const flatLists = tree!.root.findAll(
      node => (node.type as unknown) === 'FlatList',
    );
    const viewerList = flatLists[1];

    expect(viewerList.props.horizontal).toBe(true);
    expect(viewerList.props.initialNumToRender).toBe(2);
    expect(viewerList.props.maxToRenderPerBatch).toBe(2);
    expect(viewerList.props.windowSize).toBe(3);
    expect(viewerList.props.removeClippedSubviews).toBe(true);
  });
});
