/**
 * PeekHint — first-run banner that teaches the peek gesture.
 *
 * Renders as a ListHeaderComponent on the home feed. Uses useQuery-backed
 * AsyncStorage so that external dismissal (via usePeekModal's first-open
 * side effect) propagates through query invalidation, not a prop drill.
 *
 * Lifecycle:
 *   1. Mount: useQuery reads PEEK_HINT_SEEN_KEY.
 *   2. If data === 'true' → render null.
 *   3. Else render the banner + start 10s auto-dismiss timer.
 *   4. On X tap OR 10s timer: write PEEK_HINT_SEEN_KEY = 'true' AND
 *      invalidate ['peekHintSeen'] so the query refetches 'true' and the
 *      banner hides locally.
 *   5. First peek (via usePeekModal) writes the same key and invalidates
 *      the same query. This component refetches, sees 'true', renders
 *      null. Single-path dismiss via query invalidation — no callback
 *      prop drilling, no forceHidden prop.
 *
 * DESIGN.md principle enforced: this is a STATIC banner. No animation.
 * "Only FAB breathes" is load-bearing.
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useQuery} from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import {XIcon} from '../icons';
import {queryClient} from '../../lib/queryClient';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts, typeScale} from '../../theme/typography';
import {spacing, radii} from '../../theme/spacing';
// Single source of truth for the AsyncStorage key, owned by the hook.
import {PEEK_HINT_SEEN_KEY} from '../../hooks/usePeekModal';

export {PEEK_HINT_SEEN_KEY};

const AUTO_DISMISS_MS = 10_000;

async function readHintSeen(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PEEK_HINT_SEEN_KEY);
  } catch (err) {
    // Storage failure is fail-closed: assume seen so the banner hides.
    safeSentryBreadcrumb('peek hint AsyncStorage read failed', {
      error: String(err),
    });
    return 'true';
  }
}

async function writeHintSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(PEEK_HINT_SEEN_KEY, 'true');
  } catch (err) {
    safeSentryBreadcrumb('peek hint AsyncStorage write failed', {
      error: String(err),
    });
  }
}

function safeSentryBreadcrumb(message: string, data?: Record<string, unknown>) {
  try {
    Sentry.addBreadcrumb({
      category: 'peek',
      message,
      level: 'warning',
      data,
    });
  } catch {
    // Sentry may not be initialized yet. Swallow.
  }
}

export function PeekHint() {
  const {colors} = useTheme();

  const {data: seen} = useQuery({
    queryKey: ['peekHintSeen'],
    queryFn: readHintSeen,
    staleTime: Infinity, // Read once; only refetch on explicit invalidation.
  });

  const dismiss = React.useCallback(() => {
    writeHintSeen();
    queryClient.invalidateQueries({queryKey: ['peekHintSeen']});
  }, []);

  // Auto-dismiss after 10s. Only starts the timer while the hint is visible.
  React.useEffect(() => {
    if (seen === 'true') {
      return;
    }
    const timer = setTimeout(() => {
      dismiss();
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [seen, dismiss]);

  if (seen === 'true' || seen === undefined) {
    // Hide during initial query load (seen === undefined means query has
    // not resolved yet). This prevents a flash-of-hint on app start if the
    // user has already seen it.
    return null;
  }

  return (
    <View
      testID="peek-hint"
      style={[
        styles.container,
        {
          backgroundColor: colors.bgSecondary,
          borderColor: colors.borderCard,
        },
      ]}
      accessibilityRole="alert"
      accessibilityLabel="Hold any card to peek inside">
      <View
        style={[styles.dot, {backgroundColor: colors.accentGold}]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text
        style={[styles.label, {color: colors.textSecondary}]}
        numberOfLines={1}>
        Hold any card to peek inside
      </Text>
      <Pressable
        testID="peek-hint-dismiss"
        onPress={dismiss}
        hitSlop={12}
        accessibilityLabel="Dismiss peek hint"
        accessibilityRole="button">
        <XIcon size={16} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    flex: 1,
    fontFamily: fonts.ui.medium,
    fontSize: typeScale.ui.fontSize,
    lineHeight: typeScale.ui.lineHeight,
  },
});
