/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { MainTab, BottomNav } from './components/BottomNav';
import { AppHeader } from './components/AppHeader';
import { PhotoGrid } from './components/PhotoGrid';
import { PhotoViewer } from './components/PhotoViewer';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { PhotoEditorModal } from './components/PhotoEditorModal';
import { PhotoCompressorModal } from './components/PhotoCompressorModal';
import { PrivateVaultModal } from './components/PrivateVaultModal';
import { SmartCleanerModal } from './components/SmartCleanerModal';
import { MemoriesView } from './components/MemoriesView';
import { AlbumsView } from './components/AlbumsView';
import { SearchView } from './components/SearchView';
import { RecycleBinModal } from './components/RecycleBinModal';
import { SettingsView } from './components/SettingsView';
import { AndroidStatusBar } from './components/AndroidStatusBar';
import { AndroidToast } from './components/AndroidToast';
import { SelectionToolbar } from './components/SelectionToolbar';
import { PhotoInfoModal } from './components/PhotoInfoModal';
import { ConfirmDialog } from './components/ConfirmDialog';

import { AdBanner } from './components/AdBanner';
import { AdInterstitial } from './components/AdInterstitial';
import { PremiumModal } from './components/PremiumModal';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { TermsModal } from './components/TermsModal';
import { PermissionsModal } from './components/PermissionsModal';
import { PlayStoreAssetsModal } from './components/PlayStoreAssetsModal';
import { VaultLockScreen } from './components/VaultLockScreen';
import { BillingService } from './services/billing';
import { MediaService } from './services/media';

import { getThemeConfig, THEMES, DEFAULT_THEME_ID } from './theme/themes';
import { ThemeBackground } from './theme/ThemeBackground';
import { createIdleDebouncedWriter } from './lib/perf';
import {
  INITIAL_MEDIA,
  INITIAL_ALBUMS,
  INITIAL_MEMORIES,
} from './data/sampleMedia';
import {
  MediaItem,
  Album,
  MemoryCard,
  VaultConfig,
  AppSettings,
  GridColumns,
  ThemeId,
} from './types';

// Persistence writes are debounced + idle-scheduled (see lib/perf.ts) instead
// of running synchronously inside their useEffect. These fire on every
// mediaItems/settings/albums/vaultConfig change -- including silent
// background rescans every time the app regains focus -- and JSON.stringify
// + localStorage.setItem on a real device's full media list is real,
// blocking main-thread work. Running it synchronously right after a state
// update meant a tap that triggered a state change (favorite, delete, tab
// switch) could get stuck behind that write before its own UI update painted,
// which is what made buttons feel like they had a delay before "opening".
const writeSettings = createIdleDebouncedWriter<unknown>((v) => {
  localStorage.setItem('neo_gallery_settings', JSON.stringify(v));
});
const writeAlbums = createIdleDebouncedWriter<unknown>((v) => {
  localStorage.setItem('neo_gallery_albums', JSON.stringify(v));
});
const writeVaultConfig = createIdleDebouncedWriter<unknown>((v) => {
  localStorage.setItem('neo_gallery_vault_config', JSON.stringify(v));
});
const writeMediaList = createIdleDebouncedWriter<any[]>((items) => {
  MediaService.saveMediaList(items);
});

