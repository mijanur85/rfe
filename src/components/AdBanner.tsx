// ============================================================================
// AD BANNER COMPONENT (AdMob-Ready)
// Positioned above Bottom Navigation or inside list streams.
// Automatically hidden when isPremiumUser is true.
// // TODO: Capacitor native swap point -> @capacitor-community/admob banner view
// ============================================================================

import React, { useState } from 'react';
import { ExternalLink, Info, X } from 'lucide-react';
import { AdsService } from '../services/ads';

export const AdBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);

  if (!AdsService.shouldShowAds() || dismissed) return null;

  return (
    <div className="w-full bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 border-t border-b border-white/10 px-3 py-1.5 flex items-center justify-between text-white text-xs select-none">
      <div className="flex items-center gap-2 min-w-0">
        <span className="bg-amber-500 text-black text-[9px] font-black px-1.2 py-0.5 rounded tracking-wider uppercase shrink-0">
          Ad
        </span>
        <div className="truncate">
          <p className="text-[11px] font-bold text-zinc-100 truncate">Fast & Secure Cloud Storage Pro</p>
          <p className="text-[9px] text-zinc-400 truncate">Store photos with end-to-end encryption</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="px-2 py-1 rounded-lg bg-cyan-500 text-black font-bold text-[10px] flex items-center gap-1 hover:bg-cyan-400"
        >
          <span>Install</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-zinc-500 hover:text-zinc-300"
          title="Close Ad"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
