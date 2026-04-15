import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {Appearance} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type CustomThemeField,
  type Palette,
  type ResolvedCustomThemeSelection,
  type ThemeMode,
  DEFAULT_CUSTOM_THEME_SELECTION,
  getThemePalette,
  isPaletteDark,
  resolveCustomPalette,
  resolveCustomThemeSelection,
} from './tokens';
import {typeScale as baseTypeScale, createScaledTypeScale} from './typography';

export const THEME_STORAGE_KEY = '@iskrib_theme';
export const CUSTOM_THEME_STORAGE_KEY = '@iskrib_theme_custom';
export const FONT_SIZE_KEY = '@iskrib_font_size';

export type {ThemeMode} from './tokens';
export type FontSizeKey = 'small' | 'default' | 'large' | 'xlarge';

export const FONT_SIZE_PRESETS: Record<FontSizeKey, {scale: number; label: string}> = {
  small: {scale: 0.875, label: 'Small'},
  default: {scale: 1, label: 'Default'},
  large: {scale: 1.125, label: 'Large'},
  xlarge: {scale: 1.375, label: 'Extra Large'},
};

interface ThemeContextValue {
  theme: ThemeMode;
  colors: Palette;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  customTheme: ResolvedCustomThemeSelection;
  customThemeColors: Palette;
  setCustomThemeField: <K extends CustomThemeField>(
    field: K,
    value: ResolvedCustomThemeSelection[K],
  ) => void;
  fontSizeKey: FontSizeKey;
  fontScale: number;
  /** Pre-scaled typeScale — use this instead of the static `typeScale` for dynamic sizing. */
  scaledType: typeof baseTypeScale;
  /** Convenience: scale any arbitrary font size by the user's preference. */
  sf: (size: number) => number;
  setFontSize: (key: FontSizeKey) => void;
  // Kept for LexicalRenderer backward compat
  readingFont: {fontSize: number; lineHeight: number};
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function persistValue(key: string, value: string) {
  AsyncStorage.setItem(key, value).catch(() => {});
}

function getInitialThemeMode(): ThemeMode {
  const appearance = Appearance.getColorScheme();
  return appearance === 'light' || appearance === 'dark' ? appearance : 'dark';
}

function resolveStoredThemeMode(value: string | null): ThemeMode | null {
  if (
    value === 'light' ||
    value === 'dark' ||
    value === 'universe' ||
    value === 'custom'
  ) {
    return value;
  }
  return null;
}

export function ThemeProvider({children}: {children: React.ReactNode}) {
  const [theme, setThemeState] = useState<ThemeMode>(() => getInitialThemeMode());
  const [customTheme, setCustomThemeState] = useState<ResolvedCustomThemeSelection>(
    DEFAULT_CUSTOM_THEME_SELECTION,
  );
  const [fontSizeKey, setFontSizeKeyState] = useState<FontSizeKey>('default');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      try {
        const [storedTheme, storedFont, storedCustomTheme] = await Promise.all([
          AsyncStorage.getItem(THEME_STORAGE_KEY),
          AsyncStorage.getItem(FONT_SIZE_KEY),
          AsyncStorage.getItem(CUSTOM_THEME_STORAGE_KEY),
        ]);

        if (!active) {
          return;
        }

        const resolvedTheme = resolveStoredThemeMode(storedTheme);
        if (resolvedTheme) {
          setThemeState(resolvedTheme);
        }

        if (storedFont && storedFont in FONT_SIZE_PRESETS) {
          setFontSizeKeyState(storedFont as FontSizeKey);
        }

        let parsedCustomTheme: unknown = null;
        if (storedCustomTheme) {
          try {
            parsedCustomTheme = JSON.parse(storedCustomTheme);
          } catch {
            parsedCustomTheme = null;
          }
        }

        setCustomThemeState(resolveCustomThemeSelection(parsedCustomTheme));
      } finally {
        if (active) {
          setLoaded(true);
        }
      }
    };

    hydrate();

    return () => {
      active = false;
    };
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    persistValue(THEME_STORAGE_KEY, mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(currentTheme => {
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      persistValue(THEME_STORAGE_KEY, nextTheme);
      return nextTheme;
    });
  }, []);

  const setCustomThemeField = useCallback(
    function setCustomThemeField<K extends CustomThemeField>(
      field: K,
      value: ResolvedCustomThemeSelection[K],
    ) {
      setCustomThemeState(currentTheme => {
        const nextTheme = {
          ...currentTheme,
          [field]: value,
        };
        persistValue(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(nextTheme));
        return nextTheme;
      });
    },
    [],
  );

  const setFontSize = useCallback((key: FontSizeKey) => {
    setFontSizeKeyState(key);
    persistValue(FONT_SIZE_KEY, key);
  }, []);

  const fontScale = FONT_SIZE_PRESETS[fontSizeKey].scale;

  const customThemeColors = useMemo(
    () => resolveCustomPalette(customTheme),
    [customTheme],
  );

  const colors = useMemo(() => {
    return theme === 'custom'
      ? customThemeColors
      : getThemePalette(theme, customTheme);
  }, [theme, customTheme, customThemeColors]);

  const isDark = useMemo(() => isPaletteDark(colors), [colors]);

  const value = useMemo<ThemeContextValue>(() => {
    const scaledType = createScaledTypeScale(fontScale);
    const sf = (size: number) => Math.round(size * fontScale);

    return {
      theme,
      colors,
      isDark,
      toggleTheme,
      setTheme,
      customTheme,
      customThemeColors,
      setCustomThemeField,
      fontSizeKey,
      fontScale,
      scaledType,
      sf,
      setFontSize,
      readingFont: {
        fontSize: scaledType.body.fontSize ?? 16,
        lineHeight: scaledType.body.lineHeight ?? 26,
      },
    };
  }, [
    theme,
    colors,
    isDark,
    toggleTheme,
    setTheme,
    customTheme,
    customThemeColors,
    setCustomThemeField,
    fontSizeKey,
    fontScale,
    setFontSize,
  ]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
