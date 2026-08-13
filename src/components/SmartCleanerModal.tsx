import React, { useState } from 'react';
import {
  Wand2,
  X,
  Copy,
  HardDrive,
  Trash2,
  CheckCircle2,
  Sparkles,
  Layers,
  Film,
  Camera,
  ArrowRight,
  ScanSearch,
} from 'lucide-react';
import { MediaItem, ThemeConfig } from '../types';
import { LazyThumb } from './LazyThumb';

interface Props {
  mediaItems: MediaItem[];
  onDeleteMedia: (id: string) => void;
  onBatchDeleteMedia: (ids: string[]) => void;
  onScanDuplicates: () => void;
  isScanningDuplicates: boolean;
  duplicateScanProgress: { done: number; total: number };
  onClose: () => void;
  theme: ThemeConfig;
}

export const SmartCleanerModal: React.FC<Props> = ({
  mediaItems,
  onDeleteMedia,
  onBatchDeleteMedia,
  onScanDuplicates,
  isScanningDuplicates,
  duplicateScanProgress,
  onClose,
  theme,
}) => {
  const [activeTab, setActiveTab] = useState<'duplicates' | 'large_files' | 'screenshots'>(
    'duplicates'
  );
  const [selectedDeleteIds, setSelectedDeleteIds] = useState<string[]>([]);
  const [cleanedTotalMb, setCleanedTotalMb] = useState(0);

  // Filter exact duplicates and similar photos
  const duplicateItems = mediaItems.filter((m) => m.isDuplicate || m.duplicateGroupId || m.similarGroup);

  // Large files (> 10 MB)
  const largeFiles = mediaItems.filter((m) => m.sizeMb >= 10).sort((a, b) => b.sizeMb - a.sizeMb);

  // Screenshots
  const screenshots = mediaItems.filter((m) => m.album === 'Screenshots');

  // Calculate potential savings
  const duplicateSavingsMb = duplicateItems.reduce((acc, curr) => acc + curr.sizeMb, 0) / 2;
  const largeFilesTotalMb = largeFiles.reduce((acc, curr) => acc + curr.sizeMb, 0);

  const toggleSelectDelete = (id: string) => {
    setSelectedDeleteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCleanSelected = () => {
    if (selectedDeleteIds.length === 0) return;
    const itemsToDelete = mediaItems.filter((m) => selectedDeleteIds.includes(m.id));
    const saved = itemsToDelete.reduce((acc, m) => acc + m.sizeMb, 0);

    onBatchDeleteMedia(selectedDeleteIds);
    setCleanedTotalMb((prev) => prev + saved);
    setSelectedDeleteIds([]);
  };

  const formatSize = (mb: number) => {
    if (mb >= 1000) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white" style={{ backgroundColor: '#000000' }}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-zinc-900 bg-black" style={{ backgroundColor: '#000000' }}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Wand2 className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold flex items-center gap-1.5">
              <span>Smart Cleaner</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                Storage Optimizer
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400 font-mono">
              Free up space safely with confirmation
            </p>
          </div>
        </div>

        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Banner Card */}
      <div className="p-4 max-w-2xl mx-auto w-full">
        <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-950/60 via-teal-950/40 to-cyan-950/60 border border-emerald-500/30 shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-400">
              Potential Storage Reclamation
            </span>
            <div className="text-2xl font-extrabold text-white font-mono">
              You can free up {formatSize(duplicateSavingsMb + largeFilesTotalMb * 0.4)}
            </div>
            {cleanedTotalMb > 0 && (
              <p className="text-xs text-teal-300 font-semibold">
                🎉 Already cleaned {formatSize(cleanedTotalMb)}!
              </p>
            )}
          </div>

          {selectedDeleteIds.length > 0 && (
            <button
              onClick={handleCleanSelected}
              className="px-4 py-2.5 rounded-2xl bg-emerald-400 text-black font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-bounce"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clean Selected ({selectedDeleteIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-4 max-w-2xl mx-auto w-full flex gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveTab('duplicates')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
            activeTab === 'duplicates'
              ? 'bg-emerald-500 text-black border-emerald-400 shadow-md'
              : 'bg-white/5 border-white/10 text-zinc-400'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Duplicates ({duplicateItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('large_files')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
            activeTab === 'large_files'
              ? 'bg-emerald-500 text-black border-emerald-400 shadow-md'
              : 'bg-white/5 border-white/10 text-zinc-400'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>Large Files ({largeFiles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('screenshots')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
            activeTab === 'screenshots'
              ? 'bg-emerald-500 text-black border-emerald-400 shadow-md'
              : 'bg-white/5 border-white/10 text-zinc-400'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Screenshots ({screenshots.length})</span>
        </button>
      </div>

      {/* Main Content List */}
      <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full space-y-4">
        {/* DUPLICATES VIEW */}
        {activeTab === 'duplicates' && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-400">
              Identical media detected by comparing real file content, not just names or dates. Compare thumbnails and
              keep the best copy.
            </p>

            <button
              onClick={onScanDuplicates}
              disabled={isScanningDuplicates}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-xs font-bold disabled:opacity-60 cursor-pointer"
            >
              <ScanSearch className={`w-4 h-4 ${isScanningDuplicates ? 'animate-spin' : ''}`} />
              {isScanningDuplicates
                ? `Scanning... ${duplicateScanProgress.done}/${duplicateScanProgress.total}`
                : 'Scan for Duplicates'}
            </button>

            {duplicateItems.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 bg-white/5 rounded-2xl border border-white/10">
                {isScanningDuplicates ? 'Checking your library...' : 'No duplicates found yet. Tap "Scan for Duplicates" to check.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {duplicateItems.map((item) => {
                  const isSelected = selectedDeleteIds.includes(item.id);

                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleSelectDelete(item.id)}
                      className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-red-500/20 border-red-500 text-white'
                          : 'bg-zinc-950/80 border-zinc-800 text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      <LazyThumb
                        item={item}
                        alt={item.title}
                        className="w-16 h-16 rounded-xl shrink-0 border border-white/10"
                      />

                      <div className="flex-1 min-w-0 space-y-1">
                        <span className="text-xs font-bold truncate block">{item.title}</span>
                        <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-2">
                          <span>{item.sizeMb.toFixed(1)} MB</span>
                          <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[9px] uppercase">
                            {item.album}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'bg-red-500 border-red-400 text-white'
                            : 'border-white/20 bg-white/5'
                        }`}
                      >
                        {isSelected && <Trash2 className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* LARGE FILES VIEW */}
        {activeTab === 'large_files' && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-400">
              Media files sorted by size. Large 4K videos and RAW photos consume the most storage.
            </p>

            <div className="space-y-2">
              {largeFiles.map((item) => {
                const isSelected = selectedDeleteIds.includes(item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => toggleSelectDelete(item.id)}
                    className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-red-500/20 border-red-500 text-white'
                        : 'bg-zinc-950/80 border-zinc-800 text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <LazyThumb
                        item={item}
                        alt={item.title}
                        className="w-14 h-14 rounded-xl shrink-0 border border-white/10"
                      />
                      <div className="min-w-0 space-y-1">
                        <h4 className="text-xs font-bold truncate">{item.title}</h4>
                        <p className="text-[10px] font-mono text-zinc-400">
                          {item.type.toUpperCase()} • {item.date}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-extrabold font-mono text-cyan-400">
                        {formatSize(item.sizeMb)}
                      </span>
                      <div
                        className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'bg-red-500 border-red-400 text-white'
                            : 'border-white/20 bg-white/5'
                        }`}
                      >
                        {isSelected && <Trash2 className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SCREENSHOTS VIEW */}
        {activeTab === 'screenshots' && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-400">
              Screenshots often accumulate and become obsolete. Review and remove unnecessary screen grabs.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {screenshots.map((item) => {
                const isSelected = selectedDeleteIds.includes(item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => toggleSelectDelete(item.id)}
                    className={`relative aspect-square rounded-2xl overflow-hidden border cursor-pointer ${
                      isSelected ? 'ring-2 ring-red-500' : 'border-white/10'
                    }`}
                  >
                    <LazyThumb
                      item={item}
                      alt={item.title}
                      className="w-full h-full"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-2 flex flex-col justify-end">
                      <span className="text-[10px] font-bold truncate text-white">
                        {item.title}
                      </span>
                      <span className="text-[9px] font-mono text-zinc-400">
                        {item.sizeMb.toFixed(1)} MB
                      </span>
                    </div>

                    <div
                      className={`absolute top-2 right-2 w-6 h-6 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? 'bg-red-500 border-red-400 text-white'
                          : 'bg-black/60 border-white/20'
                      }`}
                    >
                      {isSelected && <Trash2 className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
