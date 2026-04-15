import {
  DEFAULT_CUSTOM_THEME_SELECTION,
  darkPalette,
  getThemePalette,
  isPaletteDark,
  lightPalette,
  resolveCustomPalette,
  resolveCustomThemeSelection,
  universePalette,
} from '../src/theme/tokens';

describe('resolveCustomThemeSelection', () => {
  it('returns defaults for non-record input', () => {
    expect(resolveCustomThemeSelection(undefined)).toEqual(
      DEFAULT_CUSTOM_THEME_SELECTION,
    );
    expect(resolveCustomThemeSelection(null)).toEqual(
      DEFAULT_CUSTOM_THEME_SELECTION,
    );
    expect(resolveCustomThemeSelection([])).toEqual(
      DEFAULT_CUSTOM_THEME_SELECTION,
    );
    expect(resolveCustomThemeSelection('custom')).toEqual(
      DEFAULT_CUSTOM_THEME_SELECTION,
    );
    expect(resolveCustomThemeSelection(42)).toEqual(
      DEFAULT_CUSTOM_THEME_SELECTION,
    );
  });

  it('replaces invalid fields with their per-field default', () => {
    expect(
      resolveCustomThemeSelection({accentColor: 'not-real'}),
    ).toEqual(DEFAULT_CUSTOM_THEME_SELECTION);
    expect(
      resolveCustomThemeSelection({primaryBackground: 42}),
    ).toEqual(DEFAULT_CUSTOM_THEME_SELECTION);
  });

  it('accepts a partial valid record and fills the rest with defaults', () => {
    const out = resolveCustomThemeSelection({primaryBackground: 'midnight'});
    expect(out.primaryBackground).toBe('midnight');
    expect(out.cardBackground).toBe(
      DEFAULT_CUSTOM_THEME_SELECTION.cardBackground,
    );
    expect(out.primaryText).toBe(DEFAULT_CUSTOM_THEME_SELECTION.primaryText);
    expect(out.accentColor).toBe(DEFAULT_CUSTOM_THEME_SELECTION.accentColor);
  });
});

describe('resolveCustomPalette', () => {
  // Badge ring colors are a load-bearing invariant — they must always
  // reflect darkPalette regardless of accent override, because the
  // Legend/OG badge glow is part of the brand identity and must not
  // shift to a user's custom accent.
  it.each(['amber', 'rose', 'sage', 'starlight'] as const)(
    'preserves darkPalette badge tokens for accent %s',
    accent => {
      const palette = resolveCustomPalette({
        ...DEFAULT_CUSTOM_THEME_SELECTION,
        accentColor: accent,
      });
      expect(palette.badgeLegendBorder).toBe(darkPalette.badgeLegendBorder);
      expect(palette.badgeLegendGlow).toBe(darkPalette.badgeLegendGlow);
      expect(palette.badgeOGBorder).toBe(darkPalette.badgeOGBorder);
      expect(palette.badgeOGGlow).toBe(darkPalette.badgeOGGlow);
    },
  );

  it('falls back to ink/basalt/ivory/amber for non-record input', () => {
    const palette = resolveCustomPalette('garbage');
    // 'ink' primary background hex from customPrimaryBackgroundOptions.
    expect(palette.bgPrimary).toBe('#0C0C0C');
  });
});

describe('getThemePalette', () => {
  it('maps each known theme mode to its palette', () => {
    expect(getThemePalette('light')).toBe(lightPalette);
    expect(getThemePalette('dark')).toBe(darkPalette);
    expect(getThemePalette('universe')).toBe(universePalette);
  });

  it('returns a resolved custom palette for custom mode', () => {
    const palette = getThemePalette('custom', {
      ...DEFAULT_CUSTOM_THEME_SELECTION,
      primaryBackground: 'ember',
    });
    // 'ember' primary background hex from customPrimaryBackgroundOptions.
    expect(palette.bgPrimary).toBe('#17110E');
  });

  it('falls back to darkPalette for an unknown mode', () => {
    expect(getThemePalette('bogus' as any)).toBe(darkPalette);
  });
});

describe('isPaletteDark', () => {
  const mk = (bg: string) => ({...darkPalette, bgPrimary: bg});

  it('returns false for bright palettes', () => {
    expect(isPaletteDark(lightPalette)).toBe(false);
    expect(isPaletteDark(mk('#FFFFFF'))).toBe(false);
    expect(isPaletteDark(mk('#fff'))).toBe(false);
  });

  it('returns true for dark palettes', () => {
    expect(isPaletteDark(darkPalette)).toBe(true);
    expect(isPaletteDark(mk('#000000'))).toBe(true);
  });

  it('ignores the alpha byte on 8-char hex', () => {
    expect(isPaletteDark(mk('#FFFFFFAA'))).toBe(
      isPaletteDark(mk('#FFFFFF')),
    );
  });

  it('falls back to dark when the hex cannot be parsed', () => {
    expect(isPaletteDark(mk('#zzz'))).toBe(true);
  });

  it('returns true for the universe palette', () => {
    expect(isPaletteDark(universePalette)).toBe(true);
  });
});
