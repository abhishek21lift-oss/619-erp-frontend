'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, Loader2, Search, Users, AlertCircle,
  Accessibility, Plus, X, History,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useAutoSaveDraft } from '@/hooks/useAutoSaveDraft';
import { calcPostureRiskScore, classifyRisk } from '@/lib/posture-calculations';
import { STEPS, initPostureForm } from '@/components/pt-os/posture-assessment/types';
import type { PostureFormData, StepId, CoachNotes } from '@/components/pt-os/posture-assessment/types';
import PostureProgressTimeline from '@/components/pt-os/posture-assessment/PostureProgressTimeline';
import StepPostureObservations from '@/components/pt-os/posture-assessment/StepPostureObservations';
import CoachNotesPanel from '@/components/pt-os/posture-assessment/CoachNotesPanel';
import PostureRiskBadges from '@/components/pt-os/posture-assessment/PostureRiskBadges';
import PostureComparison from '@/components/pt-os/posture-assessment/PostureComparison';
import PostureCard from '@/components/pt-os/posture-assessment/PostureCard';

interface ClientOption { id: string; name: string; }

const EASE = [0.16, 1, 0.3, 1] as const;

function formFromRow(row: Record<string, unknown>): PostureFormData {
  const fresh = initPostureForm();
  const coachNotesRaw = (row.coach_notes as Partial<CoachNotes> | null) || {};
  return {
    ...fresh,
    assessmentDate: row.assessment_date ? String(row.assessment_date).slice(0, 10) : fresh.assessmentDate,
    frontIssues: Array.isArray(row.front_issues) ? row.front_issues as string[] : [],
    sideIssues: Array.isArray(row.side_issues) ? row.side_issues as string[] : [],
    backIssues: Array.isArray(row.back_issues) ? row.back_issues as string[] : [],
    otherIssueNotes: row.other_issue_notes ? String(row.other_issue_notes) : '',
    coachNotes: { ...fresh.coachNotes, ...coachNotesRaw },
  };
}

export default function PtPostureAssessmentPage() {
  return (
    <Guard>
      <AppShell>
        <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#F59E0B' }} /></div>}>
          <PostureContent />
        </Suspense>
      </AppShell>
    </Guard>
  );
}

function PostureContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const { toast } = useToast();
  const clientId = sp.get('client_id') || '';

  if (!clientId) return <ClientPicker />;
  return <PostureHub key={clientId} clientId={clientId} router={router} toast={toast} />;
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
    <div className="mx-auto w-full max-w-3xl py-6 sm:py-8">
      <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[24px] p-8 sm:p-10 mb-6"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: 'var(--bg-subtle)' }}>
            <Accessibility size={16} style={{ color: 'var(--text-muted)' }} />
          </div>
          <span className="text-[11px] font-[650] uppercase tracking-[0.08em]" style={{ color: 'var(--text-disabled)' }}>Posture Assessment</span>
        </div>
        <h1 className="text-[32px] sm:text-[40px] font-[860] tracking-[-0.03em] leading-tight" style={{ color: 'var(--text-primary)' }}>
          Postural Baseline
        </h1>
        <p className="mt-3 max-w-xl text-[14px]" style={{ color: 'var(--text-muted)' }}>
          Select a client to begin or review their posture assessment.
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
                onClick={() => router.push(`/pt-os/posture-assessment?client_id=${c.id}`)}
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
interface PostureHubProps {
  clientId: string;
  router: ReturnType<typeof useRouter>;
  toast: ReturnType<typeof useToast>['toast'];
}

