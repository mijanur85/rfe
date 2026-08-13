import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Play, Heart, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { MediaItem, GridColumns, ThemeConfig } from '../types';
import { LazyThumb } from './LazyThumb';
import { stripBackdropBlur } from '../lib/perf';

interface Props {
  mediaItems: MediaItem[];
  gridColumns: GridColumns;
  theme: ThemeConfig;
  onSelectMedia: (item: MediaItem) => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  isSelectionMode: boolean;
  hasPermission?: boolean | null;
  isScanning?: boolean;
  onRequestPermission?: () => void;
  onImportFiles?: (files: FileList) => void;
  onLongPress?: (id: string) => void;
}

type Group = { dateLabel: string; items: MediaItem[] };
type Block =
  | { key: string; type: 'header'; group: Group }
  | { key: string; type: 'row'; items: MediaItem[]; marginBottom: number };

const GRID_GAP_PX: Record<GridColumns, { base: number; sm: number }> = {
  2: { base: 8, sm: 12 },
  3: { base: 6, sm: 10 },
  4: { base: 4, sm: 8 },
  5: { base: 4, sm: 6 },
};

const HEADER_ROW_HEIGHT = 44; // approx rendered height incl. mb-2
const GROUP_BOTTOM_MARGIN = 24; // matches the old space-y-6 between groups
const SM_BREAKPOINT = 640;

const gridClassMap: Record<GridColumns, string> = {
  2: 'grid-cols-2 gap-2 sm:gap-3',
  3: 'grid-cols-3 gap-1.5 sm:gap-2.5',
  4: 'grid-cols-4 gap-1 sm:gap-2',
  5: 'grid-cols-5 gap-1 sm:gap-1.5',
};

