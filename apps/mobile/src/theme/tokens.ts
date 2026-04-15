export interface Palette {
  bgPrimary: string;
  bgSecondary: string;
  bgHover: string;
  bgElevated: string;
  bgCard: string;
  bgBackdrop: string;
  bgPill: string;
  bgGlass: string;
  bgGlassBorder: string;
  bgSelection: string;

  textPrimary: string;
  textHeading: string;
  textSecondary: string;
  textBody: string;
  textMuted: string;
  textFaint: string;

  accentGold: string;
  accentAmber: string;
  accentSage: string;
  accentDark: string;
  accentDarkHover: string;

  borderLight: string;
  borderCard: string;

  iconDefault: string;

  danger: string;
  dangerBg: string;
  success: string;
  successBg: string;

  loaderColor: string;

  // Contrast text (dark text on gold/amber surfaces)
  textOnAccent: string;

  // Story status colors (warm literary palette)
  statusOngoing: string;
  statusOngoingBg: string;
  statusCompleted: string;
  statusCompletedBg: string;
  statusHiatus: string;
  statusHiatusBg: string;

  // Analytics stat colors (muted warm tones)
  statReactions: string;
  statComments: string;
  statEngagement: string;

  // Badge colors
  badgeLegendBorder: string;
  badgeLegendGlow: string;
  badgeOGBorder: string;
  badgeOGGlow: string;
}

export type ThemeMode = 'light' | 'dark' | 'universe' | 'custom';

type PaletteSwatchOption<Id extends string> = {
  id: Id;
  label: string;
  swatch: string;
  overrides: Partial<Palette>;
};

export const lightPalette: Palette = {
  bgPrimary: '#FAF9F6',
  bgSecondary: '#F3F1ED',
  bgHover: '#EDEAE5',
  bgElevated: '#FFFFFF',
  bgCard: '#FEFEFE',
  bgBackdrop: 'rgba(250,249,246,0.75)',
  bgPill: 'rgba(120,100,80,0.06)',
  bgGlass: 'rgba(255,255,255,0.55)',
  bgGlassBorder: 'rgba(200,180,150,0.2)',
  bgSelection: 'rgba(212,168,83,0.08)',

  textPrimary: '#1A1612',
  textHeading: '#12100D',
  textSecondary: '#6B6560',
  textBody: '#8A8480',
  textMuted: '#A8A29E',
  textFaint: '#C0BBB5',

  accentGold: '#C4943E',
  accentAmber: '#D4A853',
  accentSage: '#8A9E7A',
  accentDark: '#1A1612',
  accentDarkHover: '#3A3530',

  borderLight: 'rgba(120,100,80,0.12)',
  borderCard: 'rgba(120,100,80,0.08)',

  iconDefault: '#8A8480',

  danger: '#DC2626',
  dangerBg: 'rgba(220,38,38,0.08)',
  success: '#16A34A',
  successBg: 'rgba(22,163,74,0.08)',

  loaderColor: '#C4943E',

  textOnAccent: '#1A1612',

  statusOngoing: '#7A9E6A',
  statusOngoingBg: 'rgba(122,158,106,0.10)',
  statusCompleted: '#B8943E',
  statusCompletedBg: 'rgba(184,148,62,0.10)',
  statusHiatus: '#B87A4A',
  statusHiatusBg: 'rgba(184,122,74,0.10)',

  statReactions: '#C47A6A',
  statComments: '#7A8A9E',
  statEngagement: '#A08060',

  badgeLegendBorder: '#FFD700',
  badgeLegendGlow: 'rgba(255,215,0,0.3)',
  badgeOGBorder: '#9B59FF',
  badgeOGGlow: 'rgba(155,89,255,0.3)',
};

