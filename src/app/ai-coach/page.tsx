'use client';

// AI Coach — a working chat console, not a landing page.
//
// This replaced a 590-line marketing page (hero headline, "PROCESS 01/02/03",
// stat tiles advertising "4 tools / <10s response"). That copy sells a feature
// to someone who hasn't bought it; this screen is opened by staff who already
// own it and want to ask something. The chat is now the page, with the four
// generators demoted to a launcher row and everything else cut.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { m, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Send, Square, Copy, Check, RotateCcw, Plus, Search, X, Trash2,
  Pin, PinOff, Pencil, MessageSquare, PanelLeft, Download, User, BookOpen,
  Dumbbell, Apple, TrendingUp, BarChart3, Database, Loader2, AlertTriangle,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import ChatMarkdown from '@/components/fitness/ChatMarkdown';
import { api } from '@/lib/api';
import { apiBase } from '@/lib/http';
import { useToast } from '@/lib/toast';
import { useAuth } from '@/lib/auth-context';
import { normaliseRole } from '@/lib/nav-config';
import type { AiConversation, Client } from '@/lib/api';

/* ── Types ─────────────────────────────────────────────────────────────── */

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  error?: boolean;
  /** Studio documents the answer was grounded in (RAG). */
  sources?: string[];
  /** Live-data tools consulted (client lookup, revenue, attendance…). */
  tools?: string[];
}

interface StreamEvent {
  type: 'start' | 'chunk' | 'sources' | 'tools' | 'done' | 'error';
  content?: string;
  message?: string;
  conversation_id?: string;
  sources?: string[];
  tools?: string[];
}

/* ── Suggested prompts ─────────────────────────────────────────────────────
 * Grouped by what they exercise, and every one is a question the backend can
 * actually answer well — the studio-data ones hit the tool layer, the rest
 * hit general coaching knowledge. Clicking sends immediately; a suggestion
 * that only fills the box is a second click for nothing.
 */
const PROMPT_GROUPS: { label: string; accent: string; prompts: string[] }[] = [
  {
    label: 'Studio',
    accent: '#22d3ee',
    prompts: [
      'How many active clients do we have?',
      'What was our revenue this month?',
      'Who has outstanding dues?',
      'How was attendance this week?',
    ],
  },
  {
    label: 'Coaching',
    accent: '#a78bfa',
    prompts: [
      'Design a 4-week fat-loss block for a beginner',
      'What exercises target back for a beginner?',
      'How should I progress a client stuck on bench press?',
    ],
  },
  {
    label: 'Nutrition',
    accent: '#34d399',
    prompts: [
      'Build a 2,000 kcal vegetarian day with 150g protein',
      'Explain protein timing around training',
    ],
  },
];

const GENERATORS = [
  { href: '/ai/workout-generator', icon: Dumbbell,   label: 'Workout Plan', color: '#60a5fa' },
  { href: '/ai/diet-generator',    icon: Apple,      label: 'Diet Plan',    color: '#34d399' },
  { href: '/ai/progress-analysis', icon: TrendingUp, label: 'Progress',     color: '#fbbf24' },
  { href: '/ai/business-insights', icon: BarChart3,  label: 'Business',     color: '#c084fc', adminOnly: true },
];

const ACCENT = 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)';
const VIOLET = '#a78bfa';

