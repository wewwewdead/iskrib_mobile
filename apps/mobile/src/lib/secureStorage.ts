import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Supabase-compatible storage adapter backed by react-native-keychain.
 *
 * Falls back to AsyncStorage if keychain is unavailable or during the
 * 30-day migration window (allows safe rollback to pre-keychain builds).
 *
 *   ┌──────────┐  getItem  ┌───────────┐  miss  ┌──────────────┐
 *   │ Supabase │ ────────▶ │ Keychain  │ ─────▶ │ AsyncStorage │
 *   └──────────┘           └───────────┘        └──────────────┘
 *                              write ▲
 *                    migration ──────┘ (copy + keep original 30 days)
 */

const MIGRATION_TS_KEY = '@iskrib/keychain-migration-ts';
const MIGRATION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

let Keychain: typeof import('react-native-keychain') | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Keychain = require('react-native-keychain');
} catch {
  // react-native-keychain not linked — fall back to AsyncStorage
}

async function keychainGet(key: string): Promise<string | null> {
  if (!Keychain) return null;

  try {
    const result = await Keychain.getGenericPassword({ service: key });
    if (result && result.password) {
      return result.password;
    }
    return null;
  } catch {
    return null;
  }
}

async function keychainSet(key: string, value: string): Promise<boolean> {
  if (!Keychain) return false;

  try {
    await Keychain.setGenericPassword(key, value, { service: key });
    return true;
  } catch {
    return false;
  }
}

async function keychainRemove(key: string): Promise<void> {
  if (!Keychain) return;

  try {
    await Keychain.resetGenericPassword({ service: key });
  } catch {
    // best-effort
  }
}

async function tryMigrate(key: string): Promise<string | null> {
  try {
    const asyncValue = await AsyncStorage.getItem(key);
    if (!asyncValue) return null;

    const wrote = await keychainSet(key, asyncValue);
    if (wrote) {
      // Record migration timestamp — do NOT delete AsyncStorage yet (30-day rollback)
      await AsyncStorage.setItem(MIGRATION_TS_KEY, String(Date.now()));
    }

    return asyncValue;
  } catch {
    return null;
  }
}

async function cleanupOldAsyncStorage(key: string): Promise<void> {
  try {
    const tsStr = await AsyncStorage.getItem(MIGRATION_TS_KEY);
    if (!tsStr) return;

    const migrationTs = Number(tsStr);
    if (Number.isNaN(migrationTs)) return;

    if (Date.now() - migrationTs > MIGRATION_TTL_MS) {
      await AsyncStorage.removeItem(key);
      await AsyncStorage.removeItem(MIGRATION_TS_KEY);
    }
  } catch {
    // best-effort cleanup
  }
}

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    // Try keychain first
    const keychainValue = await keychainGet(key);
    if (keychainValue != null) {
      // Validate JSON is not corrupt
      try {
        JSON.parse(keychainValue);
      } catch {
        // Corrupt data — clear it and treat as missing
        await keychainRemove(key);
        // Fall through to AsyncStorage or migration
      }

      // Opportunistic cleanup of old AsyncStorage entries
      cleanupOldAsyncStorage(key).catch(() => {});

      // Re-check after potential corrupt removal
      const recheck = await keychainGet(key);
      if (recheck != null) return recheck;
    }

    // Try migration from AsyncStorage → keychain
    const migrated = await tryMigrate(key);
    if (migrated != null) return migrated;

    // Final fallback: read AsyncStorage directly
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    const wrote = await keychainSet(key, value);
    if (!wrote) {
      // Keychain unavailable — fall back to AsyncStorage
      await AsyncStorage.setItem(key, value);
    }
  },

  async removeItem(key: string): Promise<void> {
    await keychainRemove(key);

    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // best-effort
    }
  },
};
