/**
 * Sound design framework for Iskrib.
 *
 * Uses react-native-sound (bare RN compatible).
 * Sets audio session to Ambient category on iOS to respect the hardware
 * silent switch. All sounds are warm, organic tones matching Iskrib's
 * literary identity.
 *
 * Sound assets: MP3 format, max 50KB each, stored in assets/sounds/.
 * Until real sound assets are created, all play() calls are no-ops.
 */
import {Platform} from 'react-native';

let Sound: any = null;

try {
  Sound = require('react-native-sound');
  // Set audio category to Ambient — respects iOS silent switch
  if (Sound.setCategory) {
    Sound.setCategory('Ambient');
  }
} catch {
  // Sound module not available — all calls become no-ops
}

type SoundName = 'open' | 'save' | 'publish' | 'reaction' | 'milestone';

// Map of sound names to file paths (relative to assets/sounds/)
const SOUND_FILES: Record<SoundName, string> = {
  open: 'open.mp3',
  save: 'save.mp3',
  publish: 'publish.mp3',
  reaction: 'reaction.mp3',
  milestone: 'milestone.mp3',
};

// Cache loaded sound instances
const cache: Partial<Record<SoundName, any>> = {};

let muted = false;

/** Mute all sounds globally */
export function setMuted(value: boolean) {
  muted = value;
}

/** Check if sounds are muted */
export function isMuted(): boolean {
  return muted;
}

/**
 * Load a sound into cache. Call during app init for frequently used sounds.
 * Safe to call if sound assets don't exist yet — will fail silently.
 */
export function preload(name: SoundName): Promise<void> {
  if (!Sound) {
    return Promise.resolve();
  }

  return new Promise(resolve => {
    const basePath =
      Platform.OS === 'android' ? SOUND_FILES[name] : `sounds/${SOUND_FILES[name]}`;

    const sound = new Sound(basePath, Sound.MAIN_BUNDLE, (error: any) => {
      if (error) {
        // Sound file doesn't exist yet — this is expected until assets are created
        resolve();
        return;
      }
      cache[name] = sound;
      resolve();
    });
  });
}

/**
 * Play a sound by name.
 * No-op if: muted, sound not loaded, sound module unavailable, or asset missing.
 */
export function play(name: SoundName) {
  if (muted || !cache[name]) {
    return;
  }

  try {
    const sound = cache[name];
    // Reset to start if already playing
    sound.stop(() => {
      sound.play((success: boolean) => {
        if (!success) {
          // Playback interrupted — not an error worth logging
        }
      });
    });
  } catch {
    // Silently fail — sound is enhancement, not critical
  }
}

/**
 * Release all cached sounds to free memory.
 * Call on app background or cleanup.
 */
export function releaseAll() {
  for (const name of Object.keys(cache) as SoundName[]) {
    try {
      cache[name]?.release();
    } catch {
      // Ignore release errors
    }
    delete cache[name];
  }
}

/** Preload all sounds — call during app initialization */
export function preloadAll(): Promise<void> {
  return Promise.all(
    (Object.keys(SOUND_FILES) as SoundName[]).map(preload),
  ).then(() => {});
}

export const Sounds = {
  play,
  preload,
  preloadAll,
  releaseAll,
  setMuted,
  isMuted,
} as const;
