'use client';
/**
 * Member — Progress photos.
 *
 * The member's photo timeline: photos their trainer took at the studio and
 * photos they add from their phone. A before/after slider compares their
 * first and latest photo of the same pose.
 *
 * Privacy is the point of the design, not an afterthought:
 *   • Photos are served through /uploads, which lets only this member and
 *     their studio's trainer read them (the same check as a PAR-Q).
 *   • The phone photo is re-encoded before upload, which strips EXIF —
 *     including GPS location — and shrinks it to ~300 KB.
 *   • Members can delete what they uploaded; a trainer's photos are the
 *     trainer's record and stay.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Camera, ImagePlus, Loader2, Lock, Trash2, X } from 'lucide-react';
import Guard from '@/components/Guard';
import MemberShell from '@/components/member/MemberShell';
import {
  Card, EASE, EmptyState, LoadError, MC, PageSkeleton, PageTitle, Section, longDate,
} from '@/components/member/MemberUI';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import type { MePhoto, MePhotoType } from '@/lib/api';
import { compressImage } from '@/lib/compress-image';
import { IMAGE_FORMATS, MB, checkFile } from '@/lib/forms/files';
import { palette, rgba } from '@/lib/palette';
import { useToast } from '@/lib/toast';

export default function MemberPhotosPage() {
  return (
    <Guard role="member">
      <MemberShell>
        <PhotosBody />
      </MemberShell>
    </Guard>
  );
}

const POSES: { value: MePhotoType; label: string }[] = [
  { value: 'front', label: 'Front' },
  { value: 'side', label: 'Side' },
  { value: 'back', label: 'Back' },
  { value: 'other', label: 'Other' },
];
const POSE_LABEL: Record<string, string> = {
  front: 'Front', side: 'Side', back: 'Back', flexed: 'Flexed', full_body: 'Full body', other: 'Other',
};
const day = (v: string) => String(v).slice(0, 10);

function PhotosBody() {
  const [photos, setPhotos] = useState<MePhoto[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState<MePhoto | null>(null);

  const load = useCallback(() => {
    api.me.photos().then((r) => setPhotos(r.data)).catch(() => setFailed(true));
  }, []);
  useEffect(() => { load(); }, [load]);

  const title = (
    <PageTitle icon={<Camera size={20} />} title="Progress photos"
      sub="Only you and your trainer can see these" />
  );
  if (failed) return <>{title}<LoadError what="photos" /></>;
  if (!photos) return <PageSkeleton />;

  const addButton = (
    <button type="button" onClick={() => setAdding(true)}
      className="mb-4 flex h-12 w-full items-center justify-center gap-2 rounded-[13px] text-[14px] font-[750] text-white"
      style={{ background: MC.primary }}>
      <ImagePlus size={17} aria-hidden /> Add a photo
    </button>
  );

  return (
    <>
      {title}
      <AnimatePresence initial={false}>
        {adding ? (
          <AddPhoto key="add" onCancel={() => setAdding(false)}
            onAdded={(p) => { setPhotos((prev) => [p, ...(prev ?? [])]); setAdding(false); }} />
        ) : <m.div key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{addButton}</m.div>}
      </AnimatePresence>

      {photos.length === 0 ? (
        <EmptyState icon={<Camera size={18} />} title="Start your photo timeline"
          body="Take a front, side and back photo today in the same spot and light. In a few weeks, compare them side by side." />
      ) : (
        <>
          <Compare photos={photos} />
          <Timeline photos={photos} onOpen={setViewing} />
        </>
      )}

      <Viewer photo={viewing} onClose={() => setViewing(null)}
        onDeleted={(id) => { setPhotos((prev) => prev?.filter((p) => p.id !== id) ?? prev); setViewing(null); }} />
    </>
  );
}

/* ── Add ─────────────────────────────────────────────────────────────────── */

