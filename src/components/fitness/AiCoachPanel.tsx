'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { m, AnimatePresence } from 'framer-motion';
import {
  Sparkles, X, Brain, Zap, Dumbbell, Salad, Send, User, ChevronDown, RotateCcw, BookOpen, Database,
  Square, AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { streamAiChat } from '@/lib/ai-stream';
import type { Client } from '@/lib/api';
import { useDialogA11y } from '@/hooks/useDialogA11y';
import { errorMessage } from '@/lib/forms/errors';
import { aiWorkoutInputSchema } from '@/lib/forms/schemas/aiGenerator';
import { clampNumericText } from '@/components/ui/FloatInput';

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
  /** Set when the document store could not be searched for this answer. */
  grounding?: 'unavailable';
}

// ─── SSE stream event shape (from POST /api/ai/chat) ──────────────────────────
//
// The wire format is defined and parsed in lib/ai-stream (AiStreamEvent); this
// panel only reacts to the parsed events it gets from streamAiChat. Keeping a
// local copy of the shape here would be a second parser waiting to drift.

function computeAge(dob?: string): number | undefined {
  if (!dob) return undefined;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return undefined;
  const age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
  return age > 0 && age < 120 ? age : undefined;
}

/**
 * The member's recorded weekly frequency, as the day box should start.
 *
 * Blank when the record holds neither: blank is not zero days, it is "the
 * server reads the same columns and decides". This box used to start at '4',
 * which the server accepted as a trainer-stated value whenever the record was
 * thin — every unnamed client was programmed for four days.
 */
function recordedTrainingDays(c: Client | null): string {
  const sessions = Number(c?.sessions_per_week);
  if (Number.isInteger(sessions) && sessions >= 1 && sessions <= 7) return String(sessions);
  const preferred = typeof c?.preferred_training_days === 'string'
    ? c.preferred_training_days.split(',').filter((d) => d.trim()).length
    : 0;
  return preferred >= 1 && preferred <= 7 ? String(preferred) : '';
}

/**
 * The profile's goal/experience as this form's labels, or blank.
 *
 * The server prefers the record to anything this form sends. Showing the
 * record in the field — rather than a trainer's pick the server will ignore —
 * is what makes the panel honest about which programme it will generate.
 */
