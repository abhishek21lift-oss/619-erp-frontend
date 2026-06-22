'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { http } from '@/lib/http';
import { useToast } from '@/lib/toast';
import Image from 'next/image';
import {
  Camera, Save, User, Mail, Phone, MapPin,
  Calendar, Briefcase, Edit3, Check, Loader2
} from 'lucide-react';

interface ProfileForm {
  name: string;
  email: string;
  phone: string;
  role: string;
  location: string;
  bio: string;
}

function Field({
  label, name, value, onChange, type = 'text', placeholder = '', disabled = false
}: {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  type?: string; placeholder?: string; disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12px] font-medium text-white/45 uppercase tracking-wide">{label}</label>
      <input
        name={name} type={type} value={value} onChange={onChange}
        disabled={disabled} placeholder={placeholder}
        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[14px] text-white placeholder:text-white/20
          focus:outline-none focus:border-[#FF2E63]/60 focus:bg-white/[0.06] focus:ring-2 focus:ring-[#FF2E63]/10
          disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
      />
    </div>
  );
}

export default function ProfileOverviewPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState<ProfileForm>({
    name: '', email: '', phone: '', role: '', location: '', bio: ''
  });
  const [original, setOriginal] = useState<ProfileForm>(form);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isDirty = JSON.stringify(form) !== JSON.stringify(original);

  useEffect(() => {
    async function load() {
      try {
        const data = await http<any>('/api/profile/me');
        const filled: ProfileForm = {
          name: data.name ?? user?.name ?? '',
          email: data.email ?? user?.email ?? '',
          phone: data.phone ?? '',
          role: data.role ?? user?.role ?? '',
          location: data.location ?? '',
          bio: data.bio ?? '',
        };
        setForm(filled);
        setOriginal(filled);
        setAvatarUrl(data.avatarUrl ?? null);
      } catch {
        const filled: ProfileForm = {
          name: user?.name ?? '',
          email: user?.email ?? '',
          phone: '',
          role: user?.role ?? '',
          location: '',
          bio: '',
        };
        setForm(filled);
        setOriginal(filled);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await http('/api/profile/me', { method: 'PUT', body: JSON.stringify(form) });
      setOriginal(form);
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => setForm(original);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await http<{ avatarUrl: string }>('/api/profile/avatar', { method: 'POST', body: fd });
      setAvatarUrl(res.avatarUrl);
      toast.success('Avatar updated');
    } catch {
      toast.error('Avatar upload failed');
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  const initials = (form.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="bg-[#141414] border border-white/[0.07] rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-white/[0.07]" />
            <div className="space-y-2">
              <div className="h-4 w-36 bg-white/[0.07] rounded-lg" />
              <div className="h-3 w-24 bg-white/[0.04] rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-32">
      {/* Avatar card */}
      <div className="bg-[#141414] border border-white/[0.07] rounded-2xl p-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FF2E63] to-[#7C3AED] flex items-center justify-center text-[22px] font-bold overflow-hidden">
              {avatarUrl
                ? <Image src={avatarUrl} alt={form.name} fill className="object-cover" sizes="80px" />
                : initials
              }
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#FF2E63] flex items-center justify-center shadow-lg hover:bg-[#E11D48] transition-all active:scale-95"
            >
              {avatarUploading
                ? <Loader2 size={13} className="animate-spin text-white" />
                : <Camera size={13} className="text-white" />
              }
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div>
            <h2 className="text-[17px] font-semibold text-white">{form.name || 'Your Name'}</h2>
            <p className="text-[13px] text-white/45 mt-0.5">{form.role || 'Role not set'}</p>
            <p className="text-[12px] text-white/30 mt-0.5">{form.email}</p>
          </div>
        </div>
      </div>

      {/* Personal info */}
      <div className="bg-[#141414] border border-white/[0.07] rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <User size={14} className="text-[#FF2E63]" />
          <h3 className="text-[14px] font-semibold text-white">Personal Information</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full Name" name="name" value={form.name} onChange={handleChange} placeholder="Your full name" />
          <Field label="Email" name="email" value={form.email} onChange={handleChange} type="email" placeholder="you@example.com" disabled />
          <Field label="Phone" name="phone" value={form.phone} onChange={handleChange} placeholder="+91 9999999999" />
          <Field label="Location" name="location" value={form.location} onChange={handleChange} placeholder="City, Country" />
        </div>
        <div className="space-y-1.5">
          <label className="block text-[12px] font-medium text-white/45 uppercase tracking-wide">Bio</label>
          <textarea
            name="bio" value={form.bio} onChange={handleChange}
            rows={3} placeholder="A short bio about yourself..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[14px] text-white placeholder:text-white/20
              focus:outline-none focus:border-[#FF2E63]/60 focus:bg-white/[0.06] focus:ring-2 focus:ring-[#FF2E63]/10
              transition-all resize-none"
          />
        </div>
      </div>

      {/* Work info */}
      <div className="bg-[#141414] border border-white/[0.07] rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Briefcase size={14} className="text-[#FF2E63]" />
          <h3 className="text-[14px] font-semibold text-white">Work Details</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Role / Title" name="role" value={form.role} onChange={handleChange} placeholder="e.g. Head Trainer" disabled />
        </div>
        <p className="text-[12px] text-white/30">Role is managed by your administrator.</p>
      </div>

      {/* Sticky save bar */}
      {isDirty && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl
            bg-[#141414]/90 border border-white/10 backdrop-blur-xl shadow-2xl"
          style={{ animation: 'slideUp 0.28s cubic-bezier(0.16,1,0.3,1)' }}
        >
          <span className="w-2 h-2 rounded-full bg-[#FF2E63] animate-pulse" />
          <span className="text-[13px] text-white/70">Unsaved changes</span>
          <button onClick={handleDiscard} className="px-3 py-1.5 rounded-lg text-[12px] text-white/40 hover:text-white/70 hover:bg-white/5 transition-all">
            Discard
          </button>
          <button
            onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#FF2E63] hover:bg-[#E11D48] text-[13px] text-white font-medium transition-all active:scale-95 disabled:opacity-60"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateX(-50%) translateY(16px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
