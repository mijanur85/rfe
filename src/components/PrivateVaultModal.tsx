import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Unlock,
  X,
  RotateCcw,
} from 'lucide-react';
import { MediaItem, VaultConfig, ThemeConfig } from '../types';
import { LazyThumb } from './LazyThumb';

interface Props {
  vaultConfig: VaultConfig;
  vaultMedia: MediaItem[];
  onUpdateVaultConfig: (newConfig: VaultConfig) => void;
  onRestoreFromVault: (id: string) => void;
  onClose: () => void;
  theme: ThemeConfig;
  onSelectMedia: (item: MediaItem) => void;
}

export const PrivateVaultModal: React.FC<Props> = ({
  vaultMedia,
  onRestoreFromVault,
  onClose,
  theme,
  onSelectMedia,
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white" style={{ backgroundColor: '#000000' }}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-zinc-900 bg-black" style={{ backgroundColor: '#000000' }}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold flex items-center gap-1.5">
              <span>Private Vault</span>
              <Unlock className="w-3.5 h-3.5 text-emerald-400" />
            </h3>
            <p className="text-[11px] text-zinc-400 font-mono">
              {vaultMedia.length} Encrypted Items Protected
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 transition-colors flex items-center gap-1"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock & Exit</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-purple-500 text-white font-semibold text-xs shadow-xl animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Main Body - Unlocked Vault Gallery */}
      <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold">Encrypted Vault Media</h3>
              <p className="text-xs text-zinc-400">
                Protected and hidden from standard device media scanners
              </p>
            </div>

            <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold border border-purple-500/30">
              SHA-256 Protected
            </span>
          </div>

          {vaultMedia.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-dashed border-white/20 space-y-3 bg-zinc-950/40 my-8">
              <ShieldCheck className="w-12 h-12 text-purple-400 mx-auto opacity-50" />
              <h4 className="text-sm font-bold">Private Vault is Empty</h4>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                Add photos and videos to Private Vault from the photo viewer action menu.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {vaultMedia.map((item) => (
                <div
                  key={item.id}
                  className="relative aspect-square rounded-2xl overflow-hidden border border-purple-500/30 bg-zinc-950 group shadow-lg"
                >
                  <div onClick={() => onSelectMedia(item)} className="w-full h-full cursor-pointer hover:scale-105 transition-transform">
                    <LazyThumb item={item} alt={item.title} className="w-full h-full" />
                  </div>

                  {/* Restore Action */}
                  <button
                    type="button"
                    onClick={() => {
                      onRestoreFromVault(item.id);
                      triggerToast('Restored to main gallery');
                    }}
                    className="absolute bottom-2 right-2 p-2 rounded-xl bg-black/80 text-cyan-400 hover:bg-cyan-500 hover:text-black border border-cyan-400/40 text-xs font-bold flex items-center gap-1 shadow-lg backdrop-blur-md transition-all"
                    title="Restore to Main Gallery"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
