import {useEffect, useRef, useState} from 'react';
import {AppState, type AppStateStatus} from 'react-native';
import {queryClient} from '../lib/queryClient';

const BACKGROUND_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const SHIMMER_TIMEOUT_MS = 5000; // auto-clear after 5 seconds

/**
 * Detects when the app returns from background after >5 minutes.
 * Returns `isCatchingUp` — show a shimmer overlay while queries refresh.
 * Auto-clears on first successful query refetch or after 5s timeout.
 */
export function useAppStateRecovery() {
  const [isCatchingUp, setIsCatchingUp] = useState(false);
  const backgroundTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundTimestampRef.current = Date.now();
        return;
      }

      if (nextState === 'active' && backgroundTimestampRef.current != null) {
        const elapsed = Date.now() - backgroundTimestampRef.current;
        backgroundTimestampRef.current = null;

        if (elapsed >= BACKGROUND_THRESHOLD_MS) {
          setIsCatchingUp(true);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  // Auto-clear on first successful query refetch or timeout
  useEffect(() => {
    if (!isCatchingUp) return;

    // Timeout guard — clear after 5 seconds regardless
    const timeout = setTimeout(() => setIsCatchingUp(false), SHIMMER_TIMEOUT_MS);

    // Clear on first successful query update
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (
        event.type === 'updated' &&
        event.query.state.status === 'success'
      ) {
        setIsCatchingUp(false);
      }
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [isCatchingUp]);

  return {isCatchingUp};
}
