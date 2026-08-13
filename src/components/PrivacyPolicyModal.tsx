// ============================================================================
// PRIVACY POLICY MODAL (Google Play Store Compliant)
// Real readable in-app policy covering local photo access, AdMob, Google Play Billing,
// user data deletion rights, contact: bullseyemijan@gmail.com
// ============================================================================

import React from 'react';
import { X, ShieldCheck, Mail, Calendar, Trash2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
      <div className="w-full max-w-2xl bg-zinc-950 border border-cyan-500/30 rounded-3xl p-6 text-white space-y-5 shadow-2xl relative max-h-[85vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Privacy Policy</h2>
              <p className="text-[10px] font-mono text-zinc-400">Last Updated: August 7, 2026</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Policy Body */}
        <div className="overflow-y-auto pr-2 space-y-4 text-xs text-zinc-300 leading-relaxed font-sans scrollbar-thin">
          <section className="space-y-1">
            <h3 className="text-sm font-bold text-cyan-300">1. Overview & Data Ownership</h3>
            <p>
              Neo Gallery ("we", "our", or "the App") is designed with a private-first architecture. Your photos, videos, media metadata, and private vault content are stored locally on your device. We do not upload, transmit, or backup your personal media to any external cloud server or remote database.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="text-sm font-bold text-cyan-300">2. Device Permissions & Access</h3>
            <p>The App requests standard device permissions strictly necessary for gallery operations:</p>
            <ul className="list-disc pl-5 space-y-1 text-zinc-400">
              <li><strong className="text-zinc-200">Storage / Media Access:</strong> To index, view, compress, and organize your local photos and videos.</li>
              <li><strong className="text-zinc-200">Camera Access:</strong> Optional permission used solely for taking photos directly into your encrypted Private Vault.</li>
              <li><strong className="text-zinc-200">Biometric / Fingerprint:</strong> Used locally via standard system APIs to unlock your Private Vault. Biometric data is processed exclusively by Android OS security hardware and never leaves your device.</li>
            </ul>
          </section>

          <section className="space-y-1">
            <h3 className="text-sm font-bold text-cyan-300">3. Advertising (Google AdMob)</h3>
            <p>
              Free versions of Neo Gallery integrate Google AdMob to serve non-intrusive advertisements. AdMob may collect pseudonymous identifiers such as your Android Advertising ID, general device information, and coarse network location to serve relevant ads according to Google's privacy disclosures. Pro users who purchase the in-app upgrade have all AdMob integrations disabled completely.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="text-sm font-bold text-cyan-300">4. In-App Purchases (Google Play Billing)</h3>
            <p>
              When purchasing the Pro upgrade, transactions are processed securely through Google Play Billing. We do not store or process your financial card details or payment credentials.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="text-sm font-bold text-cyan-300">5. Data Deletion & User Rights</h3>
            <p>
              You maintain total control over your data. You can clear all cached thumbnails, application settings, and Private Vault records at any time by navigating to Android Settings &gt; Apps &gt; Neo Gallery &gt; Storage &gt; Clear Data, or by selecting "Reset App Data" inside the App settings.
            </p>
          </section>

          <section className="space-y-1 p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/20">
            <h3 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              <span>Contact for Privacy Inquiries</span>
            </h3>
            <p className="text-[11px] text-zinc-300">
              If you have any questions regarding this Privacy Policy, please contact us at:
              <br />
              <a href="mailto:bullseyemijan@gmail.com" className="text-cyan-400 underline font-mono">
                bullseyemijan@gmail.com
              </a>
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-white/10 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-400 text-black font-bold text-xs hover:bg-cyan-300"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
