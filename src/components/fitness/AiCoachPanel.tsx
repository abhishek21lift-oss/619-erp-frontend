'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  Sparkles, X, Brain, Zap, Dumbbell, Salad, Send, User, ChevronDown, RotateCcw, BookOpen, Database,
} from 'lucide-react';
import { api } from '@/lib/api';
import { apiBase } from '@/lib/http';
import type { Client } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AiCoachPanelProps {
  /** 'general' is a plain open-ended coach — used when opened from the AI Coach
   *  hub page rather than from a workout/diet-specific context. It hides the
   *  Generate Plan tab (that form is shaped for one specialization or the
   *  other) and opens straight into Chat. */
  type: 'workout' | 'diet' | 'general';
  onClose?: () => void;
  clientId?: string;
  /** Which tab to open on. Defaults to 'generate' for existing callers
   *  (workout/diet plan pages); the hub page's chat launcher passes 'chat'. */
  initialMode?: Mode;
}

type Mode = 'generate' | 'chat';

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
}

// ─── SSE stream event shape (from POST /api/ai/chat) ──────────────────────────

interface ChatEvent {
  type: 'start' | 'chunk' | 'sources' | 'tools' | 'done' | 'error';
  content?: string;
  message?: string;
  conversation_id?: string;
  sources?: string[];
  tools?: string[];
}

function computeAge(dob?: string): number | undefined {
  if (!dob) return undefined;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return undefined;
  const age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
  return age > 0 && age < 120 ? age : undefined;
}

// ─── Workout Goals / Diet Goals ──────────────────────────────────────────────

const WORKOUT_GOALS = ['Muscle Gain', 'Fat Loss', 'Strength', 'Endurance'];
const DIET_GOALS = ['Muscle Gain', 'Fat Loss', 'Maintenance', 'Performance'];
const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

// ─── Palette ──────────────────────────────────────────────────────────────────

const ACCENT = 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)';
const VIOLET = '#a78bfa';

// ─── Component ────────────────────────────────────────────────────────────────

