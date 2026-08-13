// ============================================================================
// PREMIUM MODAL (Google Play Billing Ready)
// Free vs Premium comparison table, mock upgrade toggle, and Play Store commission note.
// // TODO: Capacitor native swap point -> Swap with @capacitor-community/in-app-purchases
// ============================================================================

import React, { useState } from 'react';
import { X, Check, Crown, Sparkles, Shield, Zap, Infinity } from 'lucide-react';
import { BillingService } from '../services/billing';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onStatusChanged: () => void;
}

export const PremiumModal: React.FC<Props> = ({ isOpen, onClose, onStatusChanged }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const isCurrentlyPremium = BillingService.isPremium();
  const features = BillingService.getFeatureComparison();

  if (!isOpen) return null;

  const handlePurchase = async () => {
    setIsProcessing(true);
    await new Promise((res) => setTimeout(res, 800));
    await BillingService.purchasePremium();
    setIsProcessing(false);
    onStatusChanged();
    onClose();
  };

  const handleToggleOff = () => {
    BillingService.setPremiumStatus(false);
    onStatusChanged();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
      <div className="w-full max-w-lg bg-zinc-950 border border-amber-500/40 rounded-3xl p-6 text-white space-y-5 shadow-2xl relative my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Neo Gallery Pro Upgrade</h2>
              <p className="text-[10px] text-amber-400 font-mono">Google Play Billing Integrated</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hero banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/60 via-zinc-900 to-amber-950/60 border border-amber-500/30 text-center space-y-1">
          <p className="text-xs uppercase tracking-widest text-amber-400 font-bold">One-Time Lifetime Access</p>
          <p className="text-2xl font-black text-white">$2.99 USD <span className="text-xs font-normal text-zinc-400">or regional equivalent</span></p>
          <p className="text-[10px] text-zinc-400">Zero recurring subscriptions • Lifetime updates included</p>
        </div>

        {/* Free vs Premium Matrix */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">Plan Comparison Matrix</h3>
          <div className="border border-white/10 rounded-2xl overflow-hidden text-xs">
            <div className="grid grid-cols-3 bg-white/5 p-2.5 font-bold text-[11px] border-b border-white/10 text-zinc-300">
              <span>Feature</span>
              <span className="text-center text-zinc-400">Free Tier</span>
              <span className="text-center text-amber-400">Pro Upgrade</span>
            </div>

            {features.map((item, idx) => (
              <div
                key={idx}
                className={`grid grid-cols-3 p-2.5 items-center border-b border-white/5 ${
                  idx % 2 === 0 ? 'bg-zinc-900/40' : 'bg-transparent'
                }`}
              >
                <span className="font-medium text-[11px] text-zinc-200">{item.featureName}</span>
                <span className="text-center text-[10px] text-zinc-400">
                  {typeof item.freeTier === 'boolean' ? (
                    item.freeTier ? <Check className="w-3.5 h-3.5 text-emerald-400 mx-auto" /> : <X className="w-3.5 h-3.5 text-zinc-600 mx-auto" />
                  ) : (
                    item.freeTier
                  )}
                </span>
                <span className="text-center text-[10px] font-bold text-amber-300">
                  {typeof item.premiumTier === 'boolean' ? (
                    item.premiumTier ? <Check className="w-4 h-4 text-amber-400 mx-auto" /> : <X className="w-4 h-4 text-zinc-600 mx-auto" />
                  ) : (
                    item.premiumTier
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="space-y-2 pt-2">
          {isCurrentlyPremium ? (
            <div className="space-y-2">
              <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs text-center font-bold">
                ✓ Pro Status Active on this device!
              </div>
              <button
                onClick={handleToggleOff}
                className="w-full py-2.5 rounded-2xl bg-zinc-800 text-zinc-400 text-xs font-medium hover:bg-zinc-700"
              >
                Revert to Free Tier (Demo Toggle)
              </button>
            </div>
          ) : (
            <button
              onClick={handlePurchase}
              disabled={isProcessing}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 text-black font-extrabold text-xs flex items-center justify-center gap-2 hover:brightness-110 shadow-lg shadow-amber-500/20"
            >
              <Crown className="w-4 h-4 text-black" />
              <span>{isProcessing ? 'Processing Purchase...' : 'Unlock Neo Gallery Pro ($2.99)'}</span>
            </button>
          )}
        </div>

        {/* Play Store Notice */}
        <p className="text-[9px] text-center text-zinc-500 font-mono">
          Purchases processed via Google Play In-App Billing. Standard Play Store terms apply.
        </p>
      </div>
    </div>
  );
};