export const darkPalette: Palette = {
  bgPrimary: '#0C0C0C',
  bgSecondary: '#141414',
  bgHover: '#1E1E1C',
  bgElevated: '#1A1A18',
  bgCard: '#161614',
  bgBackdrop: 'rgba(12,12,12,0.8)',
  bgPill: 'rgba(255,240,210,0.06)',
  bgGlass: 'rgba(255,255,255,0.05)',
  bgGlassBorder: 'rgba(255,240,210,0.08)',
  bgSelection: 'rgba(212,168,83,0.15)',

  textPrimary: '#F0EBE3',
  textHeading: '#F5F0E8',
  textSecondary: '#B0A89E',
  textBody: '#908880',
  textMuted: '#6B6560',
  textFaint: '#504A45',

  accentGold: '#D4A853',
  accentAmber: '#E0BA6A',
  accentSage: '#9AB08A',
  accentDark: '#F0EBE3',
  accentDarkHover: '#C8C0B5',

  borderLight: 'rgba(255,240,210,0.06)',
  borderCard: 'rgba(255,240,210,0.04)',

  iconDefault: '#908880',

  danger: '#EF4444',
  dangerBg: 'rgba(239,68,68,0.12)',
  success: '#22C55E',
  successBg: 'rgba(34,197,94,0.12)',

  loaderColor: '#D4A853',

  textOnAccent: '#1A1612',

  statusOngoing: '#8AB07A',
  statusOngoingBg: 'rgba(138,176,122,0.12)',
  statusCompleted: '#C8A44E',
  statusCompletedBg: 'rgba(200,164,78,0.12)',
  statusHiatus: '#C88A5A',
  statusHiatusBg: 'rgba(200,138,90,0.12)',

  statReactions: '#D48A7A',
  statComments: '#8A9AB0',
  statEngagement: '#B09070',

  badgeLegendBorder: '#FFD700',
  badgeLegendGlow: 'rgba(255,215,0,0.4)',
  badgeOGBorder: '#9B59FF',
  badgeOGGlow: 'rgba(155,89,255,0.4)',
};

export const universePalette: Palette = {
  bgPrimary: '#060915',
  bgSecondary: '#0A1020',
  bgHover: '#121A2E',
  bgElevated: '#0D1427',
  bgCard: '#11182C',
  bgBackdrop: 'rgba(6,9,21,0.86)',
  bgPill: 'rgba(176,164,219,0.12)',
  bgGlass: 'rgba(161,170,255,0.08)',
  bgGlassBorder: 'rgba(196,204,255,0.14)',
  bgSelection: 'rgba(214,173,106,0.18)',

  textPrimary: '#F2EEFA',
  textHeading: '#FAF7FF',
  textSecondary: '#B7B1CC',
  textBody: '#9A93B3',
  textMuted: '#736C8F',
  textFaint: '#4E4967',

  accentGold: '#C89A52',
  accentAmber: '#D6AE70',
  accentSage: '#8AA4A5',
  accentDark: '#F2EEFA',
  accentDarkHover: '#D7D0E8',

  borderLight: 'rgba(212,205,236,0.1)',
  borderCard: 'rgba(212,205,236,0.07)',

  iconDefault: '#A59DBF',

  danger: '#F06B7D',
  dangerBg: 'rgba(240,107,125,0.14)',
  success: '#4FC49B',
  successBg: 'rgba(79,196,155,0.14)',

  loaderColor: '#D6AE70',

  textOnAccent: '#140F1C',

  statusOngoing: '#85B19F',
  statusOngoingBg: 'rgba(133,177,159,0.14)',
  statusCompleted: '#D0A765',
  statusCompletedBg: 'rgba(208,167,101,0.16)',
  statusHiatus: '#C68AA7',
  statusHiatusBg: 'rgba(198,138,167,0.16)',

  statReactions: '#D59AA5',
  statComments: '#97A3D7',
  statEngagement: '#B49274',

  badgeLegendBorder: '#FFE08A',
  badgeLegendGlow: 'rgba(255,224,138,0.34)',
  badgeOGBorder: '#9D8BFF',
  badgeOGGlow: 'rgba(157,139,255,0.34)',
};

