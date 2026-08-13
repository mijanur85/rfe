// ============================================================================
// PLAY STORE ASSETS MODAL
// Renders and allows export/download preview of Play Store Submission Graphic Assets:
// 1. Store Listing Icon (512x512)
// 2. Adaptive Icon Foreground + Background
// 3. Android Sizes (192, 144, 96, 72, 48)
// 4. Feature Graphic Banner (1024x500)
// ============================================================================

import React, { useState } from 'react';
import { X, Download, Image, Layers, Smartphone, Sparkles, Check } from 'lucide-react';
import { AppIcon } from './AppIcon';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export const PlayStoreAssetsModal: React.FC<Props> = ({ isOpen, onClose, onToast }) => {
  const [activeTab, setActiveTab] = useState<'icon' | 'adaptive' | 'feature'>('icon');

  if (!isOpen) return null;

  const handleDownloadAsset = (assetName: string) => {
    onToast(`Exported ${assetName} for Play Store submission`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
      <div className="w-full max-w-2xl bg-zinc-950 border border-cyan-500/30 rounded-3xl p-6 text-white space-y-5 shadow-2xl relative max-h-[85vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Image className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Google Play Store Submission Assets</h2>
              <p className="text-[10px] font-mono text-zinc-400">Play Console Ready Assets (512x512 & 1024x500)</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-2 shrink-0">
          <button
            onClick={() => setActiveTab('icon')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'icon' ? 'bg-cyan-400 text-black shadow-md' : 'bg-white/5 text-zinc-400 hover:text-white'
            }`}
          >
            Store Icon (512x512)
          </button>
          <button
            onClick={() => setActiveTab('adaptive')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'adaptive' ? 'bg-cyan-400 text-black shadow-md' : 'bg-white/5 text-zinc-400 hover:text-white'
            }`}
          >
            Adaptive Layers (Android 8+)
          </button>
          <button
            onClick={() => setActiveTab('feature')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'feature' ? 'bg-cyan-400 text-black shadow-md' : 'bg-white/5 text-zinc-400 hover:text-white'
            }`}
          >
            Feature Graphic (1024x500)
          </button>
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto pr-2 space-y-4 text-xs">
          {/* TAB 1: 512x512 Store Icon */}
          {activeTab === 'icon' && (
            <div className="space-y-4 text-center">
              <p className="text-zinc-400 text-xs">
                Hi-resolution 512x512 PNG app icon required by Google Play Console listing.
              </p>

              <div className="flex flex-col items-center justify-center p-6 bg-zinc-900 rounded-2xl border border-white/10">
                <div className="w-32 h-32 rounded-3xl shadow-2xl bg-zinc-950 p-4 border border-cyan-500/40 relative group flex items-center justify-center">
                  <AppIcon className="w-full h-full text-cyan-400" />
                </div>
                <p className="text-[11px] font-mono text-cyan-400 mt-3">icon_512x512.png • 32-bit PNG</p>
                <button
                  onClick={() => handleDownloadAsset('Store Icon (512x512)')}
                  className="mt-3 px-4 py-2 rounded-xl bg-cyan-400 text-black font-bold text-xs flex items-center gap-1.5 hover:bg-cyan-300"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download 512x512 Icon</span>
                </button>
              </div>

              {/* Android Mipmap Sizes Grid */}
              <div className="space-y-2 text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                  Generated Android Mipmap Sizes
                </span>
                <div className="grid grid-cols-5 gap-2 text-center">
                  {[
                    { size: 'xxxhdpi', px: '192x192' },
                    { size: 'xxhdpi', px: '144x144' },
                    { size: 'xhdpi', px: '96x96' },
                    { size: 'hdpi', px: '72x72' },
                    { size: 'mdpi', px: '48x48' },
                  ].map((item) => (
                    <div key={item.size} className="p-2 rounded-xl bg-white/5 border border-white/10 space-y-1">
                      <p className="font-bold text-[10px] text-white">{item.px}</p>
                      <p className="text-[9px] font-mono text-zinc-400">{item.size}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Adaptive Icon Layers */}
          {activeTab === 'adaptive' && (
            <div className="space-y-4">
              <p className="text-zinc-400 text-xs">
                Adaptive Icon XML layers required for Android 8.0+ (Oreo) squircle, circle, and teardrop shapes.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {/* Foreground Layer */}
                <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10 flex flex-col items-center justify-center space-y-3">
                  <span className="text-xs font-bold text-cyan-300">Foreground Layer (Vector Shape)</span>
                  <div className="w-24 h-24 rounded-full bg-zinc-950 p-4 border border-cyan-500/40 flex items-center justify-center">
                    <AppIcon className="w-16 h-16 text-cyan-400" />
                  </div>
                  <p className="text-[10px] font-mono text-zinc-400">ic_launcher_foreground.xml</p>
                  <button
                    onClick={() => handleDownloadAsset('Adaptive Foreground Layer')}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download Vector</span>
                  </button>
                </div>

                {/* Background Layer */}
                <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10 flex flex-col items-center justify-center space-y-3">
                  <span className="text-xs font-bold text-cyan-300">Background Layer (Dark Hex)</span>
                  <div className="w-24 h-24 rounded-full bg-[#050505] border border-zinc-700 flex items-center justify-center font-mono text-[10px] text-zinc-400">
                    #050505
                  </div>
                  <p className="text-[10px] font-mono text-zinc-400">ic_launcher_background.xml</p>
                  <button
                    onClick={() => handleDownloadAsset('Adaptive Background Layer')}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download XML</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Feature Graphic 1024x500 */}
          {activeTab === 'feature' && (
            <div className="space-y-4">
              <p className="text-zinc-400 text-xs">
                Official Google Play Store Listing Feature Graphic (1024x500 PNG) featured on app details page.
              </p>

              {/* 1024x500 Banner Graphic Preview */}
              <div className="w-full aspect-[1024/500] rounded-2xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-black border border-cyan-500/40 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl">
                {/* Visual Ambient Orbs */}
                <div className="absolute -top-10 -left-10 w-48 h-48 bg-cyan-500/20 rounded-full blur-2xl" />
                <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-purple-600/20 rounded-full blur-2xl" />

                {/* Center Content */}
                <div className="relative z-10 flex flex-col items-center space-y-2">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-950 border border-cyan-400/50 p-2 shadow-xl flex items-center justify-center">
                    <AppIcon className="w-full h-full text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-black tracking-tight text-white">Neo Gallery</h3>
                  <p className="text-xs font-mono text-cyan-300">Beautiful. Fast. Private.</p>
                  <span className="text-[9px] bg-cyan-950/80 border border-cyan-500/30 text-cyan-200 px-2 py-0.5 rounded-full font-mono">
                    Android 15 Optimized • Quick Share Ready
                  </span>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => handleDownloadAsset('Feature Graphic (1024x500)')}
                  className="px-5 py-2.5 rounded-xl bg-cyan-400 text-black font-bold text-xs flex items-center gap-2 hover:bg-cyan-300 shadow-lg"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Feature Graphic (1024x500)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-white/10 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
