'use client';

// Whiteboards — the studio-wide board list.
//
// Exists because the panel embedded on a client profile was the ONLY way to
// reach a board: no nav entry, no landing page, so unless you already knew to
// open a specific client and scroll, the feature was invisible. This is the
// front door.
//
// Boards attached to a client are still edited from that client's profile —
// this page finds them, shows where they belong, and opens them.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import {
  PenLine, Plus, Loader2, Search, Trash2, User, ArrowRight, Archive,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api, type WhiteboardSummary, type Whiteboard } from '@/lib/api';
import { useToast } from '@/lib/toast';
import WhiteboardCanvas from '@/components/whiteboard/WhiteboardCanvas';

const EASE_EXPO = [0.16, 1, 0.3, 1] as const;

const fmtWhen = (iso: string) => {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function WhiteboardsPage() {
  return (
    <Guard>
      <AppShell title="Whiteboards">
        <WhiteboardsScreen />
      </AppShell>
    </Guard>
  );
}

function WhiteboardsScreen() {
  const { toast } = useToast();
  const router = useRouter();
  const [boards, setBoards] = useState<WhiteboardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const [opening, setOpening] = useState('');
  const [open, setOpen] = useState<Whiteboard | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.whiteboards.list({ status: showArchived ? 'archived' : 'active' });
      setBoards(res.data ?? []);
    } catch (err) {
      // The most likely cause on first run is that the backend has not been
      // redeployed yet, so /api/whiteboards 404s. Say that plainly instead of
      // showing a bare error string nobody can act on.
      const status = (err as { status?: number })?.status;
      setError(status === 404
        ? 'The whiteboards API is not available yet — the backend needs deploying.'
        : err instanceof Error ? err.message : 'Could not load whiteboards');
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useEffect(() => { load(); }, [load]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return boards;
    return boards.filter((b) => b.title.toLowerCase().includes(q));
  }, [boards, query]);

  const create = async () => {
    setCreating(true);
    try {
      const res = await api.whiteboards.create({
        title: `Board — ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`,
      });
      setOpen({ ...res.data, can_edit: true });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create the board');
    } finally {
      setCreating(false);
    }
  };

  const openBoard = async (id: string) => {
    setOpening(id);
    try {
      setOpen((await api.whiteboards.get(id)).data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open the board');
    } finally {
      setOpening('');
    }
  };

  const remove = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    try {
      await api.whiteboards.remove(id);
      toast.success('Whiteboard deleted');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete');
    }
  };

  if (open) {
    return (
      <div>
        <button onClick={() => { setOpen(null); load(); }}
          className="mb-3 inline-flex min-h-[34px] items-center gap-1 rounded-[10px] px-2.5 text-[12px] font-[650]"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
          ← All whiteboards
        </button>
        <p className="mb-2 text-[15px] font-[750]" style={{ color: 'var(--text-primary)' }}>{open.title}</p>
        <WhiteboardCanvas board={open} className="h-[min(74vh,680px)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[11px] px-3"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', minHeight: 38 }}>
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search whiteboards…" aria-label="Search whiteboards"
            className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
            style={{ color: 'var(--text-primary)' }} />
        </div>
        <button onClick={() => setShowArchived((s) => !s)}
          className="inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-[11px] px-3 text-[12px] font-[650]"
          style={showArchived
            ? { background: 'var(--brand)', color: '#fff' }
            : { background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          <Archive size={13} /> Archived
        </button>
        <button onClick={create} disabled={creating}
          className="inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-[11px] px-3.5 text-[12.5px] font-[700] disabled:opacity-50"
          style={{ background: 'var(--brand)', color: '#fff' }}>
          {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          New board
        </button>
      </div>

      {loading ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[76px] animate-pulse rounded-[14px]" style={{ background: 'var(--bg-subtle)' }} />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-[14px] p-5 text-center"
          style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)' }}>
          <p className="text-[13px] font-[650]" style={{ color: 'var(--danger)' }}>{error}</p>
          <button onClick={load} className="mt-2 text-[12px] underline" style={{ color: 'var(--danger)' }}>Retry</button>
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[16px] px-4 py-12 text-center"
          style={{ background: 'var(--bg-subtle)', border: '1px dashed var(--border)' }}>
          <PenLine size={26} style={{ color: 'var(--text-disabled)' }} />
          <p className="text-[14px] font-[700]" style={{ color: 'var(--text-primary)' }}>
            {query ? `Nothing matches “${query}”` : showArchived ? 'No archived boards' : 'No whiteboards yet'}
          </p>
          <p className="max-w-[380px] text-[12px]" style={{ color: 'var(--text-muted)' }}>
            Sketch a movement correction, map a pain area on the anatomy overlays, or plan a progression. Boards autosave as you draw.
          </p>
          {!query && !showArchived && (
            <button onClick={create} disabled={creating}
              className="mt-2 inline-flex min-h-[36px] items-center gap-1.5 rounded-[10px] px-3.5 text-[12.5px] font-[700]"
              style={{ background: 'var(--brand)', color: '#fff' }}>
              <Plus size={14} /> Create your first board
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((b, i) => (
            <m.div key={b.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i, 8) * 0.04, ease: EASE_EXPO }}>
              <div className="flex h-full items-center gap-3 rounded-[14px] px-3 py-3 transition-colors hover:bg-[var(--bg-hover)]"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
                  style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                  <PenLine size={15} />
                </span>
                <button onClick={() => openBoard(b.id)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-[13px] font-[650]" style={{ color: 'var(--text-primary)' }}>{b.title}</p>
                  <p className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {b.entity_type === 'pt_client' && <User size={10} />}
                    {b.entity_type === 'pt_client' ? 'Client board' : 'Standalone'} · {fmtWhen(b.updated_at)}
                  </p>
                </button>
                {opening === b.id && <Loader2 size={14} className="animate-spin" style={{ color: 'var(--text-muted)' }} />}
                {/* Jump to the client this board belongs to — the board lives in
                    that client's record and the trainer usually wants the rest
                    of it too. */}
                {b.entity_type === 'pt_client' && b.entity_id && (
                  <button onClick={() => router.push(`/pt-os/clients/${b.entity_id}`)}
                    aria-label="Open client" title="Open client"
                    className="shrink-0 rounded-[8px] p-2" style={{ color: 'var(--text-disabled)' }}>
                    <ArrowRight size={13} />
                  </button>
                )}
                <button onClick={() => remove(b.id, b.title)} aria-label={`Delete ${b.title}`}
                  className="shrink-0 rounded-[8px] p-2 transition-colors hover:bg-[var(--danger-bg)]"
                  style={{ color: 'var(--text-disabled)' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </m.div>
          ))}
        </div>
      )}
    </div>
  );
}
