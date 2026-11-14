import { supabase } from './supabase';

/**
 * Uploads a file to this app's own server (/api/storage/upload, signed-in users only)
 * and returns its public URL. The old Supabase Storage buckets don't exist on the
 * self-hosted server, so every upload goes through here.
 */
export async function uploadFile(file: File): Promise<{ url: string | null; error: Error | null }> {
  try {
    const { data } = await supabase!.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return { url: null, error: new Error('Sign in to upload files') };
    const res = await fetch('/api/storage/upload', {
      method: 'POST',
      headers: {
        'x-filename': encodeURIComponent(file.name),
        'Content-Type': file.type || 'application/octet-stream',
        Authorization: `Bearer ${token}`,
      },
      body: file,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.url) {
      return { url: null, error: new Error(json.error || `Upload failed (${res.status})`) };
    }
    return { url: json.url as string, error: null };
  } catch (e) {
    return { url: null, error: e instanceof Error ? e : new Error('Upload failed') };
  }
}
