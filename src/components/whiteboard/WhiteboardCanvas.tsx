'use client';

/**
 * WhiteboardCanvas — an autosaving annotation canvas bound to one board.
 *
 * Wraps Excalidraw (MIT) rather than reimplementing a canvas engine. That gets
 * pen/shapes/arrows/text/sticky notes/images/grid/zoom/pan/undo/redo/group/
 * lock/layer-order, touch + stylus input and PNG/SVG export for free, all of
 * which are years of work to build well.
 *
 * ── Three things here are load-bearing ──────────────────────────────────────
 *
 * 1. Assets are self-hosted. Excalidraw otherwise fetches its fonts from
 *    esm.sh at runtime, which our CSP blocks (and which would put a third
 *    party in the render path of an authenticated clinical app). The files are
 *    copied into public/ by scripts/copy-excalidraw-assets.mjs on postinstall.
 *
 * 2. Saves are debounced AND serialised. Drawing fires change events at frame
 *    rate; sending each one would flood the API. Equally, two saves in flight
 *    can land out of order and the older one wins — so a save never starts
 *    while another is running.
 *
 * 3. Version conflicts surface instead of silently clobbering. The server
 *    rejects a stale write with 409; we stop autosaving and tell the user
 *    rather than throwing away whoever saved first.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, Check, CloudOff, AlertTriangle, RotateCcw } from 'lucide-react';
import { api, type Whiteboard, type WhiteboardDocument } from '@/lib/api';
import { useToast } from '@/lib/toast';

import '@excalidraw/excalidraw/index.css';

// Excalidraw touches `window` during module evaluation, so it can never be
// server-rendered. ssr:false is required, not an optimisation.
const Excalidraw = dynamic(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw,
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center" style={{ background: 'var(--bg-subtle)' }}>
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--brand)' }} />
      </div>
    ),
  },
);

// Point the engine at our own copy of its fonts. Must be set before the engine
// initialises, hence module scope rather than an effect.
if (typeof window !== 'undefined') {
  (window as unknown as { EXCALIDRAW_ASSET_PATH?: string }).EXCALIDRAW_ASSET_PATH =
    '/excalidraw-assets/';
}

/** Long enough that a continuous stroke is one save, short enough that a
 *  trainer who closes the tab loses nothing meaningful. */
const AUTOSAVE_DEBOUNCE_MS = 1500;

type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: number }
  | { kind: 'conflict' }
  | { kind: 'error'; message: string };

