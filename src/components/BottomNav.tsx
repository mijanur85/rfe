import React from 'react';
import { Image, FolderHeart, Sparkles, Settings, ShieldCheck, Wand2 } from 'lucide-react';
import { ThemeConfig } from '../types';

export type MainTab = 'photos' | 'albums' | 'memories' | 'settings';

interface Props {
  activeTab: MainTab;
  onChangeTab: (tab: MainTab) => void;
  theme: ThemeConfig;
  onOpenVault: () => void;
  onOpenCleaner: () => void;
}

const BottomNavImpl: React.FC<Props> = ({
  activeTab,
  onChangeTab,
  theme,
  onOpenVault,
  onOpenCleaner,
}) => {
  const tabs: { id: MainTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'photos', label: 'Photos', icon: Image },
    { id: 'albums', label: 'Albums', icon: FolderHeart },
    { id: 'memories', label: 'Memories', icon: Sparkles },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-30 max-w-md mx-auto sm:max-w-xl md:max-w-2xl lg:max-w-4xl px-3 pb-3 pt-1 ${theme.bottomNavClass}`}>
      {/* Quick floating action pills (Cleaner & Vault) above nav */}
      <div className="flex items-center justify-between px-2 pb-2 text-xs">
        <button
          onClick={onOpenCleaner}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border transition-all ${
            theme.id === 'cyber-neon'
              ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40 hover:bg-cyan-900/80 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
              : theme.id === 'luxury-gold'
              ? 'bg-amber-950/60 text-amber-300 border-amber-500/40 hover:bg-amber-900/60'
              : 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
          }`}
        >
          <Wand2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>Smart Cleaner</span>
        </button>

        <button
          onClick={onOpenVault}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border transition-all ${
            theme.id === 'cyber-neon'
              ? 'bg-purple-950/80 text-purple-300 border-purple-500/40 hover:bg-purple-900/80 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
              : theme.id === 'luxury-gold'
              ? 'bg-stone-900 text-amber-400 border-amber-500/40'
              : 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Private Vault 🔒</span>
        </button>
      </div>

      <nav className="flex items-center justify-around py-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`flex flex-col items-center space-y-1 group transition-all duration-200 ${
                isActive
                  ? 'text-cyan-500 scale-105'
                  : theme.id === 'pure-white'
                  ? 'text-zinc-600 hover:text-zinc-900'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              <div
                className={`p-2.5 sm:p-3 rounded-2xl transition-all ${
                  isActive
                    ? 'bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_15px_rgba(0,243,255,0.2)] text-cyan-500'
                    : theme.id === 'pure-white'
                    ? 'text-zinc-600 group-hover:text-zinc-900'
                    : 'text-gray-500 group-hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-tighter">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Android Gesture Navigation Home Bar */}
      <div className="w-32 h-1 bg-zinc-500/50 hover:bg-cyan-400 rounded-full mx-auto mt-2 mb-0.5 shadow-sm transition-colors cursor-pointer" title="Android Gesture Home Bar" />
    </div>
  );
};

export const BottomNav = React.memo(BottomNavImpl);