function AddPhoto({ onCancel, onAdded }: { onCancel: () => void; onAdded: (p: MePhoto) => void }) {
  const { toast } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [pose, setPose] = useState<MePhotoType>('front');
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<'reading' | 'uploading' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setBusy('reading');
    try {
      // The shared rules: the bytes must be a JPG, PNG or WebP, whatever the
      // name says. 25 MB is generous for a camera original; it is shrunk next.
      const check = await checkFile(file, { formats: IMAGE_FORMATS, maxBytes: 25 * MB });
      if (!check.ok) { setError(check.message); return; }
      const small = await compressImage(file);
      setBlob(small);
      setPreview(URL.createObjectURL(small));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'This photo could not be read.');
    } finally {
      setBusy(null);
    }
  };

  const upload = async () => {
    if (!blob) return;
    setBusy('uploading');
    setError(null);
    try {
      const saved = (await api.me.uploadPhoto(blob, pose)).data;
      toast.success('Photo added');
      onAdded(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed. Try again.');
      setBusy(null);
    }
  };

  return (
    <m.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25, ease: EASE }} className="mb-4">
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[14px] font-[780]" style={{ color: MC.ink }}>New photo</p>
          <button type="button" onClick={onCancel} aria-label="Cancel"
            className="grid h-8 w-8 place-items-center rounded-full" style={{ color: MC.muted }}>
            <X size={16} aria-hidden />
          </button>
        </div>

        <fieldset>
          <legend className="mb-2 text-[11px] font-[720] uppercase tracking-[0.1em]" style={{ color: MC.muted }}>Pose</legend>
          <div className="grid grid-cols-4 gap-2">
            {POSES.map((p) => (
              <button key={p.value} type="button" onClick={() => setPose(p.value)} aria-pressed={pose === p.value}
                className="h-10 rounded-[11px] text-[13px] font-[720] transition-colors"
                style={pose === p.value
                  ? { background: MC.primary, color: '#fff' }
                  : { background: 'var(--bg-subtle)', color: MC.ink }}>
                {p.label}
              </button>
            ))}
          </div>
        </fieldset>

        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
          aria-label="Choose a photo" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }} />

        {preview ? (
          <div className="relative mt-3 overflow-hidden rounded-[14px]" style={{ background: 'var(--bg-subtle)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- a local blob: preview */}
            <img src={preview} alt="Your selection" className="mx-auto max-h-[360px] w-auto object-contain" />
            <button type="button" onClick={() => input.current?.click()}
              className="absolute bottom-2 right-2 rounded-full px-3 py-1.5 text-[12px] font-[720] text-white"
              style={{ background: 'rgba(15,23,42,0.65)' }}>
              Change
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => input.current?.click()} disabled={busy === 'reading'}
            className="mt-3 flex h-36 w-full flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-dashed text-[13px] font-[700]"
            style={{ borderColor: rgba(MC.primary, 0.35), color: MC.primary, background: rgba(MC.primary, 0.04) }}>
            {busy === 'reading'
              ? <><Loader2 size={20} className="animate-spin" aria-hidden /> Preparing…</>
              : <><Camera size={22} aria-hidden /> Take or choose a photo</>}
          </button>
        )}

        {error && <p role="alert" className="mt-2 text-[12.5px] font-[600]" style={{ color: 'var(--danger-text)' }}>{error}</p>}

        <p className="mt-3 flex items-start gap-1.5 text-[11.5px] leading-relaxed" style={{ color: MC.muted }}>
          <Lock size={12} aria-hidden className="mt-0.5 shrink-0" />
          Only you and your trainer can see this. Location data is removed before upload.
        </p>

        <button type="button" onClick={() => void upload()} disabled={!blob || busy !== null}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-[13px] text-[14px] font-[750] text-white disabled:opacity-50"
          style={{ background: MC.primary }}>
          {busy === 'uploading' ? <><Loader2 size={16} className="animate-spin" aria-hidden /> Uploading…</> : `Save ${POSE_LABEL[pose].toLowerCase()} photo`}
        </button>
      </Card>
    </m.div>
  );
}

/* ── Compare ─────────────────────────────────────────────────────────────── */

function Compare({ photos }: { photos: MePhoto[] }) {
  // Poses with at least two photos taken on different days.
  const byPose = useMemo(() => {
    const map = new Map<string, MePhoto[]>();
    for (const p of photos) map.set(p.photo_type, [...(map.get(p.photo_type) ?? []), p]);
    return [...map.entries()]
      .map(([pose, list]) => [pose, [...list].sort((a, b) => day(a.taken_at).localeCompare(day(b.taken_at)))] as const)
      .filter(([, list]) => new Set(list.map((p) => day(p.taken_at))).size >= 2);
  }, [photos]);
  const [pose, setPose] = useState<string | null>(null);
  const active = byPose.find(([p]) => p === pose) ?? byPose[0];
  if (!active) return null;
  const [, list] = active;
  const before = list[0];
  const after = list[list.length - 1];

  return (
    <Section title="Before and after">
      {byPose.length > 1 && (
        <div role="tablist" aria-label="Pose" className="mb-2 flex gap-1.5">
          {byPose.map(([p]) => (
            <button key={p} type="button" role="tab" aria-selected={p === active[0]} onClick={() => setPose(p)}
              className="rounded-full px-3 py-1 text-[12px] font-[720]"
              style={p === active[0] ? { background: MC.primary, color: '#fff' } : { background: 'var(--bg-subtle)', color: MC.ink }}>
              {POSE_LABEL[p] ?? p}
            </button>
          ))}
        </div>
      )}
      <Slider before={before} after={after} />
    </Section>
  );
}

