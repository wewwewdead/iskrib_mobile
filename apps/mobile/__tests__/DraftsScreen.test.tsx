import React from 'react';
import renderer from 'react-test-renderer';
import {useMutation, useQuery} from '@tanstack/react-query';
import {DraftsScreen} from '../src/screens/Editor/DraftsScreen';

const mockNavigate = jest.fn();

jest.mock('react-native', () => {
  const ReactLib = require('react');

  return {
    Alert: {
      alert: jest.fn(),
    },
    FlatList: ({
      data,
      renderItem,
      ListEmptyComponent,
      ItemSeparatorComponent,
    }: Record<string, any>) => {
      const children = [];

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

      return ReactLib.createElement('FlatList', null, children);
    },
    Platform: {
      OS: 'ios',
      select: (options: Record<string, unknown>) => options.ios ?? options.default,
    },
    Pressable: (props: Record<string, unknown>) => ReactLib.createElement('button', props),
    SafeAreaView: (props: Record<string, unknown>) => ReactLib.createElement('SafeAreaView', props),
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      hairlineWidth: 1,
    },
    Text: (props: Record<string, unknown>) => ReactLib.createElement('Text', props),
    View: (props: Record<string, unknown>) => ReactLib.createElement('View', props),
  };
});

jest.mock('@tanstack/react-query', () => ({
  useMutation: jest.fn(),
  useQuery: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: (props: Record<string, unknown>) => {
    const ReactLib = require('react');
    return ReactLib.createElement('SafeAreaView', props);
  },
}));

jest.mock('../src/theme/ThemeProvider', () => ({
  useTheme: () => ({
    colors: {
      bgPrimary: '#000000',
      bgCard: '#111111',
      borderCard: '#222222',
      textPrimary: '#FFFFFF',
      textMuted: '#999999',
      accentAmber: '#C4943E',
      textOnAccent: '#111111',
      danger: '#CC3333',
    },
  }),
}));

jest.mock('../src/theme/spacing', () => ({
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
  },
  radii: {
    md: 8,
    xl: 12,
  },
}));

jest.mock('../src/theme/typography', () => ({
  fonts: {
    ui: {
      semiBold: 'System',
      regular: 'System',
      medium: 'System',
    },
  },
}));

jest.mock('../src/components/EmptyState', () => ({
  EmptyState: (props: Record<string, unknown>) => {
    const ReactLib = require('react');
    return ReactLib.createElement('EmptyState', props);
  },
}));

jest.mock('../src/lib/queryClient', () => ({
  queryClient: {
    setQueryData: jest.fn(),
    invalidateQueries: jest.fn(),
  },
}));

const mockedUseQuery = useQuery as jest.Mock;
const mockedUseMutation = useMutation as jest.Mock;

describe('DraftsScreen', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockedUseMutation.mockReturnValue({mutate: jest.fn()});
    mockedUseQuery.mockReturnValue({
      data: {
        data: [
          {
            id: 'draft-1',
            title: 'A saved draft',
            created_at: '2026-04-12T00:00:00.000Z',
          },
        ],
      },
      isLoading: false,
    });
  });

  it('opens the journal editor in draft mode for saved drafts', () => {
    let tree: renderer.ReactTestRenderer;

    renderer.act(() => {
      tree = renderer.create(
        <DraftsScreen
          navigation={{navigate: mockNavigate} as any}
          route={{key: 'Drafts', name: 'Drafts'} as any}
        />,
      );
    });

    const pressables = tree!.root.findAllByType('button');

    renderer.act(() => {
      pressables[0].props.onPress();
    });

    expect(mockNavigate).toHaveBeenCalledWith('JournalEditor', {
      mode: 'draft',
      journalId: 'draft-1',
    });
  });
});
