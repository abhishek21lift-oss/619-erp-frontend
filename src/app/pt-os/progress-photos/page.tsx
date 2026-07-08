'use client';
import { useState } from 'react';
import { m } from 'framer-motion';
import { Camera, Plus, Loader2, Trash2 } from 'lucide-react';
import Image from 'next/image';
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

  const pageError = clients.error || photos.error;

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

  if (pageError && !clients.loading && !photos.loading) {
    return (
      <Guard>
        <AppShell>
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, padding: 40 }}>
              <div style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 20,
                padding: '40px 32px',
                textAlign: 'center',
                maxWidth: 400,
                boxShadow: '0 4px 24px rgba(15,23,42,0.06)',
              }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
                  Unable to Load Data
                </h2>
                <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 20px' }}>
                  This feature is not available yet or there was a problem loading the page. Please try again later.
                </p>
                <button
                  onClick={() => { clients.refetch(); photos.refetch(); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '10px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg, #4b5563, #6b7280)',
                    color: '#fff', fontSize: 13, fontWeight: 700,
                    boxShadow: '0 4px 12px rgba(75,85,99,0.25)',
                  }}
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </AppShell>
      </Guard>
    );
  }

  return (
    <Guard>
      <AppShell>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 pb-6"
            style={{ borderBottom: '1px solid #f3f4f6' }}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: '#F3F4F6' }}>
                <Camera size={16} style={{ color: '#6b7280' }} />
              </div>
              <span className="text-[11px] font-[650] uppercase tracking-[0.08em]" style={{ color: '#9ca3af' }}>Progress Photos</span>
            </div>
            <h1 className="text-[32px] sm:text-[40px] font-[860] tracking-[-0.03em] leading-tight" style={{ color: '#111827' }}>
              Transformation Gallery
            </h1>
            <p className="mt-3 max-w-xl text-[14px]" style={{ color: '#6b7280' }}>
              Upload before/after progress photos to visually track client transformations.
            </p>
          </m.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-[20px] p-6" style={{ background: '#fff', border: '1px solid #e5e7eb' }}>
              <h2 className="text-[18px] font-[760] mb-5" style={{ color: '#111827' }}>Upload Photo</h2>
              <form onSubmit={handleSubmit} className="space-y-3">
                <select value={clientId} onChange={e => setClientId(e.target.value)}
                  className="w-full rounded-[12px] px-4 py-2.5 text-sm outline-none"
                  style={{ background: '#F9FAFB', border: '1px solid #d1d5db', color: '#111827' }}>
                  <option value="">Select client...</option>
                  {clients.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input required placeholder="Photo URL (data:image/... or https://...)" value={photoUrl} onChange={e => setPhotoUrl(e.target.value)}
                  className="w-full rounded-[12px] px-4 py-2.5 text-sm outline-none"
                  style={{ background: '#F9FAFB', border: '1px solid #d1d5db', color: '#111827' }} />
                <div className="flex gap-2">
                  {PHOTO_TYPES.map(pt => (
                    <button key={pt} type="button" onClick={() => setPhotoType(pt)}
                      className="flex-1 rounded-[10px] py-2 text-[11px] font-semibold capitalize transition-all"
                      style={{
                        background: photoType === pt ? 'rgba(99,102,241,0.1)' : '#F9FAFB',
                        border: `1.5px solid ${photoType === pt ? '#6366f1' : '#e5e7eb'}`,
                        color: photoType === pt ? '#6366f1' : '#6b7280',
                      }}>{pt.replace(/_/g, ' ')}</button>
                  ))}
                </div>
                <textarea placeholder="Notes..." rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                  className="w-full rounded-[12px] px-4 py-2.5 text-sm outline-none resize-none"
                  style={{ background: '#F9FAFB', border: '1px solid #d1d5db', color: '#111827' }} />
                {photoUrl && photoUrl.startsWith('data:image/') && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoUrl} alt="Preview" className="w-full h-40 object-cover rounded-[12px]" />
                  </>
                )}
                <Button type="submit" disabled={!clientId || !photoUrl || saving}
                  className="!w-full !rounded-[14px] !py-3 !font-[700]"
                  style={{ background: !clientId || !photoUrl || saving ? '#e5e7eb' : 'linear-gradient(135deg, #4b5563, #6b7280)', color: '#fff' }}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />} Upload
                </Button>
              </form>
            </div>

            <div className="rounded-[20px] p-6" style={{ background: '#fff', border: '1px solid #e5e7eb' }}>
              <h2 className="text-[18px] font-[760] mb-5" style={{ color: '#111827' }}>Photo Gallery</h2>
              <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
                {(photos.data as any[] || []).map((p: any) => (
                  <div key={p.id} className="relative rounded-[12px] overflow-hidden group" style={{ aspectRatio: '3/4' }}>
                    <Image src={p.photo_url} alt={p.photo_type} fill className="object-cover" sizes="(max-width:768px) 50vw,33vw" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                      <span className="text-white text-[10px] font-semibold capitalize">{p.photo_type} · {p.taken_at}</span>
                      <button onClick={() => handleDelete(p.id)} className="text-white/80 hover:text-red-400 mt-1">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
                {(!photos.data || (photos.data as any[]).length === 0) && (
                  <p className="col-span-2 text-center py-8 text-sm" style={{ color: '#9ca3af' }}>No photos yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </Guard>
  );
}
