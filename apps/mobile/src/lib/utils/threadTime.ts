// ═══════════════════════════════════════════════════════════════════
// threadTime — pure helpers for the thread chapter cards.
//
// formatElapsedSinceParent:
//   Produces a cozy, book-voiced elapsed-time label ("a week later",
//   "three days later") from two ISO timestamps. Returns null when
//   either timestamp is missing so the caller can hide the label on
//   the root of a thread.
//
// toRomanNumeral:
//   Converts a 1-based chapter position to a Roman numeral. Threads
//   are capped at depth 50 by find_journal_thread, so the lookup
//   table only needs to cover 1..50. No dependencies.
// ═══════════════════════════════════════════════════════════════════

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;
const ONE_WEEK_MS = 7 * ONE_DAY_MS;
const ONE_MONTH_MS = 30 * ONE_DAY_MS;
const ONE_YEAR_MS = 365 * ONE_DAY_MS;

export function formatElapsedSinceParent(
  childIso: string | null | undefined,
  parentIso: string | null | undefined,
): string | null {
  if (!childIso || !parentIso) return null;

  const child = new Date(childIso).getTime();
  const parent = new Date(parentIso).getTime();
  if (!Number.isFinite(child) || !Number.isFinite(parent)) return null;

  const diff = Math.max(0, child - parent);

  if (diff < ONE_HOUR_MS) return 'moments later';

  if (diff < ONE_DAY_MS) {
    const hours = Math.max(1, Math.round(diff / ONE_HOUR_MS));
    return hours === 1 ? 'an hour later' : `${hours} hours later`;
  }

  if (diff < ONE_WEEK_MS) {
    const days = Math.max(1, Math.round(diff / ONE_DAY_MS));
    return days === 1 ? 'a day later' : `${days} days later`;
  }

  if (diff < ONE_MONTH_MS) {
    const weeks = Math.max(1, Math.round(diff / ONE_WEEK_MS));
    return weeks === 1 ? 'a week later' : `${weeks} weeks later`;
  }

  if (diff < ONE_YEAR_MS) {
    const months = Math.max(1, Math.round(diff / ONE_MONTH_MS));
    return months === 1 ? 'a month later' : `${months} months later`;
  }

  const years = Math.max(1, Math.round(diff / ONE_YEAR_MS));
  return years === 1 ? 'a year later' : `${years} years later`;
}

// Small lookup-table numeral converter — fine for threads capped at 50.
// Standard subtractive Roman notation (IV, IX, XL, not IIII).
const ROMAN_UNITS: Array<[number, string]> = [
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

export function toRomanNumeral(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '';
  let remaining = Math.min(Math.floor(n), 3999);
  let out = '';
  for (const [value, glyph] of ROMAN_UNITS) {
    while (remaining >= value) {
      out += glyph;
      remaining -= value;
    }
  }
  return out;
}
