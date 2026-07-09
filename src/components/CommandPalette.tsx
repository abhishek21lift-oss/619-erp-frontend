'use client';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { allNavItems, isVisibleForRole, QUICK_ACTIONS, NAV_GROUPS } from '@/lib/nav-config';
import type { Role } from '@/lib/nav-config';
import { api, type Client } from '@/lib/api';
import type { AgentSSEEvent, AgentPlan } from '@/types/agent';

type Result = {
  id: string;
  label: string;
  sub?: string;
  icon: string;
  href: string;
  group: string;
  matchScore?: number;
};

type AiMessage = { role: 'user' | 'assistant' | 'system'; content: string };

function fuzzyScore(haystack: string, needle: string): number {
  if (!needle) return 0;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  if (h === n) return 1000;
  if (h.startsWith(n)) return 800;
  if (h.includes(n)) return 500;
  let hi = 0, ni = 0, score = 0;
  while (hi < h.length && ni < n.length) {
    if (h[hi] === n[ni]) { score += 10; ni++; }
    hi++;
  }
  return ni === n.length ? score : 0;
}

export default function CommandPalette() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [memberResults, setMemberResults] = useState<Client[]>([]);
  const [memberLoading, setMemberLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── AI mode state ──
  const [mode, setMode] = useState<'nav' | 'ai'>('nav');
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPlan, setAiPlan] = useState<AgentPlan | null>(null);
  const [aiTaskId, setAiTaskId] = useState<string | null>(null);
  const aiModeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Open / close hotkey + custom event from topbar button ──
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen(o => !o);
      } else if (e.key === 'Escape' && open) {
        if (mode === 'ai') { setMode('nav'); setAiMessages([]); setAiPlan(null); }
        else setOpen(false);
      }
    }
    function openPalette() { setOpen(true); }
    window.addEventListener('keydown', handler);
    window.addEventListener('619-cmd-palette', openPalette);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('619-cmd-palette', openPalette);
    };
  }, [open, mode]);

  // Reset state on open / close
  useEffect(() => {
    if (open) {
      setQ('');
      setActiveIdx(0);
      setMemberResults([]);
      setMode('nav');
      setAiMessages([]);
      setAiPlan(null);
      setAiTaskId(null);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // ── Auto-switch to AI mode when input starts with ? or / ──
  useEffect(() => {
    if (!open) return;
    if (aiModeTimer.current) clearTimeout(aiModeTimer.current);

    if (q.startsWith('?') || q.startsWith('/')) {
      setMode('ai');
      return;
    }
    // Auto-switch after 600ms with non-empty query that has no nav matches
    if (q.trim().length >= 3) {
      aiModeTimer.current = setTimeout(() => {
        // If nav results are empty, switch to AI
        // (we check staticResults inline rather than importing)
      }, 600);
    }
    return () => { if (aiModeTimer.current) clearTimeout(aiModeTimer.current); };
  }, [q, open]);

  // ── Fetch members (debounced, with abort) ──
  useEffect(() => {
    if (mode === 'ai') return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    if (!open || !q.trim()) { setMemberResults([]); return; }

    const controller = new AbortController();
    abortRef.current = controller;

    searchTimer.current = setTimeout(async () => {
      setMemberLoading(true);
      try {
        const res = await api.clients.list({ search: q });
        if (!controller.signal.aborted) setMemberResults(res.slice(0, 6));
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      } finally {
        if (!controller.signal.aborted) setMemberLoading(false);
      }
    }, 200);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      controller.abort();
    };
  }, [q, open, mode]);

  // ── Build static results ──
  const staticResults = useMemo<Result[]>(() => {
    const items = allNavItems()
      .filter(i => isVisibleForRole(i, user?.role));
    const navResults: Result[] = (items ?? []).map(i => ({
      id: 'nav-' + i.href,
      label: i.label,
      sub: i.groupLabel,
      icon: i.icon,
      href: i.href,
      group: 'Navigate',
    }));
    const actions: Result[] = QUICK_ACTIONS
      .filter(a => !a.roles?.length || (!!user?.role && a.roles.includes(user.role as Role)))
      .map(a => ({
        id: a.id,
        label: a.label,
        icon: a.icon,
        href: a.href,
        group: 'Quick actions',
      }));
    return [...actions, ...navResults];
  }, [user?.role]);

  // ── Combine + score ──
  const results = useMemo<Result[]>(() => {
    if (mode === 'ai') return [];
    const memberResultsMapped: Result[] = memberResults.map(c => {
      const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || c.name;
      return {
        id: 'mem-' + c.id,
        label: name,
        sub: c.mobile ? `+${c.country_code || '91'} ${c.mobile}` : (c.email || ''),
        icon: '◉',
        href: `/clients/${c.id}`,
        group: 'Members',
      };
    });

    if (!q.trim()) return staticResults.slice(0, 10);

    const scored = staticResults
      .map(r => ({ ...r, matchScore: fuzzyScore(r.label + ' ' + (r.sub || ''), q) }))
      .filter(r => (r.matchScore || 0) > 0)
      .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    return [...memberResultsMapped, ...scored].slice(0, 14);
  }, [q, staticResults, memberResults, mode]);

  // Keep activeIdx in range
  useEffect(() => { setActiveIdx(0); }, [q]);

  const choose = useCallback((r: Result) => {
    setOpen(false);
    router.push(r.href);
  }, [router]);

  // ── AI submit ──
  const submitAi = useCallback(async (message: string) => {
    if (!message.trim() || aiLoading) return;
    const text = message.startsWith('?') || message.startsWith('/') ? message.slice(1).trim() : message.trim();
    if (!text) return;

    setAiMessages(m => [...m, { role: 'user', content: text }]);
    setQ('');
    setAiLoading(true);
    setAiPlan(null);

    const token = typeof window !== 'undefined' ? document.cookie.match(/token=([^;]+)/)?.[1] : null;

    try {
      const response = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: text }),
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const evt: AgentSSEEvent = JSON.parse(line.slice(6));
            if (evt.event === 'thinking') {
              assistantMsg = evt.message;
              setAiMessages(m => {
                const last = m[m.length - 1];
                if (last?.role === 'assistant') return [...m.slice(0, -1), { ...last, content: evt.message }];
                return [...m, { role: 'assistant', content: evt.message }];
              });
            } else if (evt.event === 'action_result') {
              assistantMsg += (assistantMsg ? '\n' : '') + `• ${evt.summary}`;
              setAiMessages(m => {
                const last = m[m.length - 1];
                if (last?.role === 'assistant') return [...m.slice(0, -1), { ...last, content: assistantMsg }];
                return [...m, { role: 'assistant', content: assistantMsg }];
              });
            } else if (evt.event === 'requires_confirmation') {
              setAiPlan(evt.plan);
              setAiTaskId(evt.plan.taskId || null);
              setAiMessages(m => [...m, { role: 'system', content: `I need your approval to proceed with: ${evt.plan.summary}` }]);
            } else if (evt.event === 'done') {
              if (evt.status !== 'requires_confirmation') {
                const summary = evt.summary || 'Done.';
                setAiMessages(m => {
                  const last = m[m.length - 1];
                  if (last?.role === 'assistant') return [...m.slice(0, -1), { ...last, content: summary }];
                  return [...m, { role: 'assistant', content: summary }];
                });
              }
            } else if (evt.event === 'error') {
              setAiMessages(m => [...m, { role: 'system', content: `Error: ${evt.message}` }]);
            }
          } catch { /* skip malformed SSE lines */ }
        }
      }
    } catch (err: any) {
      setAiMessages(m => [...m, { role: 'system', content: `Request failed: ${err?.message || 'Unknown error'}` }]);
    } finally {
      setAiLoading(false);
    }
  }, [aiLoading]);

  // ── AI confirm ──
  const confirmAi = useCallback(async (approved: boolean) => {
    if (!aiPlan || !aiTaskId) return;
    setAiLoading(true);
    try {
      await api.agent.confirm(aiTaskId, aiPlan.confirmationToken, approved);
      setAiMessages(m => [...m, { role: 'system', content: approved ? 'Action completed successfully.' : 'Action cancelled.' }]);
      setAiPlan(null);
    } catch (err: any) {
      setAiMessages(m => [...m, { role: 'system', content: `Confirmation failed: ${err?.message}` }]);
    } finally {
      setAiLoading(false);
    }
  }, [aiPlan, aiTaskId]);

  // Keyboard nav inside palette
  useEffect(() => {
    if (!open || mode === 'ai') return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
      else if (e.key === 'Enter') {
        const r = results[activeIdx];
        if (r) { e.preventDefault(); choose(r); }
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, results, activeIdx, choose, mode]);

  // Scroll active row into view
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx, open]);

  if (!open) return null;

  // Group results by `group`
  const grouped: Record<string, Result[]> = {};
  results.forEach(r => {
    if (!grouped[r.group]) grouped[r.group] = [];
    grouped[r.group].push(r);
  });

  let runningIdx = 0;

  return (
    <div className="cmdk-backdrop" onMouseDown={() => setOpen(false)}>
      <div
        className="cmdk-modal"
        role="dialog"
        aria-label="Command palette"
        onMouseDown={e => e.stopPropagation()}
        style={mode === 'ai' ? { maxHeight: '70vh', display: 'flex', flexDirection: 'column' } : undefined}
      >
        {/* ── Input row ── */}
        <div className="cmdk-input-wrap">
          <span className="cmdk-icon" aria-hidden="true">{mode === 'ai' ? '✦' : '⌕'}</span>
          <input
            ref={inputRef}
            className="cmdk-input"
            placeholder={mode === 'ai' ? 'Ask 619 Command AI…' : 'Search members, jump to pages, run actions'}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => {
              if (mode === 'ai' && e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitAi(q);
              }
            }}
            autoComplete="off"
            spellCheck={false}
            aria-autocomplete="list"
          />
          {(memberLoading || aiLoading) && (
            <span className="cmdk-spinner" aria-label="Loading" aria-live="polite">…</span>
          )}
          {mode === 'nav' && <kbd className="cmdk-kbd">esc</kbd>}
          {mode === 'ai' && (
            <button
              type="button"
              onClick={() => { setMode('nav'); setAiMessages([]); setAiPlan(null); setQ(''); }}
              aria-label="Switch to navigation mode"
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-2)',
                borderRadius: 6,
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                lineHeight: '18px',
                flexShrink: 0,
                letterSpacing: '0.02em',
              }}
            >
              ✕ nav
            </button>
          )}
        </div>

        {/* ── AI mode: conversation + plan confirmation ── */}
        {mode === 'ai' && (
          <div
            role="log"
            aria-live="polite"
            aria-label="AI conversation"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              scrollbarWidth: 'thin',
            }}
          >
            {/* Empty state */}
            {aiMessages.length === 0 && !aiLoading && (
              <div className="cmdk-empty" style={{ padding: '28px 0', gap: 6 }}>
                <div style={{
                  fontSize: 28,
                  marginBottom: 4,
                  color: 'var(--accent)',
                  opacity: 0.7,
                  lineHeight: 1,
                }}>
                  ✦
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
                  Ask anything about your gym
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: 2 }}>
                  Members · Attendance · Payments · Schedules — Press Enter to send
                </div>
              </div>
            )}

            {/* Messages */}
            {aiMessages.map((msg, i) => {
              const isUser   = msg.role === 'user';
              const isSystem = msg.role === 'system';
              return (
                <div
                  key={i}
                  style={{
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '86%',
                    padding: '8px 12px',
                    borderRadius: isUser ? '14px 14px 3px 14px' : isSystem ? '10px' : '14px 14px 14px 3px',
                    background: isUser
                      ? 'var(--accent)'
                      : isSystem
                        ? 'var(--bg-subtle)'
                        : 'var(--bg-hover)',
                    color: isUser ? '#fff' : 'var(--text-primary)',
                    fontSize: 13,
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                    border: isSystem
                      ? '1px solid var(--border-2)'
                      : isUser
                        ? 'none'
                        : '1px solid var(--border)',
                    boxShadow: isUser
                      ? '0 2px 10px rgba(139,92,246,0.28)'
                      : '0 1px 4px rgba(0,0,0,0.08)',
                  }}
                >
                  {msg.content}
                </div>
              );
            })}

            {/* Plan confirmation card */}
            {aiPlan && !aiLoading && (
              <div
                style={{
                  border: '1px solid rgba(245,158,11,0.30)',
                  borderRadius: 12,
                  padding: '14px 16px',
                  background: 'rgba(245,158,11,0.06)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  marginTop: 4,
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 10,
                }}>
                  <span style={{ fontSize: 14, lineHeight: 1 }}>⚠</span>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--warning)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}>
                    Confirm Actions
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.5 }}>
                  {aiPlan.summary}
                </div>
                {aiPlan.actions?.filter(a => a.type === 'write').map((a, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 3, lineHeight: 1.4 }}>
                    · {a.description}
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={() => confirmAi(true)}
                    style={{
                      flex: 1,
                      padding: '7px 0',
                      borderRadius: 8,
                      border: 'none',
                      cursor: 'pointer',
                      background: 'var(--accent)',
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 600,
                      letterSpacing: '0.01em',
                      boxShadow: '0 2px 10px var(--accent-soft)',
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmAi(false)}
                    style={{
                      flex: 1,
                      padding: '7px 0',
                      borderRadius: 8,
                      border: '1px solid var(--border-2)',
                      cursor: 'pointer',
                      background: 'var(--bg-subtle)',
                      color: 'var(--text-muted)',
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Nav mode: standard results ── */}
        {mode === 'nav' && (
          <div className="cmdk-list" ref={listRef} role="listbox" aria-label="Search results">
            {results.length === 0 && q.trim() && (
              <div className="cmdk-empty">
                <div style={{ fontSize: 22, marginBottom: 8, color: 'var(--border-3)', lineHeight: 1 }}>○</div>
                <div style={{ fontWeight: 500 }}>No matches for &ldquo;{q}&rdquo;</div>
                <button
                  type="button"
                  onClick={() => setMode('ai')}
                  style={{
                    marginTop: 12,
                    padding: '6px 16px',
                    borderRadius: 8,
                    border: '1px solid var(--border-2)',
                    cursor: 'pointer',
                    background: 'var(--bg-subtle)',
                    color: 'var(--accent)',
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                  }}
                >
                  ✦ Ask 619 AI instead
                </button>
              </div>
            )}
            {Object.entries(grouped).map(([groupName, items]) => (
              <div key={groupName} className="cmdk-group" role="group" aria-label={groupName}>
                <div className="cmdk-group-label">{groupName}</div>
                {(items ?? []).map(r => {
                  const idx = runningIdx++;
                  const isActive = idx === activeIdx;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      data-idx={idx}
                      role="option"
                      aria-selected={isActive}
                      className={`cmdk-item${isActive ? ' is-active' : ''}`}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => choose(r)}
                    >
                      <span className="cmdk-item-icon" aria-hidden="true">{r.icon}</span>
                      <span className="cmdk-item-label">{r.label}</span>
                      {r.sub && <span className="cmdk-item-sub">{r.sub}</span>}
                      {isActive && <span className="cmdk-enter" aria-hidden="true">↵</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* ── Footer ── */}
        <div className="cmdk-footer">
          {mode === 'nav' ? (
            <>
              <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
              <span><kbd>↵</kbd> open</span>
              <span><kbd>esc</kbd> close</span>
              <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: 11 }}>
                Type <kbd>?</kbd> to ask AI
              </span>
            </>
          ) : (
            <>
              <span><kbd>↵</kbd> send</span>
              <span><kbd>esc</kbd> back to nav</span>
              <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: 11 }}>
                ✦ 619 Command AI
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
