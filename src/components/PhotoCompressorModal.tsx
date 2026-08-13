import React, { useState } from 'react';
import { X, SlidersHorizontal, ArrowRight, Download, CheckCircle, Sparkles } from 'lucide-react';
import { MediaItem, ThemeConfig } from '../types';

interface Props {
  media: MediaItem | null;
  onClose: () => void;
  onSaveCompressed: (originalId: string, compressedSizeMb: number) => void;
  theme: ThemeConfig;
}

type QualityPreset = 'original' | 'high' | 'medium' | 'small';

export const PhotoCompressorModal: React.FC<Props> = ({
  media,
  onClose,
  onSaveCompressed,
  theme,
}) => {
  const [preset, setPreset] = useState<QualityPreset>('medium');
  const [isSaved, setIsSaved] = useState(false);

  if (!media) return null;

  const originalSize = media.sizeMb;

  const qualityFactors: Record<QualityPreset, { label: string; factor: number; desc: string }> = {
    original: { label: 'Original Quality', factor: 1.0, desc: 'Uncompressed full size' },
    high: { label: 'High Quality (80%)', factor: 0.55, desc: 'Ideal for printing & high-res backup' },
    medium: { label: 'Medium Quality (50%)', factor: 0.28, desc: 'Best balance of quality and storage savings' },
    small: { label: 'Small Size (30%)', factor: 0.12, desc: 'Maximum compression for quick web sharing' },
  };

  const calculatedSize = Number((originalSize * qualityFactors[preset].factor).toFixed(2));
  const savingsMb = Number((originalSize - calculatedSize).toFixed(2));
  const savingsPercent = Math.round((1 - calculatedSize / originalSize) * 100);

  const handleApply = () => {
    onSaveCompressed(media.id, calculatedSize);
    setIsSaved(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
      <div className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl space-y-6 ${theme.cardClass} ${theme.bgClass}`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Image Compression</h3>
              <p className="text-xs text-zinc-400">Free up space without losing memory</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thumbnail + Live Size Comparison Box */}
        <div className="p-4 rounded-2xl bg-black/50 border border-white/10 flex items-center gap-4">
          <img
            src={media.thumbnailUrl || media.url}
            alt={media.title}
            className="w-16 h-16 rounded-xl object-cover shrink-0 border border-white/10"
          />
          <div className="flex-1 space-y-1">
            <span className="text-xs font-semibold text-zinc-300 truncate block">
              {media.title}
            </span>

            <div className="flex items-center gap-2 text-sm font-mono font-bold">
              <span className="text-red-400 line-through">{originalSize.toFixed(1)} MB</span>
              <ArrowRight className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="text-emerald-400">{calculatedSize} MB</span>
            </div>

            {savingsPercent > 0 && (
              <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                Save {savingsMb} MB ({savingsPercent}% smaller)
              </span>
            )}
          </div>
        </div>

        {/* Preset Selection Cards */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Select Quality Level
          </label>
          <div className="grid grid-cols-1 gap-2">
            {(Object.keys(qualityFactors) as QualityPreset[]).map((key) => {
              const q = qualityFactors[key];
              const isSelected = preset === key;

              return (
                <button
                  key={key}
                  onClick={() => setPreset(key)}
                  className={`flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-md'
                      : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold">{q.label}</div>
                    <div className="text-[10px] text-zinc-400">{q.desc}</div>
                  </div>

                  <span className="text-xs font-mono font-semibold text-cyan-300">
                    ~{(originalSize * q.factor).toFixed(1)} MB
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        {isSaved ? (
          <div className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-emerald-500 text-black font-bold text-sm animate-bounce">
            <CheckCircle className="w-5 h-5" />
            <span>Compressed Successfully!</span>
          </div>
        ) : (
          <button
            onClick={handleApply}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xl ${
              theme.id === 'cyber-neon'
                ? 'bg-cyan-400 text-black shadow-[0_0_20px_#00f0ff]'
                : theme.id === 'luxury-gold'
                ? 'bg-amber-400 text-black shadow-[0_0_20px_#d4af37]'
                : 'bg-white text-black'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Apply Compression ({calculatedSize} MB)</span>
          </button>
        )}
      </div>
    </div>
  );
};
