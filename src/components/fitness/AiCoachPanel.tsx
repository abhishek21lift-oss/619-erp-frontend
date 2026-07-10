'use client';

import { useState, useRef, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  X,
  Brain,
  Zap,
  Dumbbell,
  Salad,
  Send,
} from 'lucide-react';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AiCoachPanelProps {
  type: 'workout' | 'diet';
  onClose?: () => void;
  clientId?: string;
}

type Mode = 'generate' | 'chat';

interface Message {
  id: string;
  role: 'user' | 'coach';
  content: string;
  timestamp: Date;
}

// ─── Canned coach responses ───────────────────────────────────────────────────

const CANNED_RESPONSES: string[] = [
  "Great question! Based on your current plan, I'd recommend focusing on progressive overload — gradually increasing the weight or reps each session. Consistency is the key to long-term results.",
  "Your nutrition is the foundation. Aim for a protein intake of 1.6–2.2g per kg of bodyweight, spread across 3–5 meals. This supports muscle repair and keeps you satiated.",
  "Recovery is just as important as training. Aim for 7–9 hours of sleep, and consider adding an active recovery day with light walking or yoga to reduce soreness.",
  "Hydration matters more than most people realise. Shoot for at least 35ml per kg of bodyweight daily, and increase that on training days. Even mild dehydration impacts performance.",
  "Mind-muscle connection is underrated. Try slowing down the eccentric (lowering) phase of each lift to 3–4 seconds — this increases time under tension and muscle recruitment.",
];

function getCannedResponse(): string {
  return CANNED_RESPONSES[Math.floor(Math.random() * CANNED_RESPONSES.length)];
}

// ─── Workout Goals / Diet Goals ──────────────────────────────────────────────

const WORKOUT_GOALS = ['Muscle Gain', 'Fat Loss', 'Strength', 'Endurance'];
const DIET_GOALS = ['Muscle Gain', 'Fat Loss', 'Maintenance', 'Performance'];
const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

// ─── Component ────────────────────────────────────────────────────────────────