function fmtRelative(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function AiCoachPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const role = normaliseRole(user?.role);
  const isAdminOrManager = role === 'admin' || role === 'manager';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [historyQuery, setHistoryQuery] = useState('');
  const [railOpen, setRailOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [clientQuery, setClientQuery] = useState('');

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  /** Last user message, so Regenerate can resend it without re-reading state. */
  const lastUserMsgRef = useRef<string>('');

  /* ── Data loading ──────────────────────────────────────────────────── */

  const loadConversations = useCallback(async () => {
    try {
      const res = await api.ai.conversations({ limit: 50 });
      setConversations(res.data ?? []);
    } catch { /* history is non-critical — a failure here must not block chat */ }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    api.pt.clients()
      .then((r) => setClients(((r?.data ?? []) as Client[])))
      .catch(() => { /* client attach is optional */ });
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, streaming]);

  /* ── Streaming send ────────────────────────────────────────────────── */

  const send = useCallback(async (text: string, opts?: { regenerate?: boolean }) => {
    const body = text.trim();
    if (!body || streaming) return;

    const regenerate = Boolean(opts?.regenerate);
    lastUserMsgRef.current = body;

    if (regenerate) {
      // Drop the answer being replaced so the new one streams into its place
      // rather than stacking a second reply under the same question.
      setMessages((prev) => {
        const next = [...prev];
        while (next.length && next[next.length - 1].role === 'assistant') next.pop();
        return next;
      });
    } else {
      setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', content: body }]);
      setInput('');
    }

    setStreaming(true);
    const replyId = `a-${Date.now()}`;
    let acc = '';
    let started = false;
    let pendingSources: string[] | undefined;
    let pendingTools: string[] | undefined;

    const controller = new AbortController();
    abortRef.current = controller;

    const pushReply = (content: string, error = false) =>
      setMessages((prev) => [...prev, { id: replyId, role: 'assistant', content, error, sources: pendingSources, tools: pendingTools }]);
    const updateReply = (content: string) =>
      setMessages((prev) => prev.map((msg) => (msg.id === replyId ? { ...msg, content, sources: pendingSources, tools: pendingTools } : msg)));

    try {
      const res = await fetch(`${apiBase()}/api/ai/chat`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: body,
          conversation_id: conversationId ?? undefined,
          client_id: selectedClient?.id,
          regenerate,
        }),
      });
      if (!res.ok || !res.body) {
        throw new Error(res.status === 401 ? 'Your session has expired — please sign in again.' : `Request failed (${res.status}).`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          let evt: StreamEvent;
          try { evt = JSON.parse(raw) as StreamEvent; } catch { continue; }

          if (evt.type === 'start' && evt.conversation_id) {
            setConversationId(evt.conversation_id);
          } else if (evt.type === 'sources') {
            pendingSources = evt.sources;
          } else if (evt.type === 'tools') {
            pendingTools = evt.tools;
          } else if (evt.type === 'chunk') {
            acc += evt.content ?? '';
            if (!started) { started = true; pushReply(acc); } else updateReply(acc);
          } else if (evt.type === 'done') {
            if (evt.conversation_id) setConversationId(evt.conversation_id);
          } else if (evt.type === 'error') {
            throw new Error(evt.message || 'The coach ran into a problem.');
          }
        }
      }

      if (!started) pushReply("I couldn't generate a reply just now — please try again.", true);
      loadConversations();
    } catch (err) {
      // A user-pressed Stop is not a failure — keep whatever streamed.
      if (controller.signal.aborted) { loadConversations(); return; }
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      if (!started) pushReply(`⚠️ ${msg}`, true);
      else updateReply(`${acc}\n\n⚠️ ${msg}`);
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [streaming, conversationId, selectedClient, loadConversations]);

  const stop = () => abortRef.current?.abort();

  /* ── Conversation actions ──────────────────────────────────────────── */

  const newChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setConversationId(null);
    setInput('');
    setRailOpen(false);
    composerRef.current?.focus();
  };

  const openConversation = async (id: string) => {
    abortRef.current?.abort();
    setRailOpen(false);
    try {
      const res = await api.ai.conversation(id);
      const loaded = (res.data.messages ?? []).map((msg, i) => ({
        id: msg.id || `h-${i}`,
        role: msg.role,
        content: msg.content,
      })) as ChatMessage[];
      setMessages(loaded);
      setConversationId(id);
      // Seed the regenerate source from the loaded thread. Without this,
      // "Try again" on a conversation opened from history would call send('')
      // — which returns early — and appear to do nothing at all.
      const lastUser = [...loaded].reverse().find((msg) => msg.role === 'user');
      lastUserMsgRef.current = lastUser?.content ?? '';
      // Sources/tools aren't persisted per message, so a reloaded thread shows
      // the text without its chips — the answer itself is unchanged.
    } catch {
      toast.error('Could not open that conversation.');
    }
  };

  const removeConversation = async (id: string) => {
    if (!window.confirm('Delete this conversation? This cannot be undone.')) return;
    try {
      await api.ai.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (conversationId === id) newChat();
    } catch {
      toast.error('Could not delete that conversation.');
    }
  };

  const togglePin = async (conv: AiConversation) => {
    const next = !conv.pinned;
    setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, pinned: next } : c)));
    try {
      await api.ai.updateConversation(conv.id, { pinned: next });
      loadConversations(); // re-sorts pinned to the top server-side
    } catch {
      setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, pinned: !next } : c)));
      toast.error('Could not update that conversation.');
    }
  };

  const commitRename = async (id: string) => {
    const title = renameDraft.trim();
    setRenamingId(null);
    if (!title) return;
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
    try {
      await api.ai.updateConversation(id, { title });
    } catch {
      toast.error('Could not rename that conversation.');
      loadConversations();
    }
  };

  const copyMessage = async (msg: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      toast.error('Could not copy to clipboard.');
    }
  };

  /** Exports the open thread as a markdown file — the format it's authored in. */
  const exportChat = () => {
    if (!messages.length) return;
    const body = messages
      .map((msg) => (msg.role === 'user' ? `## You\n\n${msg.content}` : `## AI Coach\n\n${msg.content}`))
      .join('\n\n---\n\n');
    const blob = new Blob([`# AI Coach conversation\n\n${body}\n`], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-coach-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* ── Derived ───────────────────────────────────────────────────────── */

  const filteredConversations = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) =>
      (c.title ?? '').toLowerCase().includes(q) || (c.last_message ?? '').toLowerCase().includes(q));
  }, [conversations, historyQuery]);

  const filteredClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    const list = q ? clients.filter((c) => (c.name ?? '').toLowerCase().includes(q)) : clients;
    return list.slice(0, 8);
  }, [clients, clientQuery]);

  const visibleGenerators = GENERATORS.filter((g) => !g.adminOnly || isAdminOrManager);
  const isEmpty = messages.length === 0;

  /* ── Render ────────────────────────────────────────────────────────── */

  return (
    <Guard>
      {/* No `title` prop: AppShell would render its own <h1>AI Coach</h1> above
          this, duplicating the in-chat header and eating height the fixed
          layout below has to account for. */}
      <AppShell>
        {/* data-no-pull-refresh: the message list owns vertical dragging, so
            pulling at its top must not also trigger the shell's global
            pull-to-refresh. */}
        <div
          className="ai-chat-shell flex"
          data-no-pull-refresh
        >
          {/* ── History rail ───────────────────────────────────────── */}
          <ConversationRail
            open={railOpen}
            onClose={() => setRailOpen(false)}
            conversations={filteredConversations}
            activeId={conversationId}
            query={historyQuery}
            onQuery={setHistoryQuery}
            onNew={newChat}
            onOpen={openConversation}
            onDelete={removeConversation}
            onTogglePin={togglePin}
            renamingId={renamingId}
            renameDraft={renameDraft}
            onRenameStart={(c) => { setRenamingId(c.id); setRenameDraft(c.title ?? ''); }}
            onRenameChange={setRenameDraft}
            onRenameCommit={commitRename}
            onRenameCancel={() => setRenamingId(null)}
          />

          {/* ── Chat column ────────────────────────────────────────── */}
          <div className="flex min-w-0 flex-1 flex-col">

            {/* Header */}
            <header
              className="flex shrink-0 items-center gap-2 px-3 py-2.5 sm:px-5"
              style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}
            >
              <button
                onClick={() => setRailOpen(true)}
                aria-label="Conversation history"
                className="flex h-9 w-9 items-center justify-center rounded-[10px] lg:hidden"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              >
                <PanelLeft size={15} />
              </button>

              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]"
                style={{ background: ACCENT, boxShadow: '0 3px 14px rgba(124,58,237,0.35)' }}
              >
                <Sparkles size={16} color="#fff" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-[760]" style={{ color: 'var(--text-primary)' }}>AI Coach</p>
                <p className="truncate text-[10.5px]" style={{ color: 'var(--text-muted)' }}>
                  Answers from your studio&apos;s live data &amp; documents
                </p>
              </div>

              {/* Client attach */}
              <ClientAttach
                selected={selectedClient}
                open={clientPickerOpen}
                query={clientQuery}
                options={filteredClients}
                onToggle={() => setClientPickerOpen((v) => !v)}
                onQuery={setClientQuery}
                onSelect={(c) => { setSelectedClient(c); setClientPickerOpen(false); setClientQuery(''); }}
                onClear={() => setSelectedClient(null)}
              />

              {messages.length > 0 && (
                <button
                  onClick={exportChat}
                  title="Export conversation as Markdown"
                  aria-label="Export conversation"
                  className="hidden h-9 w-9 items-center justify-center rounded-[10px] sm:flex"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                >
                  <Download size={14} />
                </button>
              )}

              <button
                onClick={newChat}
                className="flex h-9 items-center gap-1.5 rounded-[10px] px-3 text-[12px] font-[700]"
                style={{ background: ACCENT, color: '#fff', boxShadow: '0 3px 14px rgba(124,58,237,0.3)' }}
              >
                <Plus size={13} /> <span className="hidden sm:inline">New</span>
              </button>
            </header>

            {/* Messages / empty state */}
            <div className="min-h-0 flex-1 overflow-y-auto" style={{ background: 'var(--bg-canvas)' }}>
              <div className="mx-auto w-full max-w-3xl px-3 py-5 sm:px-5">
                {isEmpty ? (
                  <EmptyState
                    onPrompt={(p) => send(p)}
                    generators={visibleGenerators}
                    onGenerator={(href) => router.push(href)}
                    onKnowledgeBase={isAdminOrManager ? () => router.push('/ai-coach/knowledge') : undefined}
                  />
                ) : (
                  <div className="flex flex-col gap-4">
                    {messages.map((msg, i) => (
                      <MessageBubble
                        key={msg.id}
                        msg={msg}
                        copied={copiedId === msg.id}
                        onCopy={() => copyMessage(msg)}
                        // Regenerate belongs only on the final answer — an
                        // older one can't be replaced without discarding the
                        // turns that came after it.
                        canRegenerate={
                          msg.role === 'assistant' && !msg.error && i === messages.length - 1 && !streaming
                        }
                        onRegenerate={() => send(lastUserMsgRef.current, { regenerate: true })}
                      />
                    ))}
                    {streaming && messages[messages.length - 1]?.role === 'user' && <TypingDots />}
                    <div ref={endRef} />
                  </div>
                )}
              </div>
            </div>

            {/* Composer */}
            <div
              className="shrink-0 px-3 pt-2.5 sm:px-5"
              style={{
                borderTop: '1px solid var(--border)',
                background: 'var(--bg-card)',
                paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
              }}
            >
              <div className="mx-auto flex w-full max-w-3xl items-end gap-2">
                <textarea
                  ref={composerRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
                  }}
                  rows={1}
                  placeholder="Ask about a client, your studio's numbers, training, nutrition…"
                  className="flex-1 resize-none rounded-[14px] px-3.5 py-2.5 text-[13px] outline-none"
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1.5px solid var(--border)',
                    color: 'var(--text-primary)',
                    maxHeight: 140,
                    minHeight: 42,
                  }}
                />
                {streaming ? (
                  <button
                    onClick={stop}
                    aria-label="Stop generating"
                    className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[13px]"
                    style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
                  >
                    <Square size={14} fill="currentColor" />
                  </button>
                ) : (
                  <button
                    onClick={() => send(input)}
                    disabled={!input.trim()}
                    aria-label="Send"
                    className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[13px] transition-opacity disabled:opacity-40"
                    style={{ background: ACCENT, color: '#fff', boxShadow: '0 4px 16px rgba(124,58,237,0.32)' }}
                  >
                    <Send size={15} />
                  </button>
                )}
              </div>
              <p className="mx-auto mt-1.5 max-w-3xl text-center text-[10px]" style={{ color: 'var(--text-disabled)' }}>
                AI can make mistakes — apply your own judgement before acting on a recommendation.
              </p>
            </div>
          </div>
        </div>

        {/* A chat console wants the message list to scroll on its own with the
            composer pinned, which needs an exact height — but .shell-main
            (globals.css) wraps every page in padding that differs by
            breakpoint, and on mobile that padding also reserves space for the
            bottom nav. So each breakpoint cancels its own padding with a
            matching negative margin, then subtracts only what is genuinely
            unavailable: the top bar always, plus the bottom nav where it
            exists. Keep these in step with .shell-main if its padding changes. */}
        <style>{`
          .ai-chat-shell {
            margin: -16px;
            margin-bottom: calc(-1 * (var(--bottom-nav-h) + env(safe-area-inset-bottom, 0px) + 16px));
            height: calc(100dvh - var(--topbar-h, 46px) - var(--bottom-nav-h) - env(safe-area-inset-bottom, 0px));
            overflow: hidden;
          }
          @media (min-width: 768px) {
            .ai-chat-shell {
              margin: -24px;
              margin-bottom: calc(-1 * (var(--bottom-nav-h) + env(safe-area-inset-bottom, 0px) + 16px));
            }
          }
          @media (min-width: 1024px) {
            .ai-chat-shell {
              margin: -24px;
              margin-bottom: -32px;
              height: calc(100dvh - var(--topbar-h, 46px));
            }
          }
        `}</style>
      </AppShell>
    </Guard>
  );
}

