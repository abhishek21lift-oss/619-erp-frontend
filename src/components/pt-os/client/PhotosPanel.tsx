'use client';

import { useEffect, useState } from 'react';
import { Camera, ChevronRight, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/forms/errors';
import { activatable } from '@/lib/a11y';
import { EmptyPanel, TAB_COLOR } from './ClientTabs';

/**
 * The client's progress photos, fetched.
 *
 * ── What this replaces ─────────────────────────────────────────────────────
 *
 * A hardcoded `<EmptyPanel title="No progress photos yet" />`. The Photos tab
 * queried nothing — there was not a single photo API call in the whole profile
 * page — so it said "none" to every client on the platform, including the ones
 * with twenty photos on file. The endpoint has existed the whole time
 * (`api.progress.progressPhotos.list`, backed by
 * `/api/progress/progress-photos`), and the dedicated Progress Photos screen
 * has always read it.
 *
 * A tab that renders a fixed empty state is worse than one that is missing:
 * missing prompts you to look elsewhere, and a confident "none" stops you
 * looking at all.
 *
 * ── Three states, not two ──────────────────────────────────────────────────
 *
 * Loading, failed, and answered. The Documents card on the same page collapses
 * "the request failed" into "nothing on file", which is the mistake this file
 * exists not to repeat: a trainer who is told a client has no photos when the
 * request 500'd will re-shoot photos that already exist.
 */

interface ProgressPhoto {
  id: string;
  photo_url: string;
  photo_type: string;
  taken_at: string;
}

/** Newest first — the comparison a trainer wants is "now versus then". */
function byNewest(a: ProgressPhoto, b: ProgressPhoto) {
  return String(b.taken_at ?? '').localeCompare(String(a.taken_at ?? ''));
}

function formatTaken(value: string) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PhotosPanel({ clientId }: { clientId: string }) {
  const [photos, setPhotos] = useState<ProgressPhoto[] | null>(null);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPhotos(null);
    setError('');
    api.progress.progressPhotos.list({ client_id: clientId })
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res?.data) ? (res.data as ProgressPhoto[]) : [];
        setPhotos([...rows].sort(byNewest));
      })
      .catch((e) => {
        if (!cancelled) setError(errorMessage(e, 'Could not load progress photos.'));
      });
    return () => { cancelled = true; };
  }, [clientId]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[22px] bg-white px-6 py-12 text-center"
        style={{ border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div className="flex h-12 w-12 items-center justify-center rounded-[16px]"
          style={{ background: 'rgba(220,38,38,0.10)', color: '#dc2626' }}>
          <AlertTriangle size={20} />
        </div>
        {/* Says the request failed, rather than reporting an empty gallery. */}
        <p className="text-[14px] font-[780]" style={{ color: 'var(--text-primary)' }}>
          Could not load progress photos
        </p>
        <p className="max-w-[46ch] text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {error} This client may still have photos on file.
        </p>
        <a href={`/pt-os/progress-photos?client_id=${clientId}`}
          className="flex h-[44px] items-center gap-1.5 rounded-[12px] px-4 text-[12px] font-[750]"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
          Open Progress Photos <ChevronRight size={13} />
        </a>
      </div>
    );
  }

  if (photos === null) {
    return (
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="aspect-square animate-pulse rounded-[14px]"
            style={{ background: 'var(--bg-subtle)' }} />
        ))}
      </div>
    );
  }

  if (photos.length === 0) {
    // The genuine empty state, reached only after the request answered.
    return (
      <EmptyPanel
        icon={<Camera size={20} />}
        title="No progress photos yet"
        body="Front, side and back photos over time are the comparison clients respond to most. They stay private to the studio."
        color={TAB_COLOR.success}
        actions={[{ label: 'Add progress photos', href: `/pt-os/progress-photos?client_id=${clientId}` }]}
      />
    );
  }

  return (
    <div className="rounded-[22px] bg-white p-4"
      style={{ border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[13px] font-[780]" style={{ color: 'var(--text-primary)' }}>
          {photos.length} photo{photos.length === 1 ? '' : 's'}
        </p>
        <a href={`/pt-os/progress-photos?client_id=${clientId}`}
          className="flex items-center gap-1 text-[12px] font-[700]" style={{ color: 'var(--brand)' }}>
          Compare and add <ChevronRight size={13} />
        </a>
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {photos.slice(0, 8).map((p) => (
          <div key={p.id}
            className="group relative aspect-square overflow-hidden rounded-[14px] cursor-pointer"
            style={{ border: '1px solid var(--border)' }}
            {...activatable(() => setPreview(p.photo_url), { label: `View ${p.photo_type} photo from ${formatTaken(p.taken_at)}` })}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.photo_url} alt={`${p.photo_type} view, ${formatTaken(p.taken_at)}`} className="h-full w-full object-cover" />
            <span className="absolute inset-x-0 bottom-0 truncate px-1.5 py-1 text-[9.5px] font-[700] text-white"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)' }}>
              {formatTaken(p.taken_at)}
            </span>
          </div>
        ))}
      </div>

      {preview && (
        <div
          // A full-screen overlay: a downward drag inside it is somebody
          // looking at the photo, not asking to refresh the page underneath.
          // pull-refresh-optout.test.ts scans for exactly this and caught it
          // missing here.
          data-no-pull-refresh
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.8)' }}
          {...activatable(() => setPreview(null), { label: 'Close photo preview' })}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Enlarged view" className="max-h-full max-w-full rounded-[16px]" />
        </div>
      )}
    </div>
  );
}
