export type ThemeId =
  | 'pure-black'
  | 'pure-white'
  | 'obsidian'
  | 'ivory'
  | 'sapphire'
  | 'emerald'
  | 'crimson'
  | 'desert-sand'
  | 'arctic'
  | 'violet-noir'
  | 'copper-forge'
  | 'ocean-deep'
  | 'rose-marble'
  | 'carbon';

export type GridColumns = 2 | 3 | 4 | 5;

export type MediaType = 'photo' | 'video';

export interface MediaItem {
  id: string;
  title: string;
  type: MediaType;
  url: string;
  thumbnailUrl: string;
  date: string; // YYYY-MM-DD
  time?: string;
  sizeMb: number;
  sizeBytes?: number;
  album: string;
  location?: string;
  tags?: string[];
  isFavorite: boolean;
  inVault: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  daysRemainingInBin?: number;
  width?: number;
  height?: number;
  durationSec?: number; // for videos
  mimeType: string;
  cameraModel?: string;
  iso?: number;
  resolution?: string;
  originalSizeMb?: number;
  compressedSizeMb?: number;
  duplicateGroupId?: string;
  isDuplicate?: boolean;
  similarGroup?: string;
  mediaId?: number; // raw native MediaStore numeric id, used for on-demand thumbnail loading
  rawPath?: string; // real filesystem path (unconverted) -- needed for native sharing
  customAlbumIds?: string[]; // ids of user-created (virtual) albums this item has been added to
}

export interface Album {
  id: string;
  name: string;
  coverUrl: string;
  count: number;
  systemType: 'camera' | 'screenshots' | 'downloads' | 'whatsapp' | 'videos' | 'favorites' | 'recently_added' | 'custom';
  isHidden?: boolean;
}

export interface MemoryCard {
  id: string;
  title: string;
  subtitle: string;
  timeframe: 'on_this_day' | '1_year' | '2_years' | '5_years' | 'ai_highlight';
  dateString: string;
  coverMediaId: string;
  mediaIds: string[];
  storyText: string;
  mood?: 'nostalgic' | 'adventurous' | 'serene' | 'vibrant';
}

export type UnlockMethod = 'pin' | 'pattern' | 'fingerprint' | 'any';

export interface VaultConfig {
  isLocked: boolean;
  unlockMethod: UnlockMethod;
  pinCode: string; // e.g. "1234"
  patternNodes: number[]; // e.g. [0, 1, 2, 4, 6] for 3x3 grid
  isFingerprintEnabled: boolean;
  failedAttempts: number;
  lockUntil: number | null; // timestamp
  isHiddenMode: boolean;
}

export interface DuplicateGroup {
  id: string;
  title: string;
  type: 'exact' | 'similar' | 'video';
  items: MediaItem[];
  totalSavingsMb: number;
}

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  tagline: string;
  isPremium: boolean;
  type: 'static';
  bgClass: string;
  cardClass: string;
  borderClass: string;
  textPrimaryClass: string;
  textSecondaryClass: string;
  accentClass: string;
  accentGradient: string;
  glowClass: string;
  bottomNavClass: string;
  headerClass: string;
  fontFamilyClass: string;
  buttonClass: string;
  viewerBg: string;
  playerAccent: string;
  previewGradient: string;
}

export interface AppSettings {
  currentTheme: ThemeId;
  isPremium: boolean;
  adsEnabled: boolean;
  gridColumns: GridColumns;
  autoLockVault: boolean;
  sortBy: 'date-desc' | 'date-asc' | 'size-desc' | 'name-asc';
}