export default function App() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanningMedia, setIsScanningMedia] = useState(false);

  // App state with local persistence
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('neo_gallery_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.currentTheme || !(parsed.currentTheme in THEMES)) {
          parsed.currentTheme = DEFAULT_THEME_ID;
        }
        return parsed;
      }
    } catch {}
    return {
      currentTheme: DEFAULT_THEME_ID,
      isPremium: false,
      adsEnabled: true,
      gridColumns: 3,
      autoLockVault: true,
      sortBy: 'date-desc',
    };
  });

  const [mediaItems, setMediaItems] = useState<MediaItem[]>(() => {
    try {
      const saved = localStorage.getItem('neo_gallery_media');
      if (saved && Array.isArray(JSON.parse(saved))) return JSON.parse(saved);
    } catch {}
    return INITIAL_MEDIA;
  });

  const [albums, setAlbums] = useState<Album[]>(() => {
    try {
      const saved = localStorage.getItem('neo_gallery_albums');
      if (saved && Array.isArray(JSON.parse(saved))) return JSON.parse(saved);
    } catch {}
    return INITIAL_ALBUMS;
  });

  const [memories, setMemories] = useState<MemoryCard[]>(() => {
    try {
      const saved = localStorage.getItem('neo_gallery_memories');
      if (saved && Array.isArray(JSON.parse(saved))) return JSON.parse(saved);
    } catch {}
    return INITIAL_MEMORIES;
  });

  const [vaultConfig, setVaultConfig] = useState<VaultConfig>(() => {
    try {
      const saved = localStorage.getItem('neo_gallery_vault_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      isLocked: true,
      unlockMethod: 'pin',
      pinCode: '1234',
      patternNodes: [0, 1, 2, 4],
      isFingerprintEnabled: true,
      failedAttempts: 0,
      lockUntil: null,
      isHiddenMode: false,
    };
  });

  // Navigation & View States
  const [activeTab, setActiveTab] = useState<MainTab>('photos');
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);

  // Modals
  const [viewingMedia, setViewingMedia] = useState<MediaItem | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [playingVideoMedia, setPlayingVideoMedia] = useState<MediaItem | null>(null);
  const [editingPhotoMedia, setEditingPhotoMedia] = useState<MediaItem | null>(null);
  const [compressingMedia, setCompressingMedia] = useState<MediaItem | null>(null);

  const [showVault, setShowVault] = useState(false);
  const [showVaultLock, setShowVaultLock] = useState(false);
  const [vaultLockMode, setVaultLockMode] = useState<'unlock' | 'change-password' | 'change-lock-style'>('unlock');
  const [showCleaner, setShowCleaner] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showRecycleBin, setShowRecycleBin] = useState(false);

  // New Compliance & Premium States
  const [showPremium, setShowPremium] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [showPlayStoreAssets, setShowPlayStoreAssets] = useState(false);
  const [showInterstitial, setShowInterstitial] = useState(false);

  const [appToast, setAppToast] = useState<string | null>(null);
  const [infoModalMedia, setInfoModalMedia] = useState<MediaItem | null>(null);
  const [showAllFilesConfirm, setShowAllFilesConfirm] = useState(false);

  const showToast = (msg: string, durationMs: number = 2500) => {
    setAppToast(msg);
    setTimeout(() => setAppToast(null), durationMs);
  };

  // Load Device Media & Request Permissions.
  // silent=true is used for automatic background rescans (app resume, etc.)
  // so newly added photos/videos get picked up without interrupting the user
  // with a toast/spinner every time they switch back to the app.
  const loadDeviceMedia = useCallback(async (silent: boolean = false) => {
    if (!silent) setIsScanningMedia(true);
    try {
      let granted = await MediaService.checkPermissions();
      if (!granted) {
        granted = await MediaService.requestPermissions();
      }
      setHasPermission(granted);

      if (granted) {
        const items = await MediaService.getAllMedia();
        setMediaItems(items);
        if (!silent) {
          if (items.length === 0) {
            showToast('Permission granted, but 0 items found on device.', 5000);
          } else {
            showToast(`Loaded ${items.length} item(s) from device`);
          }
        }
      } else if (!silent) {
        showToast('Storage permission was not granted');
      }
    } catch (err) {
      console.error('Neo Gallery: loadDeviceMedia failed', err);
      if (!silent) {
        showToast('Scan failed: ' + (err instanceof Error ? err.message : String(err)), 5000);
      }
    } finally {
      if (!silent) setIsScanningMedia(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImportDeviceFiles = useCallback((fileList: FileList) => {
    const imported = MediaService.createMediaItemsFromFiles(fileList);
    setMediaItems((prev) => [...imported, ...prev]);
    showToast(`Added ${imported.length} media items from device`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadDeviceMedia();
  }, []);

  // Auto re-scan (silently, in the background) whenever the app comes back
  // to the foreground -- e.g. the user takes a photo or gets a WhatsApp image
  // in another app, then switches back to Neo Gallery. This is throttled so
  // rapid app-switching doesn't trigger a rescan every time.
  useEffect(() => {
    let lastScan = Date.now();
    const MIN_INTERVAL_MS = 4000;

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastScan < MIN_INTERVAL_MS) return;
      lastScan = now;
      loadDeviceMedia(true);
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);

  // Recalculate real albums and memories whenever media items change
  useEffect(() => {
    if (mediaItems.length >= 0) {
      MediaService.getAlbumsFromMedia(mediaItems).then((scannedAlbums) => {
        setAlbums((prevAlbums) => {
          // getAlbumsFromMedia only returns folders that currently contain
          // at least one scanned item. A custom album the user just
          // created (real folder, but still empty) or one that only has
          // items added via the virtual "Add to album" tag would
          // otherwise vanish from the Albums tab on the next rescan --
          // keep those around instead of dropping them.
          const scannedNames = new Set(scannedAlbums.map((a) => a.name.toLowerCase()));
          const preservedCustom = prevAlbums.filter(
            (a) => a.systemType === 'custom' && !scannedNames.has(a.name.toLowerCase())
          );
          return [...scannedAlbums, ...preservedCustom];
        });
      });
      const realMemories = MediaService.generateDateBasedMemories(mediaItems);
      setMemories(realMemories);
    }
  }, [mediaItems]);

  // Persistence Effects (debounced + idle-scheduled -- see writeX defs above)
  useEffect(() => {
    writeSettings(settings);
  }, [settings]);

  useEffect(() => {
    writeMediaList(mediaItems);
  }, [mediaItems]);

  useEffect(() => {
    writeAlbums(albums);
  }, [albums]);

  useEffect(() => {
    writeVaultConfig(vaultConfig);
  }, [vaultConfig]);

  const activeTheme = useMemo(() => getThemeConfig(settings.currentTheme), [settings.currentTheme]);

  // Main filtered gallery photos (excluding vault items & deleted items)
  const visiblePhotos = useMemo(() => {
    return mediaItems.filter((item) => {
      if (item.inVault || item.isDeleted) return false;

      if (selectedAlbum) {
        if (selectedAlbum.systemType === 'favorites') return item.isFavorite;
        if (selectedAlbum.systemType === 'videos') return item.type === 'video';
        const realFolderMatch = item.album.toLowerCase() === selectedAlbum.name.toLowerCase();
        // Custom albums can also contain items that were "Added to album"
        // (a virtual/non-destructive tag) rather than physically Moved
        // into the album's real folder -- both count as membership.
        const virtualTagMatch =
          selectedAlbum.systemType === 'custom' && (item.customAlbumIds || []).includes(selectedAlbum.id);
        return realFolderMatch || virtualTagMatch;
      }

      return true;
    });
  }, [mediaItems, selectedAlbum]);

  const vaultMedia = useMemo(() => {
    return mediaItems.filter((m) => m.inVault && !m.isDeleted);
  }, [mediaItems]);

  // Recycle Bin list shown to the user, with "days left" computed live from
  // deletedAt instead of a static number stamped once at delete time -- so
  // it actually counts down as time passes instead of always saying "30".
  const RECYCLE_BIN_RETENTION_DAYS = 30;
  const daysSinceIso = (iso?: string): number => {
    if (!iso) return 0;
    const then = new Date(iso).getTime();
    if (isNaN(then)) return 0;
    return Math.max(0, (Date.now() - then) / (1000 * 60 * 60 * 24));
  };

  const deletedMedia = useMemo(() => {
    return mediaItems
      .filter((m) => m.isDeleted)
      .map((m) => ({
        ...m,
        daysRemainingInBin: Math.max(0, Math.ceil(RECYCLE_BIN_RETENTION_DAYS - daysSinceIso(m.deletedAt))),
      }));
  }, [mediaItems]);

  // Handlers
  const handleToggleFavorite = (id: string) => {
    setMediaItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isFavorite: !item.isFavorite } : item))
    );
  };

  // Soft delete -> Recycle Bin. This is a real Recycle Bin, not just an
  // app-only flag: the item is flagged "trashed" at the MediaStore level
  // (same mechanism Google Photos uses), so it genuinely disappears from
  // main storage and every other gallery app right away, but the actual
  // file isn't destroyed and can be restored from the bin. Only deleting
  // FROM the Recycle Bin (handlePermanentDelete / handleEmptyBin below),
  // or leaving it there past the 30-day retention window, destroys it for
  // real.
  const softDeleteToRecycleBin = async (ids: string[]): Promise<string[]> => {
    const items = mediaItems.filter((m) => ids.includes(m.id));
    if (items.length === 0) return [];
    const { affectedIds, unsupported } = await MediaService.trashOnDevice(items, true);
    // "unsupported" only happens on very old Android (< 10) with no
    // OS-level trash concept -- fall back to an app-only soft delete there
    // rather than silently doing nothing.
    const idsToBin = affectedIds.length > 0 ? affectedIds : unsupported ? items.map((i) => i.id) : [];
    if (idsToBin.length === 0) return [];
    const now = new Date().toISOString();
    setMediaItems((prev) =>
      prev.map((item) => (idsToBin.includes(item.id) ? { ...item, isDeleted: true, deletedAt: now } : item))
    );
    return idsToBin;
  };

  const handleDeleteMedia = async (id: string) => {
    if (viewingMedia?.id === id) setViewingMedia(null);
    const binned = await softDeleteToRecycleBin([id]);
    if (binned.length === 0) {
      showToast('Delete cancelled or failed');
    } else {
      showToast('Moved to Recycle Bin');
    }
  };

  const handleBatchDeleteMedia = async (ids: string[]) => {
    const binned = await softDeleteToRecycleBin(ids);
    if (binned.length === 0) {
      showToast('Delete cancelled or failed');
    } else {
      showToast(`Moved ${binned.length} item(s) to Recycle Bin`);
    }
  };

  const handleMoveToVault = (id: string) => {
    setMediaItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, inVault: true } : item))
    );
    if (viewingMedia?.id === id) setViewingMedia(null);
  };

  const handleRestoreFromVault = (id: string) => {
    setMediaItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, inVault: false } : item))
    );
  };

  // Restores an item out of the Recycle Bin: clears the MediaStore
  // IS_TRASHED flag (so it reappears in main storage / other gallery apps
  // exactly where it was) and clears the local isDeleted flag.
  const handleRestoreFromBin = async (id: string) => {
    const item = mediaItems.find((m) => m.id === id);
    if (item) {
      await MediaService.trashOnDevice([item], false);
    }
    setMediaItems((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isDeleted: false, deletedAt: undefined } : m))
    );
    showToast('Restored from Recycle Bin');
  };

  // Auto-purge: anything that has sat in the Recycle Bin past the 30-day
  // retention window gets permanently deleted automatically, exactly like
  // Google Photos' own trash. Guarded by a ref so an in-flight purge isn't
  // re-triggered by every incidental mediaItems change while it's running.
  const purgeInProgressRef = useRef(false);
  useEffect(() => {
    if (purgeInProgressRef.current) return;
    const expired = mediaItems.filter(
      (m) => m.isDeleted && m.deletedAt && daysSinceIso(m.deletedAt) >= RECYCLE_BIN_RETENTION_DAYS
    );
    if (expired.length === 0) return;

    purgeInProgressRef.current = true;
    (async () => {
      try {
        const { deletedIds } = await MediaService.deleteFromDevice(expired);
        const idsToRemove = deletedIds.length > 0 ? deletedIds : expired.map((i) => i.id);
        setMediaItems((prev) => prev.filter((m) => !idsToRemove.includes(m.id)));
      } finally {
        purgeInProgressRef.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaItems]);

  // Opens the real Android/iOS share sheet (WhatsApp, Messenger, imo, etc. --
  // whatever's actually installed) using the raw device file paths.
  const handleShare = async (items: MediaItem[]) => {
    if (items.length === 0) return;
    if (!Capacitor.isNativePlatform()) {
      showToast('Sharing only works on the installed app, not in this preview');
      return;
    }
    try {
      const paths = items.map((i) => i.rawPath || i.url).filter(Boolean);
      await Share.share({
        files: paths,
        dialogTitle: items.length > 1 ? `Share ${items.length} items` : 'Share',
      });
    } catch (err) {
      // The user closing the share sheet without picking anything also
      // rejects the promise -- don't show an error toast for that.
      const msg = err instanceof Error ? err.message : String(err);
      if (!/cancel/i.test(msg)) {
        showToast('Share failed: ' + msg);
      }
    }
  };

  // --- Selection mode (long-press to start, like a normal gallery app) ---
  // useCallback here (and on the handlers below) so PhotoGrid/AppHeader/
  // BottomNav's React.memo can actually skip re-rendering when unrelated
  // App state changes -- a plain inline/re-declared function would get a
  // new identity every render and defeat memo entirely.
  const handleLongPressSelect = useCallback((id: string) => {
    setIsSelectionMode(true);
    setSelectedIds([id]);
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  // Same stability reasoning as above -- these were inline arrows passed
  // straight into JSX before, which recreated on every App render and made
  // AppHeader/BottomNav/PhotoGrid's React.memo pointless.
  const handleSelectMedia = useCallback((item: MediaItem) => setViewingMedia(item), []);
  const handleChangeGridColumns = useCallback((cols: number) => {
    setSettings((prev) => ({ ...prev, gridColumns: cols as GridColumns }));
  }, []);
  const handleOpenSearch = useCallback(() => setShowSearch(true), []);
  const handleOpenRecycleBin = useCallback(() => setShowRecycleBin(true), []);
  const handleChangeTab = useCallback((tab: MainTab) => {
    setActiveTab(tab);
    if (tab !== 'photos') setSelectedAlbum(null);
  }, []);
  const handleOpenVault = useCallback(() => {
    setVaultLockMode('unlock');
    setShowVaultLock(true);
  }, []);
  const handleOpenCleaner = useCallback(() => setShowCleaner(true), []);

  const handleSelectAllVisible = (visibleIds: string[]) => {
    setSelectedIds((prev) => (prev.length === visibleIds.length ? [] : visibleIds));
  };

  const handleExitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedIds([]);
  };

  const handleBulkShare = () => {
    const items = mediaItems.filter((m) => selectedIds.includes(m.id));
    handleShare(items);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const binned = await softDeleteToRecycleBin(selectedIds);
    if (binned.length === 0) {
      showToast('Delete cancelled or failed');
      return;
    }
    showToast(`Moved ${binned.length} item(s) to Recycle Bin`);
    handleExitSelectionMode();
  };

  const handleBulkAddToAlbum = (albumId: string) => {
    setMediaItems((prev) =>
      prev.map((m) =>
        selectedIds.includes(m.id)
          ? { ...m, customAlbumIds: Array.from(new Set([...(m.customAlbumIds || []), albumId])) }
          : m
      )
    );
    setAlbums((prev) =>
      prev.map((a) => (a.id === albumId ? { ...a, count: (a.count || 0) + selectedIds.length } : a))
    );
    showToast(`Added ${selectedIds.length} item(s) to album`);
    handleExitSelectionMode();
  };

  // Moves the real files on device into the target album's real folder,
  // then re-scans MediaStore so the grid/albums reflect the actual new
  // location (the moved items now genuinely live under that folder).
  const handleBulkMove = async (targetAlbumName: string) => {
    const items = mediaItems.filter((m) => selectedIds.includes(m.id));
    if (items.length === 0) return;
    const success = await MediaService.moveToAlbum(items, targetAlbumName);
    if (!success) {
      showToast('Move cancelled or failed');
      return;
    }
    showToast(`Moved ${items.length} item(s) to "${targetAlbumName}"`);
    handleExitSelectionMode();
    await loadDeviceMedia(true);
  };

  // Copies the real files into the target album's real folder as brand
  // new files, then re-scans to pick up the copies.
  const handleBulkCopy = async (targetAlbumName: string) => {
    const items = mediaItems.filter((m) => selectedIds.includes(m.id));
    if (items.length === 0) return;
    const results = await MediaService.copyToAlbum(items, targetAlbumName);
    if (results.length === 0) {
      showToast('Copy cancelled or failed');
      return;
    }
    showToast(`Copied ${results.length} item(s) to "${targetAlbumName}"`);
    handleExitSelectionMode();
    await loadDeviceMedia(true);
  };

  // Renames the real file on device (single item only).
  const handleRenameSingle = async (item: MediaItem, newName: string) => {
    const success = await MediaService.renameOnDevice(item, newName);
    if (!success) {
      showToast('Rename cancelled or failed');
      return;
    }
    showToast('Renamed');
    handleExitSelectionMode();
    await loadDeviceMedia(true);
  };

  const handleSetAsWallpaper = async (item: MediaItem) => {
    const success = await MediaService.setAsWallpaper(item);
    if (!success) {
      showToast('Could not open "Set as" -- only available on the installed app');
    }
  };

  // Smart Cleaner deletes (duplicates, large files, screenshots) go to the
  // Recycle Bin just like every other delete in the app -- removed from
  // main storage right away, but recoverable for 30 days instead of gone
  // for good the moment you tap Delete.
  const handleCleanerDelete = async (ids: string[]) => {
    if (ids.length === 0) return;
    const binned = await softDeleteToRecycleBin(ids);
    if (binned.length === 0) {
      showToast('Delete cancelled or failed');
      return;
    }
    showToast(`Moved ${binned.length} item(s) to Recycle Bin`);
  };

  const [isScanningDuplicates, setIsScanningDuplicates] = useState(false);
  const [duplicateScanProgress, setDuplicateScanProgress] = useState({ done: 0, total: 0 });

  const handleScanDuplicates = async () => {
    setIsScanningDuplicates(true);
    setDuplicateScanProgress({ done: 0, total: 0 });
    try {
      const updated = await MediaService.scanForDuplicates(mediaItems, (done, total) =>
        setDuplicateScanProgress({ done, total })
      );
      setMediaItems(updated);
      const foundCount = updated.filter((m) => m.isDuplicate).length;
      showToast(foundCount > 0 ? `Found ${foundCount} duplicate item(s)` : 'No duplicates found', 3500);
    } finally {
      setIsScanningDuplicates(false);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    const item = mediaItems.find((m) => m.id === id);
    if (item) {
      const { success, deletedIds } = await MediaService.deleteFromDevice([item]);
      if (!success) {
        showToast('Could not delete from device storage');
        return;
      }
      // Browser-preview-only cleanup: items imported via the file picker in
      // dev preview use a blob: object URL instead of a real device path.
      // Revoking it here (once we know it's genuinely gone for good) frees
      // that memory instead of leaking it for the rest of the session.
      if (item.url && item.url.startsWith('blob:')) {
        try { URL.revokeObjectURL(item.url); } catch {}
      }
      setMediaItems((prev) => prev.filter((m) => !deletedIds.includes(m.id)));
    } else {
      setMediaItems((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const handleEmptyBin = async () => {
    const binned = mediaItems.filter((m) => m.isDeleted);
    if (binned.length === 0) return;
    const { success, deletedIds } = await MediaService.deleteFromDevice(binned);
    if (!success) {
      showToast('Could not delete from device storage');
      return;
    }
    binned.forEach((item) => {
      if (deletedIds.includes(item.id) && item.url && item.url.startsWith('blob:')) {
        try { URL.revokeObjectURL(item.url); } catch {}
      }
    });
    setMediaItems((prev) => prev.filter((m) => !deletedIds.includes(m.id)));
    showToast(`Permanently deleted ${deletedIds.length} item(s)`);
  };

  const handleSaveCompressed = (originalId: string, compressedSizeMb: number) => {
    setMediaItems((prev) =>
      prev.map((item) =>
        item.id === originalId
          ? {
              ...item,
              originalSizeMb: item.sizeMb,
              sizeMb: compressedSizeMb,
              compressedSizeMb: compressedSizeMb,
            }
          : item
      )
    );
  };

  const handleSaveEditedPhoto = (editedMedia: MediaItem) => {
    setMediaItems((prev) => [editedMedia, ...prev]);
  };

  // Creates a REAL folder on the device (Pictures/<name>) via MediaService,
  // not just an entry in this app's own album list. Creating that folder
  // needs "All files access" -- if it isn't granted yet we ask once and
  // send the user to the system settings screen to turn it on, then they
  // can retry.
  const handleCreateAlbum = async (name: string) => {
    if (!Capacitor.isNativePlatform()) {
      // No real device storage to create a folder on in the browser preview.
      const newAlbum: Album = {
        id: `alb-custom-${Date.now()}`,
        name,
        coverUrl: mediaItems[0]?.thumbnailUrl || '',
        count: 0,
        systemType: 'custom',
      };
      setAlbums((prev) => [...prev, newAlbum]);
      return;
    }

    const { success, needsAllFilesPermission } = await MediaService.createRealAlbum(name);

    if (success) {
      const newAlbum: Album = {
        id: `alb-custom-${Date.now()}`,
        name,
        coverUrl: mediaItems[0]?.thumbnailUrl || '',
        count: 0,
        systemType: 'custom',
      };
      setAlbums((prev) => [...prev, newAlbum]);
      showToast(`Created "${name}" folder on your device`);
      return;
    }

    if (needsAllFilesPermission) {
      setShowAllFilesConfirm(true);
      return;
    }

    showToast('Could not create album folder on device');
  };

  const handleDeleteAlbum = (id: string) => {
    setAlbums((prev) => prev.filter((a) => a.id !== id));
  };

  const handleUnlockPremium = () => {
    setSettings((prev) => ({ ...prev, isPremium: true, adsEnabled: false }));
  };

  // Photo viewer prev / next navigation
  const currentIndexInGrid = viewingMedia
    ? visiblePhotos.findIndex((m) => m.id === viewingMedia.id)
    : -1;

  const handleViewerNext = () => {
    if (currentIndexInGrid >= 0 && currentIndexInGrid < visiblePhotos.length - 1) {
      setViewingMedia(visiblePhotos[currentIndexInGrid + 1]);
    }
  };

  const handleViewerPrev = () => {
    if (currentIndexInGrid > 0) {
      setViewingMedia(visiblePhotos[currentIndexInGrid - 1]);
    }
  };

  return (
    <div className={`min-h-screen relative font-sans ${activeTheme.bgClass} transition-colors duration-300 select-none`}>
      {/* Background Theme Layer */}
      <ThemeBackground
        themeId={settings.currentTheme}
        isMediaOpen={!!viewingMedia || !!playingVideoMedia}
      />

      {/* Android Toast Notification */}
      <AndroidToast message={appToast} onClose={() => setAppToast(null)} />

      {isSelectionMode && (
        <SelectionToolbar
          theme={activeTheme}
          selectedCount={selectedIds.length}
          totalVisibleCount={visiblePhotos.length}
          allSelected={selectedIds.length > 0 && selectedIds.length === visiblePhotos.length}
          customAlbums={albums.filter((a) => a.systemType === 'custom')}
          allAlbums={albums}
          selectedItems={mediaItems.filter((m) => selectedIds.includes(m.id))}
          onSelectAll={() => handleSelectAllVisible(visiblePhotos.map((m) => m.id))}
          onCancel={handleExitSelectionMode}
          onShare={handleBulkShare}
          onDelete={handleBulkDelete}
          onAddToAlbum={handleBulkAddToAlbum}
          onMove={handleBulkMove}
          onCopy={handleBulkCopy}
          onRename={(newName) => {
            const item = mediaItems.find((m) => selectedIds.includes(m.id));
            if (item) handleRenameSingle(item, newName);
          }}
          onSetAsWallpaper={() => {
            const item = mediaItems.find((m) => selectedIds.includes(m.id));
            if (item) handleSetAsWallpaper(item);
          }}
          onShowInfo={() => {
            const item = mediaItems.find((m) => selectedIds.includes(m.id));
            if (item) setInfoModalMedia(item);
          }}
        />
      )}

      <PhotoInfoModal media={infoModalMedia} onClose={() => setInfoModalMedia(null)} />

      <ConfirmDialog
        isOpen={showAllFilesConfirm}
        title='Allow "All Files Access"?'
        message='Creating a real folder on your device needs this permission. This opens the system Settings screen -- turn it on there, then try creating the album again.'
        confirmLabel="Open Settings"
        onConfirm={async () => {
          setShowAllFilesConfirm(false);
          await MediaService.requestAllFilesPermission();
        }}
        onCancel={() => setShowAllFilesConfirm(false)}
      />

      {/* Main Header */}
      <AppHeader
        theme={activeTheme}
        gridColumns={settings.gridColumns}
        onChangeGridColumns={handleChangeGridColumns}
        onOpenSearch={handleOpenSearch}
        onOpenRecycleBin={handleOpenRecycleBin}
        isPremium={settings.isPremium}
        deletedItemsCount={deletedMedia.length}
      />

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-2 sm:px-4 pt-3 pb-28">
        {/* Selected Album Filter Header Banner */}
          {selectedAlbum && activeTab === 'photos' && (
            <div className="mb-4 p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-cyan-400">Album:</span>
                <span className="text-sm font-bold text-white">{selectedAlbum.name}</span>
              </div>
              <button
                onClick={() => setSelectedAlbum(null)}
                className="text-xs text-zinc-400 hover:text-white underline"
              >
                Clear Filter
              </button>
            </div>
          )}

          {/* TAB 1: PHOTOS GRID */}
          {activeTab === 'photos' && (
            <PhotoGrid
              mediaItems={visiblePhotos}
              gridColumns={settings.gridColumns}
              theme={activeTheme}
              onSelectMedia={handleSelectMedia}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              isSelectionMode={isSelectionMode}
              hasPermission={hasPermission}
              isScanning={isScanningMedia}
              onRequestPermission={loadDeviceMedia}
              onImportFiles={handleImportDeviceFiles}
              onLongPress={handleLongPressSelect}
            />
          )}

          {/* TAB 2: ALBUMS */}
          {activeTab === 'albums' && (
            <AlbumsView
              albums={albums}
              mediaItems={mediaItems}
              theme={activeTheme}
              onSelectAlbum={(alb) => {
                setSelectedAlbum(alb);
                setActiveTab('photos');
              }}
              onCreateAlbum={handleCreateAlbum}
              onDeleteAlbum={handleDeleteAlbum}
              isPremium={settings.isPremium}
            />
          )}

          {/* TAB 3: MEMORIES */}
          {activeTab === 'memories' && (
            <MemoriesView
              memories={memories}
              mediaItems={mediaItems}
              theme={activeTheme}
              onOpenMedia={(item) => setViewingMedia(item)}
            />
          )}

          {/* TAB 4: SETTINGS */}
          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              mediaItems={mediaItems}
              theme={activeTheme}
              onSelectTheme={(themeId) => {
                setSettings((prev) => ({ ...prev, currentTheme: themeId }));
                showToast('Theme background updated!');
              }}
              onOpenCleaner={() => setShowCleaner(true)}
              onOpenVault={() => {
                setVaultLockMode('unlock');
                setShowVaultLock(true);
              }}
              onChangeVaultPassword={() => {
                setVaultLockMode('change-password');
                setShowVaultLock(true);
              }}
              onChangeVaultLockStyle={() => {
                setVaultLockMode('change-lock-style');
                setShowVaultLock(true);
              }}
              onOpenRecycleBin={() => setShowRecycleBin(true)}
              onUnlockPremium={() => setShowPremium(true)}
              onOpenPrivacyPolicy={() => setShowPrivacyPolicy(true)}
              onOpenTerms={() => setShowTerms(true)}
              onOpenPermissions={() => setShowPermissions(true)}
              onOpenPlayStoreAssets={() => setShowPlayStoreAssets(true)}
            />
          )}
        </main>

        {/* AdBanner placed above Bottom Navigation */}
        <AdBanner />

        {/* Bottom Navigation */}
        <BottomNav
          activeTab={activeTab}
          onChangeTab={handleChangeTab}
          theme={activeTheme}
          onOpenVault={handleOpenVault}
          onOpenCleaner={handleOpenCleaner}
        />

      {/* MODALS */}
      {/* 1. Fullscreen Photo Viewer */}
      {viewingMedia && (
        <PhotoViewer
          media={viewingMedia}
          onClose={() => setViewingMedia(null)}
          onNext={handleViewerNext}
          onPrev={handleViewerPrev}
          onToggleFavorite={handleToggleFavorite}
          onDelete={handleDeleteMedia}
          onMoveToVault={handleMoveToVault}
          onOpenEditor={(media) => setEditingPhotoMedia(media)}
          onOpenCompressor={(media) => setCompressingMedia(media)}
          onOpenVideoPlayer={(media) => setPlayingVideoMedia(media)}
          onShare={(media) => handleShare([media])}
          theme={activeTheme}
        />
      )}

      {/* 2. Premium Video Player */}
      {playingVideoMedia && (
        <VideoPlayerModal
          media={playingVideoMedia}
          onClose={() => setPlayingVideoMedia(null)}
          theme={activeTheme}
        />
      )}

      {/* 3. Photo Editor */}
      {editingPhotoMedia && (
        <PhotoEditorModal
          media={editingPhotoMedia}
          onClose={() => setEditingPhotoMedia(null)}
          onSave={handleSaveEditedPhoto}
          theme={activeTheme}
        />
      )}

      {/* 4. Photo Compressor */}
      {compressingMedia && (
        <PhotoCompressorModal
          media={compressingMedia}
          onClose={() => setCompressingMedia(null)}
          onSaveCompressed={handleSaveCompressed}
          theme={activeTheme}
        />
      )}

      {/* Vault Lock Screen */}
      <VaultLockScreen
        isOpen={showVaultLock}
        initialMode={vaultLockMode}
        onSuccess={() => {
          setShowVaultLock(false);
          if (vaultLockMode === 'unlock') {
            setShowVault(true);
          }
        }}
        onCancel={() => setShowVaultLock(false)}
        onToast={showToast}
      />

      {/* 5. Private Vault */}
      {showVault && (
        <PrivateVaultModal
          vaultConfig={vaultConfig}
          vaultMedia={vaultMedia}
          onUpdateVaultConfig={(cfg) => setVaultConfig(cfg)}
          onRestoreFromVault={handleRestoreFromVault}
          onClose={() => setShowVault(false)}
          theme={activeTheme}
          onSelectMedia={(item) => setViewingMedia(item)}
        />
      )}

      {/* 6. Smart Storage Cleaner */}
      {showCleaner && (
        <SmartCleanerModal
          mediaItems={mediaItems.filter((m) => !m.inVault && !m.isDeleted)}
          onDeleteMedia={(id) => handleCleanerDelete([id])}
          onBatchDeleteMedia={handleCleanerDelete}
          onScanDuplicates={handleScanDuplicates}
          isScanningDuplicates={isScanningDuplicates}
          duplicateScanProgress={duplicateScanProgress}
          onClose={() => setShowCleaner(false)}
          theme={activeTheme}
        />
      )}

      {/* 7. Search */}
      {showSearch && (
        <SearchView
          mediaItems={mediaItems}
          theme={activeTheme}
          onSelectMedia={(item) => {
            setViewingMedia(item);
            setShowSearch(false);
          }}
          onClose={() => setShowSearch(false)}
        />
      )}

      {/* 8. Recycle Bin */}
      {showRecycleBin && (
        <RecycleBinModal
          deletedItems={deletedMedia}
          onRestore={handleRestoreFromBin}
          onPermanentDelete={handlePermanentDelete}
          onEmptyBin={handleEmptyBin}
          onClose={() => setShowRecycleBin(false)}
          theme={activeTheme}
        />
      )}

      {/* 10. Premium Pro Modal */}
      <PremiumModal
        isOpen={showPremium}
        onClose={() => setShowPremium(false)}
        onStatusChanged={() => {
          const isPrem = BillingService.isPremium();
          setSettings((prev) => ({ ...prev, isPremium: isPrem, adsEnabled: !isPrem }));
          showToast(isPrem ? 'Upgraded to Neo Gallery Pro!' : 'Reverted to Free Tier');
        }}
      />

      {/* 11. Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={showPrivacyPolicy}
        onClose={() => setShowPrivacyPolicy(false)}
      />

      {/* 12. Terms & Conditions Modal */}
      <TermsModal
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
      />

      {/* 13. Permissions Disclosure Modal */}
      <PermissionsModal
        isOpen={showPermissions}
        onClose={() => setShowPermissions(false)}
        onRequestPermission={loadDeviceMedia}
      />

      {/* 14. Play Store Assets Modal */}
      <PlayStoreAssetsModal
        isOpen={showPlayStoreAssets}
        onClose={() => setShowPlayStoreAssets(false)}
        onToast={showToast}
      />

      {/* Interstitial Ad Slot */}
      <AdInterstitial
        isOpen={showInterstitial}
        onClose={() => setShowInterstitial(false)}
      />
    </div>
  );
}
