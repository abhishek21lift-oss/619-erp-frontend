'use client';

// Phase 3 — the Command Center's data feed.
//
// One hook, two transports, one render path. The component above it does not
// know or care which one is live: it gets a snapshot and a label saying how it
// arrived.
//
// ── Polling is not the fallback, it is the floor ─────────────────────────────
//
// The HTTP snapshot endpoint is fetched immediately on mount, before the socket
// is even attempted. A console that shows skeletons while a WebSocket
// handshake, a ticket round trip and a TLS negotiation complete is slower to
// first paint than the polling version it replaced, which would make the
// realtime feature a downgrade for the first second of every visit.
//
// From there the stream takes over if it can. If it cannot — no
// NEXT_PUBLIC_API_URL, nginx without the Upgrade block, a corporate proxy that
// strips WebSockets, the backend started with COMMAND_CENTER_STREAM=off — the
// poll simply keeps running and the operator sees a 5s console instead of a 1s
// one. That degradation is silent by design in behaviour and explicit in the
// UI: the header says which transport is live, because "why is this screen
// stale" is a question an operator should never have to guess at.
//
// ── Why the socket closes when the tab is hidden ─────────────────────────────
//
// The server collects once per tick for as long as ANY client is connected, and
// those collects hit Postgres and Redis. A console left open in a background
// tab overnight would keep that load on forever for nobody's benefit. Hidden
// means disconnect; visible means reconnect and immediately re-fetch, so
// returning to the tab shows current state rather than a frozen one.

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { wsBase } from '@/lib/http';
import type { CommandCenterSnapshot } from '@/lib/api';

export type Transport = 'stream' | 'polling';

export interface CommandCenterFeed {
  snap: CommandCenterSnapshot | null;
  error: string;
  loading: boolean;
  refreshing: boolean;
  /** Which transport is currently delivering data. */
  transport: Transport;
  /**
   * Every snapshot this hook has actually received this visit, oldest first,
   * capped at HISTORY_LIMIT. Not a backend history endpoint — there isn't
   * one — just the real frames that already flowed through this hook,
   * retained instead of discarded. What a card's trend sparkline reads.
   */
  history: CommandCenterSnapshot[];
  /** Force a fresh probe — over the socket when it is up, over HTTP otherwise. */
  refresh: () => void;
}

/** Reconnect backoff. Capped so a long outage does not become a long wait. */
const RETRY_BASE_MS = 1_000;
const RETRY_MAX_MS = 30_000;

/** The spinner cannot wait forever on a frame that may never come. */
const REFRESH_SPINNER_TIMEOUT_MS = 5_000;

/** Enough points for a real shape (a stream tick every second, a poll every
 *  five) without holding the whole visit in memory. */
const HISTORY_LIMIT = 30;

function isSnapshot(v: unknown): v is CommandCenterSnapshot {
  return !!v && typeof v === 'object' && 'cards' in v && 'status' in v;
}