export function AiCoachPanel({ type, onClose, clientId, initialMode }: AiCoachPanelProps) {
  const [mode, setMode] = useState<Mode>(initialMode ?? 'generate');

  // Client selection state
  const [clientList, setClientList] = useState<Client[]>([]);
  const [clientQuery, setClientQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [clientLocked, setClientLocked] = useState(false);

  // Generate plan state
  const [goal, setGoal] = useState('');
  const [experience, setExperience] = useState('');
  const [trainingDays, setTrainingDays] = useState<string>('4');
  const [dietaryPrefs, setDietaryPrefs] = useState('');
  const [allergies, setAllergies] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

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
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (mode === 'chat') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, mode]);

  // Close on Escape
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Abort any in-flight stream on unmount
  useEffect(() => () => abortRef.current?.abort(), []);

  // ── Client selection ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!clientId) return;
    api.clients.get(clientId)
      .then(c => { setSelectedClient(c); setClientLocked(true); })
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

  // ── Generate plan ──────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!goal || !selectedClient) return;
    setIsGenerating(true);
    setGenerationResult(null);
    setGenerationError(null);

    const age = computeAge(selectedClient.dob) ?? 30;
    const gender = selectedClient.gender || 'male';
    const weight_kg = selectedClient.weight ?? 75;
    const height_cm = selectedClient.height ?? 175;

    try {
      if (type === 'workout') {
        const res = await api.ai.generateWorkout({
          age, gender, weight_kg, height_cm,
          goal: goal.toLowerCase().replace(/ /g, '_'),
          experience_level: experience.toLowerCase() || 'beginner',
          training_days: parseInt(trainingDays, 10) || 4,
          client_id: selectedClient.id,
        });
        const plan = res.data;
        const summary = [
          `📋 ${plan.name}`,
          `🎯 Goal: ${plan.goal} | Level: ${plan.level} | ${plan.weeks} weeks, ${plan.days_per_week}×/week`,
          '',
          ...Object.entries(plan.weekly_schedule ?? {}).slice(0, 4).map(([day, d]) =>
            `${day.toUpperCase()}: ${d.name} — ${d.exercises?.map(e => e.name).join(', ')}`
          ),
          '',
          plan.progression_notes ? `📈 ${plan.progression_notes}` : '',
          plan.nutrition_notes ? `🥗 ${plan.nutrition_notes}` : '',
        ].filter(Boolean).join('\n');
        setGenerationResult(summary);
      } else {
        const res = await api.ai.generateDiet({
          age, gender, weight_kg, height_cm,
          activity_level: 'moderate',
          goal: goal.toLowerCase().replace(/ /g, '_'),
          dietary_preferences: dietaryPrefs || undefined,
          allergies: allergies || undefined,
          client_id: selectedClient.id,
        });
        const plan = res.data;
        const summary = [
          `📋 ${plan.name}`,
          `🔥 ${plan.total_calories} kcal | 💪 ${plan.macros?.protein_g}g P | 🍚 ${plan.macros?.carbs_g}g C | 🧈 ${plan.macros?.fat_g}g F`,
          '',
          ...plan.meals?.slice(0, 5).map(mm => `${mm.name} (${mm.time}) — ${mm.calories} kcal`) ?? [],
          '',
          plan.notes ?? '',
        ].filter(Boolean).join('\n');
        setGenerationResult(summary);
      }
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Failed to generate plan. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }

  // ── Chat send (real SSE streaming to /api/ai/chat) ──────────────────────────

  const handleSend = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || isTyping) return;

    const userMsg: Message = { id: `user-${Date.now()}`, role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    const coachId = `coach-${Date.now()}`;
    let acc = '';
    let started = false;
    let pendingSources: string[] | undefined;
    let pendingTools: string[] | undefined;

    const controller = new AbortController();
    abortRef.current = controller;

    const pushCoach = (content: string, error = false) =>
      setMessages(prev => [...prev, { id: coachId, role: 'coach', content, timestamp: new Date(), error, sources: pendingSources, tools: pendingTools }]);
    const updateCoach = (content: string) =>
      setMessages(prev => prev.map(m2 => (m2.id === coachId ? { ...m2, content } : m2)));

    try {
      const res = await fetch(`${apiBase()}/api/ai/chat`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: text,
          conversation_id: conversationId ?? undefined,
          client_id: selectedClient?.id,
        }),
      });

      if (!res.ok || !res.body) throw new Error(res.status === 401 ? 'Your session has expired. Please sign in again.' : `Request failed (${res.status}).`);

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
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          let evt: ChatEvent;
          try { evt = JSON.parse(jsonStr) as ChatEvent; } catch { continue; }

          if (evt.type === 'start' && evt.conversation_id) {
            setConversationId(evt.conversation_id);
          } else if (evt.type === 'sources') {
            pendingSources = evt.sources;
          } else if (evt.type === 'tools') {
            pendingTools = evt.tools;
          } else if (evt.type === 'chunk') {
            acc += evt.content ?? '';
            if (!started) { started = true; setIsTyping(false); pushCoach(acc); }
            else updateCoach(acc);
          } else if (evt.type === 'done') {
            if (evt.conversation_id) setConversationId(evt.conversation_id);
          } else if (evt.type === 'error') {
            throw new Error(evt.message || 'The AI coach ran into a problem.');
          }
        }
      }

      if (!started) pushCoach('I couldn\'t generate a reply just now — please try again.', true);
    } catch (err) {
      if (controller.signal.aborted) return;
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      if (!started) { setIsTyping(false); pushCoach(`⚠️ ${msg}`, true); }
      else updateCoach(`${acc}\n\n⚠️ ${msg}`);
    } finally {
      setIsTyping(false);
      abortRef.current = null;
    }
  }, [chatInput, isTyping, conversationId, selectedClient]);

  function handleChatKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  const canGenerate = Boolean(goal && selectedClient) && !isGenerating;

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
            background: 'rgba(4,2,10,0.55)',
            backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
          }}
        />
      )}

      <m.div
        initial={{ x: '100%', opacity: 0.6 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0.6 }}
        transition={{ duration: 0.34, ease: [0.32, 0.72, 0, 1] }}
        role="dialog"
        aria-label="AI Coach"
        style={{
          position: 'fixed', right: 0, top: 0, bottom: 0,
          width: 'min(420px, 100vw)',
          zIndex: 9000,
          background: 'rgba(9,7,18,0.98)',
          backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
          borderLeft: '1px solid rgba(167,139,250,0.20)',
          boxShadow: '-24px 0 60px rgba(0,0,0,0.45)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header — padded for the notch / status bar via safe-area insets */}
        <div
          style={{
            padding: 'calc(16px + env(safe-area-inset-top)) 18px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'linear-gradient(180deg, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0) 100%)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
            <div
              style={{
                width: 38, height: 38, borderRadius: 11,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.35) 0%, rgba(139,92,246,0.35) 100%)',
                border: '1px solid rgba(167,139,250,0.30)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
              <Sparkles size={19} color={VIOLET} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15.5, fontWeight: 700, color: 'rgba(255,255,255,0.92)', margin: 0, lineHeight: 1.2 }}>
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
                  width: 32, height: 32, borderRadius: 9, border: 'none',
                  background: 'rgba(255,255,255,0.06)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'rgba(255,255,255,0.55)', flexShrink: 0,
                }}
              >
                <X size={17} />
              </m.button>
            )}
          </div>

          {/* Segmented mode toggle — hidden for the general coach, whose
              Generate form (goal / experience / dietary prefs) is shaped for
              a workout or diet plan specifically and has nothing to render. */}
          {type !== 'general' && (
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 11, padding: 3, gap: 2 }}>
            {(['generate', 'chat'] as const).map(m_ => (
              <button
                key={m_}
                onClick={() => setMode(m_)}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
                  fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                  background: mode === m_ ? ACCENT : 'transparent',
                  color: mode === m_ ? '#fff' : 'rgba(255,255,255,0.52)',
                  boxShadow: mode === m_ ? '0 4px 14px rgba(124,92,246,0.35)' : 'none',
                  transition: 'all 0.18s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {m_ === 'generate' ? <><Zap size={13} /> Generate Plan</> : <><Brain size={13} /> Chat</>}
              </button>
            ))}
          </div>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <AnimatePresence mode="wait">
            {mode === 'generate' && type !== 'general' ? (
              <m.div
                key="generate"
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -14 }}
                transition={{ duration: 0.2 }}
                style={{
                  height: '100%', overflowY: 'auto',
                  padding: '20px 18px calc(24px + env(safe-area-inset-bottom))',
                  display: 'flex', flexDirection: 'column', gap: 16,
                }}
              >
                {/* Client select */}
                <Field label="Client">
                  <ClientPicker
                    clientLocked={clientLocked}
                    selectedClient={selectedClient}
                    clientQuery={clientQuery}
                    showClientDropdown={showClientDropdown}
                    filteredClients={filteredClients}
                    onFocus={() => { setShowClientDropdown(true); if (selectedClient) { setSelectedClient(null); setClientQuery(''); } }}
                    onQueryChange={(v) => { setClientQuery(v); setSelectedClient(null); setShowClientDropdown(true); }}
                    onBlur={() => setTimeout(() => setShowClientDropdown(false), 150)}
                    onSelect={(c) => { setSelectedClient(c); setClientQuery(c.name); setShowClientDropdown(false); }}
                  />
                </Field>

                {/* Goal select */}
                <Field label="Goal">
                  <SelectInput value={goal} onChange={setGoal} placeholder="Select goal...">
                    {(type === 'workout' ? WORKOUT_GOALS : DIET_GOALS).map(g => <option key={g} value={g}>{g}</option>)}
                  </SelectInput>
                </Field>

                {type === 'workout' ? (
                  <>
                    <Field label="Experience Level">
                      <SelectInput value={experience} onChange={setExperience} placeholder="Select level...">
                        {EXPERIENCE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                      </SelectInput>
                    </Field>

                    <Field label="Training Days per Week">
                      <input
                        type="number" min={1} max={7} value={trainingDays}
                        onChange={e => setTrainingDays(e.target.value)}
                        style={inputStyle} placeholder="e.g. 4"
                      />
                    </Field>
                  </>
                ) : (
                  <>
                    <Field label="Dietary Preferences">
                      <input
                        type="text" value={dietaryPrefs} onChange={e => setDietaryPrefs(e.target.value)}
                        style={inputStyle} placeholder="e.g. Vegetarian, High protein..."
                      />
                    </Field>
                    <Field label="Allergies / Intolerances">
                      <input
                        type="text" value={allergies} onChange={e => setAllergies(e.target.value)}
                        style={inputStyle} placeholder="e.g. Nuts, Gluten..."
                      />
                    </Field>
                  </>
                )}

                {!selectedClient && (
                  <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', margin: '-4px 0 0' }}>
                    Select a client and a goal to generate a plan.
                  </p>
                )}

                {/* Generate button */}
                <m.button
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  whileHover={canGenerate ? { scale: 1.02 } : {}}
                  whileTap={canGenerate ? { scale: 0.98 } : {}}
                  style={{
                    marginTop: 2, padding: '13px 0', borderRadius: 11, border: 'none',
                    background: canGenerate ? ACCENT : 'rgba(99,102,241,0.22)',
                    color: canGenerate ? '#fff' : 'rgba(255,255,255,0.35)',
                    fontSize: 13.5, fontWeight: 700,
                    cursor: canGenerate ? 'pointer' : 'not-allowed',
                    boxShadow: canGenerate ? '0 8px 22px rgba(124,92,246,0.35)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    transition: 'all 0.18s',
                  }}
                >
                  {isGenerating
                    ? <><span>Generating your plan</span><AnimatedDots /></>
                    : <><Sparkles size={15} /> Generate Plan</>}
                </m.button>

                <AnimatePresence>
                  {isGenerating && (
                    <m.p
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                      style={{ fontSize: 12, color: 'rgba(167,139,250,0.80)', textAlign: 'center', margin: 0 }}
                    >
                      Your AI coach is crafting a personalised plan…
                    </m.p>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {generationError && (
                    <m.div
                      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
                      style={{ padding: '12px 14px', borderRadius: 11, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
                    >
                      <p style={{ fontSize: 12, color: '#f87171', margin: 0 }}>{generationError}</p>
                    </m.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {generationResult && (
                    <m.div
                      initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.97 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      style={{
                        padding: '14px 16px', borderRadius: 13,
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.14) 0%, rgba(139,92,246,0.14) 100%)',
                        border: '1px solid rgba(167,139,250,0.25)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 8 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: VIOLET }}>
                          <Sparkles size={13} /> Plan Generated &amp; Saved
                        </span>
                        <button
                          onClick={() => { setGenerationResult(null); setGoal(''); }}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 11.5, cursor: 'pointer' }}
                        >
                          <RotateCcw size={11} /> New
                        </button>
                      </div>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.78)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 240, overflowY: 'auto' }}>
                        {generationResult}
                      </p>
                    </m.div>
                  )}
                </AnimatePresence>
              </m.div>
            ) : (
              <m.div
                key="chat"
                initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 14 }}
                transition={{ duration: 0.2 }}
                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              >
                {/* Client selection — chat used to have no way to attach a
                    client at all unless one was already picked in Generate
                    mode or the panel was opened directly from a client's own
                    page (clientLocked). Ask about a client with none set and
                    the AI has nothing client-specific to answer from — which
                    is exactly the "I don't have access" reply this fixes. */}
                {selectedClient ? (
                  <div style={{ padding: '10px 16px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: VIOLET, background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.22)', borderRadius: 999, padding: '4px 10px' }}>
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
                      onSelect={(c) => { setSelectedClient(c); setClientQuery(c.name); setShowClientDropdown(false); }}
                    />
                    <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.32)', margin: '5px 2px 0' }}>
                      Optional — pick a client so the coach can factor in their profile.
                    </p>
                  </div>
                )}

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                          <p style={{ fontSize: 13, color: msg.role === 'user' ? '#fff' : msg.error ? '#fca5a5' : 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                            {msg.content}
                          </p>
                          {msg.sources && msg.sources.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(255,255,255,0.4)' }}>
                                <BookOpen size={10} /> Sources:
                              </span>
                              {msg.sources.map((title) => (
                                <span key={title}
                                  style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'rgba(167,139,250,0.15)', color: VIOLET }}>
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
                                  style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'rgba(34,211,238,0.15)', color: '#22d3ee' }}>
                                  {name}
                                </span>
                              ))}
                            </div>
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
                              style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(167,139,250,0.70)' }}
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
                    placeholder="Ask your AI coach anything…"
                    style={{
                      flex: 1, resize: 'none', background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 12px',
                      fontSize: 13, color: '#fff', outline: 'none', fontFamily: 'inherit',
                      lineHeight: 1.4, maxHeight: 100, overflowY: 'auto',
                    }}
                  />
                  <m.button
                    onClick={handleSend}
                    disabled={!chatInput.trim() || isTyping}
                    whileHover={chatInput.trim() && !isTyping ? { scale: 1.08 } : {}}
                    whileTap={chatInput.trim() && !isTyping ? { scale: 0.95 } : {}}
                    style={{
                      width: 38, height: 38, borderRadius: 11, border: 'none',
                      background: chatInput.trim() && !isTyping ? ACCENT : 'rgba(255,255,255,0.08)',
                      color: chatInput.trim() && !isTyping ? '#fff' : 'rgba(255,255,255,0.25)',
                      cursor: chatInput.trim() && !isTyping ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      transition: 'all 0.18s',
                    }}
                  >
                    <Send size={16} />
                  </m.button>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </m.div>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * The client search/select field — shared between Generate mode and Chat
 * mode. It used to exist only in Generate mode: a chat opened without ever
 * visiting Generate first had no way to attach a client at all, so
 * client_id stayed undefined on every message and the AI, quite correctly,
 * had nothing client-specific to answer from.
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
      <input
        type="text"
        value={selectedClient ? selectedClient.name : clientQuery}
        onFocus={onFocus}
        onChange={e => onQueryChange(e.target.value)}
        onBlur={onBlur}
        placeholder="Search clients..."
        style={inputStyle}
      />
      {showClientDropdown && filteredClients.length > 0 && (
        <div
          style={{
            position: 'absolute', zIndex: 10, width: '100%', marginTop: 4,
            background: 'rgba(20,16,34,0.99)', border: '1px solid rgba(255,255,255,0.12)',
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.50)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function SelectInput({
  value, onChange, placeholder, children,
}: { value: string; onChange: (v: string) => void; placeholder: string; children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ ...inputStyle, paddingRight: 34, cursor: 'pointer', color: value ? '#fff' : 'rgba(255,255,255,0.45)' }}
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
      <ChevronDown
        size={15}
        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }}
      />
    </div>
  );
}

function AnimatedDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center', marginLeft: 2 }}>
      {[0, 1, 2].map(i => (
        <m.span
          key={i}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2, ease: 'easeInOut' }}
          style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }}
        />
      ))}
    </span>
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
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  appearance: 'none',
  WebkitAppearance: 'none',
};
