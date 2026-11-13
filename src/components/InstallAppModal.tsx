import { useState } from 'react';
import { CheckCircle2, Download, Monitor, PlusSquare, Share, Smartphone, X } from 'lucide-react';
import { usePWA } from '../lib/pwa';
import { useToastStore } from '../store/toastStore';
import { buttonClass } from './Button';
import { APK_URL, detectPlatform, useAndroidRelease, type Platform } from '../lib/appRelease';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export function InstallAppModal({ isOpen, onClose }: InstallAppModalProps) {
  const { isInstalled, canInstall, promptInstall } = usePWA();
  const { addToast } = useToastStore();
  const [installing, setInstalling] = useState(false);
  const [platform] = useState<Platform>(detectPlatform);
  const release = useAndroidRelease(isOpen);

  if (!isOpen) return null;

  const installWebApp = async () => {
    setInstalling(true);
    try {
      const result = await promptInstall();
      if (result === 'accepted') {
        addToast('StudyMate is being added to your device', 'success');
        onClose();
      }
    } catch {
      addToast("Your browser didn't offer an install prompt", 'info');
    } finally {
      setInstalling(false);
    }
  };

  const apkMeta = release ? `Version ${release.versionName} · ${formatSize(release.sizeBytes)}` : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="install-title">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md space-y-5 rounded-t-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 sm:rounded-[var(--radius-lg)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/icon-192.png" alt="" className="h-11 w-11 rounded-xl" />
            <div>
              <h3 id="install-title" className="text-base font-semibold">Get the StudyMate app</h3>
              <p className="text-xs text-[var(--text-muted)]">
                {platform === 'android' ? 'For your Android phone' : platform === 'ios' ? 'For your iPhone or iPad' : 'For this computer'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="btn btn-ghost btn-sm !p-1.5">
            <X size={18} />
          </button>
        </div>

        {isInstalled ? (
          <div className="flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--surface-hover)] p-4 text-sm">
            <CheckCircle2 size={20} className="shrink-0 text-emerald-500" />
            <span>You're already using the installed app.</span>
          </div>
        ) : platform === 'android' ? (
          <div className="space-y-3">
            {release ? (
              <>
                <a href={APK_URL} download className={buttonClass('primary', 'lg', 'w-full')}>
                  <Download size={18} /> Download for Android
                </a>
                <p className="text-center text-xs text-[var(--text-muted)]">{apkMeta}</p>
                <ol className="list-decimal space-y-1 pl-5 text-xs text-[var(--text-muted)]">
                  <li>Open the downloaded file.</li>
                  <li>If asked, allow your browser to install apps, then tap Install.</li>
                </ol>
                <p className="text-xs text-[var(--text-muted)]">
                  The Android app adds background playback, picture-in-picture and offline video cache.
                </p>
              </>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">The Android app isn't available to download yet.</p>
            )}
            <button type="button" onClick={installWebApp} disabled={installing || !canInstall} className={buttonClass('ghost', 'sm', 'w-full')}>
              {canInstall ? 'Or add the web app to your home screen' : 'Web app install not offered by this browser'}
            </button>
          </div>
        ) : platform === 'ios' ? (
          <div className="space-y-3 text-sm">
            <p className="text-[var(--text-muted)]">Add StudyMate to your home screen from Safari:</p>
            <ol className="space-y-2">
              <li className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-hover)] text-xs font-semibold">1</span>
                Tap <Share size={15} className="inline" /> Share in Safari's toolbar.
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-hover)] text-xs font-semibold">2</span>
                Choose <PlusSquare size={15} className="inline" /> Add to Home Screen.
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-hover)] text-xs font-semibold">3</span>
                Tap Add.
              </li>
            </ol>
          </div>
        ) : (
          <div className="space-y-3">
            <button type="button" onClick={installWebApp} disabled={installing || !canInstall} className={buttonClass('primary', 'lg', 'w-full')}>
              <Monitor size={18} /> {canInstall ? 'Install on this computer' : 'Install not offered by this browser'}
            </button>
            {!canInstall && (
              <p className="text-xs text-[var(--text-muted)]">Use Chrome or Edge to install StudyMate as a desktop app.</p>
            )}
            {release && (
              <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                <Smartphone size={18} className="shrink-0 text-[var(--text-muted)]" />
                <div className="flex-1 text-xs">
                  <div className="font-medium">Android phone?</div>
                  <div className="text-[var(--text-muted)]">Open this site on your phone, or download the APK. {apkMeta}</div>
                </div>
                <a href={APK_URL} download className={buttonClass('secondary', 'sm')}>
                  APK
                </a>
              </div>
            )}
          </div>
        )}

        <div className="border-t border-[var(--border)] pt-3 text-center">
          <button type="button" onClick={onClose} className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-main)]">
            Continue in browser
          </button>
        </div>
      </div>
    </div>
  );
}
