// ============================================================================
// STORAGE SERVICE - CAPACITOR PREFERENCES-BACKED ABSTRACTION LAYER
// Handles persistent key-value storage, IndexedDB media cache, and secure hashes.
//
// Backed by @capacitor/preferences (real Android SharedPreferences on
// device, localStorage under the hood on web) instead of raw localStorage --
// SharedPreferences survives low-storage cache clears that can wipe
// WebView localStorage, which is what could previously lose favorites,
// vault settings, and theme choice.
//
// All values live in one JSON blob under a single Preferences key, kept as
// an in-memory cache that's hydrated ONCE at app boot (see main.tsx, which
// awaits StorageService.ready() before the app ever mounts). Every
// getItem/setItem call below still reads/writes that in-memory cache
// synchronously, exactly like the old localStorage calls did -- so nothing
// that reads settings during rendering, scrolling, or thumbnail loading
// changes at all. Only the (debounced, background) persistence to disk
// moved to the Preferences API.
// ============================================================================

import { Preferences } from '@capacitor/preferences';
import { MediaItem } from '../types';
import { NativeMediaStore } from './nativeMediaStore';
import { createIdleDebouncedWriter } from '../lib/perf';

export interface StorageCategoryStats {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  photosBytes: number;
  videosBytes: number;
  appsBytes: number;
  documentsBytes: number;
  otherBytes: number;
  formatted: {
    total: string;
    used: string;
    free: string;
    photos: string;
    videos: string;
    apps: string;
    documents: string;
    other: string;
  };
  percentages: {
    used: number;
    photos: number;
    videos: number;
    apps: number;
    documents: number;
    other: number;
  };
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0 || isNaN(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
  return `${val} ${sizes[i]}`;
}

// Simple SHA-256 hash using Web Crypto API or JS fallback for PIN/Pattern security
export async function hashString(input: string): Promise<string> {
  if (window.crypto && window.crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(input);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallthrough to simple hash if crypto fail
    }
  }
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'fallback_hash_' + Math.abs(hash).toString(16);
}

const LEGACY_LOCALSTORAGE_PREFIX = 'neogallery_';
const PREFERENCES_KEY = 'neogallery_store_v1';

let cache: Record<string, any> = {};
let hydrated = false;
let hydratePromise: Promise<void> | null = null;

// One-time migration: pulls anything that was previously saved under the
// old raw-localStorage keys into the new store, so people updating from an
// earlier build of the app don't lose favorites/albums/vault
// config/theme. Safe to run even if there's nothing to migrate.
function migrateFromLegacyLocalStorage(): Record<string, any> {
  const out: Record<string, any> = {};
  try {
    Object.keys(localStorage).forEach((key) => {
      if (!key.startsWith(LEGACY_LOCALSTORAGE_PREFIX)) return;
      const shortKey = key.slice(LEGACY_LOCALSTORAGE_PREFIX.length);
      try {
        const raw = localStorage.getItem(key);
        if (raw) out[shortKey] = JSON.parse(raw);
      } catch {
        // skip anything that doesn't parse cleanly
      }
    });
  } catch {
    // localStorage inaccessible -- nothing to migrate, start fresh
  }
  return out;
}

async function hydrate(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: PREFERENCES_KEY });
    if (value) {
      cache = JSON.parse(value);
    } else {
      const migrated = migrateFromLegacyLocalStorage();
      cache = migrated;
      if (Object.keys(migrated).length > 0) {
        await Preferences.set({ key: PREFERENCES_KEY, value: JSON.stringify(migrated) });
      }
    }
  } catch (e) {
    console.warn('Neo Gallery: storage hydrate failed, starting with an empty store', e);
    cache = {};
  } finally {
    hydrated = true;
  }
}

// Debounced + idle-scheduled, exactly like the media-list writer already
// used elsewhere in the app -- a burst of setItem calls (e.g. toggling
// several favorites quickly) still only touches disk once things settle,
// off the critical path of the tap that triggered it.
const persistDebounced = createIdleDebouncedWriter<Record<string, any>>((snapshot) => {
  Preferences.set({ key: PREFERENCES_KEY, value: JSON.stringify(snapshot) }).catch((e) => {
    console.warn('Neo Gallery: storage persist failed', e);
  });
}, 250);

