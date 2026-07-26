'use client';

/**
 * AnatomyPicker — choose an anatomy overlay to drop onto the canvas.
 *
 * Reads /anatomy/anatomy-manifest.json, which is generated at build time by
 * scripts/anatomy/build-anatomy.mjs from licence-verified geometry. The picker
 * is manifest-driven on purpose: adding artwork later (skeleton, joints,
 * ligaments) means regenerating the manifest, not editing this component.
 *
 * Opacity is chosen BEFORE insertion rather than after, because the artwork is
 * a substrate to draw on — the useful decision is "how faint should this sit
 * under my ink", and making it a post-hoc property means selecting a locked
 * element to change it.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Search, X, Info } from 'lucide-react';

export type AnatomyAsset = {
  id: string;
  title: string;
  category: string;
  bodyPart: string;
  region?: string;
  view?: string;
  svg: string;
  png: string | null;
  thumbnail: string;
  license: string;
  author: string;
  source: string;
  commercial_use: boolean;
  attribution_required: boolean;
};

type Manifest = {
  assets: AnatomyAsset[];
  coverage?: { shipped: string[]; empty: string[]; note?: string };
};

const CATEGORY_LABEL: Record<string, string> = {
  body: 'Full body',
  muscles: 'Muscles',
  skeleton: 'Skeleton',
  joints: 'Joints',
  ligaments: 'Ligaments',
  injuries: 'Rehab',
  exercises: 'Exercises',
};

export default function AnatomyPicker({
  open, onClose, onInsert,
}: {
  open: boolean;
  onClose: () => void;
  onInsert: (asset: AnatomyAsset, opacity: number) => Promise<void> | void;
}) {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [opacity, setOpacity] = useState(45);
  const [inserting, setInserting] = useState('');

  useEffect(() => {
    if (!open || manifest || loading) return;
    setLoading(true);
    setError('');
    fetch('/anatomy/anatomy-manifest.json')
      .then((r) => { if (!r.ok) throw new Error(`manifest ${r.status}`); return r.json(); })
      .then((m: Manifest) => setManifest(m))
      .catch(() => setError('Could not load the anatomy library'))
      .finally(() => setLoading(false));
  }, [open, manifest, loading]);

  const categories = useMemo(() => {
    const present = new Set((manifest?.assets ?? []).map((a) => a.category));
    return ['all', ...Array.from(present)];
  }, [manifest]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (manifest?.assets ?? []).filter((a) => {
      if (category !== 'all' && a.category !== category) return false;
      if (!q) return true;
      return a.title.toLowerCase().includes(q) || a.bodyPart.includes(q);
    });
  }, [manifest, query, category]);

  const insert = useCallback(async (asset: AnatomyAsset) => {
    setInserting(asset.id);
    try {
      await onInsert(asset, opacity);
      onClose();
    } finally {
      setInserting('');
    }
  }, [onInsert, opacity, onClose]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[60] flex flex-col" style={{ background: 'var(--bg-elevated)' }}>
      <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: 'var(--border)' }}>
        <Search size={14} style={{ color: 'var(--text-muted)' }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search anatomy…"
          aria-label="Search anatomy"
          autoFocus
          className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
        <button onClick={onClose} aria-label="Close anatomy picker"
          className="rounded-full p-1.5" style={{ color: 'var(--text-muted)' }}>
          <X size={15} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-b px-3 py-2" style={{ borderColor: 'var(--border)' }}>
        {categories.map((c) => (
          <button key={c} onClick={() => setCategory(c)}
            className="rounded-full px-2.5 py-1 text-[11px] font-[700] transition-colors"
            style={category === c
              ? { background: 'var(--brand)', color: '#fff' }
              : { background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
            {c === 'all' ? 'All' : CATEGORY_LABEL[c] ?? c}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="anatomy-opacity" className="text-[11px] font-[650]" style={{ color: 'var(--text-muted)' }}>
            Opacity {opacity}%
          </label>
          <input id="anatomy-opacity" type="range" min={10} max={100} step={5}
            value={opacity} onChange={(e) => setOpacity(Number(e.target.value))}
            className="w-24" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 size={22} className="animate-spin" style={{ color: 'var(--brand)' }} />
          </div>
        ) : error ? (
          <p className="py-8 text-center text-[12.5px]" style={{ color: 'var(--danger)' }}>{error}</p>
        ) : results.length === 0 ? (
          <p className="py-8 text-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
            Nothing matches “{query}”.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {results.map((a) => (
              <button key={a.id} onClick={() => insert(a)} disabled={!!inserting}
                title={`${a.title} — ${a.license}`}
                className="group relative flex flex-col items-center gap-1 rounded-[10px] p-2 transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-50"
                style={{ border: '1px solid var(--border)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.thumbnail} alt={a.title} loading="lazy"
                  className="h-20 w-full object-contain" />
                <span className="line-clamp-2 text-[10px] font-[650] leading-tight"
                  style={{ color: 'var(--text-secondary)' }}>{a.title}</span>
                {inserting === a.id && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-[10px]"
                    style={{ background: 'var(--bg-elevated)', opacity: 0.8 }}>
                    <Loader2 size={16} className="animate-spin" style={{ color: 'var(--brand)' }} />
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Coverage is stated in the UI, not just the docs — a trainer looking
            for a knee ligament diagram should find out here, not by hunting. */}
        {manifest?.coverage?.empty?.length ? (
          <div className="mt-4 flex gap-2 rounded-[10px] p-3 text-[11px]"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
            <Info size={13} className="mt-0.5 shrink-0" />
            <span>
              Not in the library yet: {manifest.coverage.empty.map((c) => CATEGORY_LABEL[c] ?? c).join(', ')}.
              Artwork is added centrally — nothing to configure here.
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
