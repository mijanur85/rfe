import React from 'react';
import { Search, Trash2 } from 'lucide-react';
import { ThemeConfig } from '../types';
import { AppIcon } from './AppIcon';

interface Props {
  theme: ThemeConfig;
  gridColumns: number;
  onChangeGridColumns: (cols: number) => void;
  onOpenSearch: () => void;
  onOpenRecycleBin: () => void;
  isPremium: boolean;
  deletedItemsCount: number;
}

const AppHeaderImpl: React.FC<Props> = ({
  theme,
  gridColumns,
  onChangeGridColumns,
  onOpenSearch,
  onOpenRecycleBin,
  isPremium,
  deletedItemsCount,
}) => {
  const columnOptions = [2, 3, 4, 5];

  return (
    // theme.headerClass already carries the right blur/opacity per theme --
    // it's the same pairing bottomNavClass uses, so the header now matches
    // the bottom nav's glass look exactly instead of forcing an extra
    // blur-xl on top of it.
    <header className={`sticky top-0 z-20 px-3 py-2 ${theme.headerClass}`}>
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        {/* Brand identity */}
        <div className="flex items-center gap-2">
          <AppIcon size="sm" glow={true} />
          <div className="flex items-center gap-1.5">
            <span className={`text-sm font-black tracking-tight uppercase ${theme.id === 'pure-white' ? 'text-zinc-900' : 'text-white'}`}>
              NEO GALLERY
            </span>
            {isPremium && (
              <span className="px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider rounded bg-gradient-to-r from-amber-400 to-yellow-500 text-black uppercase shadow-[0_0_8px_rgba(251,191,36,0.5)]">
                PRO
              </span>
            )}
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          {/* Column Density Toggle */}
          <div className="flex items-center bg-black/50 border border-gray-800 rounded-xl p-0.5 text-xs backdrop-blur-md shadow-[0_0_15px_rgba(0,243,255,0.08)]">
            {columnOptions.map((cols) => (
              <button
                key={cols}
                onClick={() => onChangeGridColumns(cols)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  gridColumns === cols
                    ? 'bg-cyan-400 text-black shadow-[0_0_10px_rgba(0,243,255,0.4)]'
                    : 'text-gray-400 hover:text-white'
                }`}
                title={`${cols} Grid Columns`}
              >
                {cols}
              </button>
            ))}
          </div>

          {/* Search Button - Glass Circle from Design */}
          <button
            onClick={onOpenSearch}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-gray-800 flex items-center justify-center bg-black/50 backdrop-blur-md shadow-[0_0_15px_rgba(0,243,255,0.1)] hover:border-cyan-500 transition-colors text-cyan-400"
            title="Search photos & videos"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Recycle Bin Shortcut */}
          <button
            onClick={onOpenRecycleBin}
            className={`p-2 rounded-xl border transition-all relative ${theme.buttonClass}`}
            title="Recycle Bin"
          >
            <Trash2 className="w-4 h-4 text-zinc-400" />
            {deletedItemsCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[14px] text-center">
                {deletedItemsCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export const AppHeader = React.memo(AppHeaderImpl);
