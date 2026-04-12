import {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useMutation, useQuery} from '@tanstack/react-query';
import {socialApi, JournalComment} from '../lib/api/socialApi';
import {queryClient} from '../lib/queryClient';

export function useComments(
  postId: string,
  receiverId: string | undefined,
  onReplyActivated?: () => void,
) {
  const [commentInput, setCommentInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<{id: string; userName: string} | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [fetchedReplies, setFetchedReplies] = useState<Record<string, JournalComment[]>>({});
  const [loadingReplies, setLoadingReplies] = useState<Set<string>>(new Set());
  const [replyErrors, setReplyErrors] = useState<Set<string>>(new Set());
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const commentsQuery = useQuery({
    queryKey: ['journal-comments', postId],
    queryFn: () => socialApi.getComments(postId, null, 20),
    enabled: !!postId,
  });

  const handleReply = useCallback((commentId: string, userName: string) => {
    setReplyingTo({id: commentId, userName});
    onReplyActivated?.();
  }, [onReplyActivated]);

  const fetchReplies = useCallback((commentId: string) => {
    setLoadingReplies(prev => {
      const next = new Set(prev);
      next.add(commentId);
      return next;
    });

    socialApi.getReplies(postId, commentId).then(res => {
      if (!mountedRef.current) {
        return;
      }

      setFetchedReplies(prev => ({...prev, [commentId]: res.comments}));
      setReplyErrors(prev => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
      setLoadingReplies(prev => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    }).catch(() => {
      if (!mountedRef.current) {
        return;
      }

      setReplyErrors(prev => {
        const next = new Set(prev);
        next.add(commentId);
        return next;
      });
      setLoadingReplies(prev => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    });
  }, [postId]);

  const handleToggleReplies = useCallback((commentId: string) => {
    setExpandedReplies(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
        return next;
      }
      next.add(commentId);

      if (!fetchedReplies[commentId] && !loadingReplies.has(commentId)) {
        fetchReplies(commentId);
      }

      return next;
    });
  }, [fetchReplies, fetchedReplies, loadingReplies]);

  const addCommentMutation = useMutation({
    mutationFn: async () => {
      const body = commentInput.trim();
      if (!body) throw new Error('Comment cannot be empty.');
      if (!receiverId) throw new Error('Missing journal owner.');
      return socialApi.addComment({
        comments: body,
        postId,
        receiverId,
        parentId: replyingTo?.id,
      });
    },
    onSuccess: () => {
      if (!mountedRef.current) {
        return;
      }

      const parentId = replyingTo?.id;
      setCommentInput('');
      setReplyingTo(null);
      queryClient.invalidateQueries({queryKey: ['journal-comments', postId]});
      queryClient.invalidateQueries({queryKey: ['journal', postId]});
      queryClient.invalidateQueries({queryKey: ['feed']});
      queryClient.invalidateQueries({queryKey: ['profileWritings']});
      if (parentId) {
        setFetchedReplies(prev => {
          const next = {...prev};
          delete next[parentId];
          return next;
        });
        setExpandedReplies(prev => {
          const next = new Set(prev);
          next.add(parentId);
          return next;
        });
        fetchReplies(parentId);
      }
    },
    onError: e => {
      if (!mountedRef.current) {
        return;
      }

      Alert.alert('Comment failed', e instanceof Error ? e.message : 'Error');
    },
  });

  const clearReplyError = useCallback((commentId: string) => {
    setReplyErrors(prev => {
      const next = new Set(prev);
      next.delete(commentId);
      return next;
    });
  }, []);

  const retryReplies = useCallback((commentId: string) => {
    clearReplyError(commentId);
    fetchReplies(commentId);
  }, [clearReplyError, fetchReplies]);

  const comments = commentsQuery.data?.comments ?? [];

  return {
    comments,
    isLoading: commentsQuery.isLoading,
    commentInput,
    setCommentInput,
    replyingTo,
    setReplyingTo,
    expandedReplies,
    fetchedReplies,
    loadingReplies,
    replyErrors,
    clearReplyError,
    retryReplies,
    handleReply,
    handleToggleReplies,
    submitComment: () => addCommentMutation.mutate(),
    isSubmitting: addCommentMutation.isPending,
  };
}