export default function WhiteboardCanvas({
  board,
  className = '',
  onSaved,
}: {
  board: Whiteboard;
  className?: string;
  onSaved?: (version: number) => void;
}) {
  const { toast } = useToast();
  const [saveState, setSaveState] = useState<SaveState>({ kind: 'idle' });
  const [isDark, setIsDark] = useState(false);

  // Refs, not state: these change on every stroke and must not re-render the
  // canvas. Re-rendering Excalidraw mid-stroke drops the stroke.
  const versionRef = useRef(board.document_version);
  const pendingRef = useRef<WhiteboardDocument | null>(null);
  const inFlightRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // Follow the app's theme. AppShell writes `data-theme` on <html>, so observe
  // that rather than duplicating the theme resolution logic.
  useEffect(() => {
    const read = () => setIsDark(document.documentElement.classList.contains('dark'));
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    return () => observer.disconnect();
  }, []);

  const flush = useCallback(async () => {
    if (stoppedRef.current || inFlightRef.current) return;
    const doc = pendingRef.current;
    if (!doc) return;

    pendingRef.current = null;
    inFlightRef.current = true;
    setSaveState({ kind: 'saving' });

    try {
      const res = await api.whiteboards.saveDocument(board.id, doc, versionRef.current);
      versionRef.current = res.data.document_version;
      if (!mountedRef.current) return;
      setSaveState({ kind: 'saved', at: Date.now() });
      onSaved?.(res.data.document_version);
    } catch (err) {
      if (!mountedRef.current) return;
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        // Someone else saved. Continuing to autosave would either keep
        // failing or, worse, succeed against a version we then guess at and
        // destroy their work. Stop and hand the decision to the user.
        stoppedRef.current = true;
        setSaveState({ kind: 'conflict' });
      } else {
        // Keep the document queued so a transient failure retries on the next
        // edit rather than silently dropping the work.
        pendingRef.current = doc;
        setSaveState({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Could not save',
        });
      }
    } finally {
      inFlightRef.current = false;
      // A change that arrived while this save was in flight still needs
      // writing — without this it would sit until the user draws again.
      if (!stoppedRef.current && pendingRef.current && mountedRef.current) {
        timerRef.current = setTimeout(flush, AUTOSAVE_DEBOUNCE_MS);
      }
    }
  }, [board.id, onSaved]);

  const handleChange = useCallback((
    elements: readonly unknown[],
    appState: Record<string, unknown>,
    files: Record<string, unknown>,
  ) => {
    if (!board.can_edit || stoppedRef.current) return;

    // appState holds transient UI state (cursor position, current tool,
    // selection) that changes constantly and is not worth persisting or
    // syncing. Only the parts that describe the board itself are kept.
    pendingRef.current = {
      elements: elements as unknown[],
      appState: {
        viewBackgroundColor: appState.viewBackgroundColor,
        gridSize: appState.gridSize,
      },
      files,
    };

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, AUTOSAVE_DEBOUNCE_MS);
  }, [board.can_edit, flush]);

  const reloadAfterConflict = useCallback(async () => {
    try {
      const fresh = await api.whiteboards.get(board.id);
      // A full reload is the honest resolution: we have no merge algorithm,
      // and pretending to merge would lose edits unpredictably. Real-time
      // co-editing is a later phase; until then the rule is last-reader-wins
      // and the user is told explicitly.
      versionRef.current = fresh.data.document_version;
      window.location.reload();
    } catch {
      toast.error('Could not reload the board');
    }
  }, [board.id, toast]);

  return (
    <div className={`relative flex flex-col overflow-hidden rounded-[16px] ${className}`}
      style={{ border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>

      <SaveIndicator state={saveState} canEdit={board.can_edit} onReload={reloadAfterConflict} />

      {/* min-h-0 lets the canvas actually shrink inside a flex column — without
          it the canvas forces the container taller than the viewport. */}
      <div className="min-h-0 flex-1">
        <Excalidraw
          initialData={{
            elements: (board.document?.elements ?? []) as never,
            appState: {
              ...(board.document?.appState ?? {}),
              // Never restore a persisted theme: it must follow the app's.
              theme: isDark ? 'dark' : 'light',
            } as never,
            files: (board.document?.files ?? {}) as never,
            scrollToContent: true,
          }}
          theme={isDark ? 'dark' : 'light'}
          viewModeEnabled={!board.can_edit}
          onChange={handleChange as never}
          UIOptions={{
            canvasActions: {
              // Off because they act on the browser's local file, not this
              // board — a trainer hitting "Save to disk" and assuming the
              // board was saved is a data-loss trap.
              loadScene: false,
              saveToActiveFile: false,
              export: { saveFileToDisk: true },
              toggleTheme: false,
            },
          }}
        />
      </div>
    </div>
  );
}

function SaveIndicator({ state, canEdit, onReload }: {
  state: SaveState; canEdit: boolean; onReload: () => void;
}) {
  if (!canEdit) {
    return (
      <Bar tone="var(--text-muted)">
        <CloudOff size={13} /> Read-only — your role cannot edit whiteboards
      </Bar>
    );
  }
  switch (state.kind) {
    case 'saving':
      return <Bar tone="var(--text-muted)"><Loader2 size={13} className="animate-spin" /> Saving…</Bar>;
    case 'saved':
      return <Bar tone="var(--success)"><Check size={13} /> All changes saved</Bar>;
    case 'conflict':
      return (
        <Bar tone="var(--warning)">
          <AlertTriangle size={13} />
          <span className="flex-1">Someone else edited this board. Autosave paused.</span>
          <button onClick={onReload}
            className="inline-flex items-center gap-1 rounded-[8px] px-2 py-1 text-[11px] font-[700]"
            style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
            <RotateCcw size={11} /> Reload
          </button>
        </Bar>
      );
    case 'error':
      return (
        <Bar tone="var(--danger)">
          <AlertTriangle size={13} />
          <span className="flex-1 truncate">{state.message} — will retry</span>
        </Bar>
      );
    default:
      return <Bar tone="var(--text-disabled)">Autosaves as you draw</Bar>;
  }
}

function Bar({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-b px-3 py-1.5 text-[11.5px] font-[600]"
      style={{ borderColor: 'var(--border)', color: tone, background: 'var(--bg-subtle)' }}>
      {children}
    </div>
  );
}
