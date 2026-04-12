import {Alert} from 'react-native';
import {useMutation, useQuery} from '@tanstack/react-query';
import {socialApi} from '../lib/api/socialApi';
import {mobileApi} from '../lib/api/mobileApi';
import {queryClient} from '../lib/queryClient';
import {emitGlobalToast} from '../lib/globalToast';

const MAX_PINS = 3;

export function usePinnedIds() {
  return useQuery({
    queryKey: ['userPinnedIds'],
    queryFn: () => mobileApi.getUserPinnedIds(),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}

export function useTogglePinMutation() {
  return useMutation({
    mutationFn: async (journalId: string) => {
      return socialApi.togglePin({journalId});
    },
    onSuccess: (_data, _journalId) => {
      queryClient.invalidateQueries({queryKey: ['pinnedJournals']});
      queryClient.invalidateQueries({queryKey: ['userPinnedIds']});
      queryClient.invalidateQueries({queryKey: ['profileWritings']});
      queryClient.invalidateQueries({queryKey: ['feed'], refetchType: 'none'});
    },
    onError: (err: any) => {
      const message = err?.error || err?.message || 'Could not update pin. Please try again.';
      Alert.alert('Error', message);
    },
  });
}

export function useTogglePinWithLimit() {
  const {data: pinnedIdsData} = usePinnedIds();
  const pinnedIds = pinnedIdsData?.pinnedIds ?? [];
  const mutation = useTogglePinMutation();

  const togglePin = (journalId: string) => {
    const isAlreadyPinned = pinnedIds.includes(journalId);
    if (!isAlreadyPinned && pinnedIds.length >= MAX_PINS) {
      Alert.alert(
        'Pin limit reached',
        'You can only pin up to 3 posts. Unpin an existing post from your pinned section to make room for a new one.',
        [{text: 'Got it', style: 'default'}],
      );
      return;
    }
    mutation.mutate(journalId, {
      onSuccess: () => {
        emitGlobalToast(
          isAlreadyPinned ? 'Post unpinned.' : 'Post pinned to your profile.',
          'success',
        );
      },
    });
  };

  return {togglePin, pinnedIds, isPinning: mutation.isPending};
}

export function useReorderPinMutation() {
  return useMutation({
    mutationFn: async ({journalId, direction}: {journalId: string; direction: 'up' | 'down'}) => {
      return socialApi.reorderPin({journalId, direction});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['pinnedJournals']});
    },
    onError: () => {
      Alert.alert('Error', 'Could not reorder pin. Please try again.');
    },
  });
}
