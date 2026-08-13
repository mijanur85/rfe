// ============================================================================
// TERMS & CONDITIONS MODAL (Google Play Store Compliant)
// Real readable in-app terms page covering usage terms, Pro purchases, liabilities,
// Saudi Arabia governing law.
// ============================================================================

import React from 'react';
import { X, FileText, Scale } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
      <div className="w-full max-w-2xl bg-zinc-950 border border-purple-500/30 rounded-3xl p-6 text-white space-y-5 shadow-2xl relative max-h-[85vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Terms & Conditions</h2>
              <p className="text-[10px] font-mono text-zinc-400">Governing Law: Saudi Arabia</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Terms Body */}
        <div className="overflow-y-auto pr-2 space-y-4 text-xs text-zinc-300 leading-relaxed font-sans scrollbar-thin">
          <section className="space-y-1">
            <h3 className="text-sm font-bold text-purple-300">1. Agreement to Terms</h3>
            <p>
              By installing or using Neo Gallery ("Application"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please uninstall the Application immediately.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="text-sm font-bold text-purple-300">2. License & Acceptable Use</h3>
            <p>
              We grant you a non-exclusive, non-transferable, revocable license to use the Application for personal, non-commercial purposes on Android devices. You agree not to reverse engineer, decompile, distribute, or create derivative works of the Application.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="text-sm font-bold text-purple-300">3. In-App Purchases & Refunds</h3>
            <p>
              Pro Lifetime upgrades are processed via Google Play In-App Billing. Refunds for digital purchases are handled strictly according to Google Play's official refund policies. To request a refund, please submit your request directly through your Google Play Account order history.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="text-sm font-bold text-purple-300">4. Disclaimer of Liability & Backups</h3>
            <p>
              Neo Gallery operates locally on your hardware. While we implement robust PIN and pattern security for Private Vault storage, you are solely responsible for maintaining backup copies of your photos and videos. We are not liable for accidental data loss caused by hardware failure, factory resets, or forgotten security PINs.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="text-sm font-bold text-purple-300">5. Age Requirement & Jurisdiction</h3>
            <p>
              You must be at least 13 years old to use this Application. These Terms are governed by and construed in accordance with the laws of Saudi Arabia, without regard to its conflict of law provisions.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-white/10 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-500 text-white font-bold text-xs hover:bg-purple-400"
          >
            Accept & Continue
          </button>
        </div>
      </div>
    </div>
  );
};
