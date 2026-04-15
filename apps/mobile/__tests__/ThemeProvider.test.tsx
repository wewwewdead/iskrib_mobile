import React from 'react';
import renderer from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  CUSTOM_THEME_STORAGE_KEY,
  THEME_STORAGE_KEY,
  ThemeProvider,
  useTheme,
} from '../src/theme/ThemeProvider';
import {
  DEFAULT_CUSTOM_THEME_SELECTION,
  resolveCustomPalette,
} from '../src/theme/tokens';

describe('ThemeProvider', () => {
  let latestTheme: ReturnType<typeof useTheme> | null = null;

  function TestConsumer() {
    latestTheme = useTheme();
    return null;
  }

  async function renderThemeProvider() {
    let tree: renderer.ReactTestRenderer;

    await renderer.act(async () => {
      tree = renderer.create(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>,
      );
      await Promise.resolve();
    });

    return tree!;
  }

  async function unmountTree(tree: renderer.ReactTestRenderer) {
    await renderer.act(async () => {
      tree.unmount();
    });
  }

  beforeEach(async () => {
    latestTheme = null;
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('loads persisted custom theme selections into a full custom palette', async () => {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, 'custom');
    await AsyncStorage.setItem(
      CUSTOM_THEME_STORAGE_KEY,
      JSON.stringify({
        primaryBackground: 'midnight',
        cardBackground: 'starlit',
        primaryText: 'moon',
        accentColor: 'starlight',
      }),
    );

    const tree = await renderThemeProvider();

    expect(latestTheme?.theme).toBe('custom');
    expect(latestTheme?.customTheme).toEqual({
      primaryBackground: 'midnight',
      cardBackground: 'starlit',
      primaryText: 'moon',
      accentColor: 'starlight',
    });
    expect(latestTheme?.colors.bgPrimary).toBe('#080D18');
    expect(latestTheme?.colors.bgCard).toBe('#0F162A');
    expect(latestTheme?.colors.textPrimary).toBe('#EEF1FA');
    expect(latestTheme?.colors.accentAmber).toBe('#A99AF0');
    expect(latestTheme?.isDark).toBe(true);

    await unmountTree(tree);
  });

  it('falls back to the safe dark custom defaults when stored custom theme data is corrupted', async () => {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, 'custom');
    await AsyncStorage.setItem(CUSTOM_THEME_STORAGE_KEY, '{broken-json');

    const tree = await renderThemeProvider();

    expect(latestTheme?.theme).toBe('custom');
    expect(latestTheme?.customTheme).toEqual(DEFAULT_CUSTOM_THEME_SELECTION);
    expect(latestTheme?.colors).toEqual(
      resolveCustomPalette(DEFAULT_CUSTOM_THEME_SELECTION),
    );
    expect(latestTheme?.isDark).toBe(true);

    await unmountTree(tree);
  });

  it('updates and persists custom swatch selections without leaving custom mode', async () => {
    const tree = await renderThemeProvider();

    await renderer.act(async () => {
      latestTheme?.setTheme('custom');
    });

    await renderer.act(async () => {
      latestTheme?.setCustomThemeField('accentColor', 'rose');
    });

    expect(latestTheme?.theme).toBe('custom');
    expect(latestTheme?.customTheme.accentColor).toBe('rose');
    expect(latestTheme?.colors.accentAmber).toBe('#E1A18E');

    const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    const storedCustomTheme = await AsyncStorage.getItem(CUSTOM_THEME_STORAGE_KEY);

    expect(storedTheme).toBe('custom');
    expect(storedCustomTheme).not.toBeNull();
    expect(JSON.parse(storedCustomTheme!)).toMatchObject({
      accentColor: 'rose',
    });

    await unmountTree(tree);
  });

  it('keeps badge ring tokens stable when the custom accent changes', async () => {
    const tree = await renderThemeProvider();

    await renderer.act(async () => {
      latestTheme?.setTheme('custom');
    });

    const originalBadgeLegendBorder = latestTheme?.colors.badgeLegendBorder;
    const originalBadgeLegendGlow = latestTheme?.colors.badgeLegendGlow;
    const originalBadgeOgBorder = latestTheme?.colors.badgeOGBorder;
    const originalBadgeOgGlow = latestTheme?.colors.badgeOGGlow;

    await renderer.act(async () => {
      latestTheme?.setCustomThemeField('accentColor', 'starlight');
    });

    expect(latestTheme?.colors.accentAmber).toBe('#A99AF0');
    expect(latestTheme?.colors.badgeLegendBorder).toBe(originalBadgeLegendBorder);
    expect(latestTheme?.colors.badgeLegendGlow).toBe(originalBadgeLegendGlow);
    expect(latestTheme?.colors.badgeOGBorder).toBe(originalBadgeOgBorder);
    expect(latestTheme?.colors.badgeOGGlow).toBe(originalBadgeOgGlow);

    await unmountTree(tree);
  });
});
