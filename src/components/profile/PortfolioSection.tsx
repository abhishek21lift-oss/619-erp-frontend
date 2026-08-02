'use client';

// Portfolio — the photographs and clips a coach shows people.
//
// ── This section owns its own server state, and that is deliberate ───────────
//
// Every other section on this page is a controlled component feeding one dirty
// baseline and one Save button. This one is not, because its actions are not
// edits to a form: an upload, a pin, a delete and a reorder are each a complete
// change on their own, they involve files, and batching them behind Save would
// mean a photograph that is on the server but not in the list until somebody
// presses a button. So they commit immediately, and nothing here ever touches
// the page's dirty state.
//
// ── Reorder is a mode with buttons, not a drag ───────────────────────────────
//
// A drag inside a vertically scrolling page on a touch screen fights the scroll
// gesture, and the fight is unwinnable without preventDefault on touchmove,
// which then breaks scrolling everywhere the pointer starts on a tile. Up/down
// buttons are unglamorous, work with a thumb, work with a keyboard, and cannot
// be half-performed.
//
// ── Pinned items are shown as their own group ────────────────────────────────
//
// The server orders `pinned DESC, sort_order ASC`. If pinning did not visibly
// move an item into its own group, "move up" past the pinned block would look
// broken — the request would succeed and the tile would come back where it
// started. Reordering is therefore confined to a group, which is exactly what
// the server's ordering can express.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import {
  Plus, Pin, PinOff, Trash2, ArrowUp, ArrowDown, ArrowUpDown, Check, X,
  ImageIcon, Play, GitCompareArrows, Loader2, Images, ExternalLink, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { api, PORTFOLIO_LIMITS } from '@/lib/api';
import type { PortfolioItem, PortfolioKind } from '@/lib/api';
import { ApiError } from '@/lib/http';

const KINDS: { value: PortfolioKind; label: string; hint: string; icon: React.ReactNode }[] = [
  { value: 'image', label: 'Photo', hint: 'A single image', icon: <ImageIcon size={14} /> },
  { value: 'before_after', label: 'Before / After', hint: 'Two images, shown side by side', icon: <GitCompareArrows size={14} /> },
  { value: 'video_link', label: 'Video', hint: 'A YouTube or Vimeo link, plus a thumbnail', icon: <Play size={14} /> },
];

const MB = (n: number) => `${Math.round(n / (1024 * 1024))}MB`;

/**
 * A watch URL turned into something an iframe can show.
 *
 * The server has already guaranteed the host is YouTube or Vimeo, so this is
 * only a shape transform — but it returns null rather than guessing when the
 * shape is unfamiliar, and the caller falls back to opening the original link.
 * A wrong embed URL renders as a permanent grey rectangle with no error.
 */
export function embedUrl(raw: string | null): string | null {
  if (!raw) return null;
  let u: URL;
  try { u = new URL(raw); } catch { return null; }

  const host = u.hostname.replace(/^www\./, '');
  if (host === 'youtu.be') {
    const id = u.pathname.slice(1);
    return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : null;
  }
  if (host === 'youtube.com') {
    if (u.pathname.startsWith('/embed/')) return u.toString();
    const id = u.searchParams.get('v');
    return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : null;
  }
  if (host === 'player.vimeo.com') return u.toString();
  if (host === 'vimeo.com') {
    const id = u.pathname.split('/').filter(Boolean)[0];
    return /^\d+$/.test(id || '') ? `https://player.vimeo.com/video/${id}` : null;
  }
  return null;
}

/** Read an ApiError's message without leaking a stack trace into the UI. */
function reason(err: unknown, fallback: string) {
  return err instanceof ApiError && err.message ? err.message : fallback;
}

// ── Skeleton ────────────────────────────────────────────────────────────────

export function PortfolioSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }} />
      ))}
    </div>
  );
}

// ── One tile ────────────────────────────────────────────────────────────────

