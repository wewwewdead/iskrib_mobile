/**
 * usePeekModal — per-screen hook managing the peek modal state.
 *
 * Each screen that wants peek (HomeFeedScreen, InterestSection) calls this
 * hook independently. There is NO shared Context or global state. One
 * instance per screen. Simple.
 *
 * Ownership: the `['peekContent', userId, postId]` query key prefix is
 * owned by peek. Do NOT invalidate it from outside this hook or PeekModal.
 *
 *     ┌────────────────────┐
 *     │  Screen mounts     │
 *     └─────────┬──────────┘
 *               │
 *               ▼
 *     ┌────────────────────┐  sync ref INLINE during render
 *     │  isOtherModalOpen  │────────────────────┐
 *     └─────────┬──────────┘                    │
 *               │                                ▼
 *               ▼                         ┌────────────────┐
 *     ┌────────────────────┐              │ otherModalRef  │
 *     │  openPeek(post)    │─────reads───▶│ (latest value) │
 *     └─────────┬──────────┘              └────────────────┘
 *               │
 *               ├─ isOtherModalOpen? ──▶ return (no-op)
 *               │
 *               ├─ tapHaptic()
 *               │
 *               ├─ setPeekPost(post)
 *               │
 *               └─ first open only:
 *                  ├─ AsyncStorage.setItem(PEEK_HINT_SEEN_KEY, 'true')
 *                  └─ queryClient.invalidateQueries(['peekHintSeen'])
 */
import {useCallback, useRef, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {tapHaptic} from '../lib/haptics';
import {queryClient} from '../lib/queryClient';
import type {JournalItem} from '../lib/api/mobileApi';

/**
 * Exported so PeekHint and usePeekModal share the same AsyncStorage key.
 * If you rename this, update PeekHint.tsx as well.
 */
export const PEEK_HINT_SEEN_KEY = '@iskrib:peekHintSeen';

/**
 * Window-coordinate rectangle of the PostCard that triggered a peek.
 * Passed from PostCard.measureInWindow through onLongPress to usePeekModal.
 * PeekModal uses it to compute a FLIP (First/Last/Invert/Play) entry
 * animation that anchors the modal's initial position on the source card.
 *
 * If undefined, PeekModal falls back to the default layered entry
 * animation (used by the VoiceOver rotor path where there's no press
 * location).
 */
export interface PeekSourceRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UsePeekModalOptions {
  /**
   * The caller must pass the current modal state on every render. The hook
   * syncs this to an internal ref INLINE (not inside useEffect) so that
   * openPeek always reads the latest value, even if openPeek is invoked in
   * the same render cycle as a parent state change.
   */
  isOtherModalOpen: boolean;
}

interface UsePeekModalResult {
  peekPost: JournalItem | null;
  peekSourceRect: PeekSourceRect | null;
  openPeek: (post: JournalItem, sourceRect?: PeekSourceRect) => void;
  closePeek: () => void;
}

interface PeekState {
  post: JournalItem | null;
  sourceRect: PeekSourceRect | null;
}

const EMPTY_STATE: PeekState = {post: null, sourceRect: null};

export function usePeekModal({
  isOtherModalOpen,
}: UsePeekModalOptions): UsePeekModalResult {
  // Single state object so peekPost and peekSourceRect always stay in sync.
  // A race where peekPost is set but peekSourceRect isn't (or vice versa)
  // would cause the modal to animate from a stale rect — unified state
  // makes that impossible.
  const [peekState, setPeekState] = useState<PeekState>(EMPTY_STATE);

  // INLINE ref sync during render. This is intentional (and the React
  // "always-latest ref" pattern). useEffect would run AFTER commit, which
  // is too late when openPeek is called synchronously from a callback in
  // the same render tick.
  const otherModalRef = useRef(isOtherModalOpen);
  otherModalRef.current = isOtherModalOpen;

  // Tracks whether the "first peek" side effect (AsyncStorage write +
  // query invalidation to dismiss PeekHint) has already fired for this
  // hook instance.
  const firstOpenFiredRef = useRef(false);

  const openPeek = useCallback(
    (post: JournalItem, sourceRect?: PeekSourceRect) => {
      if (otherModalRef.current) {
        // Another modal (CommentModal, RepostModal) is open. Stacked modal
        // guard — do not open peek on top of another modal.
        return;
      }

      tapHaptic();
      setPeekState({post, sourceRect: sourceRect ?? null});

      if (!firstOpenFiredRef.current) {
        firstOpenFiredRef.current = true;
        // Fire-and-forget: AsyncStorage write can fail silently on a broken
        // storage layer; we assume the hint was seen (fail-closed).
        AsyncStorage.setItem(PEEK_HINT_SEEN_KEY, 'true').catch(() => {
          // Intentionally swallowed. The hint will still dismiss locally in
          // PeekHint's own setTimeout or X-tap path.
        });
        queryClient.invalidateQueries({queryKey: ['peekHintSeen']});
      }
    },
    [],
  );

  const closePeek = useCallback(() => {
    setPeekState(EMPTY_STATE);
    tapHaptic();
  }, []);

  return {
    peekPost: peekState.post,
    peekSourceRect: peekState.sourceRect,
    openPeek,
    closePeek,
  };
}
