import React, { useEffect, useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Button } from '../components/Button';
import { dataService, type UserProfile } from '../lib/dataService';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';

const NAME_MAX = 60;
const BIO_MAX = 300;
const AVATAR_MAX_MB = 5;

/** Tell the navbar (and anything else showing the profile) to reload it. */
function announceProfileChange() {
  window.dispatchEvent(new Event('profile-updated'));
}

export function Profile() {
  const { user, role } = useAuthStore();
  const addToast = useToastStore((s) => s.addToast);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    if (!user) return;
    dataService.getUserProfile(user.id).then(({ data }) => {
      const p = data as UserProfile | null;
      setProfile(p);
      setName(p?.full_name ?? '');
      setBio(p?.bio ?? '');
      setLoading(false);
    });
  }, [user]);

  const dirty = (profile?.full_name ?? '') !== name.trim() || (profile?.bio ?? '') !== bio.trim();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const cleanName = name.trim();
    if (cleanName.length < 2) {
      addToast('Enter your name (at least 2 characters)', 'error');
      return;
    }
    setSaving(true);
    const updates = { full_name: cleanName, bio: bio.trim() };
    const { error } = await dataService.updateProfile(user.id, updates);
    setSaving(false);
    if (error) {
      addToast(`Couldn't save: ${error.message}`, 'error');
      return;
    }
    setProfile((p) => (p ? { ...p, ...updates } : p));
    setName(updates.full_name);
    setBio(updates.bio);
    announceProfileChange();
    addToast('Profile saved', 'success');
  };

  const changeAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) {
      addToast('Choose an image (JPG, PNG or WebP)', 'error');
      return;
    }
    if (file.size > AVATAR_MAX_MB * 1024 * 1024) {
      addToast(`Image must be under ${AVATAR_MAX_MB} MB`, 'error');
      return;
    }
    setUploading(true);
    const { url, error } = await dataService.uploadAvatar(user.id, file);
    if (error || !url) {
      setUploading(false);
      addToast(`Couldn't upload: ${error?.message ?? 'unknown error'}`, 'error');
      return;
    }
    const { error: updateError } = await dataService.updateProfile(user.id, { avatar_url: url });
    setUploading(false);
    if (updateError) {
      addToast(`Couldn't save photo: ${updateError.message}`, 'error');
      return;
    }
    setProfile((p) => (p ? { ...p, avatar_url: url } : p));
    announceProfileChange();
    addToast('Photo updated', 'success');
  };

  const removeAvatar = async () => {
    if (!user) return;
    const { error } = await dataService.updateProfile(user.id, { avatar_url: '' });
    if (error) addToast(`Couldn't remove photo: ${error.message}`, 'error');
    else {
      setProfile((p) => (p ? { ...p, avatar_url: '' } : p));
      announceProfileChange();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  const initials =
    (name || user?.email || '?')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || '?';

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Profile</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">How you appear on the leaderboard, in discussions and on plans you share.</p>
      </header>

      <form onSubmit={save} className="space-y-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-[var(--primary-soft)] text-2xl font-semibold text-[var(--primary)]"
            aria-label="Change photo"
            disabled={uploading}
          >
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : initials}
            <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              {uploading ? <Loader2 className="animate-spin" size={22} /> : <Camera size={22} />}
            </span>
          </button>
          <div className="min-w-0 space-y-1">
            <p className="truncate font-medium">{profile?.full_name || 'Add your name'}</p>
            <p className="text-sm text-[var(--text-muted)]">{role === 'admin' ? 'Admin' : 'Student'} · {profile?.points ?? 0} points</p>
            <div className="flex gap-1">
              <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? 'Uploading…' : 'Change photo'}
              </Button>
              {profile?.avatar_url && (
                <Button size="sm" variant="ghost" onClick={removeAvatar} disabled={uploading}>
                  Remove
                </Button>
              )}
            </div>
          </div>
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" ref={fileInputRef} onChange={changeAvatar} />
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Name</span>
          <input className="input" value={name} maxLength={NAME_MAX} autoComplete="name" placeholder="Your full name" onChange={(e) => setName(e.target.value)} required />
        </label>

        <label className="block space-y-1.5">
          <span className="flex justify-between text-sm font-medium">
            Bio <span className="font-normal text-[var(--text-muted)]">{bio.length}/{BIO_MAX}</span>
          </span>
          <textarea className="input min-h-[96px]" value={bio} maxLength={BIO_MAX} placeholder="What you're preparing for" onChange={(e) => setBio(e.target.value)} />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Email</span>
          <input className="input cursor-not-allowed opacity-70" value={user?.email ?? ''} disabled />
          <span className="block text-xs text-[var(--text-muted)]">Your email is your sign-in and can't be changed here.</span>
        </label>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving || !dirty}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
