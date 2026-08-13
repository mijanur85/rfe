import React, { useState } from 'react';
import { Search as SearchIcon, X, Image, Video } from 'lucide-react';
import { MediaItem, ThemeConfig } from '../types';
import { LazyThumb } from './LazyThumb';

interface Props {
  mediaItems: MediaItem[];
  theme: ThemeConfig;
  onSelectMedia: (item: MediaItem) => void;
  onClose: () => void;
}

export const SearchView: React.FC<Props> = ({ mediaItems, theme, onSelectMedia, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'photo' | 'video'>('all');
  const [selectedAlbum, setSelectedAlbum] = useState<string>('all');

  // Filter logic
  const filteredItems = mediaItems.filter((item) => {
    if (item.inVault || item.isDeleted) return false;

    // Type filter
    if (selectedType !== 'all' && item.type !== selectedType) return false;

    // Album filter
    if (selectedAlbum !== 'all' && item.album.toLowerCase() !== selectedAlbum.toLowerCase()) {
      return false;
    }

    // Keyword search
    if (query.trim()) {
      const q = query.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDate = item.date.includes(q);
      const matchAlbum = item.album.toLowerCase().includes(q);
      const matchTags = item.tags?.some((t) => t.toLowerCase().includes(q));
      const matchLoc = item.location?.toLowerCase().includes(q);
      return matchTitle || matchDate || matchAlbum || matchTags || matchLoc;
    }

    return true;
  });

  const clearSearch = () => {
    setQuery('');
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col bg-black text-white ${theme.bgClass}`}>
      {/* Search Header */}
      <div className={`p-4 border-b ${theme.headerClass} space-y-3`}>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by title, date, location, tag or album..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 font-medium"
            />

            {query && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1 rounded-xl font-medium border whitespace-nowrap ${
              selectedType === 'all'
                ? 'bg-cyan-500 text-black border-cyan-400 font-bold'
                : 'bg-white/5 border-white/10 text-zinc-400'
            }`}
          >
            All Media
          </button>
          <button
            onClick={() => setSelectedType('photo')}
            className={`px-3 py-1 rounded-xl font-medium border whitespace-nowrap flex items-center gap-1 ${
              selectedType === 'photo'
                ? 'bg-cyan-500 text-black border-cyan-400 font-bold'
                : 'bg-white/5 border-white/10 text-zinc-400'
            }`}
          >
            <Image className="w-3 h-3" />
            <span>Photos Only</span>
          </button>
          <button
            onClick={() => setSelectedType('video')}
            className={`px-3 py-1 rounded-xl font-medium border whitespace-nowrap flex items-center gap-1 ${
              selectedType === 'video'
                ? 'bg-cyan-500 text-black border-cyan-400 font-bold'
                : 'bg-white/5 border-white/10 text-zinc-400'
            }`}
          >
            <Video className="w-3 h-3" />
            <span>Videos Only</span>
          </button>
        </div>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 space-y-2">
            <SearchIcon className="w-8 h-8 mx-auto opacity-30" />
            <p className="text-xs">No media matching your search terms.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectMedia(item)}
                className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 cursor-pointer group hover:scale-[1.02] transition-transform"
              >
                <LazyThumb item={item} alt={item.title} className="w-full h-full" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-1.5 flex flex-col justify-end">
                  <span className="text-[10px] font-bold text-white truncate">{item.title}</span>
                  <span className="text-[9px] font-mono text-zinc-400">{item.album}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
