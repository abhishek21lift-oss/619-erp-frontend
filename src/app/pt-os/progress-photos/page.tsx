'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import {
  Camera, Loader2, Trash2, AlertCircle, ChevronDown, X, Maximize2,
  RefreshCw, GitCompare,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Button } from '@/components/ui';
import ClientPicker from '@/components/pt-os/shared/ClientPicker';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import PhotoCropModal from '@/components/pt-os/PhotoCropModal';

interface ProgressPhoto {
  id: string; client_id: string; photo_url: string;
  photo_type: 'front' | 'side' | 'back' | 'flexed' | 'full_body' | 'other';
  taken_at: string; notes?: string | null;
}

const CARD_TYPES: { type: 'front' | 'side' | 'back'; label: string }[] = [
  { type: 'front', label: 'Front Photo' },
  { type: 'side', label: 'Side Photo' },
  { type: 'back', label: 'Back Photo' },
];

const GUIDELINES = [
  'Wear similar clothing every time',
  'Stand straight, relaxed posture',
  'Neutral, even lighting',
  'Neutral, uncluttered background',
  'Bare feet',
  'Camera at chest height',
  'Same distance from the camera every time',
];

export default function ProgressPhotosPage() {
  return (
    <Guard>
      <AppShell>
        <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#F59E0B' }} /></div>}>
          <ProgressPhotosContent />
        </Suspense>
      </AppShell>
    </Guard>
  );
}

function ProgressPhotosContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const clientId = sp.get('client_id') || '';

  if (!clientId) return <ClientPicker title="Progress Photos" icon={<Camera size={20} color="#fff" />} basePath="/pt-os/progress-photos" />;
  return <PhotoStudio key={clientId} clientId={clientId} router={router} />;
}

/* ─────────────────────────────────────────────────────── PHOTO STUDIO */
interface PhotoStudioProps { clientId: string; router: ReturnType<typeof useRouter>; }

