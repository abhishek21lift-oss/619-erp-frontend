'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { m, AnimatePresence } from 'framer-motion';
import {
  Sparkles, X, Brain, Dumbbell, Salad, Send, User, RotateCcw, BookOpen, Database,
  Square, AlertTriangle, ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { streamAiChat } from '@/lib/ai-stream';
import type { Client } from '@/lib/api';
import { useDialogA11y } from '@/hooks/useDialogA11y';
import { errorMessage } from '@/lib/forms/errors';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AiCoachPanelProps {
  type: 'workout' | 'diet' | 'general';
  onClose?: () => void;
  clientId?: string;
}

interface Message {
  id: string;
  role: 'user' | 'coach';
  content: string;
  timestamp: Date;
  error?: boolean;
  /** Titles of this studio's own documents the answer was grounded in, when RAG found a match. */
  sources?: string[];
  /** Live-data tools (member counts, attendance, revenue, etc.) consulted for this answer. */
  tools?: string[];
  /** Set when the document store could not be searched for this answer. */
  grounding?: 'unavailable';
}

// ─── SSE stream event shape (from POST /api/ai/chat) ──────────────────────────
//
// The wire format is defined and parsed in lib/ai-stream (AiStreamEvent); this
// panel only reacts to the parsed events it gets from streamAiChat. Keeping a
// local copy of the shape here would be a second parser waiting to drift.

// ─── Palette ──────────────────────────────────────────────────────────────────

const ACCENT = 'linear-gradient(135deg, #A33757 0%, #852E4E 100%)';
const VIOLET = '#FFBB94';

// ─── Component ────────────────────────────────────────────────────────────────

export function AiCoachPanel({ type, onClose, clientId }: AiCoachPanelProps) {
  // Client selection state
  const [clientList, setClientList] = useState<Client[]>([]);
  const [clientQuery, setClientQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [clientLocked, setClientLocked] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'coach',
      content: type === 'general'
        ? `Hi! I'm your AI Coach. Ask me about training, nutrition, a specific client, or your studio's own data — active clients, attendance, revenue, dues, trainers — and I'll pull the numbers directly. I'll also check this studio's own SOPs and guides if you've uploaded any to the Knowledge Base.`
        : `Hi! I'm your AI ${type === 'workout' ? 'workout' : 'nutrition'} coach. Ask me anything about ${type === 'workout' ? 'training, programming, or recovery' : 'nutrition, macros, or meal planning'} — I'll factor in the selected client's profile when one is set.`,
      timestamp: new Date(),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  // Two states, not one: typing is the gap before the first token, streaming
  // is the whole answer. They used to share `isTyping`, so the send button
  // re-enabled on the first token and a second question could be sent into a
  // stream that was still writing the first.
  const [isTyping, setIsTyping] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastUserTextRef = useRef('');

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Close on Escape
  // Escape, focus trap and focus restore, replacing a bespoke Escape listener.
  // The panel declared aria-modal while Tab walked out of it into the page
  // behind, and closing dropped focus to the top of the document.
  const dialogRef = useDialogA11y({ open: !!onClose, onClose });

  // Abort any in-flight stream on unmount
  useEffect(() => () => abortRef.current?.abort(), []);

  // ── Client selection ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!clientId) return;
    api.clients.get(clientId)
      .then(c => {
        setSelectedClient(c);
        setClientLocked(true);
      })
      .catch(() => {});
  }, [clientId]);

  useEffect(() => {
    if (clientLocked) return;
    const load = clientQuery ? api.clients.search(clientQuery) : api.clients.list({ limit: 20 });
    load.then(setClientList).catch(() => {});
  }, [clientQuery, clientLocked]);

  const filteredClients = clientList.filter(c =>
    c.name.toLowerCase().includes(clientQuery.toLowerCase())
  );

  // ── Chat send (real SSE streaming to /api/ai/chat) ──────────────────────────

  const handleSend = useCallback(async (retryText?: string) => {
    const text = (retryText ?? chatInput).trim();
    if (!text || streaming) return;
    lastUserTextRef.current = text;

    const userMsg: Message = { id: `user-${Date.now()}`, role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    if (!retryText) setChatInput('');
    setIsTyping(true);
    setStreaming(true);

    const coachId = `coach-${Date.now()}`;
    let acc = '';
    let started = false;
    let pendingSources: string[] | undefined;
    let pendingTools: string[] | undefined;
    let pendingGrounding: 'unavailable' | undefined;

    const controller = new AbortController();
    abortRef.current = controller;

    const pushCoach = (content: string, error = false) =>
      setMessages(prev => [...prev, {
        id: coachId, role: 'coach', content, timestamp: new Date(), error,
        sources: pendingSources, tools: pendingTools, grounding: pendingGrounding,
      }]);
    // Sources and tools can arrive after the first token. Rewriting only the
    // text dropped them, which was invisible only because the backend happens
    // to emit them first today.
    const updateCoach = (content: string, error?: boolean) =>
      setMessages(prev => prev.map(m2 => (m2.id === coachId
        ? {
          ...m2, content,
          error: error ?? m2.error,
          sources: pendingSources ?? m2.sources,
          tools: pendingTools ?? m2.tools,
          grounding: pendingGrounding ?? m2.grounding,
        }
        : m2)));

    try {
      // The SSE parsing lives in lib/ai-stream — the same helper the AI Coach
      // page and the Command Center assistant use — so no panel can drift from
      // the wire format. This panel only reacts to parsed events.
      const { aborted } = await streamAiChat(
        {
          message: text,
          conversationId,
          clientId: selectedClient?.id,
          signal: controller.signal,
        },
        {
          onConversationId: setConversationId,
          onSources: (srcs) => { pendingSources = srcs; },
          onTools: (t) => { pendingTools = t; },
          onGrounding: (g) => { pendingGrounding = g; },
          onText: (chunkText) => {
            acc = chunkText;
            if (!started) { started = true; setIsTyping(false); pushCoach(acc); }
            else updateCoach(acc);
          },
        },
      );

      // Stop is a user decision, not a failure — keep whatever streamed.
      if (aborted) return;
      if (!started) pushCoach('I couldn\'t generate a reply just now — please try again.', true);
    } catch (err) {
      if (controller.signal.aborted) return;
      // streamAiChat speaks the shared wording; this panel has always shown its
      // own strings, so translate back to keep the UI text byte-identical.
      const raw = errorMessage(err, 'Something went wrong. Please try again.');
      const msg = raw === 'Your session has expired — please sign in again.'
        ? 'Your session has expired. Please sign in again.'
        : raw === 'The assistant ran into a problem.'
          ? 'The AI coach ran into a problem.'
          : raw;
      if (!started) { setIsTyping(false); pushCoach(`⚠️ ${msg}`, true); }
      else updateCoach(`${acc}\n\n⚠️ ${msg}`, true);
    } finally {
      setIsTyping(false);
      setStreaming(false);
      abortRef.current = null;
    }
  }, [chatInput, streaming, conversationId, selectedClient]);

  function handleChatKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); }
  }

  // Retry belongs on the newest bubble only; an older one has been answered
  // over and re-sending its question would fork the conversation.
  const lastMessageId = messages[messages.length - 1]?.id;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop scrim */}
      {onClose && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 8999,
            background: 'rgba(15,23,42,0.55)',
            backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
          }}
        />
      )}

      <m.div
        initial={{ x: '100%', opacity: 0.6 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0.6 }}
        transition={{ duration: 0.34, ease: [0.32, 0.72, 0, 1] }}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="AI Coach"
        style={{
          position: 'fixed', right: 0, top: 0, bottom: 0,
          width: 'min(420px, 100vw)',
          zIndex: 9000,
          background: 'rgba(15,23,42,0.98)',
          backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
          borderLeft: '1px solid rgba(255,187,148,0.20)',
          boxShadow: '-24px 0 60px rgba(0,0,0,0.45)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header — padded for the notch / status bar via safe-area insets */}
        <div
          style={{
            padding: 'calc(16px + env(safe-area-inset-top)) 18px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'linear-gradient(180deg, rgba(163,55,87,0.10) 0%, rgba(163,55,87,0) 100%)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
            <div
              style={{
                width: 38, height: 38, borderRadius: 11,
                background: 'linear-gradient(135deg, rgba(163,55,87,0.35) 0%, rgba(163,55,87,0.35) 100%)',
                border: '1px solid rgba(255,187,148,0.30)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
              <Sparkles size={19} color={VIOLET} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.92)', margin: 0, lineHeight: 1.2 }}>
                AI Coach
              </p>
              <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.42)', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                {type === 'workout'
                  ? <><Dumbbell size={11} /> Workout Specialist</>
                  : type === 'diet'
                  ? <><Salad size={11} /> Nutrition Specialist</>
                  : <><Brain size={11} /> Ask anything</>}
              </p>
            </div>

            {onClose && (
              <m.button
                onClick={onClose}
                aria-label="Close"
                whileHover={{ scale: 1.08, background: 'rgba(255,255,255,0.12)' }}
                whileTap={{ scale: 0.95 }}
                style={{
                  width: 44, height: 44, borderRadius: 11, border: 'none',
                  background: 'rgba(255,255,255,0.06)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'rgba(255,255,255,0.55)', flexShrink: 0,
                }}
              >
                <X size={17} />
              </m.button>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
              <m.div
                key="chat"
                initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 14 }}
                transition={{ duration: 0.2 }}
                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              >
                {/* Client selection — a chat opened without attaching a
                    client has nothing client-specific to answer from. The
                    picker stays available unless the panel was opened from a
                    client's own page (clientLocked). */}
                {selectedClient ? (
                  <div style={{ padding: '10px 16px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: VIOLET, background: 'rgba(255,187,148,0.12)', border: '1px solid rgba(255,187,148,0.22)', borderRadius: 999, padding: '4px 10px' }}>
                      <User size={11} /> Coaching about {selectedClient.name}
                    </span>
                    {!clientLocked && (
                      <button
                        onClick={() => { setSelectedClient(null); setClientQuery(''); }}
                        style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.38)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 6px' }}
                      >
                        Change
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '10px 16px 0' }}>
                    <ClientPicker
                      clientLocked={clientLocked}
                      selectedClient={selectedClient}
                      clientQuery={clientQuery}
                      showClientDropdown={showClientDropdown}
                      filteredClients={filteredClients}
                      onFocus={() => setShowClientDropdown(true)}
                      onQueryChange={(v) => { setClientQuery(v); setShowClientDropdown(true); }}
                      onBlur={() => setTimeout(() => setShowClientDropdown(false), 150)}
                      onSelect={(c) => {
                        setSelectedClient(c);
                        setClientQuery(c.name);
                        setShowClientDropdown(false);
                      }}
                    />
                    <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.32)', margin: '5px 2px 0' }}>
                      Optional — pick a client so the coach can factor in their profile.
                    </p>
                  </div>
                )}

                {/* Plans are generated, reviewed and saved on their own
                    dedicated pages; this panel is the chat door only. */}
                {type === 'workout' && (
                  <div style={{ padding: '10px 16px 0' }}>
                    <Link
                      href={`/ai/workout-generator${selectedClient ? `?client_id=${encodeURIComponent(String(selectedClient.id))}` : ''}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 11px', borderRadius: 9, textDecoration: 'none',
                        fontSize: 11.5, fontWeight: 650, color: VIOLET,
                        background: 'rgba(255,187,148,0.10)',
                        border: '1px solid rgba(255,187,148,0.22)',
                      }}
                    >
                      <Sparkles size={12} /> Open the full generator <ArrowRight size={13} />
                    </Link>
                  </div>
                )}

                {type === 'diet' && (
                  <div style={{ padding: '10px 16px 0' }}>
                    <Link
                      href={selectedClient ? `/ai/diet-generator?client_id=${selectedClient.id}` : '/ai/diet-generator'}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 11px', borderRadius: 9, textDecoration: 'none',
                        fontSize: 11.5, fontWeight: 650, color: VIOLET,
                        background: 'rgba(255,187,148,0.10)',
                        border: '1px solid rgba(255,187,148,0.22)',
                      }}
                    >
                      <Sparkles size={12} /> Generate &amp; save a full diet plan
                    </Link>
                  </div>
                )}

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <AnimatePresence initial={false}>
                    {messages.map(msg => (
                      <m.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
                      >
                        <div
                          style={{
                            maxWidth: '84%', padding: '10px 13px',
                            borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                            background: msg.role === 'user'
                              ? ACCENT
                              : msg.error ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.07)',
                            border: msg.role === 'coach'
                              ? `1px solid ${msg.error ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.08)'}`
                              : 'none',
                          }}
                        >
                          <p style={{ fontSize: 13, color: msg.role === 'user' ? '#fff' : msg.error ? '#fca5a5' : 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                            {msg.content}
                          </p>
                          {msg.grounding === 'unavailable' && (
                            <p style={{ display: 'flex', alignItems: 'flex-start', gap: 4, fontSize: 10.5, color: '#fbbf24', margin: '8px 0 0', lineHeight: 1.4 }}>
                              <AlertTriangle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                              Your studio&apos;s documents could not be searched — this answer is not grounded in them.
                            </p>
                          )}
                          {msg.sources && msg.sources.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(255,255,255,0.4)' }}>
                                <BookOpen size={10} /> Sources:
                              </span>
                              {msg.sources.map((title) => (
                                <span key={title}
                                  style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,187,148,0.15)', color: VIOLET }}>
                                  {title}
                                </span>
                              ))}
                            </div>
                          )}
                          {msg.tools && msg.tools.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: msg.sources?.length ? 6 : 8, paddingTop: msg.sources?.length ? 0 : 8, borderTop: msg.sources?.length ? 'none' : '1px solid rgba(255,255,255,0.08)' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(255,255,255,0.4)' }}>
                                <Database size={10} /> Checked:
                              </span>
                              {msg.tools.map((name) => (
                                <span key={name}
                                  style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,187,148,0.15)', color: '#FFBB94' }}>
                                  {name}
                                </span>
                              ))}
                            </div>
                          )}
                          {msg.error && msg.id === lastMessageId && !streaming && lastUserTextRef.current && (
                            <button
                              onClick={() => void handleSend(lastUserTextRef.current)}
                              style={{
                                marginTop: 8, minHeight: 44, width: '100%', borderRadius: 9,
                                border: '1px solid rgba(255,255,255,0.18)', background: 'transparent',
                                color: 'rgba(255,255,255,0.78)', fontSize: 12, fontWeight: 650,
                                cursor: 'pointer', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', gap: 5,
                              }}
                            >
                              <RotateCcw size={12} /> Try again
                            </button>
                          )}
                        </div>
                      </m.div>
                    ))}
                  </AnimatePresence>

                  <AnimatePresence>
                    {isTyping && (
                      <m.div
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                        style={{ display: 'flex', justifyContent: 'flex-start' }}
                      >
                        <div style={{ padding: '10px 14px', borderRadius: '14px 14px 14px 4px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 4, alignItems: 'center' }}>
                          {[0, 1, 2].map(i => (
                            <m.div
                              key={i}
                              animate={{ y: [0, -4, 0] }}
                              transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15, ease: 'easeInOut' }}
                              style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,187,148,0.70)' }}
                            />
                          ))}
                        </div>
                      </m.div>
                    )}
                  </AnimatePresence>

                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div
                  style={{
                    padding: '10px 14px calc(14px + env(safe-area-inset-bottom))',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0,
                  }}
                >
                  <textarea
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={handleChatKeyDown}
                    rows={1}
                    aria-label="Ask your AI coach anything"
                    style={{
                      flex: 1, resize: 'none', background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 12px',
                      fontSize: 13, color: '#fff', fontFamily: 'inherit',
                      lineHeight: 1.4, maxHeight: 100, overflowY: 'auto',
                    }}
                  />
                  {streaming ? (
                    <m.button
                      onClick={() => abortRef.current?.abort()}
                      aria-label="Stop response"
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        width: 44, height: 44, borderRadius: 11, border: 'none',
                        background: 'rgba(255,255,255,0.14)', color: '#fff',
                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', flexShrink: 0,
                      }}
                    >
                      <Square size={13} fill="currentColor" />
                    </m.button>
                  ) : (
                    <m.button
                      onClick={() => void handleSend()}
                      disabled={!chatInput.trim()}
                      aria-label="Send message"
                      whileHover={chatInput.trim() ? { scale: 1.08 } : {}}
                      whileTap={chatInput.trim() ? { scale: 0.95 } : {}}
                      style={{
                        width: 44, height: 44, borderRadius: 11, border: 'none',
                        background: chatInput.trim() ? ACCENT : 'rgba(255,255,255,0.08)',
                        color: chatInput.trim() ? '#fff' : 'rgba(255,255,255,0.25)',
                        cursor: chatInput.trim() ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        transition: 'all 0.18s',
                      }}
                    >
                      <Send size={16} />
                    </m.button>
                  )}
                </div>
              </m.div>
        </div>
      </m.div>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * The client search/select field. A chat opened without ever attaching a
 * client had no way to do so, so client_id stayed undefined on every message
 * and the AI, quite correctly, had nothing client-specific to answer from.
 */
