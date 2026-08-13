import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Replaces window.confirm() -- the browser's native popup doesn't match the
// app's own look at all (plain system dialog, no theme, breaks immersion).
// This renders as an in-app modal instead, same visual language as the
// rest of the app's modals (Delete confirmation, Coming Soon, etc.).
export const ConfirmDialog: React.FC<Props> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onCancel}
    >
      <div
        className={`w-full max-w-sm bg-zinc-950 border rounded-3xl p-5 text-white space-y-4 ${
          danger ? 'border-red-500/30' : 'border-zinc-800'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
              danger ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold">{title}</h3>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">{message}</p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            className="py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              danger ? 'bg-red-500 hover:bg-red-400 text-white' : 'bg-cyan-500/90 hover:bg-cyan-500 text-black'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
