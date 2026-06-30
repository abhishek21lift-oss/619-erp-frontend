'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { AgentSSEEvent, AgentPlan } from '@/types/agent';

type Message = { role: 'user' | 'assistant' | 'system'; content: string; id: string };

let _msgId = 0;
function nextId() { return `m${++_msgId}`; }

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<AgentPlan | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Persist open state across page navigation
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem('ai-panel-open') : null;
    if (stored === 'true') setOpen(true);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') sessionStorage.setItem('ai-panel-open', String(open));
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', content: text.trim(), id: nextId() }]);
    setLoading(true);
    setPlan(null);

    const token = typeof window !== 'undefined' ? document.cookie.match(/token=([^;]+)/)?.[1] : null;
    const assistantId = nextId();
    setMessages(m => [...m, { role: 'assistant', content: '…', id: assistantId }]);

    try {
      const response = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: text.trim() }),
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accum = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const evt: AgentSSEEvent = JSON.parse(line.slice(6));

            if (evt.event === 'thinking') {
              accum = evt.message;
              setMessages(m => m.map(msg => msg.id === assistantId ? { ...msg, content: accum } : msg));
            } else if (evt.event === 'action_result') {
              accum = accum.replace(/…$/, '').trimEnd();
              accum += (accum ? '\n' : '') + `• ${evt.summary}`;
              setMessages(m => m.map(msg => msg.id === assistantId ? { ...msg, content: accum } : msg));
            } else if (evt.event === 'requires_confirmation') {
              setTaskId(evt.plan.taskId || null);
              setPlan(evt.plan);
              setMessages(m => m.map(msg =>
                msg.id === assistantId
                  ? { ...msg, content: `I need your approval to proceed:\n${evt.plan.summary}` }
                  : msg
              ));
            } else if (evt.event === 'done') {
              const summary = evt.summary || 'Done.';
              setMessages(m => m.map(msg => msg.id === assistantId ? { ...msg, content: summary } : msg));
            } else if (evt.event === 'error') {
              setMessages(m => m.map(msg =>
                msg.id === assistantId
                  ? { ...msg, role: 'system', content: `Error: ${evt.message}` }
                  : msg
              ));
            }
          } catch { /* skip malformed SSE */ }
        }
      }
    } catch (err: any) {
      setMessages(m => m.map(msg =>
        msg.id === assistantId
          ? { ...msg, role: 'system', content: `Request failed: ${err?.message || 'Unknown error'}` }
          : msg
      ));
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const confirmAction = useCallback(async (approved: boolean) => {
    if (!plan || !taskId) return;
    setLoading(true);
    const confirmId = nextId();
    try {
      await api.agent.confirm(taskId, plan.confirmationToken, approved);
      setMessages(m => [...m, {
        role: 'system',
        content: approved ? '✓ Action completed successfully.' : '✕ Action cancelled.',
        id: confirmId,
      }]);
      setPlan(null);
    } catch (err: any) {
      setMessages(m => [...m, {
        role: 'system',
        content: `Confirmation failed: ${err?.message}`,
        id: confirmId,
      }]);
    } finally {
      setLoading(false);
    }
  }, [plan, taskId]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setPlan(null);
    setTaskId(null);
  }, []);

  return (
    <>
      {/* Toggle button */}
      <button
        type="button"
        aria-label="619 Command AI"
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: open ? 'var(--color-primary, #6c63ff)' : 'var(--color-surface, #1e1e2e)',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          zIndex: 9999,
          transition: 'all 0.2s ease',
          color: open ? '#fff' : 'var(--color-text, #e2e8f0)',
        }}
      >
        {open ? '✕' : '✦'}
      </button>

      {/* Side panel */}
      {open && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '400px',
            maxWidth: '100vw',
            background: 'var(--color-surface, #1a1a2e)',
            borderLeft: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
            zIndex: 9998,
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'var(--font-sans, system-ui, sans-serif)',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text, #e2e8f0)', letterSpacing: '0.01em' }}>
                ✦ 619 Command AI
              </div>
              <div style={{ fontSize: 11, opacity: 0.45, marginTop: 2 }}>Natural language operations</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={clearConversation}
                  title="Clear conversation"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4, fontSize: 14, padding: 4 }}
                >
                  ⊘
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4, fontSize: 18, padding: 4, lineHeight: 1 }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', opacity: 0.4 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
                <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                  Ask me anything about your gym.<br />
                  Members, attendance, payments, schedules.
                </div>
                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    "Who's absent today?",
                    "Show dues above ₹5000",
                    "Subscriptions expiring this week",
                    "Book session for Priya tomorrow 8am",
                  ].map((hint, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => sendMessage(hint)}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 6,
                        padding: '7px 12px',
                        cursor: 'pointer',
                        fontSize: 12,
                        color: 'var(--color-text, #e2e8f0)',
                        textAlign: 'left',
                        opacity: 0.7,
                      }}
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '88%',
                  padding: '9px 13px',
                  borderRadius: msg.role === 'user' ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                  background: msg.role === 'user'
                    ? 'var(--color-primary, #6c63ff)'
                    : msg.role === 'system'
                    ? 'rgba(255,255,255,0.04)'
                    : 'rgba(255,255,255,0.07)',
                  color: msg.role === 'user' ? '#fff' : 'var(--color-text, #e2e8f0)',
                  fontSize: 13,
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  border: msg.role === 'system' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                }}>
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Confirmation card */}
            {plan && !loading && (
              <div style={{
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 10,
                padding: '14px 16px',
                background: 'rgba(245, 158, 11, 0.05)',
                marginTop: 4,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b', marginBottom: 8 }}>
                  ⚠ Confirm Actions
                </div>
                <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 10 }}>{plan.summary}</div>
                {plan.actions?.filter(a => a.type === 'write').map((a, i) => (
                  <div key={i} style={{ fontSize: 12, opacity: 0.6, marginBottom: 3 }}>
                    • {a.description}
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={() => confirmAction(true)}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 7, border: 'none',
                      cursor: 'pointer', background: 'var(--color-primary, #6c63ff)',
                      color: '#fff', fontSize: 13, fontWeight: 600,
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmAction(false)}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 7,
                      border: '1px solid rgba(255,255,255,0.15)',
                      cursor: 'pointer', background: 'transparent',
                      color: 'var(--color-text, #e2e8f0)', fontSize: 13,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            flexShrink: 0,
          }}>
            <div style={{
              display: 'flex',
              gap: 8,
              alignItems: 'flex-end',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              padding: '8px 12px',
            }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder="Ask anything…"
                rows={1}
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  color: 'var(--color-text, #e2e8f0)',
                  fontSize: 14,
                  lineHeight: 1.5,
                  fontFamily: 'inherit',
                  maxHeight: 120,
                  overflow: 'auto',
                }}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                style={{
                  background: loading || !input.trim() ? 'rgba(108, 99, 255, 0.3)' : 'var(--color-primary, #6c63ff)',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 10px',
                  cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                  color: '#fff',
                  fontSize: 14,
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                {loading ? '…' : '↑'}
              </button>
            </div>
            <div style={{ fontSize: 10, opacity: 0.3, marginTop: 6, textAlign: 'center' }}>
              Enter to send · Shift+Enter for new line
            </div>
          </div>
        </div>
      )}
    </>
  );
}
