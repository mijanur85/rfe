// ============================================================================
// PERMISSIONS DISCLOSURE MODAL (Google Play Store Compliant)
// Lists every permission requested once native, with plain-language explanations.
// No location, contacts, microphone, or SMS permissions are requested.
// ============================================================================

import React from 'react';
import { X, Shield, Camera, Fingerprint, Folder, CheckCircle, AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRequestPermission?: () => void;
}

export const PermissionsModal: React.FC<Props> = ({ isOpen, onClose, onRequestPermission }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
      <div className="w-full max-w-lg bg-zinc-950 border border-emerald-500/30 rounded-3xl p-6 text-white space-y-5 shadow-2xl relative my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Android Permissions Disclosure</h2>
              <p className="text-[10px] font-mono text-emerald-400">Google Play Store Compliant</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Permissions list */}
        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Folder className="w-4 h-4" />
              <span>Photos, Media & Storage Access</span>
            </div>
            <p className="text-zinc-300 text-[11px] pl-6">
              Allows Neo Gallery to index, render, compress, and organize your local photos and videos on your device screen.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <Camera className="w-4 h-4" />
              <span>Camera Access (Optional)</span>
            </div>
            <p className="text-zinc-300 text-[11px] pl-6">
              Used strictly when you choose to capture photos directly inside the encrypted Private Vault.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center gap-2 text-purple-400 font-bold">
              <Fingerprint className="w-4 h-4" />
              <span>Biometric Hardware / Fingerprint</span>
            </div>
            <p className="text-zinc-300 text-[11px] pl-6">
              Used to unlock your Private Vault securely via standard system hardware APIs. Biometric data never leaves Android security hardware.
            </p>
          </div>

          {/* Privacy Guarantee Banner */}
          <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 flex items-start gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-[11px]">Strict Privacy Guarantee</p>
              <p className="text-[10px] text-zinc-300">
                Neo Gallery <strong className="text-white">NEVER</strong> requests Location, Contacts, Microphone, SMS, or Phone State permissions.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between">
          {onRequestPermission && (
            <button
              onClick={() => {
                onRequestPermission();
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-cyan-500 text-black font-extrabold text-xs hover:bg-cyan-400 active:scale-95 transition-all cursor-pointer"
            >
              Grant Storage Access
            </button>
          )}
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 active:scale-95 transition-all ml-auto cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