const customPrimaryBackgroundOptions = [
  {
    id: 'ink',
    label: 'Ink',
    swatch: '#0C0C0C',
    overrides: {
      bgPrimary: '#0C0C0C',
      bgSecondary: '#141414',
      bgHover: '#1E1E1C',
      bgBackdrop: 'rgba(12,12,12,0.8)',
    },
  },
  {
    id: 'midnight',
    label: 'Midnight',
    swatch: '#080D18',
    overrides: {
      bgPrimary: '#080D18',
      bgSecondary: '#0C1322',
      bgHover: '#131C2E',
      bgBackdrop: 'rgba(8,13,24,0.84)',
    },
  },
  {
    id: 'nebula',
    label: 'Nebula',
    swatch: '#120E1C',
    overrides: {
      bgPrimary: '#120E1C',
      bgSecondary: '#181325',
      bgHover: '#211A31',
      bgBackdrop: 'rgba(18,14,28,0.84)',
    },
  },
  {
    id: 'ember',
    label: 'Ember',
    swatch: '#17110E',
    overrides: {
      bgPrimary: '#17110E',
      bgSecondary: '#1F1814',
      bgHover: '#29201B',
      bgBackdrop: 'rgba(23,17,14,0.84)',
    },
  },
] as const satisfies readonly PaletteSwatchOption<string>[];

const customCardBackgroundOptions = [
  {
    id: 'basalt',
    label: 'Basalt',
    swatch: '#1A1A18',
    overrides: {
      bgElevated: '#1A1A18',
      bgCard: '#161614',
      bgPill: 'rgba(255,240,210,0.06)',
      bgGlass: 'rgba(255,255,255,0.05)',
      bgGlassBorder: 'rgba(255,240,210,0.08)',
      borderLight: 'rgba(255,240,210,0.06)',
      borderCard: 'rgba(255,240,210,0.04)',
    },
  },
  {
    id: 'starlit',
    label: 'Starlit',
    swatch: '#121A31',
    overrides: {
      bgElevated: '#121A31',
      bgCard: '#0F162A',
      bgPill: 'rgba(193,200,255,0.1)',
      bgGlass: 'rgba(177,186,255,0.08)',
      bgGlassBorder: 'rgba(205,212,255,0.14)',
      borderLight: 'rgba(205,212,255,0.1)',
      borderCard: 'rgba(205,212,255,0.07)',
    },
  },
  {
    id: 'violet',
    label: 'Violet',
    swatch: '#1A1530',
    overrides: {
      bgElevated: '#1A1530',
      bgCard: '#161129',
      bgPill: 'rgba(210,192,255,0.1)',
      bgGlass: 'rgba(191,170,255,0.08)',
      bgGlassBorder: 'rgba(214,197,255,0.14)',
      borderLight: 'rgba(214,197,255,0.1)',
      borderCard: 'rgba(214,197,255,0.07)',
    },
  },
  {
    id: 'smoke',
    label: 'Smoke',
    swatch: '#22201D',
    overrides: {
      bgElevated: '#22201D',
      bgCard: '#1B1916',
      bgPill: 'rgba(255,232,214,0.08)',
      bgGlass: 'rgba(255,255,255,0.05)',
      bgGlassBorder: 'rgba(255,232,214,0.1)',
      borderLight: 'rgba(255,232,214,0.08)',
      borderCard: 'rgba(255,232,214,0.05)',
    },
  },
] as const satisfies readonly PaletteSwatchOption<string>[];

const customPrimaryTextOptions = [
  {
    id: 'ivory',
    label: 'Ivory',
    swatch: '#F0EBE3',
    overrides: {
      textPrimary: '#F0EBE3',
      textHeading: '#F5F0E8',
      textSecondary: '#B0A89E',
      textBody: '#908880',
      textMuted: '#6B6560',
      textFaint: '#504A45',
      iconDefault: '#908880',
    },
  },
  {
    id: 'moon',
    label: 'Moon',
    swatch: '#EEF1FA',
    overrides: {
      textPrimary: '#EEF1FA',
      textHeading: '#F8FAFF',
      textSecondary: '#B6BED5',
      textBody: '#96A0B8',
      textMuted: '#717B96',
      textFaint: '#4F5870',
      iconDefault: '#96A0B8',
    },
  },
  {
    id: 'lilac',
    label: 'Lilac',
    swatch: '#F2ECFF',
    overrides: {
      textPrimary: '#F2ECFF',
      textHeading: '#FBF8FF',
      textSecondary: '#BDAFD5',
      textBody: '#9F92B6',
      textMuted: '#796B8F',
      textFaint: '#554A68',
      iconDefault: '#9F92B6',
    },
  },
  {
    id: 'linen',
    label: 'Linen',
    swatch: '#F5E8D8',
    overrides: {
      textPrimary: '#F5E8D8',
      textHeading: '#FBF2E6',
      textSecondary: '#C0AE9C',
      textBody: '#A18F7E',
      textMuted: '#7C6A5A',
      textFaint: '#5A4A3F',
      iconDefault: '#A18F7E',
    },
  },
] as const satisfies readonly PaletteSwatchOption<string>[];

