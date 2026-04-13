import {useEffect, useSyncExternalStore} from 'react';
import {
  ensureBloomLocalStateLoaded,
  getLastSeenCountSync,
  isBloomLocalStateLoaded,
  isJournalSeenSync,
  subscribeBloomLocalState,
} from '../lib/echoBloomLocalState';

// ═══════════════════════════════════════════════════════════════════
// useEchoesPulseState — pulse decision hook.
//
// Returns `{shouldPulse}` where shouldPulse is true iff:
//   (a) local state has loaded, AND
//   (b) server reported at least one echo (currentCount > 0), AND
//   (c) EITHER the user has never opened Bloom for this journal
//       (first-time pulse) OR currentCount > lastSeenCount
//       (new-resonance pulse).
//
// Both triggers are backed by real data:
//   - first-time: local AsyncStorage "seen" set (real client state)
//   - new-resonance: delta between server's current /related count
//     and the count we recorded the last time the user opened Bloom
//     (real server-side change — not decorative).
//
// Pulse is suppressed entirely while the local state is still
// loading, so we never show a misleading "first-time" state for a
// journal that the user has in fact already seen.
// ═══════════════════════════════════════════════════════════════════

export interface EchoesPulseState {
  shouldPulse: boolean;
}

export function useEchoesPulseState(
  journalId: string | null | undefined,
  currentCount: number,
): EchoesPulseState {
  // Kick off the one-time AsyncStorage load.
  useEffect(() => {
    if (!isBloomLocalStateLoaded()) {
      void ensureBloomLocalStateLoaded();
    }
  }, []);

  // Subscribe to writes so chips re-render when marked-as-seen.
  const snapshot = useSyncExternalStore(
    subscribeBloomLocalState,
    () => {
      if (!journalId) return 'no-journal';
      if (!isBloomLocalStateLoaded()) return 'loading';
      const seen = isJournalSeenSync(journalId);
      const lastCount = getLastSeenCountSync(journalId);
      return `${seen ? 'seen' : 'unseen'}:${lastCount}`;
    },
    // Server snapshot for SSR — we never SSR, so return a stable default.
    () => 'loading',
  );

  if (!journalId || snapshot === 'no-journal' || snapshot === 'loading') {
    return {shouldPulse: false};
  }
  if (currentCount <= 0) {
    return {shouldPulse: false};
  }

  const [seenFlag, lastCountStr] = snapshot.split(':');
  const lastCount = Number(lastCountStr) || 0;

  if (seenFlag === 'unseen') {
    return {shouldPulse: true};
  }
  if (currentCount > lastCount) {
    return {shouldPulse: true};
  }
  return {shouldPulse: false};
}