function ClientPicker({
  clientLocked, selectedClient, clientQuery, showClientDropdown, filteredClients,
  onFocus, onQueryChange, onBlur, onSelect,
}: {
  clientLocked: boolean;
  selectedClient: Client | null;
  clientQuery: string;
  showClientDropdown: boolean;
  filteredClients: Client[];
  onFocus: () => void;
  onQueryChange: (v: string) => void;
  onBlur: () => void;
  onSelect: (c: Client) => void;
}) {
  if (clientLocked && selectedClient) {
    return (
      <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
        <User size={14} color="rgba(255,255,255,0.45)" />
        <span>{selectedClient.name}</span>
      </div>
    );
  }
  return (
    <div style={{ position: 'relative' }}>
      <input aria-label="Search clients"
        type="text"
        value={selectedClient ? selectedClient.name : clientQuery}
        onFocus={onFocus}
        onChange={e => onQueryChange(e.target.value)}
        onBlur={onBlur}
        style={inputStyle}
      />
      {showClientDropdown && filteredClients.length > 0 && (
        <div
          style={{
            position: 'absolute', zIndex: 10, width: '100%', marginTop: 4,
            background: 'rgba(15,23,42,0.99)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10, maxHeight: 190, overflowY: 'auto', overscrollBehavior: 'contain',
            boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
          }}
        >
          {filteredClients.map(c => (
            <button
              key={c.id}
              onMouseDown={() => onSelect(c)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px',
                minHeight: 44,
                background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.85)',
                fontSize: 13, cursor: 'pointer',
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Shared input style ───────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 13,
  color: '#fff',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  appearance: 'none',
  WebkitAppearance: 'none',
};
