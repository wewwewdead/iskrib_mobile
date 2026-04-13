import {useMemo} from 'react';
import {useQuery} from '@tanstack/react-query';
import {
  mobileApi,
  type JournalItem,
  type RelatedConfidence,
  type RelatedPostEntry,
} from '../lib/api/mobileApi';

// ═══════════════════════════════════════════════════════════════════
// useEchoBloomData — composes Echo Bloom companion data from real backend
// primitives only. No fabricated "Mirror", no recency-based "Return".
//
// Data sources (all backend-computed):
//   center         → GET /journal/:id             (existing)
//   echoes         → GET /journal/:id/related     (pgvector cosine similarity,
//                                                  capped by confidence tier,
//                                                  filtered to cross-author)
//   yourEcho       → GET /journal/:id/user-echoes (same pgvector algorithm,
//                                                  filtered to current user's
//                                                  archive — real semantic
//                                                  "you've written about this
//                                                  before")
//   promptSibling  → GET /prompt/:id/responses    (only fetched when the
//                                                  published post has a
//                                                  prompt_id; returns another
//                                                  response to the same prompt)
//
// Any card that has no honest data is omitted. If all three are empty, the
// screen still shows a center-only bloom — no illusionary slots.
// ═══════════════════════════════════════════════════════════════════

export interface EchoBloomData {
  center: JournalItem | null;
  echoes: RelatedPostEntry[];
  yourEcho: RelatedPostEntry | null;
  promptSibling: JournalItem | null;
  confidence: RelatedConfidence;
  isLoading: boolean;
}

export function useEchoBloomData(
  journalId: string,
  userId?: string | null,
): EchoBloomData {
  const centerQuery = useQuery({
    queryKey: ['journal', journalId, userId ?? null],
    queryFn: () => mobileApi.getJournalById(journalId, userId ?? undefined),
    enabled: Boolean(journalId),
  });

  const relatedQuery = useQuery({
    queryKey: ['related-posts', journalId],
    queryFn: () => mobileApi.getRelatedPosts(journalId),
    enabled: Boolean(journalId),
  });

  const userEchoesQuery = useQuery({
    queryKey: ['user-echoes', journalId, userId ?? null],
    queryFn: () => mobileApi.getUserEchoes(journalId),
    enabled: Boolean(journalId && userId),
  });

  const center = centerQuery.data?.journal ?? null;
  const promptId = center?.prompt_id ?? null;

  const promptSiblingsQuery = useQuery({
    queryKey: ['prompt-responses', promptId],
    queryFn: () =>
      mobileApi.getPromptResponses(promptId as string | number, null, 5),
    enabled: Boolean(promptId),
  });

  return useMemo<EchoBloomData>(() => {
    const related = relatedQuery.data?.posts ?? [];
    const confidence: RelatedConfidence =
      relatedQuery.data?.confidence ?? 'none';

    // Echoes: posts by OTHER authors. The /related endpoint already
    // applies a same-author penalty in ranking, but does not strictly
    // exclude them — so we filter here for the cross-author slots.
    const echoes: RelatedPostEntry[] = related
      .filter(
        item =>
          item.user_id && userId
            ? item.user_id !== userId
            : item.users?.id
              ? item.users.id !== userId
              : true,
      )
      .slice(0, 2);

    const userEchoPosts = userEchoesQuery.data?.posts ?? [];
    const yourEcho: RelatedPostEntry | null = userEchoPosts[0] ?? null;

    // Prompt sibling: first response to the same prompt that is
    // (a) not the just-published post and (b) not by the same user.
    // If none qualify, we simply don't show the card.
    let promptSibling: JournalItem | null = null;
    if (promptId && promptSiblingsQuery.data?.responses?.length) {
      const siblings = promptSiblingsQuery.data.responses;
      const match = siblings.find(
        entry =>
          entry.id !== journalId &&
          (!userId || entry.user_id !== userId),
      );
      if (match) {
        promptSibling = {
          id: match.id,
          title: match.title ?? null,
          content: null,
          created_at: match.created_at,
          user_id: match.user_id ?? null,
          users: match.users ?? null,
        };
      }
    }

    const isLoading =
      centerQuery.isLoading ||
      relatedQuery.isLoading ||
      (Boolean(userId) && userEchoesQuery.isLoading) ||
      (Boolean(promptId) && promptSiblingsQuery.isLoading);

    return {
      center,
      echoes,
      yourEcho,
      promptSibling,
      confidence,
      isLoading,
    };
  }, [
    center,
    centerQuery.isLoading,
    relatedQuery.data,
    relatedQuery.isLoading,
    userEchoesQuery.data,
    userEchoesQuery.isLoading,
    promptSiblingsQuery.data,
    promptSiblingsQuery.isLoading,
    promptId,
    userId,
    journalId,
  ]);
}
