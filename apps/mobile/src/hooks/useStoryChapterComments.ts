import {useCallback, useState} from 'react';
import {Alert} from 'react-native';
import {useMutation, useQuery} from '@tanstack/react-query';
import {storyApi, ChapterComment} from '../lib/api/storyApi';
import {queryClient} from '../lib/queryClient';

export function useStoryChapterComments(
  chapterId: string,
  paragraphIndex: number | null,
  paragraphFingerprint: string | null,
  onReplyActivated?: () => void,
) {
  const [commentInput, setCommentInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<{id: string; userName: string} | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  const commentsQuery = useQuery({
    queryKey: ['chapter-comments', chapterId, paragraphIndex],
    queryFn: () => storyApi.getChapterComments(chapterId, paragraphIndex),
    enabled: paragraphIndex !== null,
  });

  const handleReply = useCallback((commentId: string, userName: string) => {
    setReplyingTo({id: commentId, userName});
    onReplyActivated?.();
  }, [onReplyActivated]);

  const handleToggleReplies = useCallback((commentId: string) => {
    setExpandedReplies(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  }, []);

  const addCommentMutation = useMutation({
    mutationFn: async () => {
      const body = commentInput.trim();
      if (!body) throw new Error('Comment cannot be empty.');
      return storyApi.addChapterComment(chapterId, {
        comment: body,
        paragraph_index: paragraphIndex,
        paragraph_fingerprint: paragraphFingerprint,
        parent_id: replyingTo?.id ?? null,
      });
    },
    onSuccess: () => {
      setCommentInput('');
      setReplyingTo(null);
      queryClient.invalidateQueries({queryKey: ['chapter-comments', chapterId, paragraphIndex]});
      queryClient.invalidateQueries({queryKey: ['chapter-comment-counts', chapterId]});
    },
    onError: e => Alert.alert('Comment failed', e instanceof Error ? e.message : 'Error'),
  });

  // Server returns replies[] nested in each top-level comment, so we build
  // fetchedReplies from the query data directly (no separate fetch needed).
  const comments: ChapterComment[] = commentsQuery.data ?? [];

  const fetchedReplies: Record<string, ChapterComment[]> = {};
  comments.forEach(c => {
    if (c.replies && c.replies.length > 0) {
      fetchedReplies[c.id] = c.replies;
    }
  });

  return {
    comments,
    isLoading: commentsQuery.isLoading,
    commentInput,
    setCommentInput,
    replyingTo,
    setReplyingTo,
    expandedReplies,
    fetchedReplies,
    loadingReplies: new Set<string>(),
    handleReply,
    handleToggleReplies,
    submitComment: () => addCommentMutation.mutate(),
    isSubmitting: addCommentMutation.isPending,
  };
}
