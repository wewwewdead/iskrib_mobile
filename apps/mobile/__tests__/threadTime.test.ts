import {
  formatElapsedSinceParent,
  toRomanNumeral,
} from '../src/lib/utils/threadTime';

describe('formatElapsedSinceParent', () => {
  const parent = '2026-01-01T00:00:00Z';

  it('returns null when either timestamp is missing', () => {
    expect(formatElapsedSinceParent(null, parent)).toBeNull();
    expect(formatElapsedSinceParent(undefined, parent)).toBeNull();
    expect(formatElapsedSinceParent(parent, null)).toBeNull();
    expect(formatElapsedSinceParent(parent, undefined)).toBeNull();
  });

  it('returns null when either timestamp is unparseable', () => {
    expect(formatElapsedSinceParent('not-a-date', parent)).toBeNull();
    expect(formatElapsedSinceParent(parent, 'also-bad')).toBeNull();
  });

  it('clamps negative diffs to "moments later"', () => {
    expect(formatElapsedSinceParent('2025-12-31T00:00:00Z', parent)).toBe(
      'moments later',
    );
  });

  it('returns "moments later" when under one hour', () => {
    expect(formatElapsedSinceParent('2026-01-01T00:30:00Z', parent)).toBe(
      'moments later',
    );
  });

  it('uses singular "an hour later" vs plural hours', () => {
    expect(formatElapsedSinceParent('2026-01-01T01:05:00Z', parent)).toBe(
      'an hour later',
    );
    expect(formatElapsedSinceParent('2026-01-01T03:00:00Z', parent)).toBe(
      '3 hours later',
    );
  });

  it('uses singular "a day later" vs plural days', () => {
    expect(formatElapsedSinceParent('2026-01-02T00:00:00Z', parent)).toBe(
      'a day later',
    );
    expect(formatElapsedSinceParent('2026-01-04T00:00:00Z', parent)).toBe(
      '3 days later',
    );
  });

  it('uses singular "a week later" vs plural weeks', () => {
    expect(formatElapsedSinceParent('2026-01-08T00:00:00Z', parent)).toBe(
      'a week later',
    );
    expect(formatElapsedSinceParent('2026-01-22T00:00:00Z', parent)).toBe(
      '3 weeks later',
    );
  });

  it('uses singular "a month later" vs plural months', () => {
    expect(formatElapsedSinceParent('2026-02-10T00:00:00Z', parent)).toBe(
      'a month later',
    );
    // ~6 30-day months from 2026-01-01
    expect(formatElapsedSinceParent('2026-07-10T00:00:00Z', parent)).toBe(
      '6 months later',
    );
  });

  it('uses singular "a year later" vs plural years', () => {
    expect(formatElapsedSinceParent('2027-01-02T00:00:00Z', parent)).toBe(
      'a year later',
    );
    expect(formatElapsedSinceParent('2029-02-01T00:00:00Z', parent)).toBe(
      '3 years later',
    );
  });
});

describe('toRomanNumeral', () => {
  it('returns empty string for non-positive or non-finite input', () => {
    expect(toRomanNumeral(0)).toBe('');
    expect(toRomanNumeral(-3)).toBe('');
    expect(toRomanNumeral(NaN)).toBe('');
    expect(toRomanNumeral(Infinity)).toBe('');
  });

  it('uses subtractive notation for the 1..50 range ThreadScreen needs', () => {
    expect(toRomanNumeral(1)).toBe('I');
    expect(toRomanNumeral(4)).toBe('IV');
    expect(toRomanNumeral(5)).toBe('V');
    expect(toRomanNumeral(9)).toBe('IX');
    expect(toRomanNumeral(10)).toBe('X');
    expect(toRomanNumeral(40)).toBe('XL');
    expect(toRomanNumeral(44)).toBe('XLIV');
    expect(toRomanNumeral(49)).toBe('XLIX');
    expect(toRomanNumeral(50)).toBe('L');
  });

  it('floors fractional input', () => {
    expect(toRomanNumeral(3.9)).toBe('III');
  });
});
