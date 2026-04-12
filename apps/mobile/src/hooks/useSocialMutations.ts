import {Alert} from 'react-native';
import {useMutation, type QueryKey} from '@tanstack/react-query';
import {socialApi} from '../lib/api/socialApi';
import {queryClient} from '../lib/queryClient';
import type {CursorPage, JournalItem} from '../lib/api/mobileApi';
import {emitGlobalToast} from '../lib/globalToast';

type InfiniteData = {pages: CursorPage<JournalItem>[]};

export function useBookmarkMutation(queryKey: QueryKey) {
  return useMutation({
    mutationFn: async (journalId: string) => {
      return socialApi.toggleBookmark({journalId});
    },
    onMutate: async (journalId: string) => {
      await queryClient.cancelQueries({queryKey});
      const prev = queryClient.getQueryData<InfiniteData>(queryKey);
      const wasBookmarked = prev?.pages
        .flatMap(p => p.data)
        .find(item => item.id === journalId)?.has_bookmarked;
      if (prev) {
        queryClient.setQueryData<InfiniteData>(queryKey, old => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map(page => ({
              ...page,
              data: page.data.map(item => {
                if (item.id !== journalId) return item;
                const bookmarked = !!item.has_bookmarked;
                const currentCount = (item.bookmark_count?.[0]?.count ?? 0) as number;
                const delta = bookmarked ? -1 : 1;
                return {
                  ...item,
                  has_bookmarked: !bookmarked,
                  bookmark_count: [{count: Math.max(0, currentCount + delta)}],
                };
              }),
            })),
          };
        });
      }
      return {prev, wasBookmarked};
    },
    onSuccess: (_data: unknown, _journalId: string, context: {prev?: InfiniteData; wasBookmarked?: boolean} | undefined) => {
      emitGlobalToast(
        context?.wasBookmarked ? 'Bookmark removed.' : 'Post bookmarked.',
        'success',
      );
    },
    onError: (_err: unknown, _journalId: string, context: {prev?: InfiniteData; wasBookmarked?: boolean} | undefined) => {
      if (context?.prev) {
        queryClient.setQueryData(queryKey, context.prev);
      }
      Alert.alert('Error', 'Could not update bookmark. Please try again.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({queryKey});
    },
  });
}

export function useRepostMutation() {
  return useMutation({
    mutationFn: async (sourceJournalId: string) => {
      return socialApi.createRepost({sourceJournalId});
    },
    onSuccess: () => {
      Alert.alert('Reposted', 'This post has been shared to your feed.');
      queryClient.invalidateQueries({queryKey: ['feed']});
    },
    onError: () => {
      Alert.alert('Error', 'Could not repost. Please try again.');
    },
  });
}
