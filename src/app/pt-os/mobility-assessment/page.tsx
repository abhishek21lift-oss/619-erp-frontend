'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, Loader2, Search, Users, AlertCircle,
  Move, Plus, X, History,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useAutoSaveDraft } from '@/hooks/useAutoSaveDraft';
import { calcMobilityScore, classifyMobility } from '@/lib/mobility-calculations';
import { STEPS, initMobilityForm, n } from '@/components/pt-os/mobility-assessment/types';
import type { MobilityFormData, StepId } from '@/components/pt-os/mobility-assessment/types';
import MobilityProgressTimeline from '@/components/pt-os/mobility-assessment/MobilityProgressTimeline';
import StepBodyRegions from '@/components/pt-os/mobility-assessment/StepBodyRegions';
import StepFunctionalTests from '@/components/pt-os/mobility-assessment/StepFunctionalTests';
import StepPerformanceMetrics from '@/components/pt-os/mobility-assessment/StepPerformanceMetrics';
import MobilityDashboard from '@/components/pt-os/mobility-assessment/MobilityDashboard';
import MobilityComparison from '@/components/pt-os/mobility-assessment/MobilityComparison';
import MobilityCard from '@/components/pt-os/mobility-assessment/MobilityCard';

interface ClientOption { id: string; name: string; }

const EASE = [0.16, 1, 0.3, 1] as const;

function formFromRow(row: Record<string, unknown>): MobilityFormData {
  const fresh = initMobilityForm();
  return {
    ...fresh,
    assessmentDate: row.assessment_date ? String(row.assessment_date).slice(0, 10) : fresh.assessmentDate,
    bodyRegions: Array.isArray(row.body_regions) && row.body_regions.length ? row.body_regions as MobilityFormData['bodyRegions'] : fresh.bodyRegions,
    mobilityTests: Array.isArray(row.mobility_tests) && row.mobility_tests.length ? row.mobility_tests as MobilityFormData['mobilityTests'] : fresh.mobilityTests,
    gripStrengthKg: row.grip_strength_kg != null ? String(row.grip_strength_kg) : '',
    verticalJumpCm: row.vertical_jump_cm != null ? String(row.vertical_jump_cm) : '',
    sitReachCm: row.sit_reach_cm != null ? String(row.sit_reach_cm) : '',
    balanceTestSeconds: row.balance_test_seconds != null ? String(row.balance_test_seconds) : '',
    reactionTimeMs: row.reaction_time_ms != null ? String(row.reaction_time_ms) : '',
    performanceNotes: row.performance_notes ? String(row.performance_notes) : '',
  };
}

export default function PtMobilityAssessmentPage() {
  return (
    <Guard>
      <AppShell>
        <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#F59E0B' }} /></div>}>
          <MobilityContent />
        </Suspense>
      </AppShell>
    </Guard>
  );
}

function MobilityContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const { toast } = useToast();
  const clientId = sp.get('client_id') || '';

  if (!clientId) return <ClientPicker />;
  return <MobilityHub key={clientId} clientId={clientId} router={router} toast={toast} />;
}

