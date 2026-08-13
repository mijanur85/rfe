import React, { useState } from 'react';
import {
  Folder,
  Plus,
  FolderHeart,
  Camera,
  Smartphone,
  Download,
  MessageSquare,
  Video,
  Heart,
  MoreVertical,
  Check,
  X,
  Trash2,
} from 'lucide-react';
import { Album, MediaItem, ThemeConfig } from '../types';

interface Props {
  albums: Album[];
  mediaItems: MediaItem[];
  theme: ThemeConfig;
  onSelectAlbum: (album: Album) => void;
  onCreateAlbum: (name: string) => void;
  onDeleteAlbum: (id: string) => void;
  isPremium: boolean;
}

export const AlbumsView: React.FC<Props> = ({
  albums,
  mediaItems,
  theme,
  onSelectAlbum,
  onCreateAlbum,
  onDeleteAlbum,
  isPremium,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');

  const getSystemIcon = (type: Album['systemType']) => {
    switch (type) {
      case 'camera':
        return <Camera className="w-4 h-4 text-cyan-400" />;
      case 'screenshots':
        return <Smartphone className="w-4 h-4 text-emerald-400" />;
      case 'downloads':
        return <Download className="w-4 h-4 text-blue-400" />;
      case 'whatsapp':
        return <MessageSquare className="w-4 h-4 text-green-400" />;
      case 'videos':
        return <Video className="w-4 h-4 text-purple-400" />;
      case 'favorites':
        return <Heart className="w-4 h-4 text-red-500 fill-red-500" />;
      default:
        return <Folder className="w-4 h-4 text-amber-400" />;
    }
  };

  const handleCreate = () => {
    if (!newAlbumName.trim()) return;
    onCreateAlbum(newAlbumName.trim());
    setNewAlbumName('');
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-6 pb-28 px-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h2 className={`text-xl font-extrabold flex items-center gap-2 ${theme.textPrimaryClass}`}>
            <FolderHeart className="w-5 h-5 text-cyan-400" />
            <span>Albums & Folders</span>
          </h2>
          <p className={`text-xs ${theme.textSecondaryClass}`}>
            Organize your media into system and custom albums
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border shadow-lg transition-all ${
            theme.id === 'cyber-neon'
              ? 'bg-cyan-400 text-black border-cyan-300 shadow-[0_0_15px_#00f0ff]'
              : theme.id === 'luxury-gold'
              ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_15px_#d4af37]'
              : 'bg-white text-black'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>New Album</span>
        </button>
      </div>

      {/* Albums Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {albums.map((alb) => {
          // Count media items in this album
          let count = alb.count;
          if (alb.systemType === 'favorites') {
            count = mediaItems.filter((m) => m.isFavorite && !m.inVault && !m.isDeleted).length;
          } else if (alb.systemType === 'videos') {
            count = mediaItems.filter((m) => m.type === 'video' && !m.inVault && !m.isDeleted).length;
          } else if (alb.systemType === 'custom') {
            // Custom albums count both items physically Moved into the
            // real folder AND items only "Added to album" via the virtual
            // (non-destructive) tag.
            count = mediaItems.filter(
              (m) =>
                !m.inVault &&
                !m.isDeleted &&
                (m.album.toLowerCase() === alb.name.toLowerCase() || (m.customAlbumIds || []).includes(alb.id))
            ).length;
          } else {
            count = mediaItems.filter(
              (m) =>
                m.album.toLowerCase() === alb.name.toLowerCase() && !m.inVault && !m.isDeleted
            ).length;
          }

          return (
            <div
              key={alb.id}
              onClick={() => onSelectAlbum(alb)}
              className={`group relative aspect-square rounded-3xl overflow-hidden cursor-pointer border transition-all duration-300 hover:scale-[1.03] ${
                theme.cardClass
              }`}
            >
              {/* Cover Image */}
              <img
                src={alb.coverUrl}
                alt={alb.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />

              {/* Top System Icon Pill */}
              <div className="absolute top-3 left-3 p-2 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10">
                {getSystemIcon(alb.systemType)}
              </div>

              {/* Delete button for custom albums */}
              {alb.systemType === 'custom' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteAlbum(alb.id);
                  }}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete Custom Album"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Bottom Info */}
              <div className="absolute bottom-0 left-0 right-0 p-3.5 space-y-0.5">
                <h3 className="text-sm font-bold text-white truncate drop-shadow-md">
                  {alb.name}
                </h3>
                <span className="text-[11px] font-mono text-zinc-300/80 block">
                  {count} {count === 1 ? 'item' : 'items'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE ALBUM MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className={`w-full max-w-sm rounded-3xl p-6 border space-y-4 shadow-2xl ${theme.cardClass} ${theme.bgClass}`}>
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-base font-bold">Create New Album</h3>
              <button onClick={() => setShowCreateModal(false)}>
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400">Album Name</label>
              <input
                type="text"
                placeholder="e.g. Summer Trip 2026"
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-black/50 border border-white/20 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <button
              onClick={handleCreate}
              className={`w-full py-3 rounded-2xl font-bold text-xs shadow-xl transition-all ${
                theme.id === 'cyber-neon'
                  ? 'bg-cyan-400 text-black shadow-[0_0_15px_#00f0ff]'
                  : theme.id === 'luxury-gold'
                  ? 'bg-amber-400 text-black shadow-[0_0_15px_#d4af37]'
                  : 'bg-white text-black'
              }`}
            >
              Create Album
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
