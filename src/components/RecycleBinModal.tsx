import React from 'react';
import { Trash2, RotateCcw, AlertTriangle, X, ShieldAlert } from 'lucide-react';
import { MediaItem, ThemeConfig } from '../types';
import { LazyThumb } from './LazyThumb';

interface Props {
  deletedItems: MediaItem[];
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  onEmptyBin: () => void;
  onClose: () => void;
  theme: ThemeConfig;
}

export const RecycleBinModal: React.FC<Props> = ({
  deletedItems,
  onRestore,
  onPermanentDelete,
  onEmptyBin,
  onClose,
  theme,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white" style={{ backgroundColor: '#000000' }}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-zinc-900 bg-black" style={{ backgroundColor: '#000000' }}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold flex items-center gap-1.5">
              <span>Recycle Bin</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-mono">
                {deletedItems.length} items
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400 font-mono">
              Items are permanently removed after 30 days
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {deletedItems.length > 0 && (
            <button
              onClick={onEmptyBin}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-500 text-white hover:bg-red-600 shadow-md transition-all"
            >
              Empty Bin
            </button>
          )}
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main List */}
      <div className="flex-1 overflow-y-auto p-4 max-w-3xl mx-auto w-full space-y-4">
        {deletedItems.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 space-y-3">
            <ShieldAlert className="w-12 h-12 mx-auto opacity-30 text-emerald-400" />
            <h4 className="text-sm font-bold text-zinc-300">Recycle Bin is Empty</h4>
            <p className="text-xs">No deleted photos or videos found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {deletedItems.map((item) => (
              <div
                key={item.id}
                className="relative aspect-square rounded-2xl overflow-hidden border border-red-500/30 bg-black group"
              >
                <div className="opacity-75 group-hover:opacity-100 transition-opacity w-full h-full">
                  <LazyThumb item={item} alt={item.title} className="w-full h-full" />
                </div>

                {/* Remaining Days Badge */}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 border border-red-500/40 text-[9px] font-mono font-bold text-red-300">
                  {item.daysRemainingInBin || 30} days left
                </div>

                {/* Actions overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2 flex items-end justify-between opacity-90">
                  <button
                    onClick={() => onRestore(item.id)}
                    className="px-2.5 py-1.5 rounded-xl bg-cyan-500 text-black font-bold text-[10px] flex items-center gap-1 shadow-md hover:bg-cyan-400"
                    title="Restore to Gallery"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restore</span>
                  </button>

                  <button
                    onClick={() => onPermanentDelete(item.id)}
                    className="p-1.5 rounded-xl bg-red-600/80 text-white hover:bg-red-600"
                    title="Delete Permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