function PhotoStudio({ clientId }: PhotoStudioProps) {
  const { toast } = useToast();
  const [clientName, setClientName] = useState('');
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [cropModalType, setCropModalType] = useState<'front' | 'side' | 'back' | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [clientRes, photosRes] = await Promise.all([
        api.pt.client(clientId) as Promise<{ data?: Record<string, unknown> }>,
        api.progress.progressPhotos.list({ client_id: clientId }) as Promise<{ data?: ProgressPhoto[] }>,
      ]);
      const c = clientRes?.data;
      if (!c) { setLoadError('Client not found.'); setLoading(false); return; }
      setClientName(String(c.name ?? ''));
      setPhotos(Array.isArray(photosRes?.data) ? photosRes.data : []);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load client.');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { loadData(); }, [loadData]);

  const latestByType = useMemo(() => {
    const out: Partial<Record<'front' | 'side' | 'back', ProgressPhoto>> = {};
    for (const t of ['front', 'side', 'back'] as const) {
      const matches = photos.filter((p) => p.photo_type === t).sort((a, b) => b.taken_at.localeCompare(a.taken_at));
      if (matches[0]) out[t] = matches[0];
    }
    return out;
  }, [photos]);

  const sortedHistory = useMemo(() => [...photos].sort((a, b) => b.taken_at.localeCompare(a.taken_at)), [photos]);

  const handleUpload = async (type: 'front' | 'side' | 'back', dataUrl: string) => {
    setUploading(true);
    try {
      await api.progress.progressPhotos.create({ client_id: clientId, photo_url: dataUrl, photo_type: type });
      toast.success(`${type[0].toUpperCase()}${type.slice(1)} photo saved.`);
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save photo.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this photo?')) return;
    try {
      await api.progress.progressPhotos.delete(id);
      toast.success('Photo deleted.');
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete photo.');
    }
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#F59E0B' }} /></div>;
  }
  if (loadError) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <AlertCircle size={32} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
        <p className="text-[14px] font-[600] text-slate-600">{loadError}</p>
        <Button variant="outline" className="mt-4" onClick={loadData}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl py-6 space-y-6">
      <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[24px] p-8 sm:p-10"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: 'var(--bg-subtle)' }}>
            <Camera size={16} style={{ color: 'var(--text-muted)' }} />
          </div>
          <span className="text-[11px] font-[650] uppercase tracking-[0.08em]" style={{ color: 'var(--text-disabled)' }}>Progress Photos</span>
        </div>
        <h1 className="text-[26px] sm:text-[32px] font-[860] tracking-[-0.03em] leading-tight" style={{ color: 'var(--text-primary)' }}>
          {clientName}&apos;s Photo Capture Studio
        </h1>
      </m.div>

      {/* Photo Guidelines */}
      <div className="rounded-[20px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <button type="button" onClick={() => setGuidelinesOpen((v) => !v)} className="flex w-full items-center justify-between px-6 py-4">
          <span className="text-[13.5px] font-[700] text-slate-700">Photo Guidelines</span>
          <ChevronDown size={16} style={{ color: '#94a3b8', transform: guidelinesOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
        {guidelinesOpen && (
          <div className="px-6 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {GUIDELINES.map((g) => (
              <div key={g} className="flex items-start gap-2 text-[12.5px] text-slate-500">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: '#F59E0B' }} />
                {g}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Front / Side / Back capture cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {CARD_TYPES.map((c) => {
          const photo = latestByType[c.type];
          return (
            <div key={c.type} className="rounded-[20px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}>
              <div
                className="relative flex items-center justify-center cursor-pointer"
                style={{ aspectRatio: '3/4', background: photo ? '#0f172a' : 'var(--bg-subtle)' }}
                onClick={() => photo ? setPreview(photo.photo_url) : setCropModalType(c.type)}
              >
                {photo ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.photo_url} alt={c.label} className="h-full w-full object-cover" />
                    <div className="absolute top-2 right-2 flex gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setPreview(photo.photo_url); }}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 hover:bg-black/70"
                      >
                        <Maximize2 size={12} color="#fff" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center px-4">
                    <span className="text-[28px]">📸</span>
                    <p className="text-[12px] font-[600] text-slate-400">Tap to capture</p>
                  </div>
                )}
              </div>
              <div className="p-3.5">
                <p className="text-[13px] font-[760] text-slate-900 mb-2">{c.label}</p>
                {photo ? (
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setCropModalType(c.type)} className="text-[12px] font-[640]" style={{ color: '#F59E0B' }}>
                      Replace
                    </button>
                    <button type="button" onClick={() => handleDelete(photo.id)} className="text-[12px] font-[640] text-slate-400 flex items-center gap-1">
                      <Trash2 size={11} /> Delete
                    </button>
                  </div>
                ) : (
                  <Button className="!w-full !py-2 !text-[12px]" iconLeft={<Camera size={12} />} onClick={() => setCropModalType(c.type)} style={{ background: '#0f172a', color: '#fff' }}>
                    Capture
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {sortedHistory.length >= 2 && <BeforeAfterCompare photos={sortedHistory} />}

      {/* Gallery / history */}
      <div className="rounded-[20px] p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h2 className="text-[16px] font-[760] mb-4" style={{ color: 'var(--text-primary)' }}>All Photos</h2>
        {sortedHistory.length === 0 ? (
          <p className="text-center py-8 text-[13px]" style={{ color: 'var(--text-disabled)' }}>No photos yet.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {sortedHistory.map((p) => (
              <div key={p.id} className="relative rounded-[12px] overflow-hidden group cursor-pointer" style={{ aspectRatio: '3/4' }} onClick={() => setPreview(p.photo_url)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.photo_url} alt={p.photo_type} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                  <span className="text-white text-[10px] font-semibold capitalize">{p.photo_type} · {p.taken_at}</span>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }} className="text-white/80 hover:text-red-400 mt-1 self-start">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PhotoCropModal
        open={cropModalType !== null}
        title={cropModalType ? `${cropModalType[0].toUpperCase()}${cropModalType.slice(1)} Photo` : 'Photo'}
        cropShape="rect" aspect={3 / 4} maxDim={1000}
        onClose={() => setCropModalType(null)}
        onConfirm={(dataUrl) => { if (cropModalType) handleUpload(cropModalType, dataUrl); setCropModalType(null); }}
      />

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6" onClick={() => setPreview(null)}>
          <button className="absolute top-5 right-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" onClick={() => setPreview(null)}>
            <X size={16} color="#fff" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Full screen preview" className="max-h-full max-w-full object-contain rounded-[12px]" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {uploading && (
        <div className="fixed above-bottom-nav right-6 z-50 flex items-center gap-2 rounded-[12px] px-4 py-3 shadow-lg" style={{ background: '#0f172a', color: '#fff' }}>
          <Loader2 size={14} className="animate-spin" /> Saving photo...
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────── BEFORE/AFTER SLIDER */
function BeforeAfterCompare({ photos }: { photos: ProgressPhoto[] }) {
  const [beforeId, setBeforeId] = useState(photos[photos.length - 1].id);
  const [afterId, setAfterId] = useState(photos[0].id);
  const [split, setSplit] = useState(50);

  const before = photos.find((p) => p.id === beforeId) ?? photos[photos.length - 1];
  const after = photos.find((p) => p.id === afterId) ?? photos[0];

  return (
    <div className="rounded-[20px] p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2.5 mb-4">
        <GitCompare size={16} style={{ color: '#94a3b8' }} />
        <h2 className="text-[16px] font-[760]" style={{ color: 'var(--text-primary)' }}>Before / After Comparison</h2>
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <label className="flex items-center gap-2 text-[12.5px] font-[600] text-slate-500">
          Before
          <select value={beforeId} onChange={(e) => setBeforeId(e.target.value)} className="rounded-[8px] px-2 py-1.5 text-[12px]" style={{ border: '1px solid #d1d5db' }}>
            {photos.map((p) => <option key={p.id} value={p.id}>{p.taken_at} · {p.photo_type}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-[12.5px] font-[600] text-slate-500">
          After
          <select value={afterId} onChange={(e) => setAfterId(e.target.value)} className="rounded-[8px] px-2 py-1.5 text-[12px]" style={{ border: '1px solid #d1d5db' }}>
            {photos.map((p) => <option key={p.id} value={p.id}>{p.taken_at} · {p.photo_type}</option>)}
          </select>
        </label>
      </div>

      <div className="relative mx-auto overflow-hidden rounded-[16px] select-none" style={{ aspectRatio: '3/4', maxWidth: 360, background: '#0f172a' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={after.photo_url} alt="After" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${split}%` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={before.photo_url} alt="Before" className="h-full object-cover" style={{ width: `${100 * (100 / split)}%`, maxWidth: 'none' }} draggable={false} />
        </div>
        <div className="absolute top-0 bottom-0" style={{ left: `${split}%`, width: 2, background: '#F59E0B', transform: 'translateX(-1px)' }} />
        <span className="absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-[700]" style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}>Before</span>
        <span className="absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-[700]" style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}>After</span>
      </div>

      <div className="mt-4 flex items-center gap-3 max-w-[360px] mx-auto">
        <RefreshCw size={13} style={{ color: '#94a3b8' }} />
        <input
          type="range" min={1} max={99} value={split}
          onChange={(e) => setSplit(Number(e.target.value))}
          className="flex-1 accent-[#F59E0B]"
        />
      </div>
    </div>
  );
}