export const StorageService = {
  // Must be awaited exactly once, before the app first renders (done in
  // main.tsx). After this resolves, every getItem/setItem call below is
  // synchronous against the in-memory cache -- callers elsewhere in the
  // app don't need to change at all.
  ready(): Promise<void> {
    if (!hydratePromise) hydratePromise = hydrate();
    return hydratePromise;
  },

  getItem<T>(key: string, defaultValue: T): T {
    if (!hydrated) {
      // Should not happen in practice (main.tsx awaits ready() before the
      // app mounts) -- fail safe to the default instead of throwing.
      return defaultValue;
    }
    const val = cache[key];
    return val !== undefined ? (val as T) : defaultValue;
  },

  setItem<T>(key: string, value: T): void {
    cache[key] = value;
    persistDebounced({ ...cache });
  },

  removeItem(key: string): void {
    delete cache[key];
    persistDebounced({ ...cache });
  },

  clearAllData(): void {
    cache = {};
    Preferences.remove({ key: PREFERENCES_KEY }).catch((e) => {
      console.warn('Neo Gallery: storage clear failed', e);
    });
  },

  // Calculate REAL Android Device Storage Statistics
  async getStorageStats(mediaItems: MediaItem[] = []): Promise<StorageCategoryStats> {
    let nativeStats: Partial<{
      totalBytes: number;
      freeBytes: number;
      usedBytes: number;
      photosBytes: number;
      videosBytes: number;
      appsBytes: number;
      documentsBytes: number;
      otherBytes: number;
    }> = {};

    try {
      nativeStats = await NativeMediaStore.getStorageStats();
    } catch (err) {
      console.warn('Failed to fetch native storage stats:', err);
    }

    // Calculate photos, videos, and documents bytes directly from accessible media items
    const nonDeleted = mediaItems.filter((m) => !m.isDeleted && !m.inVault);

    let calculatedPhotosBytes = 0;
    let calculatedVideosBytes = 0;

    nonDeleted.forEach((item) => {
      const sizeBytes = Math.round((item.sizeMb || 1.0) * 1024 * 1024);
      if (item.type === 'video') {
        calculatedVideosBytes += sizeBytes;
      } else {
        calculatedPhotosBytes += sizeBytes;
      }
    });

    const totalBytes = nativeStats.totalBytes || 64 * 1024 * 1024 * 1024;
    const freeBytes = nativeStats.freeBytes ?? Math.max(0, totalBytes - (32 * 1024 * 1024 * 1024));
    const usedBytes = nativeStats.usedBytes ?? Math.max(0, totalBytes - freeBytes);

    // Prefer the real native photo/video totals (queried directly from
    // MediaStore). Only fall back to totals calculated from currently-loaded
    // items if the native call genuinely didn't return anything.
    const photosBytes = nativeStats.photosBytes && nativeStats.photosBytes > 0
      ? nativeStats.photosBytes
      : calculatedPhotosBytes;

    const videosBytes = nativeStats.videosBytes && nativeStats.videosBytes > 0
      ? nativeStats.videosBytes
      : calculatedVideosBytes;

    // Everything on the device that isn't a photo or video (apps, documents,
    // downloads, cache, system files, etc.) is reported together as "other" --
    // we deliberately don't fabricate a guessed apps/documents split, since a
    // made-up percentage is misleading and made the numbers look inconsistent
    // between scans.
    const appsBytes = 0;
    const documentsBytes = 0;
    const otherBytes = Math.max(0, usedBytes - photosBytes - videosBytes);

    const calcPercent = (val: number) => (totalBytes > 0 ? Number(((val / totalBytes) * 100).toFixed(1)) : 0);

    return {
      totalBytes,
      usedBytes,
      freeBytes,
      photosBytes,
      videosBytes,
      appsBytes,
      documentsBytes,
      otherBytes,
      formatted: {
        total: formatBytes(totalBytes),
        used: formatBytes(usedBytes),
        free: formatBytes(freeBytes),
        photos: formatBytes(photosBytes),
        videos: formatBytes(videosBytes),
        apps: formatBytes(appsBytes),
        documents: formatBytes(documentsBytes),
        other: formatBytes(otherBytes),
      },
      percentages: {
        used: calcPercent(usedBytes),
        photos: calcPercent(photosBytes),
        videos: calcPercent(videosBytes),
        apps: calcPercent(appsBytes),
        documents: calcPercent(documentsBytes),
        other: calcPercent(otherBytes),
      },
    };
  },
};