/* ── Conversation rail ─────────────────────────────────────────────────── */

interface RailProps {
  open: boolean;
  onClose: () => void;
  conversations: AiConversation[];
  activeId: string | null;
  query: string;
  onQuery: (v: string) => void;
  onNew: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePin: (c: AiConversation) => void;
  renamingId: string | null;
  renameDraft: string;
  onRenameStart: (c: AiConversation) => void;
  onRenameChange: (v: string) => void;
  onRenameCommit: (id: string) => void;
  onRenameCancel: () => void;
}

function ConversationRail(props: RailProps) {
  const { open, onClose, conversations, activeId, query, onQuery, onNew } = props;

  const body = (
    <div className="flex h-full flex-col" style={{ background: 'var(--bg-card)' }}>
      <div className="flex items-center gap-2 p-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={onNew}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-[11px] py-2 text-[12.5px] font-[700]"
          style={{ background: ACCENT, color: '#fff' }}
        >
          <Plus size={14} /> New chat
        </button>
        <button
          onClick={onClose}
          aria-label="Close history"
          className="flex h-9 w-9 items-center justify-center rounded-[10px] lg:hidden"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
        >
          <X size={15} />
        </button>
      </div>

      <div className="px-3 pt-3">
        <div
          className="flex items-center gap-2 rounded-[10px] px-2.5 py-2"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
        >
          <Search size={13} style={{ color: 'var(--text-disabled)' }} />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search chats"
            className="min-w-0 flex-1 bg-transparent text-[12px] outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
          {query && (
            <button onClick={() => onQuery('')} aria-label="Clear search" style={{ color: 'var(--text-disabled)' }}>
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {conversations.length === 0 ? (
          <p className="px-2 py-6 text-center text-[11.5px]" style={{ color: 'var(--text-disabled)' }}>
            {query ? 'No chats match that search.' : 'No conversations yet.'}
          </p>
        ) : (
          conversations.map((c) => (
            <RailRow key={c.id} conv={c} active={c.id === activeId} {...props} />
          ))
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: permanent column */}
      <aside className="hidden w-[268px] shrink-0 lg:block" style={{ borderRight: '1px solid var(--border)' }}>
        {body}
      </aside>

      {/* Mobile: slide-over */}
      <AnimatePresence>
        {open && (
          <>
            <m.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-[60] lg:hidden"
              style={{ background: 'rgba(0,0,0,0.45)' }}
            />
            <m.aside
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 340 }}
              className="fixed inset-y-0 left-0 z-[61] w-[280px] lg:hidden"
              style={{ boxShadow: '8px 0 32px rgba(0,0,0,0.25)' }}
            >
              {body}
            </m.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function RailRow({
  conv, active, onOpen, onDelete, onTogglePin,
  renamingId, renameDraft, onRenameStart, onRenameChange, onRenameCommit, onRenameCancel,
}: RailProps & { conv: AiConversation; active: boolean }) {
  const isRenaming = renamingId === conv.id;

  if (isRenaming) {
    return (
      <div className="mb-1 rounded-[10px] p-1.5" style={{ background: 'var(--bg-subtle)' }}>
        <input
          autoFocus
          value={renameDraft}
          onChange={(e) => onRenameChange(e.target.value)}
          onBlur={() => onRenameCommit(conv.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); onRenameCommit(conv.id); }
            if (e.key === 'Escape') onRenameCancel();
          }}
          className="w-full rounded-[7px] px-2 py-1.5 text-[12px] outline-none"
          style={{ background: 'var(--bg-card)', border: `1.5px solid ${VIOLET}`, color: 'var(--text-primary)' }}
        />
      </div>
    );
  }

  return (
    <div
      className="group mb-1 flex items-center gap-1 rounded-[10px] px-2 py-2"
      style={{
        background: active ? 'rgba(139,92,246,0.12)' : 'transparent',
        border: `1px solid ${active ? 'rgba(139,92,246,0.28)' : 'transparent'}`,
      }}
    >
      <button onClick={() => onOpen(conv.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        {conv.pinned
          ? <Pin size={11} style={{ color: VIOLET, flexShrink: 0 }} />
          : <MessageSquare size={11} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-[620]" style={{ color: active ? VIOLET : 'var(--text-primary)' }}>
            {conv.title || 'Untitled chat'}
          </span>
          <span className="block truncate text-[10px]" style={{ color: 'var(--text-disabled)' }}>
            {fmtRelative(conv.updated_at)}
          </span>
        </span>
      </button>

      {/* Actions stay mounted (opacity-only) so they don't reflow the row on
          hover; on touch there's no hover, so they're always visible there. */}
      <span className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
        <IconBtn label={conv.pinned ? 'Unpin' : 'Pin'} onClick={() => onTogglePin(conv)}>
          {conv.pinned ? <PinOff size={11} /> : <Pin size={11} />}
        </IconBtn>
        <IconBtn label="Rename" onClick={() => onRenameStart(conv)}><Pencil size={11} /></IconBtn>
        <IconBtn label="Delete" danger onClick={() => onDelete(conv.id)}><Trash2 size={11} /></IconBtn>
      </span>
    </div>
  );
}

function IconBtn({ children, label, onClick, danger }: {
  children: React.ReactNode; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex h-6 w-6 items-center justify-center rounded-[6px]"
      style={{ color: danger ? '#ef4444' : 'var(--text-disabled)' }}
    >
      {children}
    </button>
  );
}

/* ── Client attach ─────────────────────────────────────────────────────── */

function ClientAttach({ selected, open, query, options, onToggle, onQuery, onSelect, onClear }: {
  selected: Client | null; open: boolean; query: string; options: Client[];
  onToggle: () => void; onQuery: (v: string) => void; onSelect: (c: Client) => void; onClear: () => void;
}) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        title={selected ? `Coaching about ${selected.name}` : 'Attach a client for context'}
        className="flex h-9 items-center gap-1.5 rounded-[10px] px-2.5 text-[11.5px] font-[650]"
        style={{
          background: selected ? 'rgba(139,92,246,0.12)' : 'var(--bg-subtle)',
          border: `1px solid ${selected ? 'rgba(139,92,246,0.3)' : 'var(--border)'}`,
          color: selected ? VIOLET : 'var(--text-muted)',
          maxWidth: 150,
        }}
      >
        <User size={13} />
        <span className="hidden truncate sm:inline">{selected ? selected.name : 'Client'}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[70]" onClick={onToggle} />
          <div
            className="absolute right-0 top-full z-[71] mt-1.5 w-[240px] overflow-hidden rounded-[13px] p-1.5"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 14px 36px rgba(0,0,0,0.2)' }}
          >
            <input
              autoFocus
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Search clients…"
              className="mb-1 w-full rounded-[9px] px-2.5 py-2 text-[12px] outline-none"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            {selected && (
              <button
                onClick={onClear}
                className="mb-1 w-full rounded-[8px] px-2.5 py-1.5 text-left text-[11.5px] font-[650]"
                style={{ color: '#ef4444' }}
              >
                Clear selection
              </button>
            )}
            <div className="max-h-[220px] overflow-y-auto">
              {options.length === 0 ? (
                <p className="px-2.5 py-3 text-center text-[11.5px]" style={{ color: 'var(--text-disabled)' }}>No clients found.</p>
              ) : options.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelect(c)}
                  className="block w-full truncate rounded-[8px] px-2.5 py-2 text-left text-[12px]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Empty state ───────────────────────────────────────────────────────── */

function EmptyState({ onPrompt, generators, onGenerator, onKnowledgeBase }: {
  onPrompt: (p: string) => void;
  generators: typeof GENERATORS;
  onGenerator: (href: string) => void;
  onKnowledgeBase?: () => void;
}) {
  return (
    <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="py-6">
      <div className="mb-6 text-center">
        <div
          className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-[18px]"
          style={{ background: ACCENT, boxShadow: '0 8px 30px rgba(124,58,237,0.4)' }}
        >
          <Sparkles size={24} color="#fff" />
        </div>
        <h1 className="text-[22px] font-[820] tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
          What can I help with?
        </h1>
        <p className="mx-auto mt-1.5 max-w-md text-[12.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          I read your studio&apos;s live records — clients, attendance, revenue, dues — and any SOPs
          you&apos;ve uploaded, so answers are about <em>your</em> studio, not generic advice.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-3">
        {PROMPT_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 text-[9.5px] font-[750] uppercase tracking-[0.08em]" style={{ color: group.accent }}>
              {group.label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {group.prompts.map((p) => (
                <button
                  key={p}
                  onClick={() => onPrompt(p)}
                  className="rounded-full px-3 py-1.5 text-left text-[11.5px] font-[560] transition-transform active:scale-[0.97]"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <p className="mb-2 text-[9.5px] font-[750] uppercase tracking-[0.08em]" style={{ color: 'var(--text-disabled)' }}>
          Structured generators
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {generators.map((g) => (
            <button
              key={g.href}
              onClick={() => onGenerator(g.href)}
              className="flex items-center gap-2 rounded-[12px] px-3 py-2.5 text-left transition-transform active:scale-[0.98]"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <g.icon size={15} style={{ color: g.color, flexShrink: 0 }} />
              <span className="truncate text-[11.5px] font-[650]" style={{ color: 'var(--text-secondary)' }}>{g.label}</span>
            </button>
          ))}
        </div>
        {onKnowledgeBase && (
          <button
            onClick={onKnowledgeBase}
            className="mt-2 flex w-full items-center gap-2 rounded-[12px] px-3 py-2.5 text-left"
            style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)' }}
          >
            <BookOpen size={15} style={{ color: VIOLET, flexShrink: 0 }} />
            <span className="text-[11.5px] font-[650]" style={{ color: 'var(--text-secondary)' }}>
              Knowledge Base — upload SOPs the coach should answer from
            </span>
          </button>
        )}
      </div>
    </m.div>
  );
}

/* ── Message bubble ────────────────────────────────────────────────────── */

function MessageBubble({ msg, copied, onCopy, canRegenerate, onRegenerate }: {
  msg: ChatMessage; copied: boolean; onCopy: () => void;
  canRegenerate: boolean; onRegenerate: () => void;
}) {
  const isUser = msg.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[85%] rounded-[16px] rounded-br-[5px] px-3.5 py-2.5"
          style={{ background: ACCENT, color: '#fff' }}
        >
          <p className="whitespace-pre-wrap text-[13px] leading-[1.5]">{msg.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex gap-2.5">
      <div
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px]"
        style={{ background: msg.error ? 'rgba(239,68,68,0.12)' : 'rgba(139,92,246,0.14)' }}
      >
        {msg.error
          ? <AlertTriangle size={13} style={{ color: '#ef4444' }} />
          : <Sparkles size={13} style={{ color: VIOLET }} />}
      </div>

      <div className="min-w-0 flex-1">
        <div
          className="rounded-[16px] rounded-tl-[5px] px-3.5 py-2.5"
          style={{
            background: msg.error ? 'rgba(239,68,68,0.06)' : 'var(--bg-card)',
            border: `1px solid ${msg.error ? 'rgba(239,68,68,0.2)' : 'var(--border)'}`,
          }}
        >
          <ChatMarkdown content={msg.content} tone="themed" size={13} />

          {(msg.sources?.length || msg.tools?.length) ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
              {msg.sources?.length ? (
                <>
                  <span className="flex items-center gap-1 text-[9px] font-[750] uppercase tracking-[0.05em]" style={{ color: 'var(--text-disabled)' }}>
                    <BookOpen size={9} /> Sources
                  </span>
                  {msg.sources.map((s) => (
                    <span key={s} className="rounded-full px-2 py-0.5 text-[10px] font-[620]"
                      style={{ background: 'rgba(139,92,246,0.12)', color: VIOLET }}>{s}</span>
                  ))}
                </>
              ) : null}
              {msg.tools?.length ? (
                <>
                  <span className="flex items-center gap-1 text-[9px] font-[750] uppercase tracking-[0.05em]" style={{ color: 'var(--text-disabled)' }}>
                    <Database size={9} /> Checked
                  </span>
                  {msg.tools.map((t) => (
                    <span key={t} className="rounded-full px-2 py-0.5 text-[10px] font-[620]"
                      style={{ background: 'rgba(34,211,238,0.14)', color: '#0891b2' }}>{t}</span>
                  ))}
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        {!msg.error && (
          <div className="mt-1 flex items-center gap-1 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
            <button
              onClick={onCopy}
              className="flex items-center gap-1 rounded-[7px] px-1.5 py-1 text-[10px] font-[650]"
              style={{ color: copied ? '#10b981' : 'var(--text-disabled)' }}
            >
              {copied ? <Check size={10} /> : <Copy size={10} />} {copied ? 'Copied' : 'Copy'}
            </button>
            {canRegenerate && (
              <button
                onClick={onRegenerate}
                className="flex items-center gap-1 rounded-[7px] px-1.5 py-1 text-[10px] font-[650]"
                style={{ color: 'var(--text-disabled)' }}
              >
                <RotateCcw size={10} /> Try again
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-2.5">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px]" style={{ background: 'rgba(139,92,246,0.14)' }}>
        <Loader2 size={13} className="animate-spin" style={{ color: VIOLET }} />
      </div>
      <div
        className="flex items-center gap-1 rounded-[16px] rounded-tl-[5px] px-4 py-3"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        {[0, 1, 2].map((i) => (
          <m.span
            key={i}
            animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15, ease: 'easeInOut' }}
            style={{ width: 5, height: 5, borderRadius: '50%', background: VIOLET }}
          />
        ))}
      </div>
    </div>
  );
}
