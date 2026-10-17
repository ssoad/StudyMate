/**
 * YouTube Utility Helper
 * Extracts video IDs, playlist IDs, and builds responsive embed URLs.
 */

export function extractPlaylistId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // Direct playlist ID format
  if (/^(PL|UU|FL|RD|OLAK5uy_)[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return trimmed;
  }

  // URL containing list=
  const match = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }

  return null;
}

export function extractVideoId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // If it's already an 11-char YouTube video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Handle formats:
  // - https://www.youtube.com/watch?v=VIDEO_ID
  // - https://youtu.be/VIDEO_ID
  // - https://www.youtube.com/embed/VIDEO_ID
  // - https://www.youtube.com/shorts/VIDEO_ID
  const patterns = [
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export function getYouTubeEmbedUrl({
  videoId,
  playlistId,
  autoplay = false,
}: {
  videoId?: string | null;
  playlistId?: string | null;
  autoplay?: boolean;
}): string {
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    enablejsapi: '1',
    origin: typeof window !== 'undefined' ? window.location.origin : '',
  });

  if (autoplay) {
    params.set('autoplay', '1');
  }

  if (videoId) {
    if (playlistId) {
      params.set('list', playlistId);
    }
    return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
  }

  if (playlistId) {
    params.set('listType', 'playlist');
    params.set('list', playlistId);
    return `https://www.youtube-nocookie.com/embed/videoseries?${params.toString()}`;
  }

  return '';
}

export function getYouTubeThumbnailUrl(videoId?: string | null): string {
  if (!videoId) {
    return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80';
  }
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Format duration helper
 */
export function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '10:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
