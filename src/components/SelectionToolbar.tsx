import React, { useState } from 'react';
import {
  X,
  CheckSquare,
  MoreVertical,
  Share2,
  FolderPlus,
  FolderInput,
  CopyPlus,
  PenLine,
  ImagePlus,
  Info,
  Trash2,
} from 'lucide-react';
import { Album, MediaItem, ThemeConfig } from '../types';

interface Props {
  theme: ThemeConfig;
  selectedCount: number;
  totalVisibleCount: number;
  allSelected: boolean;
  customAlbums: Album[];
  allAlbums: Album[];
  selectedItems: MediaItem[];
  onSelectAll: () => void;
  onCancel: () => void;
  onShare: () => void;
  onDelete: () => void;
  onAddToAlbum: (albumId: string) => void;
  onMove: (targetAlbumName: string) => void;
  onCopy: (targetAlbumName: string) => void;
  onRename: (newName: string) => void;
  onSetAsWallpaper: () => void;
  onShowInfo: () => void;
}

type Sheet = 'menu' | 'addToAlbum' | 'move' | 'copy' | null;

// Everything (Share, Add to Album, Move, Copy, Rename, Set as, Info,
// Delete) now lives in ONE overflow menu opened from the three-dot button
// next to "Select all" -- there is no separate bottom action bar anymore.
export const SelectionToolbar: React.FC<Props> = ({
  selectedCount,
  allSelected,
  customAlbums,
  allAlbums,
  selectedItems,
  onSelectAll,
  onCancel,
  onShare,
  onDelete,
  onAddToAlbum,
  onMove,
  onCopy,
  onRename,
  onSetAsWallpaper,
  onShowInfo,
}) => {
  const [sheet, setSheet] = useState<Sheet>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [showRename, setShowRename] = useState(false);

  const singleItem = selectedCount === 1 ? selectedItems[0] : null;
  const isSingleImage = !!singleItem && singleItem.type === 'photo';

  const closeAll = () => setSheet(null);

  const menuItems: {
    key: string;
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    danger?: boolean;
  }[] = [
    { key: 'share', label: 'Share', icon: <Share2 className="w-4 h-4" />, onClick: () => { closeAll(); onShare(); } },
    { key: 'add', label: 'Add to album', icon: <FolderPlus className="w-4 h-4" />, onClick: () => setSheet('addToAlbum') },
    { key: 'move', label: 'Move', icon: <FolderInput className="w-4 h-4" />, onClick: () => setSheet('move') },
    { key: 'copy', label: 'Copy', icon: <CopyPlus className="w-4 h-4" />, onClick: () => setSheet('copy') },
  ];

  if (singleItem) {
    menuItems.push({
      key: 'rename',
      label: 'Rename',
      icon: <PenLine className="w-4 h-4" />,
      onClick: () => {
        setRenameValue(singleItem.title);
        setShowRename(true);
        setSheet(null);
      },
    });
  }

  if (isSingleImage) {
    menuItems.push({
      key: 'setas',
      label: 'Set as',
      icon: <ImagePlus className="w-4 h-4" />,
      onClick: () => { closeAll(); onSetAsWallpaper(); },
    });
  }

  if (singleItem) {
    menuItems.push({
      key: 'info',
      label: 'Information',
      icon: <Info className="w-4 h-4" />,
      onClick: () => { closeAll(); onShowInfo(); },
    });
  }

  menuItems.push({
    key: 'delete',
    label: 'Delete',
    icon: <Trash2 className="w-4 h-4" />,
    danger: true,
    onClick: () => { closeAll(); setConfirmDelete(true); },
  });

  return (
    <>
      {/* Top bar -- Select all + the single three-dot overflow menu */}
      <div className="fixed top-0 left-0 right-0 z-40 px-3 py-2.5 bg-zinc-950/95 backdrop-blur-xl border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="p-1.5 rounded-full hover:bg-white/10 text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-white">{selectedCount} selected</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSelectAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
          <button
            onClick={() => setSheet(sheet === 'menu' ? null : 'menu')}
            disabled={selectedCount === 0}
            className="p-1.5 rounded-full hover:bg-white/10 text-white disabled:opacity-30 cursor-pointer"
            title="More options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Overflow menu sheet */}
      {sheet === 'menu' && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-md" onClick={closeAll}>
          <div
            className="w-full max-w-lg bg-zinc-950 border-t border-cyan-500/30 rounded-t-3xl p-3 text-white space-y-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto -mt-1 mb-2" />
            {menuItems.map((item) => (
              <button
                key={item.key}
                onClick={item.onClick}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-white/10 text-left cursor-pointer ${
                  item.danger ? 'text-red-400' : 'text-white'
                }`}
              >
                {item.icon}
                <span className="text-sm font-semibold">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add to album sheet */}
      {sheet === 'addToAlbum' && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-md" onClick={closeAll}>
          <div
            className="w-full max-w-lg bg-zinc-950 border-t border-cyan-500/30 rounded-t-3xl p-5 text-white space-y-3 max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto -mt-1 mb-2" />
            <h3 className="text-sm font-bold">Add {selectedCount} item(s) to album</h3>
            {customAlbums.length === 0 ? (
              <p className="text-xs text-zinc-400">No albums yet. Create one from the Albums tab first.</p>
            ) : (
              <div className="space-y-2">
                {customAlbums.map((album) => (
                  <button
                    key={album.id}
                    onClick={() => {
                      onAddToAlbum(album.id);
                      closeAll();
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-left cursor-pointer"
                  >
                    {album.coverUrl ? (
                      <img src={album.coverUrl} alt={album.name} className="w-10 h-10 rounded-xl object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-white/10" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{album.name}</p>
                      <p className="text-[10px] text-zinc-400">{album.count} items</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <button onClick={closeAll} className="w-full py-2.5 rounded-xl bg-white/10 text-xs font-bold cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Move / Copy destination sheet -- targets a REAL on-device folder,
          so it lists every real album (system + custom), not just custom ones. */}
      {(sheet === 'move' || sheet === 'copy') && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-md" onClick={closeAll}>
          <div
            className="w-full max-w-lg bg-zinc-950 border-t border-cyan-500/30 rounded-t-3xl p-5 text-white space-y-3 max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto -mt-1 mb-2" />
            <h3 className="text-sm font-bold">
              {sheet === 'move' ? 'Move' : 'Copy'} {selectedCount} item(s) to
            </h3>
            {allAlbums.length === 0 ? (
              <p className="text-xs text-zinc-400">No albums yet. Create one from the Albums tab first.</p>
            ) : (
              <div className="space-y-2">
                {allAlbums.map((album) => (
                  <button
                    key={album.id}
                    onClick={() => {
                      if (sheet === 'move') onMove(album.name);
                      else onCopy(album.name);
                      closeAll();
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-left cursor-pointer"
                  >
                    {album.coverUrl ? (
                      <img src={album.coverUrl} alt={album.name} className="w-10 h-10 rounded-xl object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-white/10" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{album.name}</p>
                      <p className="text-[10px] text-zinc-400">{album.count} items</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <button onClick={closeAll} className="w-full py-2.5 rounded-xl bg-white/10 text-xs font-bold cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rename sheet */}
      {showRename && singleItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-6">
          <div className="w-full max-w-sm bg-zinc-950 border border-cyan-500/30 rounded-3xl p-5 text-white space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <PenLine className="w-4 h-4 text-cyan-400" /> Rename
            </h3>
            <input
              autoFocus
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && renameValue.trim()) {
                  onRename(renameValue.trim());
                  setShowRename(false);
                }
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-400"
            />
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowRename(false)}
                className="py-2.5 rounded-xl bg-white/10 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (renameValue.trim()) {
                    onRename(renameValue.trim());
                    setShowRename(false);
                  }
                }}
                disabled={!renameValue.trim()}
                className="py-2.5 rounded-xl bg-cyan-400 text-black text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-6">
          <div className="w-full max-w-sm bg-zinc-950 border border-red-500/30 rounded-3xl p-5 text-white space-y-4">
            <h3 className="text-sm font-bold">Delete {selectedCount} item(s)?</h3>
            <p className="text-xs text-zinc-400">
              This removes the selected photos/videos from your device storage and moves them to the Recycle Bin,
              where they'll stay for 30 days before being permanently deleted. Android will ask you to confirm one
              more time.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setConfirmDelete(false);
                  onDelete();
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