export function AiCoachPanel({ type, onClose, clientId }: AiCoachPanelProps) {
  const [mode, setMode] = useState<Mode>('generate');

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
      content: `Hi! I'm your AI ${type === 'workout' ? 'workout' : 'nutrition'} coach. Ask me anything about your ${type === 'workout' ? 'training' : 'diet'} plan!`,
      timestamp: new Date(),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, mode]);

  // ── Generate plan ──────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!goal) return;
    setIsGenerating(true);
    setGenerationResult(null);
    setGenerationError(null);

    try {
      if (type === 'workout') {
        const res = await api.ai.generateWorkout({
          age: 30,
          gender: 'male',
          weight_kg: 75,
          height_cm: 175,
          goal: goal.toLowerCase().replace(/ /g, '_'),
          experience_level: experience.toLowerCase() || 'beginner',
          training_days: parseInt(trainingDays, 10) || 4,
          client_id: clientId,
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
          age: 30,
          gender: 'male',
          weight_kg: 75,
          height_cm: 175,
          activity_level: 'moderate',
          goal: goal.toLowerCase().replace(/ /g, '_'),
          dietary_preferences: dietaryPrefs || undefined,
          allergies: allergies || undefined,
          client_id: clientId,
        });
        const plan = res.data;
        const summary = [
          `📋 ${plan.name}`,
          `🔥 ${plan.total_calories} kcal | 💪 ${plan.macros?.protein_g}g P | 🍚 ${plan.macros?.carbs_g}g C | 🧈 ${plan.macros?.fat_g}g F`,
          '',
          ...plan.meals?.slice(0, 5).map(m =>
            `${m.name} (${m.time}) — ${m.calories} kcal`
          ) ?? [],
          '',
          plan.notes ?? '',
        ].filter(Boolean).join('\n');
        setGenerationResult(summary);
      }
    } catch (err) {
      setGenerationError(
        err instanceof Error ? err.message : 'Failed to generate plan. Please try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  }

  // ── Chat send ──────────────────────────────────────────────────────────────

  function handleSend() {
    const text = chatInput.trim();
    if (!text || isTyping) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    const delay = 1200 + Math.random() * 800;
    setTimeout(() => {
      const coachMsg: Message = {
        id: `coach-${Date.now()}`,
        role: 'coach',
        content: getCannedResponse(),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, coachMsg]);
      setIsTyping(false);
    }, delay);
  }

  function handleChatKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      <m.div
        initial={{ x: 380, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 380, opacity: 0 }}
        transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          bottom: 0,
          width: 380,
          zIndex: 60,
          background: 'rgba(7,5,15,0.97)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderLeft: '1px solid rgba(167,139,250,0.20)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 20px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            {/* Icon */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.3) 0%, rgba(139,92,246,0.3) 100%)',
                border: '1px solid rgba(167,139,250,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Sparkles
                size={18}
                style={{
                  background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  color: '#a78bfa',
                }}
              />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.88)',
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                AI Coach
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.40)',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  marginTop: 1,
                }}
              >
                {type === 'workout' ? (
                  <><Dumbbell size={10} /> Workout Specialist</>
                ) : (
                  <><Salad size={10} /> Nutrition Specialist</>
                )}
              </p>
            </div>

            {/* Close */}
            {onClose && (
              <m.button
                onClick={onClose}
                whileHover={{ scale: 1.1, background: 'rgba(255,255,255,0.10)' }}
                whileTap={{ scale: 0.95 }}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  border: 'none',
                  background: 'rgba(255,255,255,0.06)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(255,255,255,0.50)',
                  flexShrink: 0,
                }}
              >
                <X size={16} />
              </m.button>
            )}
          </div>

          {/* Mode toggle */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 10,
              padding: 3,
              gap: 2,
            }}
          >
            {(['generate', 'chat'] as const).map(m_ => (
              <button
                key={m_}
                onClick={() => setMode(m_)}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: mode === m_ ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'transparent',
                  color: mode === m_ ? '#fff' : 'rgba(255,255,255,0.50)',
                  transition: 'all 0.18s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                }}
              >
                {m_ === 'generate' ? (
                  <><Zap size={12} /> Generate Plan</>
                ) : (
                  <><Brain size={12} /> Chat</>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <AnimatePresence mode="wait">
            {mode === 'generate' ? (
              <m.div
                key="generate"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                style={{
                  height: '100%',
                  overflowY: 'auto',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                {/* Goal select */}
                <FieldLabel label="Goal" />
                <select
                  value={goal}
                  onChange={e => setGoal(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Select goal...</option>
                  {(type === 'workout' ? WORKOUT_GOALS : DIET_GOALS).map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>

                {type === 'workout' ? (
                  <>
                    <FieldLabel label="Experience Level" />
                    <select
                      value={experience}
                      onChange={e => setExperience(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">Select level...</option>
                      {EXPERIENCE_LEVELS.map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>

                    <FieldLabel label="Training Days per Week" />
                    <input
                      type="number"
                      min={1}
                      max={7}
                      value={trainingDays}
                      onChange={e => setTrainingDays(e.target.value)}
                      style={inputStyle}
                      placeholder="e.g. 4"
                    />
                  </>
                ) : (
                  <>
                    <FieldLabel label="Dietary Preferences" />
                    <input
                      type="text"
                      value={dietaryPrefs}
                      onChange={e => setDietaryPrefs(e.target.value)}
                      style={inputStyle}
                      placeholder="e.g. Vegetarian, High protein..."
                    />

                    <FieldLabel label="Allergies / Intolerances" />
                    <input
                      type="text"
                      value={allergies}
                      onChange={e => setAllergies(e.target.value)}
                      style={inputStyle}
                      placeholder="e.g. Nuts, Gluten..."
                    />
                  </>
                )}

                {/* Generate button */}
                <m.button
                  onClick={handleGenerate}
                  disabled={isGenerating || !goal}
                  whileHover={!isGenerating && goal ? { scale: 1.02 } : {}}
                  whileTap={!isGenerating && goal ? { scale: 0.98 } : {}}
                  style={{
                    marginTop: 4,
                    padding: '11px 0',
                    borderRadius: 10,
                    border: 'none',
                    background:
                      !goal || isGenerating
                        ? 'rgba(99,102,241,0.25)'
                        : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    color: !goal || isGenerating ? 'rgba(255,255,255,0.35)' : '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: !goal || isGenerating ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    transition: 'all 0.18s',
                  }}
                >
                  {isGenerating ? (
                    <>
                      <span>Generating your plan</span>
                      <AnimatedDots />
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Generate
                    </>
                  )}
                </m.button>

                {/* Generating status */}
                <AnimatePresence>
                  {isGenerating && (
                    <m.p
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      style={{
                        fontSize: 12,
                        color: 'rgba(167,139,250,0.80)',
                        textAlign: 'center',
                        margin: 0,
                      }}
                    >
                      Your AI coach is crafting a personalised plan...
                    </m.p>
                  )}
                </AnimatePresence>

                {/* Error state */}
                <AnimatePresence>
                  {generationError && (
                    <m.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 10,
                        background: 'rgba(239,68,68,0.12)',
                        border: '1px solid rgba(239,68,68,0.25)',
                      }}
                    >
                      <p style={{ fontSize: 12, color: '#f87171', margin: 0 }}>
                        {generationError}
                      </p>
                    </m.div>
                  )}
                </AnimatePresence>

                {/* Result card */}
                <AnimatePresence>
                  {generationResult && (
                    <m.div
                      initial={{ opacity: 0, y: 10, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.97 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      style={{
                        padding: '14px 16px',
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.12) 100%)',
                        border: '1px solid rgba(167,139,250,0.25)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <Sparkles size={13} color="#a78bfa" />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa' }}>
                          Plan Generated
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: 12,
                          color: 'rgba(255,255,255,0.75)',
                          margin: 0,
                          lineHeight: 1.6,
                          whiteSpace: 'pre-wrap',
                          maxHeight: 220,
                          overflowY: 'auto',
                        }}
                      >
                        {generationResult}
                      </p>
                    </m.div>
                  )}
                </AnimatePresence>
              </m.div>
            ) : (
              <m.div
                key="chat"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.2 }}
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Messages */}
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px 16px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <AnimatePresence initial={false}>
                    {messages.map(msg => (
                      <m.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        style={{
                          display: 'flex',
                          justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <div
                          style={{
                            maxWidth: '82%',
                            padding: '10px 13px',
                            borderRadius:
                              msg.role === 'user'
                                ? '14px 14px 4px 14px'
                                : '14px 14px 14px 4px',
                            background:
                              msg.role === 'user'
                                ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                                : 'rgba(255,255,255,0.07)',
                            border:
                              msg.role === 'coach'
                                ? '1px solid rgba(255,255,255,0.08)'
                                : 'none',
                          }}
                        >
                          <p
                            style={{
                              fontSize: 13,
                              color:
                                msg.role === 'user'
                                  ? '#fff'
                                  : 'rgba(255,255,255,0.85)',
                              margin: 0,
                              lineHeight: 1.5,
                            }}
                          >
                            {msg.content}
                          </p>
                        </div>
                      </m.div>
                    ))}
                  </AnimatePresence>

                  {/* Typing indicator */}
                  <AnimatePresence>
                    {isTyping && (
                      <m.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        style={{ display: 'flex', justifyContent: 'flex-start' }}
                      >
                        <div
                          style={{
                            padding: '10px 14px',
                            borderRadius: '14px 14px 14px 4px',
                            background: 'rgba(255,255,255,0.07)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            display: 'flex',
                            gap: 4,
                            alignItems: 'center',
                          }}
                        >
                          {[0, 1, 2].map(i => (
                            <m.div
                              key={i}
                              animate={{ y: [0, -4, 0] }}
                              transition={{
                                repeat: Infinity,
                                duration: 0.8,
                                delay: i * 0.15,
                                ease: 'easeInOut',
                              }}
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: 'rgba(167,139,250,0.70)',
                              }}
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
                    padding: '10px 14px 14px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    gap: 8,
                    alignItems: 'flex-end',
                    flexShrink: 0,
                  }}
                >
                  <textarea
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={handleChatKeyDown}
                    rows={1}
                    placeholder="Ask your AI coach anything..."
                    style={{
                      flex: 1,
                      resize: 'none',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 10,
                      padding: '9px 12px',
                      fontSize: 13,
                      color: '#fff',
                      outline: 'none',
                      fontFamily: 'inherit',
                      lineHeight: 1.4,
                      maxHeight: 100,
                      overflowY: 'auto',
                    }}
                  />
                  <m.button
                    onClick={handleSend}
                    disabled={!chatInput.trim() || isTyping}
                    whileHover={chatInput.trim() && !isTyping ? { scale: 1.08 } : {}}
                    whileTap={chatInput.trim() && !isTyping ? { scale: 0.95 } : {}}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      border: 'none',
                      background:
                        chatInput.trim() && !isTyping
                          ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                          : 'rgba(255,255,255,0.08)',
                      color:
                        chatInput.trim() && !isTyping
                          ? '#fff'
                          : 'rgba(255,255,255,0.25)',
                      cursor: chatInput.trim() && !isTyping ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.18s',
                    }}
                  >
                    <Send size={15} />
                  </m.button>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </m.div>
    </AnimatePresence>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldLabel({ label }: { label: string }) {
  return (
    <label
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: 'rgba(255,255,255,0.50)',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        display: 'block',
        marginBottom: -8,
      }}
    >
      {label}
    </label>
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
          style={{
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: 'currentColor',
            display: 'inline-block',
          }}
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
  padding: '9px 12px',
  fontSize: 13,
  color: '#fff',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  appearance: 'none',
  WebkitAppearance: 'none',
};