function Slider({ before, after }: { before: MePhoto; after: MePhoto }) {
  const [pos, setPos] = useState(50);
  return (
    <Card>
      <div className="relative aspect-[3/4] w-full select-none overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- private /uploads or data: image */}
        <img src={after.photo_url} alt={`${POSE_LABEL[after.photo_type]} photo, ${longDate(after.taken_at)}`}
          className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- private /uploads or data: image */}
          <img src={before.photo_url} alt={`${POSE_LABEL[before.photo_type]} photo, ${longDate(before.taken_at)}`}
            className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow"
          style={{ left: `${pos}%` }} />
        <span className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-[750] text-white" style={{ background: 'rgba(15,23,42,0.6)' }}>
          {longDate(before.taken_at)}
        </span>
        <span className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-[750] text-white" style={{ background: 'rgba(15,23,42,0.6)' }}>
          {longDate(after.taken_at)}
        </span>
        <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))}
          aria-label="Drag to compare before and after"
          className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0" />
      </div>
      <p className="px-4 py-2.5 text-center text-[11.5px] font-[600]" style={{ color: MC.muted }}>
        Drag to compare · {Math.max(0, Math.round((new Date(day(after.taken_at)).getTime() - new Date(day(before.taken_at)).getTime()) / 86_400_000))} days apart
      </p>
    </Card>
  );
}

/* ── Timeline ────────────────────────────────────────────────────────────── */

function Timeline({ photos, onOpen }: { photos: MePhoto[]; onOpen: (p: MePhoto) => void }) {
  const groups = useMemo(() => {
    const map = new Map<string, MePhoto[]>();
    for (const p of photos) map.set(day(p.taken_at), [...(map.get(day(p.taken_at)) ?? []), p]);
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [photos]);

  return (
    <Section title="Timeline">
      <div className="space-y-4">
        {groups.map(([d, list]) => (
          <div key={d}>
            <p className="mb-1.5 text-[12px] font-[750]" style={{ color: MC.ink }}>{longDate(d)}</p>
            <ul className="grid grid-cols-3 gap-2">
              {list.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => onOpen(p)}
                    aria-label={`${POSE_LABEL[p.photo_type] ?? p.photo_type} photo, ${longDate(p.taken_at)}`}
                    className="relative block aspect-[3/4] w-full overflow-hidden rounded-[12px] transition-transform active:scale-[0.98]"
                    style={{ background: 'var(--bg-subtle)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- private /uploads or data: image */}
                    <img src={p.photo_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                    <span className="absolute bottom-1 left-1 rounded-full px-1.5 py-0.5 text-[10px] font-[750] text-white"
                      style={{ background: 'rgba(15,23,42,0.6)' }}>
                      {POSE_LABEL[p.photo_type] ?? p.photo_type}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ── Viewer ──────────────────────────────────────────────────────────────── */

function Viewer({ photo, onClose, onDeleted }: {
  photo: MePhoto | null; onClose: () => void; onDeleted: (id: string) => void;
}) {
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => { setConfirming(false); }, [photo?.id]);

  const remove = async () => {
    if (!photo) return;
    setDeleting(true);
    try {
      await api.me.deletePhoto(photo.id);
      toast.success('Photo deleted');
      onDeleted(photo.id);
    } catch {
      toast.error('Could not delete the photo. Try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={photo !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[440px] p-0">
        {photo && (
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element -- private /uploads or data: image */}
            <img src={photo.photo_url} alt={`${POSE_LABEL[photo.photo_type] ?? photo.photo_type}, ${longDate(photo.taken_at)}`}
              className="max-h-[70vh] w-full rounded-t-[inherit] object-contain" style={{ background: '#000' }} />
            <div className="p-4">
              <DialogTitle className="text-[15px] font-[800]">
                {POSE_LABEL[photo.photo_type] ?? photo.photo_type} · {longDate(photo.taken_at)}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-[12.5px]">
                {photo.by_me ? 'Added by you' : 'Taken by your trainer'}
              </DialogDescription>
              {photo.by_me && (
                confirming ? (
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => setConfirming(false)}
                      className="h-11 flex-1 rounded-[12px] text-[13.5px] font-[720]"
                      style={{ background: 'var(--bg-subtle)', color: MC.ink }}>Keep</button>
                    <button type="button" onClick={() => void remove()} disabled={deleting}
                      className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[12px] text-[13.5px] font-[750] text-white disabled:opacity-60"
                      style={{ background: palette.red[600] }}>
                      {deleting ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Trash2 size={15} aria-hidden />}
                      Delete for good
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirming(true)}
                    className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-[720]" style={{ color: palette.red[600] }}>
                    <Trash2 size={14} aria-hidden /> Delete this photo
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
