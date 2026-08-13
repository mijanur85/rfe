import React from 'react';
import { X, Info, MapPin, HardDrive, Calendar, Ruler, FileType, FolderOpen } from 'lucide-react';
import { MediaItem } from '../types';

interface Props {
  media: MediaItem | null;
  onClose: () => void;
}

const Row: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-b-0">
    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-cyan-400 shrink-0">
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] uppercase tracking-wide text-zinc-500 font-semibold">{label}</p>
      <p className="text-xs text-white break-words">{value}</p>
    </div>
  </div>
);

// Details ("Info") panel for the long-press / selection overflow menu --
// shows real metadata already carried on the MediaItem (name, date, size,
// resolution, folder/location, file type) rather than a placeholder.
export const PhotoInfoModal: React.FC<Props> = ({ media, onClose }) => {
  if (!media) return null;

  const sizeLabel =
    media.sizeMb >= 1024 ? `${(media.sizeMb / 1024).toFixed(2)} GB` : `${media.sizeMb.toFixed(2)} MB`;
  const dimsLabel = media.width && media.height ? `${media.width} × ${media.height}` : media.resolution || 'Unknown';
  const dateLabel = media.time ? `${media.date} · ${media.time}` : media.date;
  const pathLabel = media.rawPath || `${media.album} (on-device folder)`;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 text-white space-y-3 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold">Details</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-2xl bg-white/5 px-3">
          <Row icon={<FileType className="w-4 h-4" />} label="Name" value={media.title} />
          <Row icon={<Calendar className="w-4 h-4" />} label="Date taken" value={dateLabel} />
          <Row icon={<HardDrive className="w-4 h-4" />} label="Size" value={sizeLabel} />
          <Row icon={<Ruler className="w-4 h-4" />} label="Resolution" value={dimsLabel} />
          <Row icon={<FolderOpen className="w-4 h-4" />} label="Location on device" value={pathLabel} />
          {media.location && <Row icon={<MapPin className="w-4 h-4" />} label="Place" value={media.location} />}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};
