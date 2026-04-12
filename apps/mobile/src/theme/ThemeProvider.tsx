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
import {lightPalette, darkPalette, type Palette} from './tokens';
import {typeScale as baseTypeScale, createScaledTypeScale} from './typography';

const STORAGE_KEY = '@iskrib_theme';
const FONT_SIZE_KEY = '@iskrib_font_size';

type ThemeMode = 'light' | 'dark';
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

export function ThemeProvider({children}: {children: React.ReactNode}) {
  const [theme, setThemeState] = useState<ThemeMode>(
    () => (Appearance.getColorScheme() as ThemeMode) ?? 'dark',
  );
  const [fontSizeKey, setFontSizeKeyState] = useState<FontSizeKey>('default');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(FONT_SIZE_KEY),
    ]).then(([storedTheme, storedFont]) => {
      if (storedTheme === 'light' || storedTheme === 'dark') {
        setThemeState(storedTheme);
      }
      if (storedFont && storedFont in FONT_SIZE_PRESETS) {
        setFontSizeKeyState(storedFont as FontSizeKey);
      }
      setLoaded(true);
    });
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    AsyncStorage.setItem(STORAGE_KEY, mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const setFontSize = useCallback((key: FontSizeKey) => {
    setFontSizeKeyState(key);
    AsyncStorage.setItem(FONT_SIZE_KEY, key);
  }, []);

  const fontScale = FONT_SIZE_PRESETS[fontSizeKey].scale;

  const value = useMemo<ThemeContextValue>(() => {
    const scaledType = createScaledTypeScale(fontScale);
    const sf = (size: number) => Math.round(size * fontScale);
    return {
      theme,
      colors: theme === 'dark' ? darkPalette : lightPalette,
      isDark: theme === 'dark',
      toggleTheme,
      setTheme,
      fontSizeKey,
      fontScale,
      scaledType,
      sf,
      setFontSize,
      readingFont: {fontSize: scaledType.body.fontSize ?? 16, lineHeight: scaledType.body.lineHeight ?? 26},
    };
  }, [theme, toggleTheme, setTheme, fontSizeKey, fontScale, setFontSize]);

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
