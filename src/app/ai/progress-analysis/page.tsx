'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Loader2, Sparkles, AlertTriangle, CheckCircle2, User, TrendingDown, Minus, Target, Brain, ChevronRight } from 'lucide-react';
import { motion, type Variants } from 'framer-motion';
import { api } from '@/lib/api';
import type { AiProgressAnalysis } from '@/lib/api';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';

const ACCENT = '#FBBF24';
const ACCENT_DIM = 'rgba(251,191,36,0.12)';
const ACCENT_GLOW = 'rgba(251,191,36,0.25)';

interface Client { id: number; name: string; email?: string; }

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

function TrendBadge({ direction }: { direction: string }) {
  const up = direction === 'up' || direction === 'improving';
  const down = direction === 'down' || direction === 'declining';
  if (up) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981' }}>
      <TrendingUp size={15} />
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Up</span>
    </div>
  );
  if (down) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#ef4444' }}>
      <TrendingDown size={15} />
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Down</span>
    </div>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#9ca3af' }}>
      <Minus size={15} />
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stable</span>
    </div>
  );
}

export default function ProgressAnalysisPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AiProgressAnalysis | null>(null);
  const [meta, setMeta] = useState<{ model?: string; tier?: string; used_fallback?: boolean } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = clientSearch ? api.clients.search(clientSearch) : api.clients.list({ limit: 20 });
    load.then((data) => setClients(data as unknown as Client[])).catch(() => {});
  }, [clientSearch]);

  const handleAnalyze = async () => {
    if (!selectedClient) { setError('Please select a client first.'); return; }
    setError(''); setLoading(true); setAnalysis(null); setMeta(null);
    try {
      const res = await api.ai.analyzeProgress(String(selectedClient.id));
      setAnalysis(res.data);
      setMeta({ model: res.model, tier: res.tier, used_fallback: res.used_fallback });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to analyse progress.');
    } finally { setLoading(false); }
  };

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  return (
    <Guard>
      <AppShell title="AI Progress Analyzer">
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 80px' }}>
          {/* Hero */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0} style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16, flexShrink: 0,
                background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(251,191,36,0.05))',
                border: '1px solid rgba(251,191,36,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <TrendingUp size={24} color={ACCENT} />
              </div>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: '#111827' }}>AI Progress Analyzer</h1>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6b7280' }}>
                  Deep dive into a client&apos;s fitness journey with AI-powered insights and strategy
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['Weight Trends', 'Strength Analysis', 'Attendance Tracking', 'Risk Detection', 'Monthly Strategy'].map((p) => (
                <span key={p} style={{
                  fontSize: 12, fontWeight: 500, padding: '5px 12px', borderRadius: 20,
                  background: ACCENT_DIM, color: ACCENT, border: '1px solid rgba(251,191,36,0.2)',
                }}>{p}</span>
              ))}
            </div>
          </motion.div>

          {/* Client selector */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={1} style={{
            borderRadius: 24, padding: '28px',
            background: '#fff', border: '1px solid #e5e7eb',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            marginBottom: 32,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: ACCENT_DIM, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={16} color={ACCENT} />
              </div>
              <span style={{ fontWeight: 700, color: '#111827', fontSize: 15 }}>Select Client</span>
            </div>

            <div style={{ position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <User size={16} color="#9ca3af" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  style={{
                    width: '100%', padding: '12px 14px 12px 42px', borderRadius: 12, fontSize: 14,
                    background: '#fff', border: '1px solid #d1d5db',
                    color: '#111827', outline: 'none', boxSizing: 'border-box',
                  }}
                  placeholder="Search clients by name…"
                  value={selectedClient ? selectedClient.name : clientSearch}
                  onFocus={() => { setShowDropdown(true); if (selectedClient) { setClientSearch(''); setSelectedClient(null); } }}
                  onChange={(e) => { setClientSearch(e.target.value); setSelectedClient(null); setShowDropdown(true); }}
                />
              </div>

              {showDropdown && filteredClients.length > 0 && (
                <div style={{
                  position: 'absolute', zIndex: 20, width: '100%', marginTop: 4,
                  background: '#fff', border: '1px solid #e5e7eb',
                  borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  maxHeight: 220, overflowY: 'auto',
                }}>
                  {filteredClients.map((c, i) => (
                    <button
                      key={c.id}
                      style={{
                        width: '100%', textAlign: 'left', padding: '12px 16px',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        borderBottom: i < filteredClients.length - 1 ? '1px solid #f3f4f6' : 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}
                      onMouseDown={() => { setSelectedClient(c); setClientSearch(c.name); setShowDropdown(false); }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{c.name}</div>
                        {c.email && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{c.email}</div>}
                      </div>
                      <ChevronRight size={14} color="#9ca3af" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 13 }}>{error}</div>
            )}

            <div style={{ marginTop: 20 }}>
              <button
                onClick={handleAnalyze}
                disabled={loading || !selectedClient}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px',
                  borderRadius: 12, fontSize: 14, fontWeight: 700,
                  background: !selectedClient || loading ? 'rgba(251,191,36,0.3)' : `linear-gradient(135deg, ${ACCENT}, #F59E0B)`,
                  color: '#111827', border: 'none',
                  cursor: !selectedClient || loading ? 'not-allowed' : 'pointer',
                  boxShadow: selectedClient && !loading ? `0 4px 20px ${ACCENT_GLOW}` : 'none',
                }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {loading ? 'Analysing…' : 'Analyse Progress'}
              </button>
            </div>
          </motion.div>

          {/* Loading */}
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '60px 0',
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: 20, background: ACCENT_DIM,
                border: '1px solid rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Loader2 size={28} color={ACCENT} className="animate-spin" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Analysing progress data…</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>AI is reviewing workouts, nutrition, and attendance patterns</div>
              </div>
            </motion.div>
          )}

          {/* Results */}
          {analysis && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {meta && (
                <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                  borderRadius: 20, width: 'fit-content',
                  background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)',
                }}>
                  <Sparkles size={13} color="#D4AF37" />
                  <span style={{ fontSize: 12, color: '#D4AF37', fontWeight: 600 }}>Analysed by {meta.model}</span>
                  {meta.used_fallback && <span style={{ fontSize: 11, color: '#D97706', marginLeft: 4 }}>(fallback)</span>}
                </motion.div>
              )}

              {/* Summary */}
              <motion.div variants={fadeUp} initial="hidden" animate="show" custom={1} style={{
                borderRadius: 20, padding: '24px',
                background: '#FFFBEB',
                border: '1px solid rgba(251,191,36,0.25)',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>AI Summary</div>
                <p style={{ fontSize: 15, color: '#111827', lineHeight: 1.7, margin: 0 }}>{analysis.summary}</p>
                {analysis.period_analysed && (
                  <div style={{ marginTop: 12, fontSize: 12, color: '#9ca3af' }}>
                    Period analysed: <strong style={{ color: '#374151' }}>{analysis.period_analysed}</strong>
                  </div>
                )}
              </motion.div>

              {/* Trend cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                {analysis.weight_trend && (
                  <motion.div variants={fadeUp} initial="hidden" animate="show" custom={2} style={{
                    borderRadius: 16, padding: '20px',
                    background: '#fff', border: '1px solid #e5e7eb',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Weight</span>
                      <TrendBadge direction={analysis.weight_trend.direction} />
                    </div>
                    {analysis.weight_trend.change_kg !== undefined && (
                      <div style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginBottom: 6 }}>
                        {analysis.weight_trend.change_kg > 0 ? '+' : ''}{analysis.weight_trend.change_kg}
                        <span style={{ fontSize: 14, color: '#9ca3af', marginLeft: 4 }}>kg</span>
                      </div>
                    )}
                    <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5, margin: 0 }}>{analysis.weight_trend.insight}</p>
                  </motion.div>
                )}
                {analysis.strength_trend && (
                  <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3} style={{
                    borderRadius: 16, padding: '20px',
                    background: '#fff', border: '1px solid #e5e7eb',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Strength</span>
                      <TrendBadge direction={analysis.strength_trend.direction} />
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 6 }}>{analysis.strength_trend.highlight}</div>
                    <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5, margin: 0 }}>{analysis.strength_trend.insight}</p>
                  </motion.div>
                )}
                {analysis.attendance_trend && (
                  <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4} style={{
                    borderRadius: 16, padding: '20px',
                    background: '#fff', border: '1px solid #e5e7eb',
                  }}>
                    <div style={{ marginBottom: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Attendance</span>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginBottom: 6 }}>
                      {analysis.attendance_trend.rate_pct}
                      <span style={{ fontSize: 14, color: '#9ca3af', marginLeft: 2 }}>%</span>
                    </div>
                    <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5, margin: 0 }}>{analysis.attendance_trend.insight}</p>
                  </motion.div>
                )}
              </div>

              {/* Wins */}
              {analysis.wins?.length ? (
                <motion.div variants={fadeUp} initial="hidden" animate="show" custom={5} style={{
                  borderRadius: 20, padding: '20px 24px',
                  background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <CheckCircle2 size={18} color="#10b981" />
                    <span style={{ fontWeight: 700, color: '#059669', fontSize: 14 }}>Wins &amp; Achievements</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {analysis.wins.map((w, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: '#10b981', marginTop: 6 }} />
                        <span style={{ fontSize: 14, color: '#059669', lineHeight: 1.5 }}>{w}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : null}

              {/* Risks */}
              {analysis.risks?.length ? (
                <motion.div variants={fadeUp} initial="hidden" animate="show" custom={6} style={{
                  borderRadius: 20, overflow: 'hidden',
                  background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.2)',
                }}>
                  <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(251,191,36,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={18} color={ACCENT} />
                    <span style={{ fontWeight: 700, color: ACCENT, fontSize: 14 }}>Risk Factors</span>
                  </div>
                  {analysis.risks.map((r, i) => (
                    <div key={i} style={{
                      padding: '16px 24px',
                      borderBottom: i < analysis.risks!.length - 1 ? '1px solid rgba(251,191,36,0.1)' : 'none',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{r.risk}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em',
                          background: r.severity === 'high' ? 'rgba(239,68,68,0.1)' : r.severity === 'medium' ? 'rgba(251,191,36,0.15)' : '#F3F4F6',
                          color: r.severity === 'high' ? '#ef4444' : r.severity === 'medium' ? ACCENT : '#6b7280',
                        }}>{r.severity}</span>
                      </div>
                      <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, margin: 0 }}>{r.action}</p>
                    </div>
                  ))}
                </motion.div>
              ) : null}

              {/* Recommendations */}
              {analysis.recommendations?.length ? (
                <motion.div variants={fadeUp} initial="hidden" animate="show" custom={7} style={{
                  borderRadius: 20, overflow: 'hidden',
                  background: '#fff', border: '1px solid #e5e7eb',
                }}>
                  <div style={{ padding: '16px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Target size={18} color={ACCENT} />
                    <span style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>Recommendations</span>
                  </div>
                  {analysis.recommendations
                    .slice()
                    .sort((a, b) => a.priority - b.priority)
                    .map((r, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 24px',
                      borderBottom: i < analysis.recommendations!.length - 1 ? '1px solid #f3f4f6' : 'none',
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        background: ACCENT_DIM, color: ACCENT, fontSize: 12, fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>{r.priority}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{r.action}</div>
                        {r.rationale && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4, lineHeight: 1.5 }}>{r.rationale}</div>}
                      </div>
                    </div>
                  ))}
                </motion.div>
              ) : null}

              {/* Next month strategy */}
              {analysis.next_month_strategy && (
                <motion.div variants={fadeUp} initial="hidden" animate="show" custom={8} style={{
                  borderRadius: 16, padding: '20px 24px',
                  background: '#fff', border: '1px solid #e5e7eb',
                  display: 'flex', gap: 14,
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: ACCENT_DIM, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Brain size={18} color={ACCENT} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Next Month Strategy</div>
                    <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, margin: 0 }}>{analysis.next_month_strategy}</p>
                  </div>
                </motion.div>
              )}

              {/* Motivation */}
              {analysis.motivation_message && (
                <motion.div variants={fadeUp} initial="hidden" animate="show" custom={9} style={{
                  borderRadius: 16, padding: '20px 24px',
                  background: ACCENT_DIM, border: '1px solid rgba(251,191,36,0.2)', textAlign: 'center',
                }}>
                  <p style={{ fontSize: 15, color: ACCENT, fontStyle: 'italic', lineHeight: 1.7, margin: 0, fontWeight: 500 }}>
                    &ldquo;{analysis.motivation_message}&rdquo;
                  </p>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </AppShell>
    </Guard>
  );
}
