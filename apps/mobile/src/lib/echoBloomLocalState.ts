import AsyncStorage from '@react-native-async-storage/async-storage';

// ═══════════════════════════════════════════════════════════════════
// Echo Bloom — local "has the user seen this bloom" state.
//
// This is a CLIENT-ONLY persistence primitive. The server has no
// concept of "which user viewed which bloom" and we deliberately do
// not invent one. All of this state lives on the device via
// AsyncStorage and exists solely to drive two honest UI behaviors:
//
//   1. First-time pulse — the chip draws attention the first time a
//      user encounters a journal that has echoes, and stops pulsing
//      permanently once they open the Bloom screen for it.
//
//   2. New-resonance pulse — if the backend's /related response for
//      this journal returns MORE posts than it did last time the user
//      opened Bloom for it, the chip pulses again. That delta is real:
//      the server embeds every published journal, so new similar
//      posts genuinely appear over time. We are reflecting a real
//      change, not fabricating one.
//
// When the user opens Bloom for a journal, we call `markBloomSeen`
// with the current count — which both records "seen" and resets the
// baseline for future delta detection.
//
// Storage is capped at `MAX_ENTRIES` to prevent unbounded growth.
// When full, we evict the oldest keys (Map iteration order = insertion
// order); the small in-memory cache tracks insertion order too.
// ═══════════════════════════════════════════════════════════════════

const SEEN_KEY = '@iskrib_bloom_seen_v1';
const COUNTS_KEY = '@iskrib_bloom_counts_v1';
const MAX_ENTRIES = 500;

// In-memory mirrors — initialized lazily from AsyncStorage, then kept
// in sync on every write so synchronous reads (React hooks) can be
// cheap. `null` means "not yet loaded."
let seenCache: Set<string> | null = null;
let countsCache: Map<string, number> | null = null;

// One-shot load promise so concurrent callers don't race AsyncStorage.
let loadPromise: Promise<void> | null = null;

// Subscribers that want to re-render when state changes (chips).
type Subscriber = () => void;
const subscribers = new Set<Subscriber>();

function notify(): void {
  subscribers.forEach(sub => {
    try {
      sub();
    } catch {
      // a bad subscriber must not poison the rest
    }
  });
}

export function subscribeBloomLocalState(sub: Subscriber): () => void {
  subscribers.add(sub);
  return () => {
    subscribers.delete(sub);
  };
}

async function loadFromStorage(): Promise<void> {
  try {
    const [seenRaw, countsRaw] = await Promise.all([
      AsyncStorage.getItem(SEEN_KEY),
      AsyncStorage.getItem(COUNTS_KEY),
    ]);

    const seenArr: unknown = seenRaw ? JSON.parse(seenRaw) : [];
    seenCache = new Set(
      Array.isArray(seenArr)
        ? seenArr.filter((v): v is string => typeof v === 'string')
        : [],
    );

    const countsObj: unknown = countsRaw ? JSON.parse(countsRaw) : {};
    countsCache = new Map();
    if (countsObj && typeof countsObj === 'object' && !Array.isArray(countsObj)) {
      for (const [key, value] of Object.entries(countsObj as Record<string, unknown>)) {
        if (typeof value === 'number' && Number.isFinite(value)) {
          countsCache.set(key, value);
        }
      }
    }
  } catch {
    seenCache = new Set();
    countsCache = new Map();
  }
}

export function ensureBloomLocalStateLoaded(): Promise<void> {
  if (seenCache && countsCache) return Promise.resolve();
  if (!loadPromise) {
    loadPromise = loadFromStorage().finally(() => {
      loadPromise = null;
      notify();
    });
  }
  return loadPromise;
}

export function isBloomLocalStateLoaded(): boolean {
  return seenCache !== null && countsCache !== null;
}

export function isJournalSeenSync(journalId: string): boolean {
  return seenCache?.has(journalId) ?? false;
}

export function getLastSeenCountSync(journalId: string): number {
  return countsCache?.get(journalId) ?? 0;
}

async function persist(): Promise<void> {
  if (!seenCache || !countsCache) return;
  try {
    await Promise.all([
      AsyncStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seenCache))),
      AsyncStorage.setItem(
        COUNTS_KEY,
        JSON.stringify(Object.fromEntries(countsCache)),
      ),
    ]);
  } catch {
    // non-fatal — a failed write will just be re-attempted on the next call
  }
}

function evictIfNeeded(): void {
  if (!seenCache || !countsCache) return;
  while (seenCache.size > MAX_ENTRIES) {
    const oldest = seenCache.values().next().value;
    if (oldest === undefined) break;
    seenCache.delete(oldest);
    countsCache.delete(oldest);
  }
  while (countsCache.size > MAX_ENTRIES) {
    const oldest = countsCache.keys().next().value;
    if (oldest === undefined) break;
    countsCache.delete(oldest);
  }
}

export async function markBloomSeen(
  journalId: string,
  currentCount: number,
): Promise<void> {
  await ensureBloomLocalStateLoaded();
  if (!seenCache || !countsCache) return;

  // Re-insert to refresh insertion order — makes eviction behave like LRU.
  seenCache.delete(journalId);
  seenCache.add(journalId);
  countsCache.delete(journalId);
  countsCache.set(journalId, Math.max(0, currentCount));

  evictIfNeeded();
  notify();
  await persist();
}
