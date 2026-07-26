'use client';

/**
 * WhiteboardPanel — the reusable "boards attached to this thing" surface.
 *
 * Deliberately entity-agnostic (entityType + entityId), so attaching boards to
 * sessions, exercises or staff later is a prop change, not a new component.
 * The PT client profile is simply its first caller.
 *
 * Loads a board's document only when one is opened: the list endpoint returns
 * metadata only, so a client with 30 boards costs one small request.
 */

import { useCallback, useEffect, useState } from 'react';
import { m } from 'framer-motion';
import {
  PenLine, Plus, Loader2, ChevronLeft, Trash2, History, Clock, X,
} from 'lucide-react';
import {
  api,
  type Whiteboard,
  type WhiteboardSummary,
  type WhiteboardEntityType,
  type WhiteboardVersion,
} from '@/lib/api';
import { useToast } from '@/lib/toast';
import WhiteboardCanvas from './WhiteboardCanvas';

const EASE_EXPO = [0.16, 1, 0.3, 1] as const;

const fmtWhen = (iso: string) => {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function WhiteboardPanel({
  entityType,
  entityId,
  defaultTitle = 'Untitled board',
  className = '',
}: {
  entityType: WhiteboardEntityType;
  entityId: string;
  /** Seed for a newly created board's name, e.g. the client's name. */
  defaultTitle?: string;
  className?: string;
}) {
  const { toast } = useToast();
  const [boards, setBoards] = useState<WhiteboardSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [creating, setCreating] = useState(false);

  const [open, setOpen] = useState<Whiteboard | null>(null);
  const [opening, setOpening] = useState('');

  const load = useCallback(async () => {
    setListLoading(true);
    setListError('');
    try {
      const res = await api.whiteboards.list({ entity_type: entityType, entity_id: entityId });
      setBoards(res.data ?? []);
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Could not load whiteboards');
    } finally {
      setListLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    setCreating(true);
    try {
      const res = await api.whiteboards.create({
        title: `${defaultTitle} — ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`,
        entity_type: entityType,
        entity_id: entityId,
      });
      // The create response is the full board, so open it directly rather than
      // round-tripping through GET.
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
      const res = await api.whiteboards.get(id);
      setOpen(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open the board');
    } finally {
      setOpening('');
    }
  };

  const remove = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? It can be restored by an admin.`)) return;
    try {
      await api.whiteboards.remove(id);
      toast.success('Whiteboard deleted');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete the board');
    }
  };

  if (open) {
    return (
      <BoardEditor
        board={open}
        className={className}
        onBack={async () => { setOpen(null); await load(); }}
      />
    );
  }

  return (
    <div className={className}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[13px] font-[750]" style={{ color: 'var(--text-primary)' }}>Whiteboards</h3>
        <button onClick={create} disabled={creating}
          className="inline-flex min-h-[34px] items-center gap-1.5 rounded-[10px] px-3 text-[12px] font-[700] transition disabled:opacity-50"
          style={{ background: 'var(--brand)', color: '#fff' }}>
          {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          New board
        </button>
      </div>

      {listLoading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-[58px] animate-pulse rounded-[12px]" style={{ background: 'var(--bg-subtle)' }} />
          ))}
        </div>
      ) : listError ? (
        <div className="rounded-[12px] p-4 text-center text-[12.5px]"
          style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
          {listError}
          <button onClick={load} className="ml-2 underline">Retry</button>
        </div>
      ) : boards.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[14px] px-4 py-8 text-center"
          style={{ background: 'var(--bg-subtle)', border: '1px dashed var(--border)' }}>
          <PenLine size={22} style={{ color: 'var(--text-disabled)' }} />
          <p className="text-[13px] font-[650]" style={{ color: 'var(--text-primary)' }}>No whiteboards yet</p>
          <p className="max-w-[280px] text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            Sketch a movement correction, mark a pain area, or map out a progression — it saves as you draw.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {boards.map((b, i) => (
            <m.div key={b.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04, ease: EASE_EXPO }}>
              <div className="flex items-center gap-3 rounded-[12px] px-3 py-2.5 transition-colors hover:bg-[var(--bg-hover)]"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]"
                  style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                  <PenLine size={14} />
                </span>
                <button onClick={() => openBoard(b.id)}
                  className="min-w-0 flex-1 text-left">
                  <p className="truncate text-[13px] font-[650]" style={{ color: 'var(--text-primary)' }}>{b.title}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Edited {fmtWhen(b.updated_at)}
                  </p>
                </button>
                {opening === b.id && <Loader2 size={14} className="animate-spin" style={{ color: 'var(--text-muted)' }} />}
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

// ── Editor shell: canvas + version history ──────────────────────────────────

function BoardEditor({ board, onBack, className = '' }: {
  board: Whiteboard; onBack: () => void; className?: string;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState(board.title);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<WhiteboardVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);

  const loadVersions = useCallback(async () => {
    setVersionsLoading(true);
    try {
      const res = await api.whiteboards.listVersions(board.id);
      setVersions(res.data ?? []);
    } catch {
      toast.error('Could not load version history');
    } finally {
      setVersionsLoading(false);
    }
  }, [board.id, toast]);

  const snapshot = async () => {
    setSavingVersion(true);
    try {
      await api.whiteboards.createVersion(board.id);
      toast.success('Version saved');
      if (showVersions) await loadVersions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save a version');
    } finally {
      setSavingVersion(false);
    }
  };

  const restore = async (versionId: string) => {
    if (!window.confirm('Restore this version? The current board is snapshotted first, so this can be undone.')) return;
    try {
      await api.whiteboards.restoreVersion(board.id, versionId);
      // Reload rather than mutating in place: the canvas is uncontrolled once
      // mounted, so the only honest way to show restored content is a remount.
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not restore that version');
    }
  };

  const commitTitle = async () => {
    const next = title.trim();
    if (!next || next === board.title) { setTitle(board.title); return; }
    try {
      await api.whiteboards.updateMeta(board.id, { title: next });
    } catch (err) {
      setTitle(board.title);
      toast.error(err instanceof Error ? err.message : 'Could not rename');
    }
  };

  return (
    <div className={className}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button onClick={onBack}
          className="inline-flex min-h-[34px] items-center gap-1 rounded-[10px] px-2.5 text-[12px] font-[650]"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
          <ChevronLeft size={14} /> Boards
        </button>

        <input
          value={title}
          disabled={!board.can_edit}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          aria-label="Board title"
          className="min-w-0 flex-1 rounded-[10px] px-3 py-1.5 text-[13px] font-[650] outline-none disabled:opacity-70"
          style={{ background: 'transparent', border: '1px solid transparent', color: 'var(--text-primary)' }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-subtle)'; }}
        />

        {board.can_edit && (
          <button onClick={snapshot} disabled={savingVersion}
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-[10px] px-2.5 text-[12px] font-[650] disabled:opacity-50"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
            {savingVersion ? <Loader2 size={13} className="animate-spin" /> : <Clock size={13} />}
            Save version
          </button>
        )}
        <button onClick={() => { setShowVersions((s) => !s); if (!showVersions) loadVersions(); }}
          className="inline-flex min-h-[34px] items-center gap-1.5 rounded-[10px] px-2.5 text-[12px] font-[650]"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
          <History size={13} /> History
        </button>
      </div>

      {showVersions && (
        <div className="mb-3 rounded-[12px] p-3"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Version history
            </p>
            <button onClick={() => setShowVersions(false)} aria-label="Close history"
              style={{ color: 'var(--text-muted)' }}><X size={14} /></button>
          </div>
          {versionsLoading ? (
            <p className="py-3 text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>Loading…</p>
          ) : versions.length === 0 ? (
            <p className="py-3 text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>
              No saved versions yet — use “Save version” to mark a point you can return to.
            </p>
          ) : (
            <div className="space-y-1">
              {versions.map((v) => (
                <div key={v.id} className="flex items-center gap-2 rounded-[9px] px-2 py-1.5 text-[12px]">
                  <Clock size={12} style={{ color: 'var(--text-disabled)' }} />
                  <span className="flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                    {v.label || `Version ${v.document_version}`} · {fmtWhen(v.created_at)}
                  </span>
                  {board.can_edit && (
                    <button onClick={() => restore(v.id)}
                      className="rounded-[7px] px-2 py-1 text-[11px] font-[700]"
                      style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                      Restore
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* A fixed, viewport-relative height: the canvas needs a definite height
          to size itself, and letting it grow with content would make an
          infinite canvas infinitely tall. */}
      <WhiteboardCanvas board={board} className="h-[min(72vh,640px)]" />
    </div>
  );
}
