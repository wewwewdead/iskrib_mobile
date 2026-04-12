import {useMutation} from '@tanstack/react-query';
import {socialApi} from '../lib/api/socialApi';
import {queryClient} from '../lib/queryClient';

export function useFollowMutation(targetUserId: string) {
  return useMutation({
    mutationFn: async () => {
      return socialApi.toggleFollow({followingId: targetUserId});
    },
    onSettled: () => {
      queryClient.invalidateQueries({queryKey: ['followsData', targetUserId]});
      queryClient.invalidateQueries({queryKey: ['profile']});
      queryClient.invalidateQueries({queryKey: ['feed']});
    },
  });
}
