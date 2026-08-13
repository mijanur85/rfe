import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  HardDrive,
  Wand2,
  ShieldCheck,
  Trash2,
  Info,
  CheckCircle2,
  Lock,
  ChevronRight,
  PieChart,
  Palette,
  KeyRound,
  Grid,
} from 'lucide-react';
import { MediaItem, AppSettings, ThemeConfig, ThemeId } from '../types';
import { THEMES } from '../theme/themes';
import { AuthService } from '../services/auth';
import { StorageService, StorageCategoryStats } from '../services/storage';

interface Props {
  settings: AppSettings;
  mediaItems: MediaItem[];
  theme: ThemeConfig;
  onSelectTheme: (themeId: ThemeId) => void;
  onOpenCleaner: () => void;
  onOpenVault: () => void;
  onOpenRecycleBin: () => void;
  onUnlockPremium: () => void;
  onOpenPrivacyPolicy: () => void;
  onOpenTerms: () => void;
  onOpenPermissions: () => void;
  onOpenPlayStoreAssets: () => void;
  onChangeVaultPassword?: () => void;
  onChangeVaultLockStyle?: () => void;
}

export const SettingsView: React.FC<Props> = ({
  settings,
  mediaItems,
  theme,
  onSelectTheme,
  onOpenCleaner,
  onOpenVault,
  onOpenRecycleBin,
  onUnlockPremium,
  onOpenPrivacyPolicy,
  onOpenTerms,
  onOpenPermissions,
  onOpenPlayStoreAssets,
  onChangeVaultPassword,
  onChangeVaultLockStyle,
}) => {
  const currentLockType = AuthService.getLockType();

  const [storageStats, setStorageStats] = useState<StorageCategoryStats | null>(null);

  useEffect(() => {
    StorageService.getStorageStats(mediaItems).then(setStorageStats);
  }, [mediaItems]);

  const formatted = storageStats?.formatted || {
    total: 'Calculating...',
    used: 'Calculating...',
    free: 'Calculating...',
    photos: '0 B',
    videos: '0 B',
    apps: '0 B',
    documents: '0 B',
    other: '0 B',
  };

  const percentages = storageStats?.percentages || {
    used: 0,
    photos: 0,
    videos: 0,
    apps: 0,
    documents: 0,
    other: 0,
  };

  return (
    <div className="space-y-6 pb-28 px-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="pt-2">
        <h2 className={`text-xl font-extrabold flex items-center gap-2 ${theme.textPrimaryClass}`}>
          <SettingsIcon className="w-5 h-5 text-cyan-400" />
          <span>Gallery Settings</span>
        </h2>
        <p className={`text-xs ${theme.textSecondaryClass}`}>
          Configure security, storage analyzer, and performance
        </p>
      </div>

      {/* STORAGE ANALYZER DASHBOARD */}
      <div className={`p-5 rounded-3xl border space-y-4 ${theme.cardClass}`}>
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Real Device Storage Analyzer</h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                {formatted.used} Used / {formatted.total} Total ({percentages.used}% used)
              </p>
            </div>
          </div>

          <span className="text-xs font-bold font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
            {formatted.free} Free
          </span>
        </div>

        {/* Multi-segment Storage Bar */}
        <div className="space-y-2">
          <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden flex">
            <div
              className="bg-cyan-400 h-full transition-all duration-300"
              style={{ width: `${Math.max(1, percentages.photos)}%` }}
              title={`Photos: ${formatted.photos}`}
            />
            <div
              className="bg-purple-500 h-full transition-all duration-300"
              style={{ width: `${Math.max(1, percentages.videos)}%` }}
              title={`Videos: ${formatted.videos}`}
            />
            <div
              className="bg-emerald-400 h-full transition-all duration-300"
              style={{ width: `${Math.max(1, percentages.apps)}%` }}
              title={`Apps: ${formatted.apps}`}
            />
            <div
              className="bg-blue-400 h-full transition-all duration-300"
              style={{ width: `${Math.max(1, percentages.documents)}%` }}
              title={`Documents/Downloads: ${formatted.documents}`}
            />
            <div
              className="bg-amber-400 h-full transition-all duration-300"
              style={{ width: `${Math.max(1, percentages.other)}%` }}
              title={`Other: ${formatted.other}`}
            />
          </div>

          {/* Detailed Storage Grid - All 8 Categories */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 text-[11px] font-mono">
            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <span className="w-2 h-2 rounded-full bg-cyan-400" /> Photos
              </span>
              <span className="font-bold text-white">{formatted.photos}</span>
            </div>

            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-purple-300">
                <span className="w-2 h-2 rounded-full bg-purple-500" /> Videos
              </span>
              <span className="font-bold text-white">{formatted.videos}</span>
            </div>

            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Apps
              </span>
              <span className="font-bold text-white">{formatted.apps}</span>
            </div>

            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-blue-300">
                <span className="w-2 h-2 rounded-full bg-blue-400" /> Downloads
              </span>
              <span className="font-bold text-white">{formatted.documents}</span>
            </div>

            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Other
              </span>
              <span className="font-bold text-white">{formatted.other}</span>
            </div>

            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                Total Storage
              </span>
              <span className="font-extrabold text-white">{formatted.total}</span>
            </div>
          </div>
        </div>

        {/* Action Button to Cleaner */}
        <button
          onClick={onOpenCleaner}
          className="w-full py-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-500/30 transition-all cursor-pointer"
        >
          <Wand2 className="w-4 h-4 animate-pulse" />
          <span>Open Smart Storage Cleaner</span>
        </button>
      </div>

      {/* BACKGROUND THEMES SELECTION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Background Themes
            </h4>
          </div>
          <span className="text-[10px] font-mono text-zinc-400">
            {Object.keys(THEMES).length} Themes Available
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(Object.keys(THEMES) as ThemeId[]).map((key) => {
            const themeItem = THEMES[key];
            const isSelected = settings.currentTheme === key;
            const isLocked = themeItem.isPremium && !settings.isPremium;

            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onSelectTheme(key);
                  if (isLocked) {
                    onUnlockPremium();
                  }
                }}
                className={`relative group rounded-2xl p-2.5 border text-left transition-all overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)] bg-cyan-950/20'
                    : 'border-white/10 hover:border-white/25 bg-zinc-950/60'
                }`}
              >
                {/* Theme Visual Preview Box — mimics the real background + surface look */}
                <div className={`w-full h-16 rounded-xl relative overflow-hidden mb-2.5 ${themeItem.previewGradient}`}>
                  {/* Mini accent dot, like a FAB/avatar in the real UI */}
                  <div className={`absolute top-1.5 left-1.5 w-3.5 h-3.5 rounded-full ${themeItem.accentClass}`} />
                  {/* Mini surface strip, like a card/header in the real UI */}
                  <div className={`absolute bottom-1.5 left-1.5 right-1.5 h-5 rounded-lg ${themeItem.cardClass}`} />
                  {/* Lock or Checkmark Overlay */}
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                    {isLocked ? (
                      <span className="p-1 rounded-full bg-black/80 backdrop-blur-md text-amber-400 border border-amber-500/40">
                        <Lock className="w-3 h-3" />
                      </span>
                    ) : isSelected ? (
                      <span className="p-1 rounded-full bg-cyan-400 text-black shadow-md">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Theme Metadata */}
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-white truncate">{themeItem.name}</span>
                    {themeItem.isPremium ? (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-500/30">
                        PREMIUM
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        FREE
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 line-clamp-1 leading-tight">{themeItem.tagline}</p>
                </div>
              </button>
            );
          })}
        </div>

      </div>

      {/* PRIVATE VAULT & SECURITY SECTION */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Private Vault Security
        </h4>

        <div className={`rounded-3xl border divide-y divide-white/10 overflow-hidden ${theme.cardClass}`}>
          {/* Active Vault Status */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Private Vault Protection</h4>
                <p className="text-[10px] text-zinc-400">
                  Current Lock Style:{' '}
                  <span className="font-bold text-cyan-400 uppercase tracking-wide">
                    {currentLockType}
                  </span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenVault}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 transition-colors"
            >
              Open Vault
            </button>
          </div>

          {/* Change Lock Style */}
          <button
            type="button"
            onClick={onChangeVaultLockStyle}
            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                <Grid className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Vault Lock Style</h4>
                <p className="text-[10px] text-zinc-400">Switch between PIN and Pattern lock</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-cyan-300 uppercase font-bold">
                {currentLockType}
              </span>
              <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white" />
            </div>
          </button>

          {/* Change Password */}
          <button
            type="button"
            onClick={onChangeVaultPassword}
            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Change Vault Password</h4>
                <p className="text-[10px] text-zinc-400">Update your current Vault PIN or Pattern</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white" />
          </button>

          {/* Recycle Bin */}
          <button
            type="button"
            onClick={onOpenRecycleBin}
            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-500/20 text-red-400">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Recycle Bin</h4>
                <p className="text-[10px] text-zinc-400">30-day automatic deletion safety</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </button>
        </div>
      </div>

      {/* PLAY STORE COMPLIANCE & LEGAL SECTION */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Play Store Compliance & Legal
        </h4>

        <div className={`rounded-3xl border divide-y divide-white/10 overflow-hidden ${theme.cardClass}`}>
          {/* Privacy Policy */}
          <button
            onClick={onOpenPrivacyPolicy}
            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Privacy Policy</h4>
                <p className="text-[10px] text-zinc-400">In-app privacy disclosures & data rights</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </button>

          {/* Terms & Conditions */}
          <button
            onClick={onOpenTerms}
            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Terms & Conditions</h4>
                <p className="text-[10px] text-zinc-400">Usage agreement & Play refund rules</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </button>

          {/* Permissions Disclosure */}
          <button
            onClick={onOpenPermissions}
            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Permissions Disclosure</h4>
                <p className="text-[10px] text-zinc-400">Plain-language Android permission usage</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </button>
        </div>
      </div>

      {/* AD STATUS BANNER */}
      {!settings.isPremium ? (
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
          <div className="text-xs space-y-0.5">
            <span className="font-bold text-amber-400">Ad Status: Non-intrusive Ads active</span>
            <p className="text-[10px] text-zinc-500">
              Upgrade to Pro to remove all advertisements.
            </p>
          </div>
          <button
            onClick={onUnlockPremium}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-extrabold text-[11px]"
          >
            Remove Ads
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300 font-bold">
          <CheckCircle2 className="w-4 h-4" />
          <span>Pro Active: 100% Ad-Free Experience</span>
        </div>
      )}

      {/* ABOUT NEO GALLERY */}
      <div className="p-4 rounded-3xl bg-zinc-950/80 border border-cyan-500/20 text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
          <span>🤖 Android 15 (API level 35)</span>
          <span>•</span>
          <span>Material You Compatible</span>
        </div>
        <h3 className="text-xs font-bold text-white">Neo Gallery for Android v2.5 Pro</h3>
        <p className="text-[10px] text-zinc-400">Optimized for Android Phones, Foldables & Tablets</p>
        <p className="text-[9px] text-zinc-500 font-mono pt-1">
          Package: com.neogallery.app • Quick Share Enabled
        </p>
      </div>
    </div>
  );
};