function Tile({ item, resolveUrl, reordering, canUp, canDown, busy, onOpen, onPin, onDelete, onMove }: {
  item: PortfolioItem;
  resolveUrl: (p: string) => string;
  reordering: boolean;
  canUp: boolean;
  canDown: boolean;
  busy: boolean;
  onOpen: () => void;
  onPin: () => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const kind = KINDS.find((k) => k.value === item.kind);

  return (
    <m.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="group relative aspect-[4/5] overflow-hidden rounded-2xl"
      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
    >
      <button
        type="button"
        onClick={onOpen}
        className="absolute inset-0 h-full w-full"
        aria-label={item.title || 'Open portfolio item'}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolveUrl(item.url)}
          alt={item.title || item.caption || ''}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        {/* A scrim only where text sits, so the photograph is not dulled. */}
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-2/5"
          style={{ background: 'linear-gradient(to top,rgba(15,23,42,0.78),transparent)' }} />

        {item.kind === 'video_link' && (
          <span aria-hidden className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full"
              style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.35)' }}>
              <Play size={16} className="translate-x-[1px] text-white" fill="white" />
            </span>
          </span>
        )}

        {(item.title || item.caption) && (
          <span className="absolute inset-x-0 bottom-0 block px-2.5 pb-2.5 text-left">
            {item.title && (
              <span className="block truncate text-[11.5px] font-[760] text-white">{item.title}</span>
            )}
            {item.caption && (
              <span className="block truncate text-[10.5px]" style={{ color: 'rgba(255,255,255,0.78)' }}>
                {item.caption}
              </span>
            )}
          </span>
        )}
      </button>

      {/* Kind marker, top-left, always visible — a before/after is a different
          claim from a photo and should not need a tap to tell them apart. */}
      {item.kind !== 'image' && (
        <span aria-hidden className="pointer-events-none absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-lg text-white"
          style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(8px)' }}>
          {kind?.icon}
        </span>
      )}

      {/* No per-tile "pinned" badge: it sat under the controls at the same
          corner, and the group heading above already says which of these are
          pinned. Two indicators for one fact, one of them obscured. */}

      {/* Controls. Always visible on touch — `group-hover` alone would make
          delete and pin unreachable on the devices most likely to be used. */}
      <div className="absolute right-2 top-2 flex flex-col gap-1.5 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        {reordering ? (
          <>
            <IconButton label="Move up" disabled={!canUp || busy} onClick={() => onMove(-1)}>
              <ArrowUp size={13} />
            </IconButton>
            <IconButton label="Move down" disabled={!canDown || busy} onClick={() => onMove(1)}>
              <ArrowDown size={13} />
            </IconButton>
          </>
        ) : (
          <>
            <IconButton label={item.pinned ? 'Unpin' : 'Pin to the top'} disabled={busy} onClick={onPin}>
              {item.pinned ? <PinOff size={13} /> : <Pin size={13} />}
            </IconButton>
            <IconButton label="Delete" disabled={busy} onClick={onDelete} danger>
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            </IconButton>
          </>
        )}
      </div>
    </m.div>
  );
}

function IconButton({ label, onClick, disabled, danger, children }: {
  label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-7 w-7 items-center justify-center rounded-lg text-white transition-colors disabled:opacity-40"
      style={{
        background: danger ? 'rgba(220,38,38,0.88)' : 'rgba(15,23,42,0.62)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.22)',
      }}
    >
      {children}
    </button>
  );
}

// ── Lightbox ────────────────────────────────────────────────────────────────

