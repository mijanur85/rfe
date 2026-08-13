import React from 'react';
import { Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

// Generic "Coming Soon" popup used for any feature that is present in the UI
// but not wired up to real native functionality yet (e.g. Fingerprint/Biometric
// unlock, which needs a native BiometricPrompt implementation to actually work).
export const ComingSoonModal: React.FC<Props> = ({
  isOpen,
  onClose,
  title = 'Coming Soon',
  message = 'This feature is on its way and will be available in an upcoming update.',
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
          <Sparkles className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
          <p className="text-xs text-zinc-400 leading-relaxed px-2">{message}</p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 px-4 rounded-xl bg-cyan-500/90 hover:bg-cyan-500 text-black text-xs font-bold transition-colors shadow-lg shadow-cyan-950/50"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
