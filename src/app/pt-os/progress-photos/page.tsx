'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Plus, Loader2, Trash2 } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { useAsync } from '@/lib/use-async';
import { api, Client } from '@/lib/api';
import { Button } from '@/components/ui';

const PHOTO_TYPES = ['front', 'side', 'back', 'flexed', 'full_body'];

export default function ProgressPhotosPage() {
  const [clientId, setClientId] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoType, setPhotoType] = useState('front');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const clients = useAsync<any[]>(() => api.pt.clients().then(r => r.data), []);
  const photos = useAsync(() => api.progress.progressPhotos.list(clientId ? { client_id: clientId } : {}).then(r => r.data), [clientId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId || !photoUrl) return;
    setSaving(true);
    try {
      await api.progress.progressPhotos.create({
        client_id: clientId, photo_url: photoUrl,
        photo_type: photoType, notes: notes || undefined,
      });
      setPhotoUrl(''); setNotes('');
      photos.refetch();
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    await api.progress.progressPhotos.delete(id);
    photos.refetch();
  }

  return (
    <Guard>
      <AppShell>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[24px] p-8 sm:p-10 mb-6"
            style={{ background: 'linear-gradient(135deg, #374151 0%, #4b5563 50%, #6b7280 100%)', boxShadow: '0 20px 60px rgba(55,65,81,0.3)' }}>
            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <Camera size={16} style={{ color: '#d1d5db' }} />
                </div>
                <span className="text-[11px] font-[650] uppercase tracking-[0.08em]" style={{ color: '#d1d5db' }}>Progress Photos</span>
              </div>
              <h1 className="text-[32px] sm:text-[40px] font-[860] tracking-[-0.03em] leading-tight" style={{ color: '#ffffff' }}>
                Transformation Gallery
              </h1>
              <p className="mt-3 max-w-xl text-[14px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Upload before/after progress photos to visually track client transformations.
              </p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-[20px] p-6" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.95)' }}>
              <h2 className="text-[18px] font-[760] mb-5" style={{ color: 'rgb(15,23,42)' }}>Upload Photo</h2>
              <form onSubmit={handleSubmit} className="space-y-3">
                <select value={clientId} onChange={e => setClientId(e.target.value)}
                  className="w-full rounded-[12px] px-4 py-2.5 text-sm outline-none"
                  style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', color: 'rgb(15,23,42)' }}>
                  <option value="">Select client...</option>
                  {clients.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input required placeholder="Photo URL (data:image/... or https://...)" value={photoUrl} onChange={e => setPhotoUrl(e.target.value)}
                  className="w-full rounded-[12px] px-4 py-2.5 text-sm outline-none"
                  style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', color: 'rgb(15,23,42)' }} />
                <div className="flex gap-2">
                  {PHOTO_TYPES.map(pt => (
                    <button key={pt} type="button" onClick={() => setPhotoType(pt)}
                      className="flex-1 rounded-[10px] py-2 text-[11px] font-semibold capitalize transition-all"
                      style={{
                        background: photoType === pt ? 'rgba(99,102,241,0.1)' : 'rgba(0,0,0,0.03)',
                        border: `1.5px solid ${photoType === pt ? '#6366f1' : 'transparent'}`,
                        color: photoType === pt ? '#6366f1' : 'rgb(148,163,184)',
                      }}>{pt.replace(/_/g, ' ')}</button>
                  ))}
                </div>
                <textarea placeholder="Notes..." rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                  className="w-full rounded-[12px] px-4 py-2.5 text-sm outline-none resize-none"
                  style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }} />
                {photoUrl && photoUrl.startsWith('data:image/') && (
                  <img src={photoUrl} alt="Preview" className="w-full h-40 object-cover rounded-[12px]" />
                )}
                <Button type="submit" disabled={!clientId || !photoUrl || saving}
                  className="!w-full !rounded-[14px] !py-3 !font-[700]"
                  style={{ background: !clientId || !photoUrl || saving ? 'rgba(0,0,0,0.1)' : 'linear-gradient(135deg, #4b5563, #6b7280)', color: '#fff' }}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />} Upload
                </Button>
              </form>
            </div>

            <div className="rounded-[20px] p-6" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.95)' }}>
              <h2 className="text-[18px] font-[760] mb-5" style={{ color: 'rgb(15,23,42)' }}>Photo Gallery</h2>
              <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
                {(photos.data as any[] || []).map((p: any) => (
                  <div key={p.id} className="relative rounded-[12px] overflow-hidden group" style={{ aspectRatio: '3/4' }}>
                    <img src={p.photo_url} alt={p.photo_type} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                      <span className="text-white text-[10px] font-semibold capitalize">{p.photo_type} · {p.taken_at}</span>
                      <button onClick={() => handleDelete(p.id)} className="text-white/80 hover:text-red-400 mt-1">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
                {(!photos.data || (photos.data as any[]).length === 0) && (
                  <p className="col-span-2 text-center py-8 text-sm" style={{ color: 'rgb(148,163,184)' }}>No photos yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </Guard>
  );
}
