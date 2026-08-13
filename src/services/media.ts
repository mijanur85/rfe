// ============================================================================
// MEDIA SERVICE - NATIVE MEDIASTORE & REAL DEVICE MEDIA ENGINE
// Queries Android MediaStore directly, handles runtime permissions, converts local
// thumbnails on disk via Capacitor, and merges persisted metadata seamlessly.
// ============================================================================

import { MediaItem, Album, MemoryCard } from '../types';
import { StorageService } from './storage';
import { NativeMediaStore, formatMediaUrl, NativeMediaItem } from './nativeMediaStore';
import { Capacitor } from '@capacitor/core';

export const MediaService = {
  // Explicit runtime permissions check and request
  async checkPermissions(): Promise<boolean> {
    try {
      const res = await NativeMediaStore.checkPermissions();
      return !!res.granted;
    } catch {
      return false;
    }
  },

  async requestPermissions(): Promise<boolean> {
    try {
      const res = await NativeMediaStore.requestPermissions();
      return !!res.granted;
    } catch {
      return false;
    }
  },

  // Retrieve all real media items from Android MediaStore
  async getAllMedia(): Promise<MediaItem[]> {
    const savedUserMetadata = StorageService.getItem<MediaItem[]>('custom_media_items', []);
    const metaMap = new Map<string, Partial<MediaItem>>();

    savedUserMetadata.forEach((meta) => {
      if (meta && meta.id) {
        metaMap.set(meta.id, meta);
        if (meta.url) metaMap.set(meta.url, meta);
      }
    });

    let scannedItems: MediaItem[] = [];

    if (Capacitor.isNativePlatform()) {
      try {
        const { items } = await NativeMediaStore.getMedia();
        scannedItems = items.map((raw) => this.mapNativeItemToMediaItem(raw, metaMap));
      } catch (err) {
        console.warn('Native MediaStore query failed:', err);
      }
    }

    // Merge vaulted and deleted items that were saved previously
    const vaultedOrDeleted = savedUserMetadata.filter((m) => m.inVault || m.isDeleted);
    const scannedIds = new Set(scannedItems.map((i) => i.id));

    vaultedOrDeleted.forEach((item) => {
      if (!scannedIds.has(item.id)) {
        scannedItems.push(item);
      }
    });

    return scannedItems;
  },

  mapNativeItemToMediaItem(raw: NativeMediaItem, metaMap: Map<string, Partial<MediaItem>>): MediaItem {
    const savedMeta = metaMap.get(raw.id) || metaMap.get(raw.url) || {};

    const formattedUrl = formatMediaUrl(raw.url);
    // Deliberately NOT falling back to the full-resolution file here. A video
    // file can't render inside an <img> at all (that's why video thumbnails
    // were blank), and using the original full-size photo as a "thumbnail"
    // for every grid cell is heavy and is what made scrolling feel laggy.
    // LazyThumb (PhotoGrid) always requests a proper small thumbnail on
    // demand instead, for both photos and videos.
    const formattedThumb = formatMediaUrl(raw.thumbnailUrl);

    return {
      id: raw.id,
      mediaId: raw.mediaId,
      rawPath: raw.url,
      title: raw.title || 'Untitled',
      type: raw.type,
      url: formattedUrl,
      thumbnailUrl: formattedThumb,
      date: raw.date || new Date().toISOString().split('T')[0],
      time: raw.time || '12:00',
      sizeMb: raw.sizeMb || 1.0,
      sizeBytes: raw.sizeBytes,
      album: raw.album || (raw.type === 'video' ? 'Videos' : 'Camera'),
      mimeType: raw.mimeType || (raw.type === 'video' ? 'video/mp4' : 'image/jpeg'),
      durationSec: raw.durationSec,
      width: raw.width,
      height: raw.height,
      isFavorite: savedMeta.isFavorite ?? false,
      inVault: savedMeta.inVault ?? false,
      isDeleted: savedMeta.isDeleted ?? false,
      deletedAt: savedMeta.deletedAt,
      daysRemainingInBin: savedMeta.daysRemainingInBin,
      tags: savedMeta.tags || [],
    };
  },

  // Save lightweight media list metadata
  async saveMediaList(items: MediaItem[]): Promise<void> {
    const lightweightItems = items.map((item) => {
      // Omit heavy base64 strings if any exist
      let cleanUrl = item.url;
      let cleanThumb = item.thumbnailUrl;

      if (cleanUrl && cleanUrl.startsWith('data:image')) {
        cleanUrl = 'placeholder_data_url';
      }
      if (cleanThumb && cleanThumb.startsWith('data:image')) {
        cleanThumb = 'placeholder_data_url';
      }

      return {
        id: item.id,
        title: item.title,
        type: item.type,
        url: cleanUrl,
        thumbnailUrl: cleanThumb,
        date: item.date,
        time: item.time,
        sizeMb: item.sizeMb,
        album: item.album,
        mimeType: item.mimeType,
        durationSec: item.durationSec,
        width: item.width,
        height: item.height,
        isFavorite: item.isFavorite,
        inVault: item.inVault,
        isDeleted: item.isDeleted,
        deletedAt: item.deletedAt,
        daysRemainingInBin: item.daysRemainingInBin,
        tags: item.tags,
      };
    });

    StorageService.setItem('custom_media_items', lightweightItems);
  },

  // Get real album list grouped by actual folder buckets (Camera, Screenshots, WhatsApp, Downloads, etc.)
  async getAlbumsFromMedia(items: MediaItem[]): Promise<Album[]> {
    const albumMap = new Map<string, { count: number; coverUrl: string; items: MediaItem[] }>();

    const validItems = items.filter((item) => !item.inVault && !item.isDeleted);

    validItems.forEach((item) => {
      const folderName = item.album || (item.type === 'video' ? 'Videos' : 'Camera');

      if (!albumMap.has(folderName)) {
        albumMap.set(folderName, {
          count: 1,
          coverUrl: item.thumbnailUrl || item.url,
          items: [item],
        });
      } else {
        const current = albumMap.get(folderName)!;
        current.count++;
        current.items.push(item);
      }
    });

    const resultAlbums: Album[] = [];

    albumMap.forEach((data, folderName) => {
      let systemType: Album['systemType'] = 'custom';
      const lower = folderName.toLowerCase();

      if (lower.includes('camera')) systemType = 'camera';
      else if (lower.includes('screenshot')) systemType = 'screenshots';
      else if (lower.includes('download')) systemType = 'downloads';
      else if (lower.includes('whatsapp')) systemType = 'whatsapp';
      else if (lower.includes('video')) systemType = 'videos';

      resultAlbums.push({
        id: `alb-${folderName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: folderName,
        coverUrl: data.coverUrl,
        count: data.count,
        systemType,
      });
    });

    // Add Favorites album if items are favorited
    const favCount = validItems.filter((i) => i.isFavorite).length;
    if (favCount > 0) {
      const favCover = validItems.find((i) => i.isFavorite)?.thumbnailUrl || '';
      resultAlbums.unshift({
        id: 'alb-favorites',
        name: 'Favorites ❤️',
        coverUrl: favCover,
        count: favCount,
        systemType: 'favorites',
      });
    }

    return resultAlbums;
  },

  // Generate real "On This Day" memories by matching each item's actual
  // capture date against today's month/day across previous years -- the
  // same core mechanic Google Photos' "On this day" / "X years ago" cards
  // use. Previously this just grabbed the N most recent items regardless
  // of date and mislabeled them "on_this_day", which is what made it show
  // a random recent-photos group instead of a real memory.
  generateDateBasedMemories(items: MediaItem[]): MemoryCard[] {
    const validItems = items.filter((m) => !m.inVault && !m.isDeleted);
    if (validItems.length === 0) return [];

    const now = new Date();
    const todayMonth = now.getMonth();
    const todayDate = now.getDate();
    const todayYear = now.getFullYear();

    // Small +/-3 day window around today's month/day, so a memory still
    // surfaces even when nothing was captured on the *exact* calendar day
    // -- mirrors Google Photos widening "On this day" to "this week, years
    // ago" when the exact date has no matches.
    const DAY_WINDOW = 3;

    const yearsAgoIfNearAnniversary = (dateStr: string): number | null => {
      const d = new Date(dateStr + 'T00:00:00');
      if (isNaN(d.getTime())) return null;
      const year = d.getFullYear();
      if (year >= todayYear) return null; // only past years count as a memory

      // Compare month/day using a fixed reference year so the Dec/Jan
      // boundary wraps correctly.
      const ref = new Date(2000, todayMonth, todayDate).getTime();
      const candidate = new Date(2000, d.getMonth(), d.getDate()).getTime();
      const diffDays = Math.round((candidate - ref) / 86400000);
      if (Math.abs(diffDays) > DAY_WINDOW) return null;

      return todayYear - year;
    };

    const byYearsAgo = new Map<number, MediaItem[]>();
    validItems.forEach((item) => {
      const yearsAgo = yearsAgoIfNearAnniversary(item.date);
      if (yearsAgo === null) return;
      const group = byYearsAgo.get(yearsAgo) || [];
      group.push(item);
      byYearsAgo.set(yearsAgo, group);
    });

    const memories: MemoryCard[] = [];
    const sortedYearsAgo = Array.from(byYearsAgo.keys()).sort((a, b) => a - b);

    sortedYearsAgo.forEach((yearsAgo) => {
      const groupItems = byYearsAgo.get(yearsAgo)!;
      if (groupItems.length === 0) return;
      const cover = groupItems[0];
      const timeframe: MemoryCard['timeframe'] =
        yearsAgo === 1 ? '1_year' : yearsAgo === 2 ? '2_years' : yearsAgo >= 5 ? '5_years' : 'ai_highlight';
      const captureYear = new Date(cover.date + 'T00:00:00').getFullYear();

      memories.push({
        id: `mem-on-this-day-${yearsAgo}`,
        title: yearsAgo === 1 ? 'On This Day, 1 Year Ago' : `On This Day, ${yearsAgo} Years Ago`,
        subtitle: `${groupItems.length} ${groupItems.length === 1 ? 'memory' : 'memories'} from ${captureYear}`,
        timeframe,
        dateString: cover.date,
        coverMediaId: cover.id,
        mediaIds: groupItems.slice(0, 12).map((i) => i.id),
        storyText: `Photos and videos captured around this date, ${yearsAgo} year${yearsAgo === 1 ? '' : 's'} ago.`,
        mood: 'nostalgic',
      });
    });

    // Only when there's genuinely no real anniversary anywhere in the
    // library do we fall back to a plain, honestly-labelled highlights
    // card -- never disguised as an "on this day" memory.
    if (memories.length === 0 && validItems.length >= 4) {
      memories.push({
        id: 'mem-gallery-highlights',
        title: 'Gallery Highlights',
        subtitle: 'Your photo & video collection',
        timeframe: 'ai_highlight',
        dateString: 'Highlights',
        coverMediaId: validItems[0].id,
        mediaIds: validItems.slice(0, 6).map((i) => i.id),
        storyText: 'No matching memory for today yet -- check back as your library grows.',
        mood: 'serene',
      });
    }

    return memories;
  },

  // Convert HTML5 File objects to real device MediaItems
  createMediaItemsFromFiles(files: FileList | File[]): MediaItem[] {
    const fileArray = Array.from(files);
    return fileArray.map((file, idx) => {
      const isVideo = file.type.startsWith('video/');
      const objectUrl = URL.createObjectURL(file);

      let folder = isVideo ? 'Movies' : 'Pictures';
      if (file.webkitRelativePath) {
        const parts = file.webkitRelativePath.split('/');
        if (parts.length > 1) {
          folder = parts[parts.length - 2];
        }
      }

      const dateStr = file.lastModified
        ? new Date(file.lastModified).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      return {
        id: `dev-file-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        type: isVideo ? 'video' : 'photo',
        url: objectUrl,
        thumbnailUrl: objectUrl,
        date: dateStr,
        time: new Date(file.lastModified || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sizeMb: Number((file.size / (1024 * 1024)).toFixed(2)),
        album: folder,
        mimeType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
        isFavorite: false,
        inVault: false,
        isDeleted: false,
        tags: [folder, isVideo ? 'video' : 'photo'],
      };
    });
  },

  // Basic search
  basicSearch(items: MediaItem[], query: string, type: 'all' | 'photo' | 'video'): MediaItem[] {
    const q = query.toLowerCase().trim();
    return items.filter((item) => {
      if (type !== 'all' && item.type !== type) return false;
      if (!q) return true;

      const matchName = item.title.toLowerCase().includes(q);
      const matchDate = item.date.toLowerCase().includes(q);
      const matchAlbum = (item.album || '').toLowerCase().includes(q);
      const matchTag = (item.tags || []).some((t) => t.toLowerCase().includes(q));

      return matchName || matchDate || matchAlbum || matchTag;
    });
  },

  // Lazily generate/fetch a single item's thumbnail on demand (called as each
  // grid cell scrolls into view, rather than for the whole library up front --
  // this is what keeps scanning fast and scrolling smooth).
  //
  // Requests are run through a small concurrency-limited queue instead of
  // firing immediately: a fast fling can bring 20-30 tiles into the 400px
  // preload margin within one frame, and firing that many native-bridge
  // calls at once was flooding the JS thread and stalling the scroll itself.
  // Capping it keeps the bridge busy but never overwhelmed; the cache above
  // still means each item is only ever actually requested once.
  //
  // The queue is LIFO (a stack), not FIFO: the tile the user is looking at
  // *right now* is always whatever was requested most recently, so it should
  // jump the line ahead of anything queued from a screen they've already
  // scrolled past. With plain FIFO, a fast fling leaves a backlog of
  // now-offscreen requests in front of the queue, which is what made
  // visible thumbnails feel slow to appear even though they were "next in
  // line" from the app's perspective.
  //
  // LazyThumb also calls cancelThumbnailRequest() when a tile scrolls back
  // out of view before its request has actually started -- so a fast
  // scroll-past doesn't spend a concurrency slot generating a thumbnail for
  // something nobody can see anymore, leaving more capacity for what's
  // actually on screen.
  //
  // Every request also gets a couple of quick retries and a hard timeout.
  // Previously a single failed/hung native call left that tile stuck on its
  // loading placeholder forever with no way to recover -- this is what made
  // the whole grid appear permanently "loading" if the native side hiccuped
  // even once. Now a failure is a real, catchable rejection so the UI (see
  // LazyThumb) can show a proper failed state instead of spinning forever.
  _thumbCache: new Map<number, string>(),
  _thumbQueue: [] as Array<{ key: number; run: () => void }>,
  _activeThumbRequests: 0,
  _maxConcurrentThumbs: 8,
  _thumbTimeoutMs: 8000,
  _thumbRetries: 2,
  _runNextThumbTask() {
    if (this._activeThumbRequests >= this._maxConcurrentThumbs) return;
    const next = this._thumbQueue.pop(); // LIFO: newest (currently visible) request first
    if (next) {
      this._activeThumbRequests++;
      next.run();
    }
  },
  // Pulls a not-yet-started request back out of the queue. No-op (safe) if
  // it already started or already resolved -- LazyThumb calls this
  // unconditionally on every unmount, it doesn't need to know which case
  // it's in.
  cancelThumbnailRequest(mediaId: number, isVideo: boolean) {
    const key = isVideo ? -mediaId : mediaId;
    const idx = this._thumbQueue.findIndex((t) => t.key === key);
    if (idx !== -1) this._thumbQueue.splice(idx, 1);
  },
  async _requestThumbnailOnce(mediaId: number, isVideo: boolean): Promise<string> {
    const call = NativeMediaStore.getThumbnail({ mediaId, isVideo });
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('thumbnail request timed out')), this._thumbTimeoutMs);
    });
    const { path } = await Promise.race([call, timeout]);
    if (!path) throw new Error('empty thumbnail path');
    return formatMediaUrl(path);
  },
  async getThumbnail(mediaId: number, isVideo: boolean): Promise<string> {
    const cacheKey = isVideo ? -mediaId : mediaId; // separate photo/video id spaces
    const cached = this._thumbCache.get(cacheKey);
    if (cached) return cached;

    if (!Capacitor.isNativePlatform()) return '';

    return new Promise<string>((resolve, reject) => {
      this._thumbQueue.push({
        key: cacheKey,
        run: async () => {
          try {
            let lastErr: unknown = null;
            for (let attempt = 0; attempt <= this._thumbRetries; attempt++) {
              try {
                const url = await this._requestThumbnailOnce(mediaId, isVideo);
                this._thumbCache.set(cacheKey, url);
                resolve(url);
                return;
              } catch (err) {
                lastErr = err;
              }
            }
            reject(lastErr instanceof Error ? lastErr : new Error('thumbnail failed'));
          } finally {
            this._activeThumbRequests--;
            this._runNextThumbTask();
          }
        },
      });
      this._runNextThumbTask();
    });
  },

  // Actually deletes items from the device's real storage (not just from the
  // app's own database). Returns the ids that were successfully deleted so
  // the caller can remove them from app state too.
  async deleteFromDevice(items: MediaItem[]): Promise<{ success: boolean; deletedIds: string[] }> {
    if (!Capacitor.isNativePlatform()) {
      return { success: false, deletedIds: [] };
    }
    const targets = items.filter((i) => i.mediaId != null);
    if (targets.length === 0) return { success: false, deletedIds: [] };

    try {
      const res = await NativeMediaStore.deleteMedia({
        items: targets.map((i) => ({ mediaId: i.mediaId as number, isVideo: i.type === 'video' })),
      });
      if (res.success) {
        return { success: true, deletedIds: targets.map((i) => i.id) };
      }
      return { success: false, deletedIds: [] };
    } catch (err) {
      console.error('Neo Gallery: deleteFromDevice failed', err);
      return { success: false, deletedIds: [] };
    }
  },

  // Soft-deletes items into a REAL Recycle Bin: flags them as trashed at
  // the MediaStore level (trashed=true) or restores them (trashed=false).
  // Trashed items disappear from main storage / other gallery apps, but
  // the actual file is not removed and can be restored. Returns the ids
  // that were actually flagged natively; on API < 29 (or on the web
  // preview) this can genuinely be unsupported, and the caller should
  // still let the affected ids fall back to an app-only soft delete.
  async trashOnDevice(
    items: MediaItem[],
    trashed: boolean
  ): Promise<{ success: boolean; affectedIds: string[]; unsupported: boolean }> {
    if (!Capacitor.isNativePlatform()) {
      return { success: false, affectedIds: [], unsupported: true };
    }
    const targets = items.filter((i) => i.mediaId != null);
    if (targets.length === 0) return { success: false, affectedIds: [], unsupported: false };

    try {
      const res = await NativeMediaStore.trashMedia({
        items: targets.map((i) => ({ mediaId: i.mediaId as number, isVideo: i.type === 'video' })),
        trashed,
      });
      if (res.success) {
        return { success: true, affectedIds: targets.map((i) => i.id), unsupported: false };
      }
      return { success: false, affectedIds: [], unsupported: !!res.unsupported };
    } catch (err) {
      console.error('Neo Gallery: trashOnDevice failed', err);
      return { success: false, affectedIds: [], unsupported: false };
    }
  },

  // Persists an edited photo as a real file on the device (Pictures/<album>)
  // instead of only keeping the base64 result in app memory. Returns the
  // real mediaId/rawPath/url so the returned MediaItem behaves exactly like
  // any other scanned photo (survives app restart, visible in other gallery
  // apps). Falls back to a data-URL-only item outside the native app (dev
  // preview in browser), same as before.
  async saveEditedImage(
    dataUrl: string,
    baseTitle: string
  ): Promise<{ persisted: boolean; mediaId?: number; rawPath?: string; url?: string; thumbnailUrl?: string }> {
    if (!Capacitor.isNativePlatform()) {
      return { persisted: false };
    }
    try {
      const displayName = `${baseTitle.replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'Edited'}_${Date.now()}.jpg`;
      const res = await NativeMediaStore.saveEditedImage({ dataUrl, displayName });
      if (!res.success || res.mediaId == null) return { persisted: false };
      const url = formatMediaUrl(res.uri || '');
      const thumbnailUrl = res.thumbnailPath ? formatMediaUrl(res.thumbnailPath) : url;
      return { persisted: true, mediaId: res.mediaId, rawPath: res.uri, url, thumbnailUrl };
    } catch (err) {
      console.error('Neo Gallery: saveEditedImage failed', err);
      return { persisted: false };
    }
  },

  // Renames the real file on device, requesting write access first if
  // needed (system consent dialog, same as delete).
  async renameOnDevice(item: MediaItem, newName: string): Promise<boolean> {
    if (!Capacitor.isNativePlatform() || item.mediaId == null) return false;
    try {
      const res = await NativeMediaStore.renameMedia({
        mediaId: item.mediaId,
        isVideo: item.type === 'video',
        newName,
      });
      return !!res.success;
    } catch (err) {
      console.error('Neo Gallery: renameOnDevice failed', err);
      return false;
    }
  },

  // Moves real files on device into a real folder (Pictures|Movies/<album>).
  async moveToAlbum(items: MediaItem[], targetAlbumName: string): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    const targets = items.filter((i) => i.mediaId != null);
    if (targets.length === 0) return false;
    try {
      const res = await NativeMediaStore.moveMedia({
        items: targets.map((i) => ({ mediaId: i.mediaId as number, isVideo: i.type === 'video' })),
        targetAlbumName,
      });
      return !!res.success;
    } catch (err) {
      console.error('Neo Gallery: moveToAlbum failed', err);
      return false;
    }
  },

  // Copies real files on device into a real folder, returning the new
  // native mediaIds so the caller can re-scan/append them.
  async copyToAlbum(
    items: MediaItem[],
    targetAlbumName: string
  ): Promise<{ originalMediaId: number; newMediaId: number }[]> {
    if (!Capacitor.isNativePlatform()) return [];
    const targets = items.filter((i) => i.mediaId != null);
    if (targets.length === 0) return [];
    try {
      const res = await NativeMediaStore.copyMedia({
        items: targets.map((i) => ({ mediaId: i.mediaId as number, isVideo: i.type === 'video' })),
        targetAlbumName,
      });
      return res.results || [];
    } catch (err) {
      console.error('Neo Gallery: copyToAlbum failed', err);
      return [];
    }
  },

  // Creates a real on-disk folder for a new album. Needs "All files
  // access" -- if not granted yet, the caller should prompt the user via
  // requestAllFilesPermission() and try again.
  async createRealAlbum(name: string): Promise<{ success: boolean; needsAllFilesPermission?: boolean }> {
    if (!Capacitor.isNativePlatform()) return { success: false };
    try {
      const res = await NativeMediaStore.createAlbum({ name });
      return { success: !!res.success, needsAllFilesPermission: !!res.needsAllFilesPermission };
    } catch (err) {
      console.error('Neo Gallery: createRealAlbum failed', err);
      return { success: false };
    }
  },

  async checkAllFilesPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const res = await NativeMediaStore.checkAllFilesAccess();
      return !!res.granted;
    } catch {
      return false;
    }
  },

  async requestAllFilesPermission(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await NativeMediaStore.requestAllFilesAccess();
    } catch (err) {
      console.error('Neo Gallery: requestAllFilesPermission failed', err);
    }
  },

  async setAsWallpaper(item: MediaItem): Promise<boolean> {
    if (!Capacitor.isNativePlatform() || item.mediaId == null || item.type === 'video') return false;
    try {
      const res = await NativeMediaStore.setAsWallpaper({ mediaId: item.mediaId });
      return !!res.success;
    } catch (err) {
      console.error('Neo Gallery: setAsWallpaper failed', err);
      return false;
    }
  },

  // Real exact-duplicate detection: first groups items by exact byte size
  // (a free, instant pre-filter -- files with different sizes can't be
  // identical), then only computes an actual SHA-256 content hash for items
  // inside a size-matching group to confirm they're truly the same file.
  // This keeps it fast (hashing usually only runs on a small subset) while
  // still being a real, not-guessed, duplicate check.
  async scanForDuplicates(
    items: MediaItem[],
    onProgress?: (done: number, total: number) => void
  ): Promise<MediaItem[]> {
    if (!Capacitor.isNativePlatform()) return items;

    const bySize = new Map<number, MediaItem[]>();
    items
      .filter((i) => !i.isDeleted && !i.inVault && i.sizeBytes && i.rawPath)
      .forEach((item) => {
        const key = item.sizeBytes as number;
        const group = bySize.get(key) || [];
        group.push(item);
        bySize.set(key, group);
      });

    const candidateGroups = Array.from(bySize.values()).filter((g) => g.length > 1);
    const totalToHash = candidateGroups.reduce((sum, g) => sum + g.length, 0);
    let hashed = 0;

    const duplicateIds = new Set<string>();
    const groupIdByItemId = new Map<string, string>();

    for (const group of candidateGroups) {
      const byHash = new Map<string, MediaItem[]>();
      for (const item of group) {
        try {
          const { hash } = await NativeMediaStore.computeFileHash({ path: item.rawPath as string });
          hashed++;
          onProgress?.(hashed, totalToHash);
          if (!hash) continue;
          const hashGroup = byHash.get(hash) || [];
          hashGroup.push(item);
          byHash.set(hash, hashGroup);
        } catch {
          hashed++;
          onProgress?.(hashed, totalToHash);
        }
      }
      byHash.forEach((matchedItems, hash) => {
        if (matchedItems.length > 1) {
          matchedItems.forEach((item) => {
            duplicateIds.add(item.id);
            groupIdByItemId.set(item.id, `dup-${hash.slice(0, 12)}`);
          });
        }
      });
    }

    return items.map((item) =>
      duplicateIds.has(item.id)
        ? { ...item, isDuplicate: true, duplicateGroupId: groupIdByItemId.get(item.id) }
        : { ...item, isDuplicate: false, duplicateGroupId: undefined }
    );
  },
};