export function useCommandCenterSnapshot(pollMs: number): CommandCenterFeed {
  const [snap, setSnap] = useState<CommandCenterSnapshot | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transport, setTransport] = useState<Transport>('polling');
  const [history, setHistory] = useState<CommandCenterSnapshot[]>([]);

  // The whole machine lives in one effect so the pieces can call each other
  // without a dependency cycle between useCallbacks. `refreshRef` is how the
  // returned callback reaches into it.
  const refreshRef = useRef<() => void>(() => {});

  useEffect(() => {
    let alive = true;
    let sock: WebSocket | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let spinnerTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const apply = (data: CommandCenterSnapshot) => {
      if (!alive) return;
      setSnap(data);
      setHistory((prev) => [...prev, data].slice(-HISTORY_LIMIT));
      setError('');
      setLoading(false);
      setRefreshing(false);
      if (spinnerTimer) { clearTimeout(spinnerTimer); spinnerTimer = null; }
    };

    const loadHttp = async (fresh = false) => {
      try {
        const res = await api.superAdmin.commandCenter({ fresh });
        apply(res.data);
      } catch (err: unknown) {
        // Only a total failure lands here — a single sick collector comes back
        // inside the payload as a red card, which is the whole design.
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Failed to load the Command Center');
        setLoading(false);
        setRefreshing(false);
      }
    };

    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = setInterval(() => { loadHttp(); }, pollMs);
    };

    const stopPolling = () => {
      if (!pollTimer) return;
      clearInterval(pollTimer);
      pollTimer = null;
    };

    const scheduleReconnect = () => {
      if (!alive || retryTimer) return;
      // Exponential with jitter: several tabs reconnecting after the same
      // backend restart should not arrive in lockstep.
      const base = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** attempts);
      const delay = base * (0.8 + Math.random() * 0.4);
      attempts += 1;
      retryTimer = setTimeout(() => { retryTimer = null; openStream(); }, delay);
    };

    const closeStream = () => {
      if (!sock) return;
      const s = sock;
      sock = null;
      // Detached first: the handlers below react to an UNEXPECTED close by
      // reconnecting, and this one is deliberate.
      s.onopen = null;
      s.onmessage = null;
      s.onerror = null;
      s.onclose = null;
      try { s.close(); } catch { /* already gone */ }
    };

    const openStream = async () => {
      if (!alive || sock) return;
      if (typeof document !== 'undefined' && document.hidden) return;

      const origin = wsBase();
      // Nothing configured — the deployment has no separate API origin to open
      // a socket against. Stay on the poll and stop trying.
      if (!origin) { startPolling(); return; }

      let ticket: string;
      let path: string;
      try {
        const res = await api.superAdmin.commandCenterStreamTicket();
        ticket = res.data.ticket;
        path = res.data.path;
      } catch {
        // The ticket route is behind the same auth as everything else here, so
        // a failure is either a session problem (the http layer is already
        // handling it) or the backend being unreachable — which the poll will
        // surface with a real error message.
        startPolling();
        scheduleReconnect();
        return;
      }
      if (!alive) return;

      let ws: WebSocket;
      try {
        ws = new WebSocket(`${origin}${path}?ticket=${encodeURIComponent(ticket)}`);
      } catch {
        startPolling();
        scheduleReconnect();
        return;
      }
      sock = ws;

      ws.onopen = () => {
        if (!alive) return;
        attempts = 0;
        setTransport('stream');
        // Only now: until the socket is actually open, the poll is the only
        // thing keeping the screen current.
        stopPolling();
      };

      ws.onmessage = (ev) => {
        let msg: unknown;
        try { msg = JSON.parse(String(ev.data)); } catch { return; }
        if (!msg || typeof msg !== 'object') return;
        const m = msg as { type?: string; data?: unknown; message?: string };
        if (m.type === 'snapshot' && isSnapshot(m.data)) apply(m.data);
        // An error frame means one collect failed server-side, not that the
        // stream is broken. The card grid already shows per-card failure, so
        // this is not surfaced as a screen-level error — the next frame will
        // carry the real state.
      };

      ws.onerror = () => {
        // Always followed by onclose, which does the work. Handled only so an
        // error event does not surface as an unhandled one.
      };

      ws.onclose = () => {
        if (!alive) return;
        sock = null;
        setTransport('polling');
        setRefreshing(false);
        startPolling();
        scheduleReconnect();
      };
    };

    refreshRef.current = () => {
      if (!alive) return;
      setRefreshing(true);
      if (sock && sock.readyState === WebSocket.OPEN) {
        try {
          sock.send(JSON.stringify({ type: 'refresh' }));
          // The reply is an ordinary snapshot frame, so the spinner is cleared
          // by apply(). This guard exists for the case where the server
          // swallowed the request — its refresh is rate limited — and no frame
          // is attributable to this press.
          if (spinnerTimer) clearTimeout(spinnerTimer);
          spinnerTimer = setTimeout(() => { if (alive) setRefreshing(false); }, REFRESH_SPINNER_TIMEOUT_MS);
          return;
        } catch { /* fall through to HTTP */ }
      }
      loadHttp(true);
    };

    const onVisibility = () => {
      if (!alive) return;
      if (document.hidden) {
        closeStream();
        if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
        stopPolling();
        setTransport('polling');
      } else {
        attempts = 0;
        // Immediately, not on the next tick: a tab returned to after ten
        // minutes must not show ten-minute-old numbers for a second.
        loadHttp();
        startPolling();
        openStream();
      }
    };

    // First paint over HTTP, then upgrade.
    loadHttp();
    startPolling();
    openStream();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisibility);
      closeStream();
      stopPolling();
      if (retryTimer) clearTimeout(retryTimer);
      if (spinnerTimer) clearTimeout(spinnerTimer);
    };
  }, [pollMs]);

  const refresh = useCallback(() => { refreshRef.current(); }, []);

  return { snap, error, loading, refreshing, transport, history, refresh };
}