const customAccentColorOptions = [
  {
    id: 'amber',
    label: 'Amber',
    swatch: '#E0BA6A',
    overrides: {
      accentGold: '#D4A853',
      accentAmber: '#E0BA6A',
      loaderColor: '#D4A853',
      bgSelection: 'rgba(224,186,106,0.16)',
      textOnAccent: '#1A1612',
    },
  },
  {
    id: 'rose',
    label: 'Rose',
    swatch: '#E1A18E',
    overrides: {
      accentGold: '#CC8974',
      accentAmber: '#E1A18E',
      loaderColor: '#E1A18E',
      bgSelection: 'rgba(225,161,142,0.18)',
      textOnAccent: '#180F0C',
    },
  },
  {
    id: 'sage',
    label: 'Sage',
    swatch: '#A8C29B',
    overrides: {
      accentGold: '#8FAA82',
      accentAmber: '#A8C29B',
      loaderColor: '#A8C29B',
      bgSelection: 'rgba(168,194,155,0.18)',
      textOnAccent: '#10140F',
    },
  },
  {
    id: 'starlight',
    label: 'Starlight',
    swatch: '#A99AF0',
    overrides: {
      accentGold: '#8A7DD4',
      accentAmber: '#A99AF0',
      loaderColor: '#A99AF0',
      bgSelection: 'rgba(169,154,240,0.2)',
      textOnAccent: '#120E1D',
    },
  },
] as const satisfies readonly PaletteSwatchOption<string>[];

export type PrimaryBackgroundSwatchId = (typeof customPrimaryBackgroundOptions)[number]['id'];
export type CardBackgroundSwatchId = (typeof customCardBackgroundOptions)[number]['id'];
export type PrimaryTextSwatchId = (typeof customPrimaryTextOptions)[number]['id'];
export type AccentColorSwatchId = (typeof customAccentColorOptions)[number]['id'];

export type CustomThemeField =
  | 'primaryBackground'
  | 'cardBackground'
  | 'primaryText'
  | 'accentColor';

export interface CustomThemeSelection {
  primaryBackground?: PrimaryBackgroundSwatchId;
  cardBackground?: CardBackgroundSwatchId;
  primaryText?: PrimaryTextSwatchId;
  accentColor?: AccentColorSwatchId;
}

export type ResolvedCustomThemeSelection = {
  primaryBackground: PrimaryBackgroundSwatchId;
  cardBackground: CardBackgroundSwatchId;
  primaryText: PrimaryTextSwatchId;
  accentColor: AccentColorSwatchId;
};

export const CUSTOM_THEME_SWATCHES = {
  primaryBackground: customPrimaryBackgroundOptions,
  cardBackground: customCardBackgroundOptions,
  primaryText: customPrimaryTextOptions,
  accentColor: customAccentColorOptions,
} as const;

export const DEFAULT_CUSTOM_THEME_SELECTION: ResolvedCustomThemeSelection = {
  primaryBackground: 'ink',
  cardBackground: 'basalt',
  primaryText: 'ivory',
  accentColor: 'amber',
};

function getOptionById<T extends readonly PaletteSwatchOption<string>[]>(
  options: T,
  id: T[number]['id'],
): T[number] {
  const match = options.find(option => option.id === id);
  if (!match) {
    return options[0];
  }
  return match;
}

