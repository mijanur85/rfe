import React, { useState } from 'react';
import { Calendar, Play, Heart, Flame, X, ChevronRight, ChevronLeft, Music, Film } from 'lucide-react';
import { MemoryCard, MediaItem, ThemeConfig } from '../types';

interface Props {
  memories: MemoryCard[];
  mediaItems: MediaItem[];
  theme: ThemeConfig;
  onOpenMedia: (media: MediaItem) => void;
}

export const MemoriesView: React.FC<Props> = ({
  memories,
  mediaItems,
  theme,
  onOpenMedia,
}) => {
  const [activeSlideshowMemory, setActiveSlideshowMemory] = useState<MemoryCard | null>(null);
  const [slideshowIndex, setSlideshowIndex] = useState(0);

  const startSlideshow = (memory: MemoryCard) => {
    setActiveSlideshowMemory(memory);
    setSlideshowIndex(0);
  };

  const currentSlideshowMedia = activeSlideshowMemory
    ? mediaItems.find((m) => m.id === activeSlideshowMemory.mediaIds[slideshowIndex]) ||
      mediaItems.find((m) => m.id === activeSlideshowMemory.coverMediaId) ||
      mediaItems[0]
    : null;

  const nextSlide = () => {
    if (!activeSlideshowMemory) return;
    setSlideshowIndex((prev) => (prev + 1) % activeSlideshowMemory.mediaIds.length);
  };

  const prevSlide = () => {
    if (!activeSlideshowMemory) return;
    setSlideshowIndex(
      (prev) => (prev - 1 + activeSlideshowMemory.mediaIds.length) % activeSlideshowMemory.mediaIds.length
    );
  };

  return (
    <div className="space-y-6 pb-28 px-4 max-w-4xl mx-auto">
      {/* Memories Hero Section */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h2 className={`text-xl font-extrabold flex items-center gap-2 ${theme.textPrimaryClass}`}>
            <Film className="w-5 h-5 text-cyan-400" />
            <span>Memories & Stories</span>
          </h2>
          <p className={`text-xs ${theme.textSecondaryClass}`}>
            Relive your special moments through curated time capsules
          </p>
        </div>
      </div>

      {/* Memory Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {memories.map((mem) => {
          const coverMedia =
            mediaItems.find((m) => m.id === mem.coverMediaId) ||
            mediaItems.find((m) => m.id === mem.mediaIds[0]) ||
            mediaItems[0];

          return (
            <div
              key={mem.id}
              onClick={() => startSlideshow(mem)}
              className={`group relative h-72 rounded-3xl overflow-hidden cursor-pointer border transition-all duration-300 hover:scale-[1.02] ${
                theme.cardClass
              }`}
            >
              {/* Cover Image */}
              {coverMedia && (
                <img
                  src={coverMedia.url}
                  alt={mem.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              )}

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20 group-hover:via-black/50 transition-colors" />

              {/* Memory Badge */}
              <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[10px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-cyan-400" />
                <span>{mem.subtitle}</span>
              </div>

              {/* Play Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="p-4 rounded-full bg-cyan-400 text-black shadow-[0_0_20px_#00f0ff] scale-90 group-hover:scale-100 transition-transform">
                  <Play className="w-6 h-6 fill-current translate-x-0.5" />
                </div>
              </div>

              {/* Bottom Information */}
              <div className="absolute bottom-0 left-0 right-0 p-4 space-y-1">
                <span className="text-[10px] font-mono font-medium text-zinc-300 block">
                  {mem.dateString}
                </span>
                <h3 className="text-base font-extrabold text-white leading-snug drop-shadow-md">
                  {mem.title}
                </h3>
                <p className="text-xs text-zinc-300/80 line-clamp-2">{mem.storyText}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* FULL SCREEN SLIDESHOW MODAL */}
      {activeSlideshowMemory && currentSlideshowMedia && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-4 sm:p-6 animate-fade-in">
          {/* Top Bar */}
          <div className="flex items-center justify-between z-10 p-2">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <Film className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-white">{activeSlideshowMemory.title}</h3>
                <p className="text-[10px] font-mono text-zinc-400">
                  {activeSlideshowMemory.subtitle} • {slideshowIndex + 1} of{' '}
                  {activeSlideshowMemory.mediaIds.length}
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveSlideshowMemory(null)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Slide Media */}
          <div className="relative flex-1 flex items-center justify-center my-4">
            <img
              src={currentSlideshowMedia.url}
              alt={currentSlideshowMedia.title}
              className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl"
            />

            <button
              onClick={prevSlide}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 text-white hover:bg-white/20"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 text-white hover:bg-white/20"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Bottom Story & Ambient Music Pill */}
          <div className="z-10 p-4 rounded-2xl bg-black/80 backdrop-blur-2xl border border-white/10 max-w-md mx-auto w-full text-center space-y-2">
            <p className="text-xs text-zinc-200 font-medium">
              "{activeSlideshowMemory.storyText}"
            </p>

            <div className="flex items-center justify-center gap-2 text-[10px] text-cyan-400 font-mono">
              <Music className="w-3 h-3 animate-pulse" />
              <span>Playing: Ambient Memory Soundtrack</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