// A single row of grid tiles. Kept as its own component so React.memo can
// skip re-rendering rows that didn't change (e.g. while other rows scroll
// in/out, or while the selection toolbar/toast/etc. re-renders the app).
const GridRow: React.FC<{
  items: MediaItem[];
  gridColumns: GridColumns;
  marginBottom: number;
  theme: ThemeConfig;
  selectedIds: string[];
  isSelectionMode: boolean;
  onSelectMedia: (item: MediaItem) => void;
  onToggleSelect: (id: string) => void;
  onLongPress?: (id: string) => void;
}> = React.memo(
  ({
    items,
    gridColumns,
    marginBottom,
    theme,
    selectedIds,
    isSelectionMode,
    onSelectMedia,
    onToggleSelect,
    onLongPress,
  }) => {
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressFiredRef = useRef(false);
    const longPressIdRef = useRef<string | null>(null);

    const startLongPress = (id: string) => {
      longPressFiredRef.current = false;
      longPressIdRef.current = id;
      longPressTimerRef.current = setTimeout(() => {
        longPressFiredRef.current = true;
        if (navigator.vibrate) navigator.vibrate(15);
        onLongPress?.(id);
      }, 450);
    };

    const cancelLongPress = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };

    // Tiles are opaque (a full-bleed thumbnail image always covers them), so
    // any blur behind them is never visible -- just wasted GPU work repeated
    // for every tile, every frame, while scrolling. Stripped here; the
    // header/bottom-nav/modals keep their blur since those are single
    // elements, not repeated dozens of times per screen.
    const cardClass = stripBackdropBlur(theme.cardClass);

    return (
      <div className={`grid ${gridClassMap[gridColumns]}`} style={{ marginBottom }}>
        {items.map((item) => {
          const isSelected = selectedIds.includes(item.id);
          return (
            <div
              key={item.id}
              onClick={() => {
                if (longPressFiredRef.current && longPressIdRef.current === item.id) {
                  longPressFiredRef.current = false;
                  return;
                }
                if (isSelectionMode) {
                  onToggleSelect(item.id);
                } else {
                  onSelectMedia(item);
                }
              }}
              onPointerDown={() => startLongPress(item.id)}
              onPointerUp={cancelLongPress}
              onPointerLeave={cancelLongPress}
              onPointerCancel={cancelLongPress}
              onContextMenu={(e) => e.preventDefault()}
              className={`group relative aspect-square rounded-xl overflow-hidden cursor-pointer border transition-transform duration-200 select-none ${cardClass} ${
                isSelected ? 'ring-2 ring-cyan-400 scale-[0.98]' : 'hover:scale-[1.01]'
              }`}
            >
              <LazyThumb
                item={item}
                alt={item.title}
                className="w-full h-full transition-transform duration-300 group-hover:scale-105"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 opacity-80 group-hover:opacity-90 transition-opacity" />

              {item.type === 'video' && (
                <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[10px] font-medium text-white">
                  <Play className="w-2.5 h-2.5 fill-white" />
                  <span>
                    {item.durationSec
                      ? `${Math.floor(item.durationSec / 60)}:${(item.durationSec % 60)
                          .toString()
                          .padStart(2, '0')}`
                      : 'Video'}
                  </span>
                </div>
              )}

              {item.isFavorite && (
                <div className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 backdrop-blur-md">
                  <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                </div>
              )}

              {isSelectionMode && (
                <div className="absolute top-1.5 left-1.5">
                  <CheckCircle2
                    className={`w-5 h-5 transition-transform ${
                      isSelected ? 'text-cyan-400 fill-cyan-400 scale-110' : 'text-white/60'
                    }`}
                  />
                </div>
              )}

              {gridColumns <= 3 && (
                <div className="absolute bottom-1 right-1.5 left-1.5 text-[9px] font-medium text-white/90 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.title}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }
);

const GroupHeader: React.FC<{ group: Group; theme: ThemeConfig }> = React.memo(({ group }) => (
  <div className="px-1 py-2 mb-2 flex items-center justify-between">
    <h2 className="text-xs font-bold uppercase tracking-widest text-cyan-400">{group.dateLabel}</h2>
    <div className="flex-1 h-[1px] bg-gradient-to-r from-cyan-900/60 to-transparent mx-3" />
    <span className="text-[10px] text-gray-500 font-mono">
      {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
    </span>
  </div>
));

const PhotoGridImpl: React.FC<Props> = ({
  mediaItems,
  gridColumns,
  theme,
  onSelectMedia,
  selectedIds,
  onToggleSelect,
  isSelectionMode,
  hasPermission = null,
  isScanning = false,
  onRequestPermission,
  onImportFiles,
  onLongPress,
}) => {
  const emptyFileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Group media by date (unchanged logic) ---
  const groupedMedia = useMemo<Group[]>(() => {
    const map = new Map<string, MediaItem[]>();
    mediaItems.forEach((item) => {
      const dateKey = item.date || 'Unknown Date';
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(item);
    });

    const sortedDates = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    return sortedDates.map((dateKey) => {
      let dateLabel = dateKey;
      if (dateKey === today) dateLabel = 'Today';
      else if (dateKey === yesterday) dateLabel = 'Yesterday';
      else {
        try {
          const d = new Date(dateKey + 'T00:00:00');
          dateLabel = d.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
        } catch {
          dateLabel = dateKey;
        }
      }
      return { dateLabel, items: map.get(dateKey)! };
    });
  }, [mediaItems]);

  // --- Flatten into virtualizable "blocks": one header block + N row blocks per group ---
  const blocks = useMemo<Block[]>(() => {
    const out: Block[] = [];
    groupedMedia.forEach((group) => {
      out.push({ key: `${group.dateLabel}__hdr`, type: 'header', group });
      const rowCount = Math.ceil(group.items.length / gridColumns);
      for (let r = 0; r < rowCount; r++) {
        const rowItems = group.items.slice(r * gridColumns, r * gridColumns + gridColumns);
        const isLastRow = r === rowCount - 1;
        out.push({
          key: `${group.dateLabel}__row${r}`,
          type: 'row',
          items: rowItems,
          marginBottom: isLastRow ? GROUP_BOTTOM_MARGIN : 0,
        });
      }
    });
    return out;
  }, [groupedMedia, gridColumns]);

  // --- Measure container width (for tile/row height) ---
  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rowHeight = useMemo(() => {
    if (!containerWidth) return 0;
    const gap = containerWidth >= SM_BREAKPOINT ? GRID_GAP_PX[gridColumns].sm : GRID_GAP_PX[gridColumns].base;
    const tileSize = (containerWidth - gap * (gridColumns - 1)) / gridColumns;
    return tileSize + gap;
  }, [containerWidth, gridColumns]);

  // --- Precompute cumulative offsets for every block ---
  const offsets = useMemo(() => {
    const arr: number[] = [0];
    let acc = 0;
    for (const block of blocks) {
      const h = block.type === 'header' ? HEADER_ROW_HEIGHT : rowHeight + block.marginBottom;
      acc += h;
      arr.push(acc);
    }
    return arr;
  }, [blocks, rowHeight]);

  const totalHeight = offsets[offsets.length - 1] || 0;

  // --- Track scroll position (the page/window scrolls; there's no nested
  // scroll container), throttled to one measurement per animation frame ---
  const [scrollState, setScrollState] = useState({ into: 0, viewport: 800 });
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setScrollState({ into: Math.max(0, -rect.top), viewport: window.innerHeight });
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // --- Work out which blocks are actually in (or near) view ---
  const { startIdx, endIdx, spacerTop, spacerBottom } = useMemo(() => {
    if (!containerWidth || blocks.length === 0) {
      // Not measured yet (first paint) -- render everything once so there's
      // no flash of empty content; this branch only ever runs for one frame.
      return { startIdx: 0, endIdx: blocks.length, spacerTop: 0, spacerBottom: 0 };
    }
    const overscan = scrollState.viewport * 1.5;
    const rangeStart = Math.max(0, scrollState.into - overscan);
    const rangeEnd = scrollState.into + scrollState.viewport + overscan;

    let start = 0;
    while (start < blocks.length && offsets[start + 1] <= rangeStart) start++;
    let end = start;
    while (end < blocks.length && offsets[end] < rangeEnd) end++;

    return {
      startIdx: start,
      endIdx: end,
      spacerTop: offsets[start],
      spacerBottom: totalHeight - offsets[end],
    };
  }, [blocks.length, offsets, scrollState, containerWidth, totalHeight]);

  const visibleBlocks = blocks.slice(startIdx, endIdx);

  if (isScanning) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] text-center p-6">
        <div className="w-10 h-10 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin mb-3" />
        <p className={`text-xs ${theme.textSecondaryClass}`}>Scanning device storage...</p>
      </div>
    );
  }

  if (hasPermission === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] text-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-3 text-cyan-400">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className={`text-base font-bold ${theme.textPrimaryClass}`}>Storage Permission Required</h3>
        <p className={`text-xs mt-1 max-w-sm ${theme.textSecondaryClass}`}>
          Grant access to your device's photos and videos to view your real media, albums, and memories in Neo Gallery.
        </p>
        {onRequestPermission && (
          <button
            onClick={onRequestPermission}
            className="mt-4 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-extrabold text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            Grant Storage Permission
          </button>
        )}
      </div>
    );
  }

  if (mediaItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-6 space-y-3">
        <input
          ref={emptyFileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0 && onImportFiles) {
              onImportFiles(e.target.files);
            }
          }}
          className="hidden"
        />
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-1">
          <ShieldAlert className="w-8 h-8 opacity-40 text-cyan-400" />
        </div>
        <h3 className={`text-base font-semibold ${theme.textPrimaryClass}`}>No Media Found</h3>
        <p className={`text-xs max-w-xs ${theme.textSecondaryClass}`}>
          Photos and videos stored on your device will appear here.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {onRequestPermission && (
            <button
              onClick={onRequestPermission}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 text-black font-extrabold text-xs transition-all cursor-pointer shadow-lg hover:bg-cyan-400"
            >
              Scan Device Storage
            </button>
          )}
          {onImportFiles && (
            <button
              onClick={() => emptyFileInputRef.current?.click()}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all border border-white/15 cursor-pointer"
            >
              Select Device Photos & Videos
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="pb-28">
      <div style={{ height: spacerTop }} aria-hidden="true" />
      {visibleBlocks.map((block) =>
        block.type === 'header' ? (
          <GroupHeader key={block.key} group={block.group} theme={theme} />
        ) : (
          <GridRow
            key={block.key}
            items={block.items}
            gridColumns={gridColumns}
            marginBottom={block.marginBottom}
            theme={theme}
            selectedIds={selectedIds}
            isSelectionMode={isSelectionMode}
            onSelectMedia={onSelectMedia}
            onToggleSelect={onToggleSelect}
            onLongPress={onLongPress}
          />
        )
      )}
      <div style={{ height: spacerBottom }} aria-hidden="true" />
    </div>
  );
};

export const PhotoGrid = React.memo(PhotoGridImpl);
