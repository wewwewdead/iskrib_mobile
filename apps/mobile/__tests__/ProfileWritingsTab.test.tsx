import React from 'react';
import renderer from 'react-test-renderer';
import {ProfileWritingsTab} from '../src/screens/Profile/ProfileWritingsTab';
import {useInfiniteQuery, useMutation} from '@tanstack/react-query';

const mockNavigate = jest.fn();
const mockPostCard = jest.fn((props: Record<string, unknown>) =>
  React.createElement('PostCard', props),
);

jest.mock('react-native', () => {
  const ReactLib = require('react');

  return {
    Platform: {
      OS: 'ios',
      select: (options: Record<string, unknown>) => options.ios ?? options.default,
    },
    View: (props: Record<string, unknown>) => ReactLib.createElement('View', props),
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      hairlineWidth: 1,
    },
    FlatList: ({
      data,
      renderItem,
      ListHeaderComponent,
      ListFooterComponent,
      ListEmptyComponent,
      ItemSeparatorComponent,
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
          if (ItemSeparatorComponent && index < data.length - 1) {
            children.push(ReactLib.createElement(ItemSeparatorComponent, {key: `sep-${item.id ?? index}`}));
          }
        });
      } else if (ListEmptyComponent) {
        children.push(
          ReactLib.isValidElement(ListEmptyComponent)
            ? ReactLib.cloneElement(ListEmptyComponent, {key: 'empty'})
            : ListEmptyComponent,
        );
      }

      if (ListFooterComponent) {
        children.push(
          ReactLib.isValidElement(ListFooterComponent)
            ? ReactLib.cloneElement(ListFooterComponent, {key: 'footer'})
            : ListFooterComponent,
        );
      }

      return ReactLib.createElement('FlatList', null, children);
    },
  };
});

jest.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: jest.fn(),
  useMutation: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../src/features/auth/AuthProvider', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
    },
  }),
}));

jest.mock('../src/components/PostCard/PostCard', () => ({
  PostCard: (props: Record<string, unknown>) => mockPostCard(props),
}));

jest.mock('../src/components/SkeletonLoader', () => {
  const {createElement} = require('react');
  return {
    PostCardSkeleton: (props: Record<string, unknown>) =>
      createElement('PostCardSkeleton', props),
  };
});

jest.mock('../src/components/Comments', () => {
  const {createElement} = require('react');
  return {
    CommentModal: (props: Record<string, unknown>) =>
      createElement('CommentModal', props),
  };
});

jest.mock('../src/components/RepostModal', () => {
  const {createElement} = require('react');
  return {
    RepostModal: (props: Record<string, unknown>) =>
      createElement('RepostModal', props),
  };
});

jest.mock('../src/components/EmptyState', () => {
  const {createElement} = require('react');
  return {
    EmptyState: (props: Record<string, unknown>) =>
      createElement('EmptyState', props),
  };
});

jest.mock('../src/components/PinnedPostsSection', () => {
  const {createElement} = require('react');
  return {
    PinnedPostsSection: (props: Record<string, unknown>) =>
      createElement('PinnedPostsSection', props),
  };
});

jest.mock('../src/hooks/useSocialMutations', () => ({
  useBookmarkMutation: () => ({
    mutate: jest.fn(),
  }),
}));

jest.mock('../src/hooks/usePinMutation', () => ({
  useTogglePinWithLimit: () => ({
    togglePin: jest.fn(),
    pinnedIds: [],
    isPinning: false,
  }),
}));

jest.mock('../src/hooks/usePrivacyMutation', () => ({
  usePrivacyMutation: () => ({
    mutate: jest.fn(),
  }),
}));

jest.mock('../src/lib/queryClient', () => ({
  queryClient: {
    cancelQueries: jest.fn(),
    getQueryData: jest.fn(),
    setQueryData: jest.fn(),
    invalidateQueries: jest.fn(),
  },
}));

jest.mock('../src/lib/utils/journalHelpers', () => ({
  getJournalCardData: () => ({
    previewText: 'Preview text',
    bannerImage: null,
    likeCount: 4,
    commentCount: 2,
    bookmarkCount: 1,
  }),
  getNextCursor: () => null,
}));

const mockedUseInfiniteQuery = useInfiniteQuery as jest.Mock;
const mockedUseMutation = useMutation as jest.Mock;

const setQueryData = (items: Array<Record<string, unknown>>) => {
  mockedUseInfiniteQuery.mockReturnValue({
    data: {
      pages: [{data: items}],
    },
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    fetchNextPage: jest.fn(),
  });
};

const renderTab = (userId: string) => {
  let tree: renderer.ReactTestRenderer;

  renderer.act(() => {
    tree = renderer.create(<ProfileWritingsTab userId={userId} />);
  });

  return tree!;
};

describe('ProfileWritingsTab', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockPostCard.mockClear();
    mockedUseMutation.mockReturnValue({mutate: jest.fn()});
  });

  it('wires edit navigation for owned original posts', () => {
    setQueryData([
      {
        id: 'journal-1',
        title: 'Owned journal',
        user_id: 'user-1',
        users: {
          id: 'user-1',
          name: 'Owner',
          image_url: null,
        },
        is_repost: false,
      },
    ]);

    renderTab('user-1');
    const postCardProps = mockPostCard.mock.calls[0][0] as Record<string, unknown>;

    expect(postCardProps.showEditAction).toBe(true);

    renderer.act(() => {
      (postCardProps.onEdit as () => void)();
    });

    expect(mockNavigate).toHaveBeenCalledWith('JournalEditor', {
      mode: 'edit',
      journalId: 'journal-1',
    });
  });

  it('does not expose edit for owned reposts', () => {
    setQueryData([
      {
        id: 'journal-2',
        title: 'Owned repost',
        user_id: 'user-1',
        users: {
          id: 'user-1',
          name: 'Owner',
          image_url: null,
        },
        is_repost: true,
      },
    ]);

    renderTab('user-1');
    const postCardProps = mockPostCard.mock.calls[0][0] as Record<string, unknown>;

    expect(postCardProps.showEditAction).toBe(false);
    expect(postCardProps.onEdit).toBeUndefined();
  });

  it('does not expose edit on visited profiles', () => {
    setQueryData([
      {
        id: 'journal-3',
        title: 'Visited profile journal',
        user_id: 'user-2',
        users: {
          id: 'user-2',
          name: 'Other writer',
          image_url: null,
        },
        is_repost: false,
      },
    ]);

    renderTab('user-2');
    const postCardProps = mockPostCard.mock.calls[0][0] as Record<string, unknown>;

    expect(postCardProps.showEditAction).toBe(false);
    expect(postCardProps.onEdit).toBeUndefined();
  });
});
