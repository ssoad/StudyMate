import { useState } from 'react';
import { Download, X, Share, PlusSquare, Smartphone, Zap, Bell, CheckCircle2 } from 'lucide-react';
import { usePWA } from '../lib/pwa';
import { useToastStore } from '../store/toastStore';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InstallAppModal({ isOpen, onClose }: InstallAppModalProps) {
  const { isInstalled, isIOS, canInstall, promptInstall } = usePWA();
  const { addToast } = useToastStore();
  const [installing, setInstalling] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    setInstalling(true);
    try {
      const result = await promptInstall();
      if (result === 'accepted') {
        addToast('StudyMate AI is installing to your device!', 'success');
        onClose();
      } else if (result === 'manual_ios') {
        // Modal will stay open to show iOS instructions
      }
    } catch {
      addToast('Could not trigger install prompt.', 'info');
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[var(--surface)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-6 overflow-hidden z-10 animate-slide-up">
        {/* Grab bar for mobile */}
        <div className="w-12 h-1.5 rounded-full bg-[var(--border)] mx-auto sm:hidden" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 p-0.5 shadow-md flex items-center justify-center shrink-0">
              <img src="/icon-192.png" alt="StudyMate Icon" className="w-full h-full rounded-[14px] object-cover" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[var(--text-main)] font-[var(--font-heading)] leading-snug">
                Install StudyMate AI
              </h3>
              <p className="text-xs text-[var(--text-muted)]">Official Learning Companion App</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Status / Perks */}
        {isInstalled ? (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
            <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
            <h4 className="font-bold text-sm text-[var(--text-main)]">App Already Installed!</h4>
            <p className="text-xs text-[var(--text-muted)]">
              StudyMate AI is running in standalone app mode on your device.
            </p>
          </div>
        ) : isIOS ? (
          /* iOS Safari Specific Guide */
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-3">
              <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider block">
                How to install on iPhone & iPad
              </span>
              <ol className="text-xs text-[var(--text-main)] space-y-2.5 list-decimal list-inside">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-500 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                  <span>Tap the <strong className="text-indigo-400">Share</strong> button <Share size={14} className="inline mx-1 text-indigo-400" /> at the bottom or top of Safari.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-500 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                  <span>Scroll down and select <strong className="text-indigo-400">Add to Home Screen</strong> <PlusSquare size={14} className="inline mx-1 text-indigo-400" />.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-500 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                  <span>Tap <strong className="text-indigo-400">Add</strong> in the top-right corner. Enjoy full-screen learning!</span>
                </li>
              </ol>
            </div>
          </div>
        ) : (
          /* Android / Chrome / Edge Native Install */
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2.5">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)]">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0">
                  <Zap size={18} />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-[var(--text-main)] block">Lightning Fast & Offline</span>
                  <span className="text-[11px] text-[var(--text-muted)]">Instant page loading & offline notes caching</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)]">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                  <Smartphone size={18} />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-[var(--text-main)] block">Native Fullscreen App</span>
                  <span className="text-[11px] text-[var(--text-muted)]">Zero browser URL bars or navigation clutter</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)]">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 shrink-0">
                  <Bell size={18} />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-[var(--text-main)] block">Real-time Chimes & Alerts</span>
                  <span className="text-[11px] text-[var(--text-muted)]">Instant enrollment and study plan alerts</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleInstallClick}
              disabled={installing}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all transform active:scale-[0.98]"
            >
              <Download size={18} />
              <span>{canInstall ? 'Install to Home Screen' : 'Add App Shortcut'}</span>
            </button>
          </div>
        )}

        <div className="text-center pt-1 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors py-1"
          >
            Continue in Browser
          </button>
        </div>
      </div>
    </div>
  );
}
