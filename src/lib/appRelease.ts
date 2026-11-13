import { useEffect, useState } from 'react';

/** Written next to the APK on the server by the release script. */
interface AndroidRelease {
  versionName: string;
  versionCode: number;
  sizeBytes: number;
  sha256?: string;
  updatedAt?: string;
}

export type Platform = 'android' | 'ios' | 'desktop';

export const APK_URL = '/downloads/studymate.apk';

export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'android';
  // iPadOS reports itself as Mac; touch support tells them apart.
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  return 'desktop';
}

/** Loads the published Android release info, or null when no APK is published. */
export function useAndroidRelease(enabled = true) {
  const [release, setRelease] = useState<AndroidRelease | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetch('/downloads/android.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.versionName === 'string') setRelease(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return release;
}

