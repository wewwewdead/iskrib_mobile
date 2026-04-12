import {Alert} from 'react-native';
import {useMutation} from '@tanstack/react-query';
import {mobileApi, type CursorPage, type JournalItem} from '../lib/api/mobileApi';
import {queryClient} from '../lib/queryClient';
import {emitGlobalToast} from '../lib/globalToast';

export function usePrivacyMutation(queryKey: readonly unknown[]) {
  return useMutation<
    {message?: string},
    Error,
    {journalId: string; privacy: 'public' | 'private'},
    {prev?: {pages: CursorPage<JournalItem>[]}}
  >({
    mutationFn: ({journalId, privacy}) =>
      mobileApi.updatePrivacy({journalId, privacy}),
    onMutate: async ({journalId, privacy}) => {
      await queryClient.cancelQueries({queryKey});
      const prev = queryClient.getQueryData<{pages: CursorPage<JournalItem>[]}>(queryKey);
      if (prev) {
        queryClient.setQueryData<{pages: CursorPage<JournalItem>[]}>(queryKey, old => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map(page => ({
              ...page,
              data: page.data.map(item =>
                item.id === journalId ? {...item, privacy} : item,
              ),
            })),
          };
        });
      }
      return {prev};
    },
    onSuccess: (_data, {privacy}) => {
      emitGlobalToast(
        privacy === 'private'
          ? 'Post set to private — only you can see it.'
          : 'Post set to public — visible to everyone.',
        'success',
      );
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(queryKey, context.prev);
      }
      Alert.alert('Error', 'Could not update privacy. Please try again.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({queryKey});
    },
  });
}
