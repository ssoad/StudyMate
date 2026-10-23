import { useState, useEffect } from 'react';
import { WifiOff, CheckCircle2 } from 'lucide-react';
import { usePWA } from '../lib/pwa';

export function OfflineIndicator() {
  const { isOnline } = usePWA();
  const [showRestored, setShowRestored] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowRestored(false);
    } else if (wasOffline) {
      setShowRestored(true);
      const timer = setTimeout(() => {
        setShowRestored(false);
        setWasOffline(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (isOnline && !showRestored) {
    return null;
  }

  return (
    <aside aria-label="Network status banner" className="fixed top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-slide-down max-w-sm w-[92%] sm:w-auto">
      {!isOnline ? (
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-amber-500/90 text-white font-semibold text-xs shadow-xl backdrop-blur-md border border-amber-400/40 pointer-events-auto justify-center">
          <WifiOff size={15} className="shrink-0 animate-pulse" />
          <span>Offline Mode — Cached lessons & notes remain available.</span>
        </div>
      ) : showRestored ? (
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600/95 text-white font-semibold text-xs shadow-xl backdrop-blur-md border border-emerald-400/40 pointer-events-auto justify-center animate-fade-in">
          <CheckCircle2 size={15} className="shrink-0" />
          <span>Connection restored — You're back online!</span>
        </div>
      ) : null}
    </aside>
  );
}
