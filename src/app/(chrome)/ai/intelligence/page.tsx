'use client';

/**
 * Intelligence Center — the trainer's operations hub for AI-discovered
 * facts and programming proposals.
 *
 * Three modes:
 * 1. Overview — unified pending work queue across all clients
 * 2. Client view — deep intelligence summary for one client
 * 3. Audit trail — history of all intelligence actions
 *
 * The UI answers:
 *   WHAT CHANGED? WHAT DOES AI KNOW? WHAT DOES AI SUGGEST?
 *   WHAT NEEDS ATTENTION? WHAT DATA IS MISSING? WHAT SHOULD I DO NEXT?
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Brain, Dumbbell, AlertTriangle, CheckCircle2, Clock, Loader2,
  RefreshCw, XCircle, Sparkles, ChevronRight, ScrollText, Zap,
} from 'lucide-react';
import { m, type Variants } from 'framer-motion';
import { api } from '@/lib/api';
import type {
  PendingWorkQueue, PendingWorkItem, AiMemoryCandidate, AiProgrammerProposal,
  ClientIntelligenceSummary,
} from '@/lib/api';
import Guard from '@/components/Guard';
import { PageContainer, PageHero, EmptyState } from '@/components/ui';
import { useToast } from '@/lib/toast';
import MemoryCandidateCard from '@/components/ai/MemoryCandidateCard';
import ProgrammerProposalCard from '@/components/ai/ProgrammerProposalCard';
import AuditTrailPanel from '@/components/ai/AuditTrailPanel';

const ACCENT = '#0067E0';
const ACCENT_DIM = 'rgba(0,103,224,0.10)';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  }),
};

/* ─── Tab bar ─────────────────────────────────────────────────────────────── */
function TabBar({ active, counts, onChange }: {
  active: 'overview' | 'memory' | 'proposals' | 'audit';
  counts: { overview: number; memory: number; proposals: number; audit: number };
  onChange: (tab: 'overview' | 'memory' | 'proposals' | 'audit') => void;
}) {
  const tabs = [
    { id: 'overview' as const, label: 'All Pending', count: counts.overview },
    { id: 'memory' as const, label: 'Memories', count: counts.memory },
    { id: 'proposals' as const, label: 'Proposals', count: counts.proposals },
    { id: 'audit' as const, label: 'Audit', count: 0 },
  ];
  return (
    <div className="flex gap-1 rounded-[14px] p-1" style={{ background: 'var(--bg-subtle)' }}>
      {tabs.map((t) => (
        <button key={t.id} type="button" onClick={() => onChange(t.id)}
          className="flex items-center gap-1.5 rounded-[11px] px-3.5 py-2 text-[12px] font-[700] transition-all"
          style={active === t.id
            ? { background: 'var(--bg-card)', color: 'var(--text-primary)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
            : { background: 'transparent', color: 'var(--text-muted)' }}>
          {t.label}
          {t.id !== 'audit' && t.count > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-[800]"
              style={{ background: t.id === active ? ACCENT_DIM : 'rgba(15,23,42,0.06)', color: t.id === active ? ACCENT : 'var(--text-disabled)' }}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ─── Priority badge ──────────────────────────────────────────────────────── */
function PriorityBadge({ priority }: { priority: number }) {
  if (priority >= 80) return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-[800]"
      style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}>HIGH</span>
  );
  if (priority >= 60) return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-[800]"
      style={{ background: 'rgba(245,158,11,0.1)', color: '#B45309' }}>MED</span>
  );
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-[800]"
      style={{ background: 'var(--bg-subtle)', color: 'var(--text-disabled)' }}>LOW</span>
  );
}

/* ─── Pending item row ────────────────────────────────────────────────────── */
function PendingItemRow({ item, onSelect }: {
  item: PendingWorkItem;
  onSelect: () => void;
}) {
  const isMemory = item.type === 'memory';
  const data = item.data as AiMemoryCandidate | AiProgrammerProposal;

  return (
    <button type="button" onClick={onSelect}
      className="flex items-center gap-3 w-full rounded-[14px] px-4 py-3.5 text-left transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)]"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px]"
        style={{ background: isMemory ? 'rgba(99,102,241,0.1)' : ACCENT_DIM }}>
        {isMemory ? <Brain size={15} color="#6366f1" /> : <Dumbbell size={15} color={ACCENT} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-[650]" style={{ color: 'var(--text-primary)' }}>
          {isMemory ? (data as AiMemoryCandidate).fact : (data as AiProgrammerProposal).summary}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="rounded-full px-2 py-0.5 text-[10px] font-[700]"
            style={{ background: isMemory ? 'rgba(99,102,241,0.08)' : 'rgba(0,103,224,0.08)',
              color: isMemory ? '#6366f1' : ACCENT }}>
            {isMemory ? (data as AiMemoryCandidate).category : (data as AiProgrammerProposal).proposal_type.replace(/_/g, ' ')}
          </span>
          <span className="text-[10px] font-[600]" style={{ color: 'var(--text-disabled)' }}>
            {Math.round((data.confidence ?? 0) * 100)}% conf
          </span>
        </div>
      </div>
      <PriorityBadge priority={item.priority} />
      <ChevronRight size={14} style={{ color: 'var(--text-disabled)' }} />
    </button>
  );
}

/* ─── Intelligence summary section ────────────────────────────────────────── */
function IntelSection({ title, icon, items, color }: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  color: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-[16px] px-4 py-3.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color }}>{icon}</span>
        <span className="text-[11px] font-[800] uppercase tracking-[0.08em]" style={{ color }}>{title}</span>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-[700]"
          style={{ background: `${color}15`, color }}>{items.length}</span>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-[12.5px] font-[560] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Generate Proposals loading steps ────────────────────────────────────── */
const GENERATION_STEPS = [
  'Analysing client data…',
  'Checking progression engine…',
  'Evaluating recovery status…',
  'Running safety checks…',
  'Preparing proposals…',
];

/* ─── Main page ───────────────────────────────────────────────────────────── */
export default function IntelligenceCenterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialClient = searchParams.get('client_id');
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'memory' | 'proposals' | 'audit'>('overview');
  const [queue, setQueue] = useState<PendingWorkQueue | null>(null);
  const [intel, setIntel] = useState<ClientIntelligenceSummary | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(initialClient);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate proposals state
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);

  // Filtered counts
  const memoryCount = queue?.memory_candidates?.length ?? 0;
  const proposalCount = queue?.programmer_proposals?.length ?? 0;
  const totalPending = queue?.total_pending ?? 0;

  const fetchQueue = useCallback(async (clientId?: string | null) => {
    try {
      const res = await api.ai.trainer.pending({
        client_id: clientId ?? undefined,
        limit: 30,
      });
      setQueue(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pending work');
    }
  }, []);

  const fetchIntel = useCallback(async (clientId: string) => {
    try {
      const res = await api.ai.trainer.intelligence(clientId);
      setIntel(res.data);
    } catch (err) {
      setIntel(null);
      if (err instanceof Error && !err.message.includes('404')) {
        setError(err.message);
      }
    }
  }, []);

  // Initial load
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      await fetchQueue(selectedClientId);
      if (selectedClientId && alive) {
        await fetchIntel(selectedClientId);
      }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [selectedClientId, fetchQueue, fetchIntel]);

  const refresh = async () => {
    setRefreshing(true);
    setError(null);
    await fetchQueue(selectedClientId);
    if (selectedClientId) await fetchIntel(selectedClientId);
    setRefreshing(false);
  };

  const handleConfirmMemory = async (id: string) => {
    await api.ai.trainer.confirmMemory(id);
    toast.success('Memory confirmed as active');
    await refresh();
  };

  const handleRejectMemory = async (id: string, reason?: string) => {
    await api.ai.trainer.rejectMemory(id, reason);
    toast.info('Memory rejected');
    await refresh();
  };

  const handleApproveProposal = async (id: string, execute?: boolean) => {
    const res = await api.ai.trainer.approveProposal(id, { execute });
    if (res.execution_status === 'failed') {
      toast.warning('Proposal approved but execution failed', { description: res.execution_error });
    } else if (execute) {
      toast.success('Change applied successfully');
    } else {
      toast.success('Proposal approved — pending training-system execution');
    }
    await refresh();
  };

  const handleRejectProposal = async (id: string, reason?: string) => {
    await api.ai.trainer.rejectProposal(id, reason);
    toast.info('Proposal rejected');
    await refresh();
  };

  const handleReverseProposal = async (id: string, reason?: string) => {
    const res = await api.ai.trainer.reverseProposal(id, reason);
    if (res.status === 'already_reversed') {
      toast.info('Already reversed');
    } else {
      toast.success('Change reversed successfully');
    }
    await refresh();
  };

  const handleGenerateProposals = async () => {
    if (!selectedClientId || generating) return;
    setGenerating(true);
    setGenStep(0);
    setError(null);

    const stepTimer = setInterval(() => {
      setGenStep((s) => Math.min(s + 1, GENERATION_STEPS.length - 1));
    }, 2000);

    try {
      await api.ai.programmer.propose({ client_id: selectedClientId });
      clearInterval(stepTimer);
      toast.success('Proposals generated successfully');
      await refresh();
    } catch (err) {
      clearInterval(stepTimer);
      const msg = err instanceof Error ? err.message : 'Failed to generate proposals';
      if (msg.includes('403') || msg.includes('Safety gate')) {
        toast.error('Safety gate blocked proposal generation', { description: msg });
      } else {
        toast.error(msg);
      }
      setError(msg);
    } finally {
      setGenerating(false);
      setGenStep(0);
    }
  };

  const viewClient = (clientId: string) => {
    setSelectedClientId(clientId);
    router.push(`/ai/intelligence?client_id=${clientId}`);
  };

  const filteredItems = (() => {
    if (!queue) return [];
    if (activeTab === 'memory') return queue.memory_candidates;
    if (activeTab === 'proposals') return queue.programmer_proposals;
    // Overview: merge and sort by priority
    return [...queue.memory_candidates, ...queue.programmer_proposals]
      .sort((a, b) => b.priority - a.priority);
  })();

  return (
    <Guard>
      <PageContainer>
        <PageHero
          icon={<Brain size={20} />}
          title="Intelligence Center"
          subtitle="What AI discovered, what it recommends, and what needs your decision."
        >
          <div className="flex flex-wrap gap-2">
            {totalPending > 0 && (
              <span className="rounded-full px-3 py-1.5 text-[11.5px] font-[650] text-white"
                style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.2)' }}>
                {totalPending} pending
              </span>
            )}
            <span className="rounded-full px-3 py-1.5 text-[11.5px] font-[650] text-white"
              style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.2)' }}>
              AI Proposals + Memory
            </span>
          </div>
        </PageHero>

        <div className="mx-auto w-full max-w-5xl">
          {/* Controls */}
          <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
            <TabBar active={activeTab} counts={{ overview: totalPending, memory: memoryCount, proposals: proposalCount, audit: 0 }}
              onChange={setActiveTab} />
            <div className="flex items-center gap-2">
              {selectedClientId && activeTab !== 'audit' && (
                <button type="button" onClick={handleGenerateProposals} disabled={generating}
                  className="flex h-9 items-center gap-1.5 rounded-[11px] px-3.5 text-[12px] font-[700] text-white transition-all"
                  style={{
                    background: generating ? '#94a3b8' : 'linear-gradient(135deg, #0067e0, #003f87)',
                    boxShadow: generating ? 'none' : '0 4px 14px rgba(0,103,224,0.3)',
                  }}>
                  {generating ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                  {generating ? GENERATION_STEPS[genStep] : 'Generate Proposals'}
                </button>
              )}
              <button type="button" onClick={refresh} disabled={refreshing}
                className="flex h-9 items-center gap-1.5 rounded-[11px] px-3 text-[12px] font-[700]"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[72px] rounded-[14px] animate-pulse" style={{ background: 'var(--bg-subtle)' }} />
              ))}
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="rounded-[14px] px-4 py-3 text-[13px] font-[600]"
              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626' }}>
              {error}
            </div>
          )}

          {/* Audit trail tab */}
          {activeTab === 'audit' && !loading && (
            <m.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
              <div className="mb-4 flex items-center gap-2">
                <ScrollText size={15} style={{ color: ACCENT }} />
                <span className="text-[13px] font-[750]" style={{ color: 'var(--text-primary)' }}>
                  Audit Trail
                </span>
                {selectedClientId && (
                  <span className="text-[11px] font-[600]" style={{ color: 'var(--text-disabled)' }}>
                    — filtered to this client
                  </span>
                )}
              </div>
              <AuditTrailPanel clientId={selectedClientId ?? undefined} limit={30} />
            </m.div>
          )}

          {/* Empty */}
          {!loading && !error && activeTab !== 'audit' && filteredItems.length === 0 && (
            <EmptyState
              icon={<CheckCircle2 size={28} />}
              title="All clear"
              description={selectedClientId
                ? 'No pending AI items for this client.'
                : 'No pending AI items across your clients.'}
            />
          )}

          {/* Pending items list */}
          {!loading && !error && activeTab !== 'audit' && filteredItems.length > 0 && (
            <m.div className="space-y-2" variants={fadeUp} initial="hidden" animate="show" custom={0}>
              {filteredItems.map((item, i) => (
                <m.div key={`${item.type}-${(item.data as AiMemoryCandidate | AiProgrammerProposal).id}`} variants={fadeUp} custom={i}>
                  <PendingItemRow
                    item={item}
                    onSelect={() => {
                      const clientId = (item.data as AiMemoryCandidate | AiProgrammerProposal).client_id;
                      viewClient(clientId);
                    }}
                  />
                </m.div>
              ))}
            </m.div>
          )}

          {/* Client Intelligence Summary */}
          {selectedClientId && intel && !loading && (
            <m.div className="mt-8" variants={fadeUp} initial="hidden" animate="show" custom={0}>
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-[10px]"
                  style={{ background: ACCENT_DIM }}>
                  <Sparkles size={15} color={ACCENT} />
                </span>
                <div>
                  <h2 className="text-[16px] font-[800]" style={{ color: 'var(--text-primary)' }}>
                    {intel.client_name}
                  </h2>
                  <p className="text-[11px] font-[600]" style={{ color: 'var(--text-disabled)' }}>
                    Client Intelligence Summary
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <IntelSection
                  title="What Changed"
                  icon={<RefreshCw size={13} />}
                  items={intel.what_changed.map((c) => c.text)}
                  color="#059669"
                />
                <IntelSection
                  title="What AI Knows"
                  icon={<Brain size={13} />}
                  items={intel.what_ai_knows.map((m) => `${m.category}: ${m.fact}`)}
                  color="#6366f1"
                />
                <IntelSection
                  title="What AI Suggests"
                  icon={<Dumbbell size={13} />}
                  items={intel.what_ai_suggests.map((s) => `${s.type}: ${s.summary}`)}
                  color={ACCENT}
                />
                <IntelSection
                  title="Needs Attention"
                  icon={<AlertTriangle size={13} />}
                  items={intel.what_needs_attention.map((a) => a.text)}
                  color="#B45309"
                />
                {intel.what_is_missing.length > 0 && (
                  <IntelSection
                    title="Missing Data"
                    icon={<XCircle size={13} />}
                    items={intel.what_is_missing}
                    color="#64748b"
                  />
                )}
              </div>

              {/* Next best action */}
              {intel.next_best_action && (
                <div className="mt-3 rounded-[14px] px-4 py-3"
                  style={{ background: 'linear-gradient(135deg, rgba(0,103,224,0.06), rgba(0,103,224,0.02))', border: '1px solid rgba(0,103,224,0.15)' }}>
                  <p className="text-[10.5px] font-[800] uppercase tracking-[0.08em]" style={{ color: ACCENT }}>
                    Next Best Action
                  </p>
                  <p className="mt-1 text-[13px] font-[650]" style={{ color: 'var(--text-primary)' }}>
                    {intel.next_best_action.text}
                  </p>
                </div>
              )}

              {/* Memory candidates for this client */}
              {queue && queue.memory_candidates.length > 0 && (
                <div className="mt-6">
                  <p className="mb-3 text-[11px] font-[800] uppercase tracking-[0.08em]" style={{ color: 'var(--text-disabled)' }}>
                    Memory Candidates for {intel.client_name}
                  </p>
                  <div className="space-y-3">
                    {queue.memory_candidates.map((item) => {
                      const mem = item.data as AiMemoryCandidate;
                      return (
                        <MemoryCandidateCard
                          key={mem.id}
                          memory={mem}
                          onConfirm={handleConfirmMemory}
                          onReject={handleRejectMemory}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Programmer proposals for this client */}
              {queue && queue.programmer_proposals.length > 0 && (
                <div className="mt-6">
                  <p className="mb-3 text-[11px] font-[800] uppercase tracking-[0.08em]" style={{ color: 'var(--text-disabled)' }}>
                    Programmer Proposals for {intel.client_name}
                  </p>
                  <div className="space-y-3">
                    {queue.programmer_proposals.map((item) => {
                      const prop = item.data as AiProgrammerProposal;
                      return (
                        <ProgrammerProposalCard
                          key={prop.id}
                          proposal={prop}
                          onApprove={handleApproveProposal}
                          onReject={handleRejectProposal}
                          onReverse={handleReverseProposal}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </m.div>
          )}
        </div>
      </PageContainer>
    </Guard>
  );
}