function Lightbox({ item, resolveUrl, onClose }: {
  item: PortfolioItem; resolveUrl: (p: string) => string; onClose: () => void;
}) {
  const embed = item.kind === 'video_link' ? embedUrl(item.externalUrl) : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    // The page behind must not scroll while this is open — on iOS it otherwise
    // scrolls under the overlay and the tile is gone when it closes.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <m.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      role="dialog"
      aria-modal="true"
      aria-label={item.title || 'Portfolio item'}
      className="fixed inset-0 z-[70] flex flex-col"
      style={{
        // dvh, because 100vh on mobile Safari is taller than the visible area
        // and puts the caption behind the browser chrome.
        height: '100dvh',
        background: 'rgba(15,23,42,0.94)',
        backdropFilter: 'blur(12px)',
        paddingTop: 'env(safe-area-inset-top,0px)',
        paddingBottom: 'env(safe-area-inset-bottom,0px)',
      }}
      onClick={onClose}
    >
      <div className="flex shrink-0 items-center justify-end p-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-9 w-9 items-center justify-center rounded-full text-white"
          style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)' }}
        >
          <X size={17} />
        </button>
      </div>

      {/* min-h-0 is load-bearing: without it this flex child refuses to shrink
          below its content and the caption is pushed off the bottom. */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-3"
        onClick={(e) => e.stopPropagation()}>
        {embed ? (
          <div className="w-full max-w-4xl" style={{ aspectRatio: '16 / 9' }}>
            <iframe
              src={embed}
              title={item.title || 'Video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full rounded-xl"
              style={{ border: 0 }}
            />
          </div>
        ) : item.kind === 'before_after' && item.afterUrl ? (
          <div className="grid h-full w-full max-w-5xl grid-cols-1 items-center gap-2 sm:grid-cols-2">
            {[{ url: item.url, label: 'Before' }, { url: item.afterUrl, label: 'After' }].map((side) => (
              <figure key={side.label} className="relative flex min-h-0 items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolveUrl(side.url)} alt={`${side.label} — ${item.title || 'portfolio item'}`}
                  className="max-h-full max-w-full rounded-xl object-contain" />
                <figcaption className="absolute left-2 top-2 rounded-full px-2.5 py-1 text-[10px] font-[760] uppercase tracking-wide text-white"
                  style={{ background: 'rgba(15,23,42,0.6)' }}>
                  {side.label}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolveUrl(item.url)} alt={item.title || item.caption || ''}
            className="max-h-full max-w-full rounded-xl object-contain" />
        )}
      </div>

      <div className="shrink-0 px-4 pb-4 pt-3 text-center" onClick={(e) => e.stopPropagation()}>
        {item.title && <p className="text-[14px] font-[760] text-white">{item.title}</p>}
        {item.caption && <p className="mt-0.5 text-[12.5px]" style={{ color: 'rgba(255,255,255,0.72)' }}>{item.caption}</p>}
        {item.externalUrl && (
          <a href={item.externalUrl} target="_blank" rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-[700]"
            style={{ color: '#b8d7ff' }}>
            {embed ? 'Open on the original site' : 'Watch the video'} <ExternalLink size={11} />
          </a>
        )}
      </div>
    </m.div>
  );
}

// ── Upload dialog ───────────────────────────────────────────────────────────

function FilePick({ label, file, onPick, max }: {
  label: string; file: File | null; onPick: (f: File | null) => void; max: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Object URLs are not garbage collected; leaking one per pick would hold the
  // whole image in memory for the life of the tab.
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div>
      <span className="mb-1 block text-[10px] font-[700] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0] || null; e.target.value = ''; onPick(f); }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="flex h-28 w-full items-center justify-center overflow-hidden rounded-xl transition-colors hover:bg-[var(--bg-hover)]"
        style={{ background: 'var(--bg-subtle)', border: '1px dashed var(--border-2, var(--border))' }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1.5 px-3 text-center">
            <Plus size={16} style={{ color: 'var(--text-muted)' }} />
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Choose an image · up to {MB(max)}</span>
          </span>
        )}
      </button>
      {file && (
        <button type="button" onClick={() => onPick(null)}
          className="mt-1 text-[10.5px] font-[650]" style={{ color: 'var(--text-muted)' }}>
          Remove {file.name.length > 24 ? `${file.name.slice(0, 24)}…` : file.name}
        </button>
      )}
    </div>
  );
}

function fieldStyle() {
  return { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' };
}

function UploadDialog({ open, onOpenChange, onCreated, remaining }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (item: PortfolioItem) => void;
  remaining: number;
}) {
  const [kind, setKind] = useState<PortfolioKind>('image');
  const [file, setFile] = useState<File | null>(null);
  const [after, setAfter] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setKind('image'); setFile(null); setAfter(null);
    setExternalUrl(''); setTitle(''); setCaption(''); setError(null);
  }, []);

  // A poster is shown small and behind a play button, so it gets the smaller
  // ceiling — the same one the server enforces.
  const limit = kind === 'video_link' ? PORTFOLIO_LIMITS.posterBytes : PORTFOLIO_LIMITS.imageBytes;

  const problem = !file ? 'Choose an image'
    : file.size > limit ? `That image is larger than ${MB(limit)}`
      : kind === 'before_after' && !after ? 'A before/after needs both images'
        : kind === 'before_after' && after && after.size > PORTFOLIO_LIMITS.imageBytes
          ? `The second image is larger than ${MB(PORTFOLIO_LIMITS.imageBytes)}`
          : kind === 'video_link' && !externalUrl.trim() ? 'Paste the YouTube or Vimeo link'
            : null;

  const submit = async () => {
    if (problem || !file) return;
    setBusy(true); setError(null);
    try {
      const item = await api.profile.portfolio.create({
        kind,
        file,
        after: kind === 'before_after' ? after || undefined : undefined,
        externalUrl: kind === 'video_link' ? externalUrl.trim() : undefined,
        title: title.trim() || undefined,
        caption: caption.trim() || undefined,
      });
      onCreated(item);
      reset();
      onOpenChange(false);
    } catch (err) {
      // The server's message names the actual limit or the actual reason, and
      // is more use than anything this component could invent.
      setError(reason(err, 'That upload did not go through. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) { if (!v) reset(); onOpenChange(v); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to your portfolio</DialogTitle>
          <DialogDescription>
            {remaining} of {PORTFOLIO_LIMITS.items} slots left. Images only — a video is a link plus a thumbnail.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <span className="mb-1.5 block text-[10px] font-[700] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              What are you adding
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {KINDS.map((k) => (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => { setKind(k.value); setError(null); }}
                  className="flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-[10.5px] font-[700] transition-colors"
                  style={{
                    background: kind === k.value ? 'rgba(0,103,224,0.12)' : 'var(--bg-subtle)',
                    border: `1px solid ${kind === k.value ? 'rgba(0,103,224,0.45)' : 'var(--border)'}`,
                    color: kind === k.value ? '#0067e0' : 'var(--text-secondary)',
                  }}
                >
                  {k.icon}
                  <span className="text-center leading-tight">{k.label}</span>
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {KINDS.find((k) => k.value === kind)?.hint}
            </p>
          </div>

          <div className={kind === 'before_after' ? 'grid grid-cols-2 gap-3' : ''}>
            <FilePick
              label={kind === 'before_after' ? 'Before' : kind === 'video_link' ? 'Thumbnail' : 'Image'}
              file={file}
              onPick={(f) => { setFile(f); setError(null); }}
              max={limit}
            />
            {kind === 'before_after' && (
              <FilePick label="After" file={after} onPick={setAfter} max={PORTFOLIO_LIMITS.imageBytes} />
            )}
          </div>

          {kind === 'video_link' && (
            <div>
              <span className="mb-1 block text-[10px] font-[700] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Video link
              </span>
              <input
                value={externalUrl}
                onChange={(e) => { setExternalUrl(e.target.value); setError(null); }}
                placeholder="https://www.youtube.com/watch?v=…"
                inputMode="url"
                className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-[var(--brand)]"
                style={fieldStyle()}
              />
              <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                YouTube or Vimeo. Other hosts are refused.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            <div>
              <span className="mb-1 block text-[10px] font-[700] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Title <span className="font-[500] normal-case">(optional)</span>
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="12-week transformation"
                className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-[var(--brand)]"
                style={fieldStyle()}
              />
            </div>
            <div>
              <span className="mb-1 block text-[10px] font-[700] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Caption <span className="font-[500] normal-case">(optional)</span>
              </span>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={400}
                rows={2}
                placeholder="What this shows, and over what period"
                className="w-full resize-none rounded-xl px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-[var(--brand)]"
                style={fieldStyle()}
              />
            </div>
          </div>

          {(error || problem) && (
            <p className="flex items-start gap-1.5 text-[11.5px] font-[620]"
              style={{ color: error ? '#dc2626' : 'var(--text-muted)' }}>
              {error && <AlertTriangle size={12} className="mt-[1px] shrink-0" />}
              {error || problem}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); onOpenChange(false); }} disabled={busy}>Cancel</Button>
          <Button onClick={submit} loading={busy} disabled={!!problem}>Add to portfolio</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Section ─────────────────────────────────────────────────────────────────

export interface PortfolioSectionProps {
  /** Prefixes a stored `/uploads/...` path with the API origin. */
  resolveUrl: (path: string) => string;
  /** Fired after any change, so the page can refresh the completion score. */
  onChanged?: () => void;
  notify?: { success: (m: string) => void; error: (m: string) => void };
}

export default function PortfolioSection({ resolveUrl, onChanged, notify }: PortfolioSectionProps) {
  const [items, setItems] = useState<PortfolioItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [lightbox, setLightbox] = useState<PortfolioItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PortfolioItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Reorder requests are serialised through this chain. Two quick taps would
  // otherwise race, and the loser would silently overwrite the winner with a
  // stale order — the one failure mode of this feature nobody would notice.
  const orderChain = useRef<Promise<void>>(Promise.resolve());

  const announce = useCallback((kind: 'success' | 'error', msg: string) => {
    notify?.[kind](msg);
  }, [notify]);

  useEffect(() => {
    let live = true;
    api.profile.portfolio.list()
      .then((rows) => { if (live) setItems(rows); })
      .catch((err) => { if (live) setLoadError(reason(err, 'Your portfolio could not be loaded.')); });
    return () => { live = false; };
  }, []);

  const pinnedCount = useMemo(() => (items || []).filter((i) => i.pinned).length, [items]);
  const remaining = PORTFOLIO_LIMITS.items - (items?.length || 0);

  const changed = useCallback((next: PortfolioItem[]) => {
    setItems(next);
    onChanged?.();
  }, [onChanged]);

  const togglePin = async (item: PortfolioItem) => {
    if (!items) return;
    setBusyId(item.id);
    try {
      const updated = await api.profile.portfolio.update(item.id, { pinned: !item.pinned });
      // Re-sort locally the way the server does, so the tile moves into or out
      // of the pinned group immediately instead of on the next load.
      const next = items.map((i) => (i.id === updated.id ? updated : i))
        .sort((a, b) => Number(b.pinned) - Number(a.pinned)
          || a.sortOrder - b.sortOrder
          || b.createdAt.localeCompare(a.createdAt));
      changed(next);
    } catch (err) {
      announce('error', reason(err, `You can pin up to ${PORTFOLIO_LIMITS.pinned} items.`));
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete || !items) return;
    setDeleting(true);
    try {
      await api.profile.portfolio.remove(pendingDelete.id);
      changed(items.filter((i) => i.id !== pendingDelete.id));
      setPendingDelete(null);
      announce('success', 'Removed from your portfolio');
    } catch (err) {
      announce('error', reason(err, 'That item could not be removed.'));
    } finally {
      setDeleting(false);
    }
  };

  const move = (index: number, dir: -1 | 1) => {
    if (!items) return;
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    // Only within a group: the server sorts pinned first, so a swap across the
    // boundary would be undone on the round trip and look like a bug.
    if (items[index].pinned !== items[target].pinned) return;

    const next = items.slice();
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);

    const ids = next.map((i) => i.id);
    orderChain.current = orderChain.current.then(async () => {
      try {
        setItems(await api.profile.portfolio.reorder(ids));
      } catch (err) {
        // A 409 means another tab changed the gallery. The server sends the
        // current list with it; rendering that is the only honest recovery.
        const fresh = err instanceof ApiError && Array.isArray((err.payload as { items?: PortfolioItem[] })?.items)
          ? (err.payload as { items: PortfolioItem[] }).items
          : null;
        if (fresh) {
          setItems(fresh);
          announce('error', 'Your portfolio changed in another tab — this is the current order.');
        } else {
          announce('error', reason(err, 'That order could not be saved.'));
        }
      }
    });
  };

  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl py-10 text-center"
        style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
        <AlertTriangle size={18} style={{ color: '#d97706' }} />
        <p className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{loadError}</p>
      </div>
    );
  }

  if (!items) return <PortfolioSkeleton />;

  const groups: { key: string; label: string | null; from: number; to: number }[] = [];
  if (pinnedCount > 0) groups.push({ key: 'pinned', label: 'Pinned', from: 0, to: pinnedCount - 1 });
  if (pinnedCount < items.length) {
    groups.push({ key: 'rest', label: pinnedCount > 0 ? 'Everything else' : null, from: pinnedCount, to: items.length - 1 });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
          {items.length === 0
            ? `Up to ${PORTFOLIO_LIMITS.items} items. Pin your ${PORTFOLIO_LIMITS.pinned} best to the top.`
            : `${items.length} of ${PORTFOLIO_LIMITS.items} items · ${pinnedCount} pinned`}
        </p>
        <div className="flex items-center gap-2">
          {items.length > 1 && (
            <Button
              variant={reordering ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setReordering((v) => !v)}
              iconLeft={reordering ? <Check size={13} /> : <ArrowUpDown size={13} />}
            >
              {reordering ? 'Done' : 'Reorder'}
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => setUploadOpen(true)}
            disabled={remaining <= 0}
            iconLeft={<Plus size={13} />}
          >
            Add item
          </Button>
        </div>
      </div>

      {reordering && (
        <p className="rounded-xl px-3 py-2 text-[11.5px]"
          style={{ background: 'rgba(0,103,224,0.08)', border: '1px solid rgba(0,103,224,0.22)', color: '#0067e0' }}>
          Use the arrows on each item. Pinned items always sit above the rest, so they reorder among themselves.
        </p>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl px-5 py-12 text-center"
          style={{ background: 'var(--bg-subtle)', border: '1px dashed var(--border)' }}>
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl"
            style={{ background: 'linear-gradient(135deg,rgba(0,103,224,0.16),rgba(0,103,224,0.10))' }}>
            <Images size={18} style={{ color: '#0067e0' }} />
          </span>
          <div>
            <p className="text-[13.5px] font-[760]" style={{ color: 'var(--text-primary)' }}>Nothing here yet</p>
            <p className="mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
              A certificate says somebody taught you. This is where you show what you did with it.
            </p>
          </div>
          <Button size="sm" onClick={() => setUploadOpen(true)} iconLeft={<Plus size={13} />}>Add your first item</Button>
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.key} className="flex flex-col gap-2.5">
            {g.label && (
              <span className="flex items-center gap-1.5 text-[10px] font-[750] uppercase tracking-wide"
                style={{ color: 'var(--text-muted)' }}>
                {g.key === 'pinned' && <Pin size={10} />}{g.label}
              </span>
            )}
            {/* 2-up at 360px: three columns on a phone gives tiles too small to
                read a caption in, and any wider grid overflows the page. */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <AnimatePresence initial={false}>
                {items.slice(g.from, g.to + 1).map((item, i) => {
                  const index = g.from + i;
                  return (
                    <Tile
                      key={item.id}
                      item={item}
                      resolveUrl={resolveUrl}
                      reordering={reordering}
                      canUp={index > g.from}
                      canDown={index < g.to}
                      busy={busyId === item.id}
                      onOpen={() => setLightbox(item)}
                      onPin={() => togglePin(item)}
                      onDelete={() => setPendingDelete(item)}
                      onMove={(dir) => move(index, dir)}
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        ))
      )}

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        remaining={remaining}
        onCreated={(item) => {
          changed([...(items || []), item]);
          announce('success', 'Added to your portfolio');
        }}
      />

      {/* Deleting a photograph removes the file as well, which is what someone
          asking to delete a photograph means — so it is worth one question. */}
      <Dialog open={!!pendingDelete} onOpenChange={(v) => { if (!v && !deleting) setPendingDelete(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this item?</DialogTitle>
            <DialogDescription>
              {pendingDelete?.title
                ? `“${pendingDelete.title}” and its ${pendingDelete.kind === 'before_after' ? 'images' : 'image'} will be removed permanently.`
                : 'The image will be removed permanently. This cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingDelete(null)} disabled={deleting}>Keep it</Button>
            <Button variant="danger" onClick={confirmDelete} loading={deleting}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {lightbox && (
          <Lightbox item={lightbox} resolveUrl={resolveUrl} onClose={() => setLightbox(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
