'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Send, Plus, Trash2, MessageSquare, ChevronLeft,
  Loader2, Zap, Dumbbell, Apple, TrendingUp, Users,
  BarChart3, AlertCircle, Sparkles, X,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api, type AiConversation, type AiMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

// ── SSE streaming helper ─────────────────────────────────────────────────────
async function streamChat(
  message: string,
  conversationId: string | null,
  onChunk: (text: string) => void,
  onConvId: (id: string) => void,
  signal: AbortSignal,
): Promise<void> {
  const baseUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? '' : (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

  const res = await fetch(`${baseUrl}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ message, conversation_id: conversationId }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'AI service error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  const convIdHeader = res.headers.get('X-Conversation-Id');
  if (convIdHeader) onConvId(convIdHeader);

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') return;
      try {
        const parsed = JSON.parse(data);
        if (parsed.content) onChunk(parsed.content);
        if (parsed.error) throw new Error(parsed.error);
      } catch { /* non-JSON lines are fine */ }
    }
  }
}

// ── Markdown-lite renderer ───────────────────────────────────────────────────
// Handles bold, inline-code, code blocks, and ordered/unordered lists.
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <pre key={i} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '12px 16px', overflowX: 'auto', fontSize: 12, lineHeight: 1.6, margin: '10px 0', border: '1px solid rgba(255,255,255,0.08)' }}>
          {lang && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase' }}>{lang}</div>}
          <code style={{ color: '#a5f3d4', whiteSpace: 'pre' }}>{codeLines.join('\n')}</code>
        </pre>
      );
      i++;
      continue;
    }

    // Heading
    if (line.startsWith('## ')) {
      nodes.push(<h3 key={i} style={{ fontSize: 14, fontWeight: 700, margin: '14px 0 6px', color: 'var(--text-primary)' }}>{line.slice(3)}</h3>);
      i++; continue;
    }
    if (line.startsWith('# ')) {
      nodes.push(<h2 key={i} style={{ fontSize: 16, fontWeight: 800, margin: '14px 0 8px', color: 'var(--text-primary)' }}>{line.slice(2)}</h2>);
      i++; continue;
    }

    // Unordered list
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <ul key={i} style={{ margin: '6px 0', paddingLeft: 18 }}>
          {items.map((it, j) => <li key={j} style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 3 }}>{inlineFormat(it)}</li>)}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      nodes.push(
        <ol key={i} style={{ margin: '6px 0', paddingLeft: 20 }}>
          {items.map((it, j) => <li key={j} style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 3 }}>{inlineFormat(it)}</li>)}
        </ol>
      );
      continue;
    }

    // Empty line
    if (!line.trim()) {
      nodes.push(<br key={i} />);
      i++; continue;
    }

    // Normal paragraph
    nodes.push(<p key={i} style={{ margin: '3px 0', fontSize: 13, lineHeight: 1.7 }}>{inlineFormat(line)}</p>);
    i++;
  }

  return <>{nodes}</>;
}

function inlineFormat(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 4, padding: '1px 5px', fontSize: '0.9em', fontFamily: 'monospace', color: '#a5f3d4' }}>{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

// ── Quick prompts ─────────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { icon: Dumbbell,   label: 'Workout Plan',   text: 'Create a personalized workout plan for me based on my profile and goals.' },
  { icon: Apple,      label: 'Nutrition Plan',  text: 'Build a nutrition plan with daily meals and macros tailored to my fitness goals.' },
  { icon: TrendingUp, label: 'Progress Review', text: 'Analyze my recent progress and weight history. What adjustments should I make?' },
  { icon: Users,      label: 'Client Report',   text: 'Generate a professional progress report for my client with recommendations.' },
  { icon: BarChart3,  label: 'Goal Timeline',   text: 'Based on my current trajectory, when will I realistically reach my goal?' },
  { icon: Zap,        label: 'Quick Tips',      text: 'Give me 5 evidence-based tips to break through my current fitness plateau.' },
];

const glass = {
  background: 'var(--bg-card)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow-card)',
} as const;

// ── Main component ────────────────────────────────────────────────────────────
export default function AiCoachPage() {
  const { user } = useAuth();

  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeConvId,  setActiveConvId]  = useState<string | null>(null);
  const [messages,      setMessages]      = useState<AiMessage[]>([]);
  const [input,         setInput]         = useState('');
  const [streaming,     setStreaming]      = useState(false);
  const [sidebarOpen,   setSidebarOpen]   = useState(true);
  const [loadingConv,   setLoadingConv]   = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState('');

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const abortRef   = useRef<AbortController | null>(null);

  // Scroll to bottom
  const scrollDown = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  // Load conversation list
  const loadConversations = useCallback(async () => {
    try {
      const res = await api.ai.conversations();
      setConversations(res.data ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Load a conversation's messages
  const openConversation = useCallback(async (id: string) => {
    setLoadingConv(true);
    setActiveConvId(id);
    setMessages([]);
    setError(null);
    setStreamingText('');
    try {
      const res = await api.ai.conversation(id);
      setMessages(res.data.messages ?? []);
    } catch {
      setError('Failed to load conversation.');
    } finally {
      setLoadingConv(false);
    }
    scrollDown();
  }, [scrollDown]);

  // Delete a conversation
  const deleteConversation = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.ai.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConvId === id) {
        setActiveConvId(null);
        setMessages([]);
      }
    } catch { /* ignore */ }
  }, [activeConvId]);

  // New conversation
  const startNew = useCallback(() => {
    abortRef.current?.abort();
    setActiveConvId(null);
    setMessages([]);
    setStreamingText('');
    setError(null);
    inputRef.current?.focus();
  }, []);

  // Send a message
  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || streaming) return;

    setInput('');
    setError(null);
    setStreaming(true);
    setStreamingText('');

    // Optimistically add user message
    const tempUserMsg: AiMessage = { id: 'tmp-user', role: 'user', content: msg, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, tempUserMsg]);
    scrollDown();

    abortRef.current = new AbortController();
    let convId = activeConvId;
    let assistantText = '';

    try {
      await streamChat(
        msg,
        convId,
        (chunk) => {
          assistantText += chunk;
          setStreamingText(assistantText);
          scrollDown();
        },
        (newId) => {
          convId = newId;
          setActiveConvId(newId);
        },
        abortRef.current.signal,
      );

      // Commit final messages
      const assistantMsg: AiMessage = { id: 'tmp-asst', role: 'assistant', content: assistantText, created_at: new Date().toISOString() };
      setMessages((prev) => [...prev, assistantMsg]);
      setStreamingText('');

      // Refresh conversation list (title may be new)
      await loadConversations();
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setMessages((prev) => prev.filter((m) => m.id !== 'tmp-user'));
      } else {
        setError(err instanceof Error ? err.message : 'AI service error. Please try again.');
        setMessages((prev) => prev.filter((m) => m.id !== 'tmp-user'));
      }
      setStreamingText('');
    } finally {
      setStreaming(false);
      scrollDown();
    }
  }, [input, streaming, activeConvId, loadConversations, scrollDown]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const allMessages = useMemo(() => {
    const base = [...messages];
    if (streamingText) {
      base.push({ id: 'streaming', role: 'assistant' as const, content: streamingText, created_at: new Date().toISOString() });
    }
    return base;
  }, [messages, streamingText]);

  const isEmptyState = !activeConvId && messages.length === 0;

  return (
    <Guard role="member">
      <AppShell>
        <div style={{ display: 'flex', height: 'calc(100vh - 120px)', gap: 16, maxWidth: 1400, margin: '0 auto', position: 'relative' }}>

          {/* ── Sidebar ── */}
          <AnimatePresence initial={false}>
            {sidebarOpen && (
              <motion.aside
                key="sidebar"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                style={{ flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                {/* New chat button */}
                <button
                  onClick={startNew}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', ...glass, borderRadius: 14, border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 13, fontWeight: 700, width: '100%', background: 'linear-gradient(135deg,#10a37f,#059669)', boxShadow: '0 4px 16px rgba(16,163,127,0.25)' }}
                >
                  <Plus size={16} color="#fff" />
                  <span style={{ color: '#fff' }}>New Conversation</span>
                </button>

                {/* Conversation list */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {conversations.length === 0 && (
                    <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                      <MessageSquare size={20} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
                      No conversations yet
                    </div>
                  )}
                  {conversations.map((conv) => (
                    <motion.button
                      key={conv.id}
                      onClick={() => openConversation(conv.id)}
                      whileHover={{ x: 2 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                        borderRadius: 12, border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                        background: activeConvId === conv.id ? 'rgba(16,163,127,0.15)' : 'var(--bg-subtle)',
                        outline: activeConvId === conv.id ? '1px solid rgba(16,163,127,0.3)' : 'none',
                        transition: 'background 0.15s',
                      }}
                    >
                      <MessageSquare size={13} color={activeConvId === conv.id ? '#10a37f' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {conv.title || 'Untitled'}
                        </div>
                        {conv.last_message && (
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                            {conv.last_message}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => deleteConversation(conv.id, e)}
                        style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-disabled)', borderRadius: 6, flexShrink: 0, opacity: 0 }}
                        className="delete-conv-btn"
                      >
                        <Trash2 size={11} />
                      </button>
                    </motion.button>
                  ))}
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* ── Chat area ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', ...glass, borderRadius: 20, overflow: 'hidden', minWidth: 0 }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{ padding: '6px 10px', borderRadius: 10, border: 'none', background: 'var(--bg-subtle)', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
              >
                {sidebarOpen ? <ChevronLeft size={15} /> : <MessageSquare size={15} />}
              </button>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg,#10a37f,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(16,163,127,0.3)' }}>
                <Bot size={18} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>619 AI Coach</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  MiniMax-M3 · Personalized to your profile
                  {user && <span>· {user.name?.split(' ')[0]}</span>}
                </div>
              </div>
              {streaming && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#10a37f' }}
                >
                  <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-flex' }}>
                    <Loader2 size={12} />
                  </motion.span>
                  Generating…
                </motion.div>
              )}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Empty state */}
              {isEmptyState && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ margin: 'auto', textAlign: 'center', maxWidth: 560 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg,#10a37f,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 32px rgba(16,163,127,0.25)' }}>
                    <Sparkles size={28} color="#fff" />
                  </div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px' }}>Your AI Fitness Coach</h2>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 28px', lineHeight: 1.6 }}>
                    Personalized workout plans, nutrition advice, and progress analysis — powered by your actual gym data.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                    {QUICK_PROMPTS.map(({ icon: Icon, label, text }) => (
                      <button
                        key={label}
                        onClick={() => sendMessage(text)}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: '12px 14px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-subtle)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                      >
                        <Icon size={16} color="#10a37f" />
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Loading conv */}
              {loadingConv && (
                <div style={{ margin: 'auto', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
                  <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-flex' }}><Loader2 size={16} /></motion.span>
                  Loading conversation…
                </div>
              )}

              {/* Error banner */}
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: 12, flexShrink: 0 }}
                  >
                    <AlertCircle size={14} />
                    <span style={{ flex: 1 }}>{error}</span>
                    <button onClick={() => setError(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#fca5a5', padding: 0 }}><X size={13} /></button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Message bubbles */}
              {allMessages.map((msg, idx) => (
                <motion.div
                  key={msg.id ?? idx}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ display: 'flex', gap: 10, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}
                >
                  {/* Avatar */}
                  <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: msg.role === 'user' ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'linear-gradient(135deg,#10a37f,#059669)', boxShadow: `0 4px 12px ${msg.role === 'user' ? 'rgba(99,102,241,0.25)' : 'rgba(16,163,127,0.25)'}` }}>
                    {msg.role === 'user'
                      ? <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{user?.name?.[0] ?? 'U'}</span>
                      : <Bot size={15} color="#fff" />
                    }
                  </div>

                  {/* Bubble */}
                  <div style={{
                    maxWidth: '78%',
                    padding: '12px 16px',
                    borderRadius: msg.role === 'user' ? '18px 6px 18px 18px' : '6px 18px 18px 18px',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg,rgba(99,102,241,0.18),rgba(139,92,246,0.15))'
                      : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${msg.role === 'user' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.07)'}`,
                    color: 'var(--text-primary)',
                  }}>
                    {msg.role === 'assistant'
                      ? renderMarkdown(msg.content)
                      : <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                    }
                    {msg.id === 'streaming' && (
                      <span style={{ display: 'inline-block', width: 2, height: 14, background: '#10a37f', marginLeft: 2, borderRadius: 1, verticalAlign: 'middle', animation: 'blink 0.9s infinite' }} />
                    )}
                  </div>
                </motion.div>
              ))}

              <div ref={bottomRef} />
            </div>

            {/* Input area */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
              {/* Quick prompts strip (shown when no messages) */}
              {isEmptyState && (
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10, scrollbarWidth: 'none' }}>
                  {QUICK_PROMPTS.slice(0, 3).map(({ label, text }) => (
                    <button key={label} onClick={() => sendMessage(text)}
                      style={{ padding: '5px 12px', borderRadius: 20, border: '1px solid rgba(16,163,127,0.3)', background: 'rgba(16,163,127,0.08)', color: '#10a37f', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, ...glass, borderRadius: 16, padding: '8px 8px 8px 16px' }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask your AI coach anything… (Shift+Enter for new line)"
                  rows={1}
                  disabled={streaming}
                  style={{ flex: 1, border: 'none', outline: 'none', resize: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.6, padding: '6px 0', minHeight: 32, maxHeight: 160, overflowY: 'auto', fontFamily: 'inherit' }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || streaming}
                  style={{
                    width: 38, height: 38, borderRadius: 12, border: 'none', cursor: (!input.trim() || streaming) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    background: (!input.trim() || streaming) ? 'var(--bg-subtle)' : 'linear-gradient(135deg,#10a37f,#059669)',
                    color: (!input.trim() || streaming) ? 'var(--text-muted)' : '#fff',
                    boxShadow: (!input.trim() || streaming) ? 'none' : '0 4px 12px rgba(16,163,127,0.35)',
                    transition: 'all 0.2s',
                  }}
                >
                  {streaming
                    ? <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-flex' }}><Loader2 size={16} /></motion.span>
                    : <Send size={16} />
                  }
                </button>
              </div>
              <p style={{ fontSize: 10, color: 'var(--text-disabled)', textAlign: 'center', margin: '8px 0 0' }}>
                AI responses are for guidance only — always consult a professional for medical or dietary advice.
              </p>
            </div>
          </div>
        </div>

        <style>{`
          .delete-conv-btn { opacity: 0; transition: opacity 0.15s; }
          button:hover .delete-conv-btn, [data-conv]:hover .delete-conv-btn { opacity: 1; }
          @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        `}</style>
      </AppShell>
    </Guard>
  );
}
