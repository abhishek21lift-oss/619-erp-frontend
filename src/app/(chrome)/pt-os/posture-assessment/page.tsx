'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, Loader2, AlertCircle, Accessibility, Plus, History,
} from 'lucide-react';
import Guard from '@/components/Guard';
import { Button, PageHero } from '@/components/ui';
import ClientPicker from '@/components/pt-os/shared/ClientPicker';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useAutoSaveDraft } from '@/hooks/useAutoSaveDraft';
import { calcPostureRiskScore, classifyRisk, calcPostureReferrals } from '@/lib/posture-calculations';
import ReferralBanner from '@/components/pt-os/shared/ReferralBanner';
import { STEPS, initPostureForm, COACH_NOTE_FIELDS } from '@/components/pt-os/posture-assessment/types';
import type { PostureFormData, StepId, CoachNotes } from '@/components/pt-os/posture-assessment/types';
import PostureProgressTimeline from '@/components/pt-os/posture-assessment/PostureProgressTimeline';
import StepPostureObservations from '@/components/pt-os/posture-assessment/StepPostureObservations';
import CoachNotesPanel from '@/components/pt-os/shared/CoachNotesPanel';
import PostureRiskBadges from '@/components/pt-os/posture-assessment/PostureRiskBadges';
import PostureComparison from '@/components/pt-os/posture-assessment/PostureComparison';
import PostureCard from '@/components/pt-os/posture-assessment/PostureCard';
import { errorMessage } from '@/lib/forms/errors';
import AssessmentDateField, { assessmentDateIssue } from '@/components/pt-os/shared/AssessmentDateField';

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
      <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#0067E0' }} /></div>}>
        <PostureContent />
      </Suspense>
    </Guard>
  );
}

function PostureContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const { toast } = useToast();
  const clientId = sp.get('client_id') || '';

  if (!clientId) return <ClientPicker title="Posture Assessment" icon={<Accessibility size={20} color="#fff" />} basePath="/pt-os/posture-assessment" />;
  return <PostureHub key={clientId} clientId={clientId} router={router} toast={toast} />;
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
      setLoadError(errorMessage(err, 'Failed to load client.'));
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { loadData(); }, [loadData]);

  const openWizard = (id: string | null) => { setEditingId(id); setView('wizard'); };
  const closeWizard = (refresh: boolean) => { setView('list'); setEditingId(null); if (refresh) loadData(); };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#0067E0' }} /></div>;
  }
  if (loadError) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <AlertCircle size={32} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
        <p className="text-[14px] font-[600] text-[color:var(--text-secondary)]">{loadError}</p>
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
      <PageHero
        icon={<Accessibility size={18} />}
        title={`${clientName}'s Posture`}
        subtitle="Posture Assessment"
        actions={
          <Button iconLeft={<Plus size={14} />} onClick={() => openWizard(null)} style={{ background: '#fff', color: '#0F172A' }}>
            New Assessment
          </Button>
        }
      />

      {sorted.length >= 2 && <PostureComparison initial={initial} latest={latest} />}

      <div className="space-y-3">
        {sorted.length === 0 && (
          <div className="rounded-[20px] p-10 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-[14px] font-[600] text-[color:var(--text-muted)]">No posture assessments yet.</p>
            <Button className="mt-4" iconLeft={<Plus size={14} />} onClick={() => openWizard(null)} style={{ background: 'linear-gradient(135deg, #0271EB, #0059CE)', color: '#fff' }}>
              Start First Assessment
            </Button>
          </div>
        )}
        {sorted.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <History size={14} style={{ color: 'var(--text-muted)' }} />
            <p className="text-[12.5px] font-[700] text-[color:var(--text-muted)]">Assessment History</p>
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
    // Never lay a local draft over a record saved after it.
    const savedAt = editing ? Date.parse(String(editing.updated_at ?? editing.created_at ?? '')) || 0 : 0;
    const draft = restore(savedAt ? { notBefore: savedAt } : undefined);
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
    const referrals = calcPostureReferrals(form.frontIssues, form.sideIssues, form.backIssues);
    return { postureRiskScore, postureRiskLevel, referrals };
  }, [form.frontIssues, form.sideIssues, form.backIssues]);

  const handleNext = () => {
    const dateErr = step === 1 ? assessmentDateIssue(form.assessmentDate) : undefined;
    if (dateErr) { toast.error(dateErr); return; }
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
      // Emptied lists and notes go as [] / null: `undefined` dropped the key,
      // so un-ticking every issue on an edit left them all saved.
      const payload: Record<string, unknown> = {
        client_id: clientId,
        assessment_date: form.assessmentDate,
        front_issues: form.frontIssues,
        side_issues: form.sideIssues,
        back_issues: form.backIssues,
        other_issue_notes: form.otherIssueNotes.trim() || null,
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
      toast.error(errorMessage(err, 'Failed to save assessment.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-28">
      {/* The shared hero, as on Consent, PAR-Q, Fitness and Goal. This page
          had its own plain header, and a Cancel that discarded the wizard
          without the "Discard changes?" check Back makes; Back on the first
          step is the way out now. */}
      <div className="mx-auto max-w-3xl pt-1">
        <PageHero icon={<Accessibility size={18} />} title={assessmentId ? 'Edit Assessment' : 'New Assessment'} subtitle={clientName}>
          {!reviewMode && <PostureProgressTimeline current={step} onStep={setStep} />}
        </PageHero>
      </div>

      <div className="mx-auto max-w-3xl py-6 space-y-5">
        <ReferralBanner referrals={analysis.referrals} />
        {!reviewMode ? (
          <m.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
            {step === 1 && (
              <div className="space-y-6">
                <AssessmentDateField value={form.assessmentDate} onChange={(v) => set('assessmentDate', v)} />
                <StepPostureObservations form={form} set={set} />
              </div>
            )}
            {step === 2 && <CoachNotesPanel
                fields={COACH_NOTE_FIELDS}
                notes={form.coachNotes}
                onChange={(key, value) => set('coachNotes', { ...form.coachNotes, [key]: value })}
                subtitle="Step 2 of 2 — optional, free-form notes per focus area."
              />}
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
                    background: analysis.postureRiskLevel === 'Low' ? 'rgba(16,185,129,0.18)' : analysis.postureRiskLevel === 'Moderate' ? 'rgba(245,158,11,0.18)' : 'rgba(220,38,38,0.2)',
                    color: analysis.postureRiskLevel === 'Low' ? '#10b981' : analysis.postureRiskLevel === 'Moderate' ? '#f59e0b' : '#f87171',
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

      <div className="page-action-bar" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--border)' }}>
        <div className="mx-auto max-w-3xl px-5 sm:px-8 py-3.5 flex items-center justify-between gap-3">
          <Button variant="outline" iconLeft={<ArrowLeft size={14} />} onClick={handleBack}>Back</Button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleSaveDraft}>Save Draft</Button>
            {!reviewMode ? (
              <Button
                iconLeft={<ArrowRight size={14} />}
                onClick={handleNext}
                style={{ background: 'linear-gradient(135deg, #0271EB, #0059CE)', color: '#fff' }}
              >
                {step === 2 ? 'Review' : 'Next'}
              </Button>
            ) : (
              <Button
                iconLeft={!saving ? <Check size={14} /> : undefined}
                loading={saving} disabled={saving}
                onClick={handleSubmit}
                style={{ background: 'linear-gradient(135deg, #0271EB, #0059CE)', color: '#fff' }}
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
