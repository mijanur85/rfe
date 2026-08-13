// ============================================================================
// AD INTERSTITIAL COMPONENT (AdMob-Ready)
// Full-screen interstitial modal triggered between major navigation transitions.
// Respects rules: Never interrupts full-screen media viewing or active scrolling.
// Automatically hidden when isPremiumUser is true.
// // TODO: Capacitor native swap point -> @capacitor-community/admob showInterstitial()
// ============================================================================

import React, { useState, useEffect } from 'react';
import { X, ExternalLink, ShieldCheck, Sparkles } from 'lucide-react';
import { AdsService } from '../services/ads';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AdInterstitial: React.FC<Props> = ({ isOpen, onClose }) => {
  const [countdown, setCountdown] = useState(3);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(3);
      setCanSkip(false);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen || !AdsService.shouldShowAds()) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-3xl p-6 text-white space-y-5 shadow-2xl relative">
        {/* Top Header Badge */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-1.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping" />
            <span>AdMob Sponsored</span>
          </div>

          {canSkip ? (
            <button
              onClick={onClose}
              className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1"
            >
              <span>Skip Ad</span>
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-2 py-1 rounded-full">
              Skip in {countdown}s
            </span>
          )}
        </div>

        {/* Ad Graphic & Body */}
        <div className="space-y-3 text-center">
          <div className="w-full h-40 bg-gradient-to-tr from-cyan-950 via-purple-950 to-zinc-900 rounded-2xl border border-cyan-500/30 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <ShieldCheck className="w-12 h-12 text-cyan-400 mb-2 animate-bounce" />
            <h3 className="text-base font-bold text-white">Ultra VPN Express</h3>
            <p className="text-[11px] text-zinc-400">High-Speed Anonymous Mobile Security</p>
          </div>

          <p className="text-xs text-zinc-300">
            Protect your online privacy with 1-click encrypted Android browsing.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-2 pt-2">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onClose();
            }}
            className="w-full py-3 rounded-2xl bg-cyan-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 hover:bg-cyan-300 shadow-lg"
          >
            <span>Install Free App</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