/* ─────────────────────────────────────────────────────── CLIENT PICKER */
function ClientPicker() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    api.pt.clients().then((r: { data?: unknown[] }) => {
      const arr = Array.isArray(r?.data) ? r.data : [];
      setClients((arr as Record<string, unknown>[]).map((c) => ({ id: String(c.id), name: String(c.name ?? '') })));
    }).catch(() => setLoadError(true)).finally(() => setLoading(false));
  }, []);

  const filtered = clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[24px] p-8 sm:p-10 mb-6"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: 'var(--bg-subtle)' }}>
            <Move size={16} style={{ color: 'var(--text-muted)' }} />
          </div>
          <span className="text-[11px] font-[650] uppercase tracking-[0.08em]" style={{ color: 'var(--text-disabled)' }}>Mobility Assessment</span>
        </div>
        <h1 className="text-[32px] sm:text-[40px] font-[860] tracking-[-0.03em] leading-tight" style={{ color: 'var(--text-primary)' }}>
          Range of Motion Baseline
        </h1>
        <p className="mt-3 max-w-xl text-[14px]" style={{ color: 'var(--text-muted)' }}>
          Select a client to begin or review their mobility assessment.
        </p>
      </m.div>

      <div className="rounded-[20px] p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-disabled)' }} />
          <input
            type="text" placeholder="Search clients..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-[10px] text-[13px] outline-none"
            style={{ background: 'var(--bg-card)', border: '1px solid #d1d5db', color: 'var(--text-primary)' }}
          />
        </div>
        {loading && <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin" /></div>}
        {loadError && <p className="text-center py-8 text-[13px]" style={{ color: 'var(--text-muted)' }}>Could not load clients.</p>}
        {!loading && !loadError && (
          <div className="flex flex-wrap gap-2 max-h-[360px] overflow-y-auto">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => router.push(`/pt-os/mobility-assessment?client_id=${c.id}`)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[13px] font-[600] transition-all"
                style={{ background: '#F9FAFB', border: '1px solid #e5e7eb', color: '#334155' }}
              >
                <Users size={13} /> {c.name}
              </button>
            ))}
            {filtered.length === 0 && <p className="text-[12px]" style={{ color: 'var(--text-disabled)' }}>No clients found.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── HUB (list + wizard) */
interface MobilityHubProps {
  clientId: string;
  router: ReturnType<typeof useRouter>;
  toast: ReturnType<typeof useToast>['toast'];
}

function MobilityHub({ clientId, toast }: MobilityHubProps) {
  const [clientName, setClientName] = useState('');
  const [assessments, setAssessments] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [view, setView] = useState<'list' | 'wizard'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [clientRes, listRes] = await Promise.all([
        api.pt.client(clientId) as Promise<{ data?: Record<string, unknown> }>,
        api.progress.mobilityPerformanceAssessments.list({ client_id: clientId }) as Promise<{ data?: Record<string, unknown>[] }>,
      ]);
      const c = clientRes?.data;
      if (!c) { setLoadError('Client not found.'); setLoading(false); return; }
      setClientName(String(c.name ?? ''));
      setAssessments(Array.isArray(listRes?.data) ? listRes.data : []);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load client.');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { loadData(); }, [loadData]);

  const openWizard = (id: string | null) => { setEditingId(id); setView('wizard'); };
  const closeWizard = (refresh: boolean) => { setView('list'); setEditingId(null); if (refresh) loadData(); };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#F59E0B' }} /></div>;
  }
  if (loadError) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <AlertCircle size={32} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
        <p className="text-[14px] font-[600] text-slate-600">{loadError}</p>
        <Button variant="outline" className="mt-4" onClick={loadData}>Retry</Button>
      </div>
    );
  }

  if (view === 'wizard') {
    const editing = editingId ? assessments.find((a) => String(a.id) === editingId) : null;
    return <MobilityWizard clientId={clientId} clientName={clientName} editing={editing || null} toast={toast} onDone={closeWizard} />;
  }

  const sorted = [...assessments].sort((a, b) => String(b.assessment_date ?? '').localeCompare(String(a.assessment_date ?? '')));
  const initial = sorted[sorted.length - 1];
  const latest = sorted[0];

  return (
    <div className="mx-auto w-full max-w-3xl px-5 sm:px-8 py-6 space-y-5">
      <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[24px] p-8 sm:p-10"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: 'var(--bg-subtle)' }}>
                <Move size={16} style={{ color: 'var(--text-muted)' }} />
              </div>
              <span className="text-[11px] font-[650] uppercase tracking-[0.08em]" style={{ color: 'var(--text-disabled)' }}>Mobility Assessment</span>
            </div>
            <h1 className="text-[26px] sm:text-[32px] font-[860] tracking-[-0.03em] leading-tight" style={{ color: 'var(--text-primary)' }}>
              {clientName}&apos;s Mobility
            </h1>
          </div>
          <Button iconLeft={<Plus size={14} />} onClick={() => openWizard(null)} style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff' }}>
            New Assessment
          </Button>
        </div>
      </m.div>

      {sorted.length >= 2 && <MobilityComparison initial={initial} latest={latest} />}

      <div className="space-y-3">
        {sorted.length === 0 && (
          <div className="rounded-[20px] p-10 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-[14px] font-[600] text-slate-500">No mobility assessments yet.</p>
            <Button className="mt-4" iconLeft={<Plus size={14} />} onClick={() => openWizard(null)} style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff' }}>
              Start First Assessment
            </Button>
          </div>
        )}
        {sorted.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <History size={14} style={{ color: 'var(--text-muted)' }} />
            <p className="text-[12.5px] font-[700] text-slate-500">Assessment History</p>
          </div>
        )}
        {sorted.map((a) => (
          <MobilityCard key={String(a.id)} assessment={a} onClick={() => openWizard(String(a.id))} />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── WIZARD */
interface MobilityWizardProps {
  clientId: string;
  clientName: string;
  editing: Record<string, unknown> | null;
  toast: ReturnType<typeof useToast>['toast'];
  onDone: (refresh: boolean) => void;
}

function MobilityWizard({ clientId, clientName, editing, toast, onDone }: MobilityWizardProps) {
  const assessmentId = editing ? String(editing.id) : null;
  const initial = useMemo(() => (editing ? formFromRow(editing) : initMobilityForm()), [editing]);

  const [form, setForm] = useState<MobilityFormData>(initial);
  const [step, setStep] = useState<StepId>(1);
  const [reviewMode, setReviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const initFormRef = useRef<MobilityFormData>(initial);

  const draftKey = `mobility-assessment-draft.v1:${clientId}:${assessmentId || 'new'}`;
  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initFormRef.current), [form]);
  const { restore, clear, saveNow } = useAutoSaveDraft({ key: draftKey, data: form, isDirty });

  useEffect(() => {
    const draft = restore();
    if (draft) { setForm({ ...initial, ...draft }); toast.info('Restored your unsaved draft.'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const set = useCallback(<K extends keyof MobilityFormData>(key: K, val: MobilityFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  const analysis = useMemo(() => {
    const mobilityScore = calcMobilityScore(form.bodyRegions, form.mobilityTests);
    const mobilityCategory = classifyMobility(mobilityScore);
    return { mobilityScore, mobilityCategory };
  }, [form.bodyRegions, form.mobilityTests]);

  const handleNext = () => {
    if (step === 3) { setReviewMode(true); return; }
    setStep((s) => (s + 1) as StepId);
  };

  const handleBack = () => {
    if (reviewMode) { setReviewMode(false); return; }
    if (step > 1) { setStep((s) => (s - 1) as StepId); return; }
    if (isDirty && !window.confirm('Discard unsaved changes?')) return;
    onDone(false);
  };

  const handleSaveDraft = () => {
    const ok = saveNow();
    toast[ok ? 'success' : 'error'](ok ? 'Draft saved.' : 'Could not save draft — storage unavailable.');
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        client_id: clientId,
        assessment_date: form.assessmentDate || undefined,
        body_regions: form.bodyRegions,
        mobility_tests: form.mobilityTests,
        grip_strength_kg: n(form.gripStrengthKg) ?? undefined,
        vertical_jump_cm: n(form.verticalJumpCm) ?? undefined,
        sit_reach_cm: n(form.sitReachCm) ?? undefined,
        balance_test_seconds: n(form.balanceTestSeconds) ?? undefined,
        reaction_time_ms: n(form.reactionTimeMs) ?? undefined,
        performance_notes: form.performanceNotes || undefined,
      };

      if (assessmentId) {
        await api.progress.mobilityPerformanceAssessments.update(assessmentId, payload);
        toast.success('Assessment updated.');
      } else {
        await api.progress.mobilityPerformanceAssessments.create(payload);
        toast.success('Assessment saved.');
      }
      clear();
      onDone(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save assessment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen pb-28" style={{ background: 'linear-gradient(160deg,#f8fafc 0%,#f1f5f9 60%,#fafafe 100%)' }}>
      {/* Header — in normal flow on the page background (no sticky card). */}
      <div className="pt-1">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px]" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 6px 18px rgba(245,158,11,0.3)' }}>
              <Move size={18} color="#fff" />
            </div>
            <div>
              <h1 className="text-[19px] font-[860] tracking-[-0.03em] text-slate-900 leading-none sm:text-[22px]">{assessmentId ? 'Edit Assessment' : 'New Assessment'}</h1>
              <p className="text-[12px] font-[600] text-slate-400 mt-1">{clientName}</p>
            </div>
          </div>
          <button type="button" onClick={() => onDone(false)} className="flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-[650] transition-colors hover:bg-white" style={{ color: '#64748b', border: '1px solid rgba(15,23,42,0.08)' }}>
            <X size={12} /> Cancel
          </button>
        </div>
        {!reviewMode && (
          <div className="mx-auto max-w-3xl px-5 sm:px-8 pb-3">
            <MobilityProgressTimeline current={step} onStep={setStep} />
          </div>
        )}
      </div>

      <div className="mx-auto max-w-3xl px-5 sm:px-8 py-6 space-y-5">
        {!reviewMode ? (
          <m.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
            {step === 1 && <StepBodyRegions form={form} set={set} />}
            {step === 2 && <StepFunctionalTests form={form} set={set} />}
            {step === 3 && <StepPerformanceMetrics form={form} set={set} />}
          </m.div>
        ) : (
          <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }} className="space-y-5">
            <MobilityDashboard mobilityScore={analysis.mobilityScore} mobilityCategory={analysis.mobilityCategory} bodyRegions={form.bodyRegions} />
          </m.div>
        )}
      </div>

      <div className="page-action-bar" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(15,23,42,0.08)' }}>
        <div className="mx-auto max-w-3xl px-5 sm:px-8 py-3.5 flex items-center justify-between gap-3">
          <Button variant="outline" iconLeft={<ArrowLeft size={14} />} onClick={handleBack}>Back</Button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleSaveDraft}>Save Draft</Button>
            {!reviewMode ? (
              <Button
                iconLeft={<ArrowRight size={14} />}
                onClick={handleNext}
                style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff' }}
              >
                {step === 3 ? 'Review' : 'Next'}
              </Button>
            ) : (
              <Button
                iconLeft={!saving ? <Check size={14} /> : undefined}
                loading={saving} disabled={saving}
                onClick={handleSubmit}
                style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff' }}
              >
                {saving ? 'Saving...' : assessmentId ? 'Update Assessment' : 'Save Assessment'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
