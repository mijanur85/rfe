import { registerPlugin, Capacitor } from '@capacitor/core';

export interface NativeMediaItem {
  id: string;
  mediaId: number;
  title: string;
  type: 'photo' | 'video';
  url: string;
  thumbnailUrl: string;
  date: string; // YYYY-MM-DD
  time?: string;
  timestamp: number;
  sizeMb: number;
  sizeBytes?: number;
  album: string; // Real bucket name e.g. "Camera", "WhatsApp Images", "Screenshots", "Downloads"
  mimeType: string;
  durationSec?: number;
  width?: number;
  height?: number;
}

export interface NativeAlbum {
  id: string;
  name: string;
  count: number;
  coverUri: string;
}

export interface NativeMediaStorePlugin {
  checkPermissions(): Promise<{ granted: boolean; permissionState?: string }>;
  requestPermissions(): Promise<{ granted: boolean; permissionState?: string }>;
  getAlbums(): Promise<{ albums: NativeAlbum[] }>;
  getMedia(options?: { bucketId?: string; offset?: number; limit?: number }): Promise<{ items: NativeMediaItem[] }>;
  getThumbnail(options: { mediaId: number; isVideo: boolean }): Promise<{ path: string }>;
  deleteMedia(options: { items: { mediaId: number; isVideo: boolean }[] }): Promise<{ success: boolean; deletedCount?: number }>;
  // Real Recycle Bin support (Google Photos-style): flags items as
  // trashed at the MediaStore level (trashed=true) so they vanish from
  // main storage / other gallery apps but stay recoverable, or clears
  // that flag again to restore them (trashed=false).
  trashMedia(options: {
    items: { mediaId: number; isVideo: boolean }[];
    trashed: boolean;
  }): Promise<{ success: boolean; updatedCount?: number; unsupported?: boolean }>;
  computeFileHash(options: { path: string }): Promise<{ hash: string }>;
  getStorageStats(): Promise<{
    totalBytes: number;
    freeBytes: number;
    usedBytes: number;
    photosBytes: number;
    videosBytes: number;
    appsBytes: number;
    documentsBytes: number;
    otherBytes: number;
  }>;
  // Writes an edited image (base64 data URL) as a real new file in
  // MediaStore -- this is what makes edited photos survive an app
  // restart and show up in other gallery apps.
  saveEditedImage(options: {
    dataUrl: string;
    displayName?: string;
    albumName?: string;
  }): Promise<{ success: boolean; mediaId?: number; uri?: string; thumbnailPath?: string }>;
  renameMedia(options: { mediaId: number; isVideo: boolean; newName: string }): Promise<{ success: boolean }>;
  moveMedia(options: {
    items: { mediaId: number; isVideo: boolean }[];
    targetAlbumName: string;
  }): Promise<{ success: boolean; movedCount?: number }>;
  copyMedia(options: {
    items: { mediaId: number; isVideo: boolean }[];
    targetAlbumName: string;
  }): Promise<{ success: boolean; results?: { originalMediaId: number; newMediaId: number }[] }>;
  // Creates a real on-disk folder under Pictures/<name>. Requires "All
  // files access" (MANAGE_EXTERNAL_STORAGE) -- see checkAllFilesAccess /
  // requestAllFilesAccess below.
  createAlbum(options: { name: string }): Promise<{ success: boolean; path?: string; needsAllFilesPermission?: boolean }>;
  checkAllFilesAccess(): Promise<{ granted: boolean }>;
  requestAllFilesAccess(): Promise<{ granted: boolean; opened?: boolean }>;
  // Hands the image to the system's own "Set as" chooser (wallpaper,
  // contact photo, etc.) -- same flow the stock gallery/Photos app uses.
  setAsWallpaper(options: { mediaId: number }): Promise<{ success: boolean }>;
}

const NativeMediaStore = registerPlugin<NativeMediaStorePlugin>('MediaStorePlugin', {
  web: {
    checkPermissions: async () => {
      const saved = sessionStorage.getItem('neogallery_perm');
      if (saved === 'denied') return { granted: false, permissionState: 'denied' };
      return { granted: true, permissionState: 'granted' };
    },
    requestPermissions: async () => {
      sessionStorage.setItem('neogallery_perm', 'granted');
      return { granted: true, permissionState: 'granted' };
    },
    getAlbums: async () => ({ albums: [] }),
    getMedia: async () => ({ items: [] }),
    getThumbnail: async () => ({ path: '' }),
    deleteMedia: async () => ({ success: false }),
    trashMedia: async () => ({ success: false, unsupported: true }),
    computeFileHash: async () => ({ hash: '' }),
    getStorageStats: async () => {
      let totalBytes = 64 * 1024 * 1024 * 1024; // 64 GB default
      let usedBytes = 12 * 1024 * 1024 * 1024;
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
        try {
          const est = await navigator.storage.estimate();
          if (est.quota && est.quota > 0) totalBytes = est.quota;
          if (est.usage && est.usage > 0) usedBytes = est.usage;
        } catch {}
      }
      return {
        totalBytes,
        usedBytes,
        freeBytes: Math.max(0, totalBytes - usedBytes),
        photosBytes: 0,
        videosBytes: 0,
        appsBytes: Math.round(usedBytes * 0.3),
        documentsBytes: Math.round(usedBytes * 0.1),
        otherBytes: Math.round(usedBytes * 0.6),
      };
    },
    // These native-storage operations have no real device to act on in the
    // browser preview -- they resolve as "unsupported" rather than
    // pretending to succeed, so MediaService can fall back to its
    // web/app-memory behavior instead of silently no-op'ing.
    saveEditedImage: async () => ({ success: false }),
    renameMedia: async () => ({ success: false }),
    moveMedia: async () => ({ success: false }),
    copyMedia: async () => ({ success: false }),
    createAlbum: async () => ({ success: false }),
    checkAllFilesAccess: async () => ({ granted: false }),
    requestAllFilesAccess: async () => ({ granted: false }),
    setAsWallpaper: async () => ({ success: false }),
  },
});

export function formatMediaUrl(rawPath: string): string {
  if (!rawPath) return '';
  if (
    rawPath.startsWith('http://') ||
    rawPath.startsWith('https://') ||
    rawPath.startsWith('data:') ||
    rawPath.startsWith('blob:')
  ) {
    return rawPath;
  }
  if (Capacitor.isNativePlatform()) {
    return Capacitor.convertFileSrc(rawPath);
  }
  return rawPath;
}

export { NativeMediaStore };
