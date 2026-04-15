import {useQuery} from '@tanstack/react-query';
import {mobileApi, type JournalThreadResponse} from '../lib/api/mobileApi';

// ═══════════════════════════════════════════════════════════════════
// useThreadPreview — fetches the first page of a journal's thread
// chain for inline rendering on a PostCard.
//
// Why `limit: 6`:
//   The card shows up to 5 neighbor posts (excluding the current
//   card's own post). Fetching 6 rows gives us 5 to render plus a
//   buffer so the filter-out-current step still yields 5 neighbors
//   when the current post happens to be in the first page.
//
// Why the query key is scoped to root_journal_id:
//   N posts in the same thread visible on one feed would otherwise
//   fire N parallel /journal/:id/thread requests (distinct query
//   keys even though the result is the same chain). Keying on the
//   root id deduplicates all siblings to a single cache entry, so a
//   feed with 10 threaded posts from 2 chains fires 2 requests, not
//   10. Falls back to the post's own id when the feed row doesn't
//   carry root_journal_id (older API responses).
//
// `enabled` gate:
//   Only fires when the caller confirms the post is part of a
//   thread (e.g. has a parent_journal_id). Other cards opt out
//   entirely so feeds don't N+1 the thread endpoint.
// ═══════════════════════════════════════════════════════════════════

const PREVIEW_PAGE_SIZE = 6;

export function useThreadPreview(
  journalId: string | undefined,
  rootJournalId: string | null | undefined,
  enabled: boolean,
) {
  const cacheId = rootJournalId || journalId;
  const fetchId = rootJournalId || journalId;
  return useQuery<JournalThreadResponse>({
    queryKey: ['journal-thread-preview', cacheId],
    queryFn: () =>
      mobileApi.getJournalThread(fetchId as string, {
        limit: PREVIEW_PAGE_SIZE,
        offset: 0,
      }),
    enabled: enabled && Boolean(fetchId),
    // 5 minutes — thread previews are append-only and refreshed by the
    // publish path's invalidateQueries (JournalEditorScreen). Bumping
    // from 60s prevents scroll-churn remounts from re-fetching every
    // minute while the user reads the same feed.
    staleTime: 5 * 60 * 1000,
  });
}
