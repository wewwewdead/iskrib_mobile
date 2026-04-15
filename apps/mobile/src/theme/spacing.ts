import {Platform, ViewStyle} from 'react-native';
import {isPaletteDark, type Palette} from './tokens';

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
} as const;

export const radii = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  xxl: 14,
  xxxl: 16,
  hero: 20,
  pill: 999,
} as const;

// Shadow factory — returns platform-appropriate shadow styles.
//
// Cached per Palette via WeakMap so 21+ card components calling this in
// their render body don't rebuild the table (6 StyleSheet objects + a
// luminance computation) on every frame during 60fps scroll. The cache
// is keyed on the palette object's identity; ThemeProvider memoizes the
// palette on [theme, customTheme], so a cached result survives until
// the active palette actually changes.
type ShadowTable = {
  card: ViewStyle;
  cardSm: ViewStyle;
  elevated: ViewStyle;
  modal: ViewStyle;
  button: ViewStyle;
  none: ViewStyle;
};

const shadowCache = new WeakMap<Palette, ShadowTable>();

export function shadows(colors: Palette): ShadowTable {
  const cached = shadowCache.get(colors);
  if (cached) return cached;
  const table = buildShadowTable(colors);
  shadowCache.set(colors, table);
  return table;
}

function buildShadowTable(colors: Palette): ShadowTable {
  const darkShadow = isPaletteDark(colors);

  return {
    card: Platform.select({
      ios: {
        shadowColor: darkShadow ? 'rgba(0,0,0,0.4)' : 'rgba(80,60,40,0.08)',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 1,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }) as ViewStyle,

    cardSm: Platform.select({
      ios: {
        shadowColor: darkShadow ? 'rgba(0,0,0,0.3)' : 'rgba(80,60,40,0.06)',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 1,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }) as ViewStyle,

    elevated: Platform.select({
      ios: {
        shadowColor: darkShadow ? 'rgba(0,0,0,0.5)' : 'rgba(80,60,40,0.12)',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 1,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
    }) as ViewStyle,

    modal: Platform.select({
      ios: {
        shadowColor: darkShadow ? 'rgba(0,0,0,0.6)' : 'rgba(80,60,40,0.15)',
        shadowOffset: {width: 0, height: 8},
        shadowOpacity: 1,
        shadowRadius: 32,
      },
      android: {
        elevation: 8,
      },
    }) as ViewStyle,

    button: Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.1)',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 1,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }) as ViewStyle,

    none: {
      shadowColor: 'transparent',
      shadowOffset: {width: 0, height: 0},
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    } as ViewStyle,
  };
}