function PostureHub({ clientId, toast }: PostureHubProps) {
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
        api.progress.postureAssessments.list({ client_id: clientId }) as Promise<{ data?: Record<string, unknown>[] }>,
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
    return <PostureWizard clientId={clientId} clientName={clientName} editing={editing || null} toast={toast} onDone={closeWizard} />;
  }

  const sorted = [...assessments].sort((a, b) => String(b.assessment_date ?? '').localeCompare(String(a.assessment_date ?? '')));
  const initial = sorted[sorted.length - 1];
  const latest = sorted[0];

  return (
    <div className="mx-auto w-full max-w-3xl py-6 space-y-5">
      <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[24px] p-8 sm:p-10"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: 'var(--bg-subtle)' }}>
                <Accessibility size={16} style={{ color: 'var(--text-muted)' }} />
              </div>
              <span className="text-[11px] font-[650] uppercase tracking-[0.08em]" style={{ color: 'var(--text-disabled)' }}>Posture Assessment</span>
            </div>
            <h1 className="text-[26px] sm:text-[32px] font-[860] tracking-[-0.03em] leading-tight" style={{ color: 'var(--text-primary)' }}>
              {clientName}&apos;s Posture
            </h1>
          </div>
          <Button iconLeft={<Plus size={14} />} onClick={() => openWizard(null)} style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff' }}>
            New Assessment
          </Button>
        </div>
      </m.div>

      {sorted.length >= 2 && <PostureComparison initial={initial} latest={latest} />}

      <div className="space-y-3">
        {sorted.length === 0 && (
          <div className="rounded-[20px] p-10 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-[14px] font-[600] text-slate-500">No posture assessments yet.</p>
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
          <PostureCard key={String(a.id)} assessment={a} onClick={() => openWizard(String(a.id))} />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── WIZARD */
interface PostureWizardProps {
  clientId: string;
  clientName: string;
  editing: Record<string, unknown> | null;
  toast: ReturnType<typeof useToast>['toast'];
  onDone: (refresh: boolean) => void;
}

function PostureWizard({ clientId, clientName, editing, toast, onDone }: PostureWizardProps) {
  const assessmentId = editing ? String(editing.id) : null;
  const initial = useMemo(() => (editing ? formFromRow(editing) : initPostureForm()), [editing]);

  const [form, setForm] = useState<PostureFormData>(initial);
  const [step, setStep] = useState<StepId>(1);
  const [reviewMode, setReviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const initFormRef = useRef<PostureFormData>(initial);

  const draftKey = `posture-assessment-draft.v1:${clientId}:${assessmentId || 'new'}`;
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

  const set = useCallback(<K extends keyof PostureFormData>(key: K, val: PostureFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  const analysis = useMemo(() => {
    const postureRiskScore = calcPostureRiskScore(form.frontIssues, form.sideIssues, form.backIssues);
    const postureRiskLevel = classifyRisk(postureRiskScore);
    return { postureRiskScore, postureRiskLevel };
  }, [form.frontIssues, form.sideIssues, form.backIssues]);

  const handleNext = () => {
    if (step === 2) { setReviewMode(true); return; }
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
        front_issues: form.frontIssues.length ? form.frontIssues : undefined,
        side_issues: form.sideIssues.length ? form.sideIssues : undefined,
        back_issues: form.backIssues.length ? form.backIssues : undefined,
        other_issue_notes: form.otherIssueNotes || undefined,
        coach_notes: form.coachNotes,
      };

      if (assessmentId) {
        await api.progress.postureAssessments.update(assessmentId, payload);
        toast.success('Assessment updated.');
      } else {
        await api.progress.postureAssessments.create(payload);
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
    <div className="pb-28">
      {/* Header — in normal flow on the page background (no sticky card). */}
      <div className="pt-1">
        <div className="mx-auto max-w-3xl py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px]" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 6px 18px rgba(245,158,11,0.3)' }}>
              <Accessibility size={18} color="#fff" />
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
          <div className="mx-auto max-w-3xl pb-3">
            <PostureProgressTimeline current={step} onStep={setStep} />
          </div>
        )}
      </div>

      <div className="mx-auto max-w-3xl py-6 space-y-5">
        {!reviewMode ? (
          <m.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
            {step === 1 && <StepPostureObservations form={form} set={set} />}
            {step === 2 && <CoachNotesPanel notes={form.coachNotes} set={(notes) => set('coachNotes', notes)} />}
          </m.div>
        ) : (
          <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }} className="space-y-5">
            <div className="rounded-[24px] overflow-hidden" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)', boxShadow: '0 12px 40px rgba(15,23,42,0.25)' }}>
              <div className="p-7 sm:p-10 flex items-center gap-8 flex-wrap">
                <div>
                  <p className="text-[11px] font-[700] uppercase tracking-wider text-white/40 mb-1">Posture Risk Score</p>
                  <p className="text-[44px] font-[900] text-white leading-none">{analysis.postureRiskScore}</p>
                </div>
                {analysis.postureRiskLevel && (
                  <span className="rounded-full px-4 py-2 text-[13px] font-[800]" style={{
                    background: analysis.postureRiskLevel === 'Low' ? 'rgba(16,185,129,0.18)' : analysis.postureRiskLevel === 'Moderate' ? 'rgba(249,115,22,0.18)' : 'rgba(220,38,38,0.2)',
                    color: analysis.postureRiskLevel === 'Low' ? '#10b981' : analysis.postureRiskLevel === 'Moderate' ? '#f97316' : '#f87171',
                  }}>
                    {analysis.postureRiskLevel} Risk
                  </span>
                )}
              </div>
            </div>
            <PostureRiskBadges frontIssues={form.frontIssues} sideIssues={form.sideIssues} backIssues={form.backIssues} />
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
                {step === 2 ? 'Review' : 'Next'}
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