function recordedGoal(c: Client | null): string {
  const raw = typeof c?.goal === 'string' ? c.goal.trim() : '';
  if (!raw) return '';
  const key = raw.toLowerCase().replace(/[\s-]+/g, '_');
  return WORKOUT_GOALS.find((g) => g.toLowerCase().replace(/ /g, '_') === key)
    ?? raw.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function recordedExperience(c: Client | null): string {
  const raw = typeof c?.workout_experience_level === 'string' ? c.workout_experience_level.trim() : '';
  if (!raw) return '';
  return EXPERIENCE_LEVELS.find((l) => l.toLowerCase() === raw.toLowerCase())
    ?? raw.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

// ─── Workout Goals ───────────────────────────────────────────────────────────

const WORKOUT_GOALS = ['Muscle Gain', 'Fat Loss', 'Strength', 'Endurance'];
const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

// ─── Palette ──────────────────────────────────────────────────────────────────

const ACCENT = 'linear-gradient(135deg, #A33757 0%, #852E4E 100%)';
const VIOLET = '#FFBB94';

// ─── Component ────────────────────────────────────────────────────────────────

export function AiCoachPanel({ type, onClose, clientId, initialMode }: AiCoachPanelProps) {
  // Only the workout specialist still generates a plan in this panel. Diet
  // plans have their own page with a real save/assign step, so this panel is
  // chat-only for diet and general.
  const chatOnly = type !== 'workout';
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(chatOnly ? 'chat' : (initialMode ?? 'generate'));

  // Client selection state
  const [clientList, setClientList] = useState<Client[]>([]);
  const [clientQuery, setClientQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [clientLocked, setClientLocked] = useState(false);

  // Generate plan state (workout specialist only)
  const [goal, setGoal] = useState('');
  const [experience, setExperience] = useState('');
  const [trainingDays, setTrainingDays] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  // The ledger id the preview came from. Without it the panel generated a
  // plan it could never save; the trainer copied the text somewhere else.
  const [generationId, setGenerationId] = useState<string | null>(null);
  // Whose plan the preview is. The trainer can change the picker between the
  // request and its answer; a preview saved against whoever is selected then
  // would file one member's programme under another's name.
  const [generationClientId, setGenerationClientId] = useState<string | null>(null);
  // Critical findings are the server's refusal reason; hiding the button here
  // stops the trainer walking into it.
  const [generationCritical, setGenerationCritical] = useState(0);
  const [savingPlan, setSavingPlan] = useState(false);

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
    if (mode === 'chat') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, mode]);

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
        setGoal(recordedGoal(c));
        setExperience(recordedExperience(c));
        setTrainingDays(recordedTrainingDays(c));
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

  // ── Generate plan ──────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!goal || !selectedClient) return;
    // Captured, not read after the await: the picker is live during the call.
    const clientIdForGeneration = selectedClient.id;
    setIsGenerating(true);
    setGenerationResult(null);
    setGenerationError(null);
    setGenerationId(null);
    setGenerationClientId(null);
    setGenerationCritical(0);

    // Unknown stays unknown. These used to fall back to invented defaults
    // (30/male/75/175), which reached the server marked as trainer-stated
    // facts and programmed a stranger's body. Omitting them lets the server
    // refuse with "missing data" instead — the trainer then fills the real
    // record rather than approving a plan built on fiction.
    const age = computeAge(selectedClient.dob);
    const gender = selectedClient.gender || undefined;
    const weight_kg = selectedClient.weight ?? undefined;
    const height_cm = selectedClient.height ?? undefined;

    /*
     * §8 — validated BEFORE the model is invoked.
     *
     * The two dedicated generator pages have always parsed their inputs
     * through these schemas. This panel is the third door to the same model
     * call and went straight to the network: `parseInt(trainingDays, 10) || 4`
     * turned a blank or mistyped box into four days without saying so, and the
     * client's stored weight and height were forwarded whatever they were — so
     * a record holding 750kg produced a programme written around 750kg.
     *
     * Refusing here is not only correctness. A generation is a billed model
     * call, and an obviously impossible input is one nobody should pay for.
     */
    const facts = {
      age: String(age),
      weight_kg: String(weight_kg),
      height_cm: String(height_cm),
    };

    /**
     * Says WHERE the impossible number came from.
     *
     * Age, weight and height are read off the client's record here rather than
     * typed into this panel, so a bare "Weight must be at most 400 kg" sends
     * the trainer hunting for a box that is not on the screen.
     */
    const refuse = (issues: { message: string; path: PropertyKey[] }[]) => {
      const first = issues[0];
      const fromRecord = ['age', 'weight_kg', 'height_cm'].includes(String(first?.path[0]));
      setGenerationError(
        fromRecord
          ? `${first.message} Check the client\u2019s profile — this is read from their record.`
          : (first?.message ?? 'Check the details before generating.'),
      );
      setIsGenerating(false);
    };

    try {
      const parsed = aiWorkoutInputSchema.safeParse({
        ...facts, training_days: trainingDays, injuries: '',
      });
      if (!parsed.success) return refuse(parsed.error.issues);
      const v = parsed.data;
      const res = await api.ai.generateWorkout({
        age, gender, weight_kg, height_cm,
        goal: goal.toLowerCase().replace(/ /g, '_'),
        // Blank stays blank. Sending "beginner" for a lead the studio has not
        // assessed marked an invented value as the trainer's own statement.
        experience_level: experience.toLowerCase() || undefined,
        // The parsed value, not `parseInt(...) || 4`. A blank box is now a
        // refusal above rather than a silent four.
        training_days: v.training_days ?? undefined,
        client_id: clientIdForGeneration,
      });
      const plan = res.data;
      setGenerationId(res.generation_id ?? null);
      setGenerationClientId(clientIdForGeneration);
      setGenerationCritical((res.audit?.violations ?? [])
        .filter((v) => v.severity === 'critical').length);
      // Names the library does not hold are dropped on save, so a preview that
      // showed them as usable would promise sessions nobody can save.
      const unverified = [...new Set((res.audit?.unverified ?? []).map((u) => u.name))];
      const summary = [
        `📋 ${plan.name}`,
        `🎯 Goal: ${plan.goal} | Level: ${plan.level} | ${plan.weeks} weeks, ${plan.days_per_week}×/week`,
        '',
        ...Object.entries(plan.weekly_schedule ?? {}).map(([day, d]) =>
          `${day.toUpperCase()}: ${d.name} — ${d.exercises?.map(e => e.name).join(', ')}`
        ),
        '',
        unverified.length
          ? `⚠️ ${unverified.length} exercise${unverified.length === 1 ? '' : 's'} not found in your Exercise Library — replace ${unverified.length === 1 ? 'it' : 'them'} with a library exercise before saving: ${unverified.slice(0, 5).join(', ')}${unverified.length > 5 ? '…' : ''}`
          : '',
        plan.progression_notes ? `📈 ${plan.progression_notes}` : '',
        plan.nutrition_notes ? `🥗 ${plan.nutrition_notes}` : '',
      ].filter(Boolean).join('\n');
      setGenerationResult(summary);
    } catch (err) {
      setGenerationError(errorMessage(err, 'Failed to generate plan. Please try again.'));
    } finally {
      setIsGenerating(false);
    }
  }

  /**
   * Turn this preview into a real programme.
   *
   * The save reads the proposal back from the ledger by id, so this panel
   * cannot smuggle in edits — and the trainer lands in the builder where the
   * rest of the work already happens.
   */
  async function saveGeneratedPlan() {
    if (!generationId || !selectedClient || generationClientId !== selectedClient.id || savingPlan) return;
    setSavingPlan(true);
    setGenerationError(null);
    try {
      const out = await api.workouts.plans.saveFromGeneration({ generation_id: generationId });
      setGenerationId(null);
      onClose?.();
      router.push(`/pt-os/workout-plans/${out.plan_id}/builder`);
    } catch (err) {
      setGenerationError(errorMessage(err, 'Could not save this programme'));
    } finally {
      setSavingPlan(false);
    }
  }

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

  const canGenerate = Boolean(goal && selectedClient) && !isGenerating;
  // Retry belongs on the newest bubble only; an older one has been answered
  // over and re-sending its question would fork the conversation.
  const lastMessageId = messages[messages.length - 1]?.id;
  // Values the record already holds. The server prefers them over the body,
  // so the form shows them read-only rather than inviting a pick it discards.
  const goalFromRecord = Boolean(recordedGoal(selectedClient));
  const experienceFromRecord = Boolean(recordedExperience(selectedClient));
  const daysFromRecord = Boolean(recordedTrainingDays(selectedClient));

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

          {/* Segmented mode toggle — only the workout specialist still has a
              Generate form. Diet and general open straight into Chat; diet
              plans are generated and saved on their own page. */}
          {type === 'workout' && (
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 11, padding: 3, gap: 2 }}>
            {(['generate', 'chat'] as const).map(m_ => (
              <button
                key={m_}
                onClick={() => setMode(m_)}
                style={{
                  flex: 1, padding: '8px 0', minHeight: 44, borderRadius: 8, border: 'none',
                  fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                  background: mode === m_ ? ACCENT : 'transparent',
                  color: mode === m_ ? '#fff' : 'rgba(255,255,255,0.52)',
                  boxShadow: mode === m_ ? '0 4px 14px rgba(163,55,87,0.35)' : 'none',
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
            {mode === 'generate' && type === 'workout' ? (
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
                    onSelect={(c) => {
                      setSelectedClient(c);
                      // The member's own record decides these values. The
                      // server prefers the record anyway; showing a trainer's
                      // pick it will ignore was the lie this fixes. Blank
                      // stays blank so the server uses the record or refuses.
                      setGoal(recordedGoal(c));
                      setExperience(recordedExperience(c));
                      setTrainingDays(recordedTrainingDays(c));
                      setClientQuery(c.name);
                      setShowClientDropdown(false);
                    }}
                  />
                </Field>

                {/* Goal select */}
                <Field label="Goal">
                  <SelectInput value={goal} onChange={setGoal} disabled={goalFromRecord} placeholder="Select goal...">
                    {goal && !WORKOUT_GOALS.includes(goal) && <option value={goal}>{goal}</option>}
                    {WORKOUT_GOALS.map(g => <option key={g} value={g}>{g}</option>)}
                  </SelectInput>
                  {goalFromRecord && <RecordNote />}
                </Field>

                <Field label="Experience Level">
                  <SelectInput value={experience} onChange={setExperience} disabled={experienceFromRecord} placeholder="Select level...">
                    {experience && !EXPERIENCE_LEVELS.includes(experience) && <option value={experience}>{experience}</option>}
                    {EXPERIENCE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </SelectInput>
                  {experienceFromRecord && <RecordNote />}
                </Field>

                <Field label="Training Days per Week">
                  <input
                    type="text" inputMode="numeric" min={1} max={7} value={trainingDays}
                    aria-label="Training days per week"
                    readOnly={daysFromRecord}
                    onChange={e => setTrainingDays(clampNumericText(e.target.value, 'integer'))}
                    style={{ ...inputStyle, ...(daysFromRecord ? { cursor: 'default', opacity: 0.85 } : {}) }}
                    placeholder="1–7"
                  />
                  {daysFromRecord && <RecordNote />}
                </Field>

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
                    background: canGenerate ? ACCENT : 'rgba(163,55,87,0.22)',
                    color: canGenerate ? '#fff' : 'rgba(255,255,255,0.35)',
                    fontSize: 13.5, fontWeight: 700,
                    cursor: canGenerate ? 'pointer' : 'not-allowed',
                    boxShadow: canGenerate ? '0 8px 22px rgba(163,55,87,0.35)' : 'none',
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
                      style={{ fontSize: 12, color: 'rgba(255,187,148,0.80)', textAlign: 'center', margin: 0 }}
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
                  {generationResult && generationClientId === selectedClient?.id && (
                    <m.div
                      initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.97 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      style={{
                        padding: '14px 16px', borderRadius: 13,
                        background: 'linear-gradient(135deg, rgba(163,55,87,0.14) 0%, rgba(163,55,87,0.14) 100%)',
                        border: '1px solid rgba(255,187,148,0.25)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 8 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: VIOLET }}>
                          <Sparkles size={13} /> Plan Generated
                        </span>
                        <button
                          onClick={() => { setGenerationResult(null); setGenerationId(null); setGenerationClientId(null); setGenerationCritical(0); }}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 11.5, cursor: 'pointer' }}
                        >
                          <RotateCcw size={11} /> New
                        </button>
                      </div>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.78)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 240, overflowY: 'auto' }}>
                        {generationResult}
                      </p>
                      {generationCritical > 0 ? (
                        <p style={{ margin: '10px 0 0', fontSize: 11.5, color: '#f87171', lineHeight: 1.5 }}>
                          {`Cannot save — ${generationCritical} critical safety finding${generationCritical === 1 ? '' : 's'}. Regenerate the programme.`}
                        </p>
                      ) : generationId && (
                        <button
                          onClick={saveGeneratedPlan}
                          disabled={savingPlan}
                          style={{
                            marginTop: 10, width: '100%', padding: '10px 0', borderRadius: 9, border: 'none',
                            background: savingPlan ? 'rgba(163,55,87,0.35)' : ACCENT,
                            color: '#fff', fontSize: 12.5, fontWeight: 700,
                            cursor: savingPlan ? 'wait' : 'pointer',
                          }}
                        >
                          {savingPlan ? 'Saving…' : 'Save & open builder'}
                        </button>
                      )}
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
                        // The member's own record decides the starting value.
                        // The trainer can still type over it; blank stays blank
                        // so the server uses the record or refuses.
                        setTrainingDays(recordedTrainingDays(c));
                        setClientQuery(c.name);
                        setShowClientDropdown(false);
                      }}
                    />
                    <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.32)', margin: '5px 2px 0' }}>
                      Optional — pick a client so the coach can factor in their profile.
                    </p>
                  </div>
                )}

                {/* Diet plans are generated, reviewed and saved on their own
                    page. This panel never saved one, and the old Generate form
                    here was a second, weaker door to the same model call. */}
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
                    placeholder="Ask your AI coach anything…"
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
      <input aria-label="Search clients"
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    // Wrapper, not sibling — see the note in ai/diet-generator's Field.
    <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.50)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function RecordNote() {
  return (
    <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.38)', marginTop: -2 }}>
      From the client record — edit the profile to change it.
    </span>
  );
}

function SelectInput({
  value, onChange, placeholder, children, disabled = false,
}: { value: string; onChange: (v: string) => void; placeholder: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <div style={{ position: 'relative' }}>
      <select aria-label={placeholder}
        value={value}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        style={{ ...inputStyle, paddingRight: 34, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.85 : 1, color: value ? '#fff' : 'rgba(255,255,255,0.45)' }}
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
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  appearance: 'none',
  WebkitAppearance: 'none',
};