function getValidOptionId<T extends readonly PaletteSwatchOption<string>[]>(
  options: T,
  value: unknown,
  fallback: T[number]['id'],
): T[number]['id'] {
  if (typeof value !== 'string') {
    return fallback;
  }
  return options.some(option => option.id === value)
    ? (value as T[number]['id'])
    : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function resolveCustomThemeSelection(input?: unknown): ResolvedCustomThemeSelection {
  if (!isRecord(input)) {
    return {...DEFAULT_CUSTOM_THEME_SELECTION};
  }

  return {
    primaryBackground: getValidOptionId(
      customPrimaryBackgroundOptions,
      input.primaryBackground,
      DEFAULT_CUSTOM_THEME_SELECTION.primaryBackground,
    ),
    cardBackground: getValidOptionId(
      customCardBackgroundOptions,
      input.cardBackground,
      DEFAULT_CUSTOM_THEME_SELECTION.cardBackground,
    ),
    primaryText: getValidOptionId(
      customPrimaryTextOptions,
      input.primaryText,
      DEFAULT_CUSTOM_THEME_SELECTION.primaryText,
    ),
    accentColor: getValidOptionId(
      customAccentColorOptions,
      input.accentColor,
      DEFAULT_CUSTOM_THEME_SELECTION.accentColor,
    ),
  };
}

export function resolveCustomPalette(selection?: unknown): Palette {
  const safeSelection = resolveCustomThemeSelection(selection);

  const palette = {
    ...darkPalette,
    ...getOptionById(
      customPrimaryBackgroundOptions,
      safeSelection.primaryBackground,
    ).overrides,
    ...getOptionById(
      customCardBackgroundOptions,
      safeSelection.cardBackground,
    ).overrides,
    ...getOptionById(
      customPrimaryTextOptions,
      safeSelection.primaryText,
    ).overrides,
    ...getOptionById(
      customAccentColorOptions,
      safeSelection.accentColor,
    ).overrides,
  };

  return {
    ...palette,
    badgeLegendBorder: darkPalette.badgeLegendBorder,
    badgeLegendGlow: darkPalette.badgeLegendGlow,
    badgeOGBorder: darkPalette.badgeOGBorder,
    badgeOGGlow: darkPalette.badgeOGGlow,
  };
}

export function getThemePalette(
  mode: ThemeMode,
  customSelection?: unknown,
): Palette {
  switch (mode) {
    case 'light':
      return lightPalette;
    case 'dark':
      return darkPalette;
    case 'universe':
      return universePalette;
    case 'custom':
      return resolveCustomPalette(customSelection);
    default:
      return darkPalette;
  }
}

function getHexRgb(color: string): [number, number, number] | null {
  const normalized = color.trim().replace('#', '');

  let r: number;
  let g: number;
  let b: number;

  if (normalized.length === 3) {
    const [rc, gc, bc] = normalized.split('');
    r = parseInt(rc + rc, 16);
    g = parseInt(gc + gc, 16);
    b = parseInt(bc + bc, 16);
  } else if (normalized.length === 6 || normalized.length === 8) {
    r = parseInt(normalized.slice(0, 2), 16);
    g = parseInt(normalized.slice(2, 4), 16);
    b = parseInt(normalized.slice(4, 6), 16);
  } else {
    return null;
  }

  // parseInt returns NaN for non-hex characters (e.g. '#zzz'). Surface
  // that as null so isPaletteDark hits its documented fallback instead
  // of silently feeding NaN into the luminance math (which then
  // compares NaN < 0.35 → false, i.e. "light" — the wrong answer).
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
    return null;
  }

  return [r, g, b];
}

function getRelativeLuminanceChannel(channel: number): number {
  const value = channel / 255;
  return value <= 0.03928
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4;
}

export function isPaletteDark(palette: Palette): boolean {
  const rgb = getHexRgb(palette.bgPrimary);
  if (!rgb) {
    return true;
  }

  const [r, g, b] = rgb;
  const luminance =
    0.2126 * getRelativeLuminanceChannel(r) +
    0.7152 * getRelativeLuminanceChannel(g) +
    0.0722 * getRelativeLuminanceChannel(b);

  return luminance < 0.35;
}
