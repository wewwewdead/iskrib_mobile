import {useQuery} from '@tanstack/react-query';
import {
  mobileApi,
  type RelatedConfidence,
  type RelatedPostEntry,
} from '../lib/api/mobileApi';

// ═══════════════════════════════════════════════════════════════════
// useEchoesSummary — the single source of truth for "does this journal
// have echoes" across the app (feed chip, PostDetail section, Bloom).
//
// Backed ONLY by the real primitive: GET /journal/:id/related
// (pgvector cosine similarity on gte-small embeddings, server-computed
// confidence tier + server 10-min LRU cache).
//
// The query key `['related-posts', id]` is deliberately shared with
// Echo Bloom's `useEchoBloomData` and the PostDetail EchoesSection so
// one network fetch powers every surface.
// ═══════════════════════════════════════════════════════════════════

// 5 minutes — stops React Query from refetching on every re-mount of
// a feed card; backend cache already lasts 10 minutes so worst-case
// staleness is bounded.
const STALE_TIME_MS = 5 * 60 * 1000;

export interface EchoesSummary {
  count: number;
  confidence: RelatedConfidence;
  hasEchoes: boolean;
  isLoading: boolean;
  posts: RelatedPostEntry[];
}

export function useEchoesSummary(
  journalId: string | null | undefined,
): EchoesSummary {
  const enabled = Boolean(journalId);

  const {data, isLoading} = useQuery({
    queryKey: ['related-posts', journalId],
    queryFn: () => mobileApi.getRelatedPosts(journalId as string),
    enabled,
    staleTime: STALE_TIME_MS,
  });

  const posts = data?.posts ?? [];
  const confidence: RelatedConfidence = data?.confidence ?? 'none';
  const count = posts.length;
  const hasEchoes = count > 0 && confidence !== 'none';

  return {count, confidence, hasEchoes, isLoading, posts};
}
