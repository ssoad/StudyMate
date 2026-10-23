import { useState, useEffect } from 'react';

// Store the deferred prompt outside React so it survives component remounts
let deferredPrompt: any = null;

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] ServiceWorker registered with scope:', registration.scope);
        })
        .catch((error) => {
          console.warn('[PWA] ServiceWorker registration failed:', error);
        });
    });

    window.addEventListener('beforeinstallprompt', (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      deferredPrompt = e;
      window.dispatchEvent(new Event('pwa-installable'));
    });

    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      console.log('[PWA] StudyMate AI installed successfully');
      window.dispatchEvent(new Event('pwa-installed'));
    });
  }
}

export function usePWA() {
  const [canInstall, setCanInstall] = useState<boolean>(!!deferredPrompt);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
  });
  const [isIOS] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
  });
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return navigator.onLine;
  });

  useEffect(() => {
    const handleInstallable = () => setCanInstall(true);
    const handleInstalled = () => {
      setCanInstall(false);
      setIsInstalled(true);
    };
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('pwa-installable', handleInstallable);
    window.addEventListener('pwa-installed', handleInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Recheck standalone status
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };
    mediaQuery.addEventListener('change', handleDisplayChange);

    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
      window.removeEventListener('pwa-installed', handleInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      mediaQuery.removeEventListener('change', handleDisplayChange);
    };
  }, []);

  const promptInstall = async (): Promise<'accepted' | 'dismissed' | 'manual_ios'> => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        deferredPrompt = null;
        setCanInstall(false);
        return 'accepted';
      }
      return 'dismissed';
    }

    if (isIOS && !isInstalled) {
      return 'manual_ios';
    }

    return 'dismissed';
  };

  return {
    canInstall,
    isInstalled,
    isIOS,
    isOnline,
    promptInstall
  };
}
