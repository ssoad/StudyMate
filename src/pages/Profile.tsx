import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { dataService, type UserProfile } from '../lib/dataService';
import { Button } from '../components/Button';
import { Card, CardBody } from '../components/Card';
import { Camera, User, Mail, Save, Loader2 } from 'lucide-react';
import { useToastStore } from '../store/toastStore';

export function Profile() {
  const { user, role } = useAuthStore();
  const { addToast } = useToastStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    bio: ''
  });

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      const { data } = await dataService.getUserProfile(user.id);
      if (data) {
        setProfile(data);
        setFormData({
          full_name: data.full_name || '',
          bio: data.bio || ''
        });
      }
      setLoading(false);
    }
    loadProfile();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await dataService.updateProfile(user.id, {
      full_name: formData.full_name,
      bio: formData.bio
    });
    
    if (error) {
      addToast('Failed to update profile', 'error');
    } else {
      addToast('Profile updated successfully', 'success');
      setProfile(prev => prev ? { ...prev, ...formData } : null);
    }
    setSaving(false);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;
    const file = e.target.files[0];
    
    setUploading(true);
    const { url, error } = await dataService.uploadAvatar(user.id, file);
    
    if (error || !url) {
      addToast('Failed to upload avatar', 'error');
      setUploading(false);
      return;
    }

    const { error: updateError } = await dataService.updateProfile(user.id, { avatar_url: url });
    if (updateError) {
      addToast('Failed to save avatar URL', 'error');
    } else {
      addToast('Avatar updated successfully', 'success');
      setProfile(prev => prev ? { ...prev, avatar_url: url } : null);
    }
    setUploading(false);
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[var(--primary)]" /></div>;
  }

  const userEmail = user?.email || 'Student';
  const initial = (profile?.full_name || userEmail).charAt(0).toUpperCase();

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold mb-2">Profile Setup</h1>
        <p className="text-[var(--text-muted)]">Manage your personal information and avatar.</p>
      </div>

      <Card glass>
        <CardBody className="p-8 flex flex-col md:flex-row gap-8 items-start">
          
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4 w-full md:w-auto">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-32 h-32 rounded-full overflow-hidden bg-[var(--surface-hover)] border-4 border-[var(--border)] shadow-xl flex items-center justify-center transition-all group-hover:border-[var(--primary)]">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-[var(--text-muted)]">{initial}</span>
                )}
                
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {uploading ? <Loader2 className="animate-spin text-white" /> : <Camera className="text-white" size={32} />}
                </div>
              </div>
            </div>
            
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleAvatarChange}
            />
            
            <div className="text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-1">Role</span>
              <span className="px-3 py-1 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full text-sm font-medium border border-[var(--primary)]/20">
                {role === 'admin' ? 'Administrator' : 'Student'}
              </span>
            </div>
          </div>

          {/* Form Section */}
          <div className="flex-1 flex flex-col gap-5 w-full">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                <Mail size={16} className="text-[var(--text-muted)]" /> Email Address
              </label>
              <input 
                type="email" 
                value={userEmail} 
                disabled 
                className="input-field opacity-60 cursor-not-allowed"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                <User size={16} className="text-[var(--text-muted)]" /> Full Name
              </label>
              <input 
                type="text" 
                name="full_name"
                value={formData.full_name} 
                onChange={handleChange}
                placeholder="e.g. John Doe"
                className="input-field focus:ring-2 focus:ring-[var(--primary)]/50"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                <User size={16} className="text-[var(--text-muted)]" /> Bio
              </label>
              <textarea 
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Tell us a bit about yourself..."
                rows={4}
                className="input-field resize-none focus:ring-2 focus:ring-[var(--primary)]/50"
              />
            </div>

            <div className="flex justify-end mt-4">
              <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">
                {saving ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
