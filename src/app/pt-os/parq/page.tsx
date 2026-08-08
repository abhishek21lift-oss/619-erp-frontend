'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, Loader2, AlertCircle, ShieldCheck, Plus,
  History, CheckCircle2, Download, Printer, Mail,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Button, PageContainer, PageHero } from '@/components/ui';
import ClientPicker from '@/components/pt-os/shared/ClientPicker';
import { api } from '@/lib/api';
import type { ParqForm, ParqFormDetail, ParqDocument } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useAutoSaveDraft } from '@/hooks/useAutoSaveDraft';
import { computeParqRisk } from '@/lib/parq-calculations';
import StepperTimeline from '@/components/pt-os/shared/StepperTimeline';
import {
  STEPS, type StepId, type ParqFormData, type FormErrors,
  initParqForm, visibleSteps, stepPositionLabel, nextStepId, prevStepId,
  CONSENT_CHECKBOX_FIELDS, PARQ_QUESTIONS,
} from '@/components/pt-os/parq/types';
import { formFromRow, buildFormPayload, buildClearancePayload, buildConsentPayload } from '@/components/pt-os/parq/mappers';
import StepCurrentHealth from '@/components/pt-os/parq/StepCurrentHealth';
import StepPastHistory from '@/components/pt-os/parq/StepPastHistory';
import StepParqQuestionnaire from '@/components/pt-os/parq/StepParqQuestionnaire';
import StepMedicalClearance from '@/components/pt-os/parq/StepMedicalClearance';
import StepConsent from '@/components/pt-os/parq/StepConsent';
import ParqReview from '@/components/pt-os/parq/ParqReview';
import ParqCard from '@/components/pt-os/parq/ParqCard';

const EASE = [0.16, 1, 0.3, 1] as const;

function validateStep(step: StepId, form: ParqFormData, riskLevel: 'low' | 'medium' | 'high'): string | undefined {
  if (step === 1) {
    const unanswered = form.parqAnswers.filter((a) => !a.answer).length;
    if (unanswered > 0) return `Please answer all ${PARQ_QUESTIONS.length} PAR-Q questions (${unanswered} remaining).`;
  }
  if (step === 2 && riskLevel === 'high') {
    if (!form.medicalClearance.doctor_name.trim() || !form.medicalClearance.hospital.trim() || !form.medicalClearance.clearance_date) {
      return 'Doctor name, hospital, and clearance date are required for high-risk clients.';
    }
  }
  if (step === 5) {
    const allChecked = CONSENT_CHECKBOX_FIELDS.every((f) => form.consentCheckboxes[f.key]);
    if (!allChecked) return 'All 7 consent checkboxes must be checked.';
    if (!form.clientSignature) return 'Client signature is required.';
    if (!form.trainerSignature) return 'Trainer signature is required.';
  }
  return undefined;
}

export default function PtParqPage() {
  return (
    <Guard>
      <AppShell>
        <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#0067E0' }} /></div>}>
          <ParqContent />
        </Suspense>
      </AppShell>
    </Guard>
  );
}

function ParqContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const { toast } = useToast();
  const clientId = sp.get('client_id') || '';

  if (!clientId) return <ClientPicker title="PAR-Q" icon={<ShieldCheck size={20} color="#fff" />} basePath="/pt-os/parq" />;
  return <ParqHub key={clientId} clientId={clientId} router={router} toast={toast} />;
}

/* ─────────────────────────────────────────────────────── HUB (list + wizard) */
interface ParqHubProps {
  clientId: string;
  router: ReturnType<typeof useRouter>;
  toast: ReturnType<typeof useToast>['toast'];
}

function ParqHub({ clientId, toast }: ParqHubProps) {
  const [clientName, setClientName] = useState('');
  const [forms, setForms] = useState<ParqForm[]>([]);
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
        api.progress.parqForms.list({ client_id: clientId }),
      ]);
      const c = clientRes?.data;
      if (!c) { setLoadError('Client not found.'); setLoading(false); return; }
      setClientName(String(c.name ?? ''));
      const sorted = [...(listRes?.data ?? [])].sort((a, b) => String(b.assessment_date ?? '').localeCompare(String(a.assessment_date ?? '')));
      setForms(sorted);
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
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#0067E0' }} /></div>;
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
    return <ParqWizard clientId={clientId} clientName={clientName} formId={editingId} toast={toast} onDone={closeWizard} />;
  }

  return (
    <PageContainer>
      <PageHero
        icon={<ShieldCheck size={20} />}
        title={`${clientName}'s PAR-Q`}
        subtitle="PAR-Q + Health Screening"
        actions={
          <button type="button" onClick={() => openWizard(null)}
            className="inline-flex h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] px-5 text-[13px] font-[700] transition-transform active:scale-95 sm:w-auto"
            style={{ background: '#fff', color: '#0F172A' }}>
            <Plus size={16} /> New Screening
          </button>
        }
      />

      <div className="mx-auto w-full max-w-3xl space-y-3">
        {forms.length === 0 && (
          <div className="rounded-[20px] p-10 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-[14px] font-[600] text-slate-500">No PAR-Q screenings yet.</p>
            <Button className="mt-4" iconLeft={<Plus size={14} />} onClick={() => openWizard(null)} style={{ background: 'linear-gradient(135deg, #0271EB, #0059CE)', color: '#fff' }}>
              Start First Screening
            </Button>
          </div>
        )}
        {forms.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <History size={14} style={{ color: 'var(--text-muted)' }} />
            <p className="text-[12.5px] font-[700] text-slate-500">Screening History</p>
          </div>
        )}
        {forms.map((f) => (
          <ParqCard key={String(f.id)} form={f} onClick={() => openWizard(String(f.id))} />
        ))}
      </div>
    </PageContainer>
  );
}

/* ─────────────────────────────────────────────────────── WIZARD */
interface ParqWizardProps {
  clientId: string;
  clientName: string;
  formId: string | null;
  toast: ReturnType<typeof useToast>['toast'];
  onDone: (refresh: boolean) => void;
}

interface SubmitResult { pdfUrl?: string; }

function ParqWizard({ clientId, clientName, formId, toast, onDone }: ParqWizardProps) {
  const [form, setForm] = useState<ParqFormData>(initParqForm());
  const [errors, setErrors] = useState<FormErrors>({});
  const [step, setStep] = useState<StepId>(1);
  const [saving, setSaving] = useState(false);
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [detailLoading, setDetailLoading] = useState(Boolean(formId));
  const [currentFormId, setCurrentFormId] = useState<string | null>(formId);
  const [clearanceId, setClearanceId] = useState<string | null>(null);
  const [consentCreated, setConsentCreated] = useState(false);
  const [documents, setDocuments] = useState<ParqDocument[]>([]);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const initFormRef = useRef<ParqFormData>(form);
  const restoredRef = useRef(false);

  const draftKey = `parq-draft.v1:${clientId}:${formId || 'new'}`;
  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initFormRef.current), [form]);
  const { restore, clear, saveNow } = useAutoSaveDraft({ key: draftKey, data: form, isDirty });

  // Load existing form detail (edit mode) or autofill from the client record (new).
  useEffect(() => {
    let cancelled = false;
    async function load() {
      let base = initParqForm();
      if (formId) {
        setDetailLoading(true);
        try {
          const res = await api.progress.parqForms.get(formId);
          const row = res?.data as ParqFormDetail | undefined;
          if (row) {
            base = formFromRow(row);
            if (!cancelled) {
              setDocuments(row.documents ?? []);
              if (row.medical_clearance?.id) setClearanceId(String(row.medical_clearance.id));
              if (row.consent) setConsentCreated(true);
            }
          }
        } catch (err: unknown) {
          if (!cancelled) toast.error(err instanceof Error ? err.message : 'Failed to load this screening.');
        } finally {
          if (!cancelled) setDetailLoading(false);
        }
      } else {
        try {
          const res = await api.pt.client(clientId) as { data?: Record<string, unknown> };
          const c = res?.data;
          if (c) {
            base = {
              ...base,
              fullName: String(c.name ?? ''),
              gender: String(c.gender ?? ''),
              dob: c.dob ? String(c.dob).slice(0, 10) : '',
              mobile: String(c.mobile ?? ''),
              email: String(c.email ?? ''),
              heightCm: c.height != null ? String(c.height) : '',
              weightKg: c.weight != null ? String(c.weight) : '',
              trainerName: String(c.trainer_name ?? ''),
              pastHistory: { ...base.pastHistory, occupation: String(c.occupation ?? '') },
            };
          }
        } catch { /* non-fatal — leave fields blank for manual entry */ }
      }
      if (cancelled) return;

      // Merge a local draft on top of the freshly loaded/autofilled baseline.
      if (!restoredRef.current) {
        restoredRef.current = true;
        const draft = restore();
        if (draft) {
          base = { ...base, ...draft };
          toast.info('Restored your unsaved draft.');
        }
      }
      initFormRef.current = base;
      setForm(base);
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId, clientId]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const set = useCallback(<K extends keyof ParqFormData>(key: K, val: ParqFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  const risk = useMemo(() => computeParqRisk(form.parqAnswers), [form.parqAnswers]);
  const riskLevel = risk.riskLevel;
  const stepperSteps = useMemo(() => visibleSteps(riskLevel).map((s) => ({ id: s.id, label: s.label })), [riskLevel]);
  const isLastStep = nextStepId(step, riskLevel) == null;

  const handleSubmit = useCallback(async () => {
    setSaving(true);
    try {
      const payload = buildFormPayload(form, clientId);
      payload.status = 'submitted';
      let fid = currentFormId;
      if (fid) {
        await api.progress.parqForms.update(fid, payload);
      } else {
        const res = await api.progress.parqForms.create(payload);
        fid = res?.data?.id ? String(res.data.id) : null;
        if (fid) setCurrentFormId(fid);
      }
      if (!fid) throw new Error('Could not save the form.');

      if (riskLevel === 'high' && (form.medicalClearance.doctor_name || form.medicalClearance.hospital)) {
        const clearancePayload = buildClearancePayload(form);
        if (clearanceId) {
          await api.progress.parqClearance.update(clearanceId, clearancePayload);
        } else {
          const cRes = await api.progress.parqClearance.create(fid, clearancePayload);
          if (cRes?.data?.id) setClearanceId(String(cRes.data.id));
        }
      }

      let pdfUrl: string | undefined;
      if (!consentCreated) {
        const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
        const consentPayload = buildConsentPayload(form, userAgent);
        const consentRes = await api.progress.parqConsent.create(fid, consentPayload);
        pdfUrl = consentRes?.data?.pdf_url;
        setConsentCreated(true);
      }

      clear();
      toast.success('PAR-Q form submitted.');
      setSubmitResult({ pdfUrl });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit PAR-Q form.');
    } finally {
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, clientId, currentFormId, riskLevel, clearanceId, consentCreated]);

  const handleNext = async () => {
    const stepDef = STEPS.find((s) => s.id === step)!;
    const err = validateStep(step, form, riskLevel);
    if (stepDef.key !== 'review') setErrors((e) => ({ ...e, [stepDef.key]: err }));
    if (err) { toast.error(err); return; }

    if (step === 1 && !currentFormId) {
      setCreatingDraft(true);
      try {
        const payload = buildFormPayload(form, clientId);
        const res = await api.progress.parqForms.create(payload);
        const newId = res?.data?.id ? String(res.data.id) : null;
        if (!newId) throw new Error('Server did not return a form id.');
        setCurrentFormId(newId);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Could not start the form.');
        setCreatingDraft(false);
        return;
      }
      setCreatingDraft(false);
    }

    const next = nextStepId(step, riskLevel);
    if (next == null) { await handleSubmit(); return; }
    setStep(next);
  };

  const handleBack = () => {
    const prev = prevStepId(step, riskLevel);
    if (prev != null) { setStep(prev); return; }
    if (isDirty && !window.confirm('Discard unsaved changes?')) return;
    onDone(false);
  };

  const handleSaveDraft = () => {
    const ok = saveNow();
    toast[ok ? 'success' : 'error'](ok ? 'Draft saved.' : 'Could not save draft — storage unavailable.');
  };

  if (detailLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#0067E0' }} /></div>;
  }

  if (submitResult) {
    return (
      <SubmitSuccess
        clientName={clientName}
        result={submitResult}
        onDone={() => onDone(true)}
      />
    );
  }

  return (
    <PageContainer>
      {/* No Cancel action — Back, in the sticky footer, already exits the
          wizard at step 1 with the same discard-confirm guard. */}
      <PageHero
        icon={<ShieldCheck size={18} />}
        title={currentFormId ? 'Edit Screening' : 'New Screening'}
        subtitle={clientName}
      >
        <StepperTimeline steps={stepperSteps} current={step} onStep={(id) => setStep(id as StepId)} />
      </PageHero>

      <div className="mx-auto max-w-3xl space-y-5">
        <m.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
          {step === 1 && <StepParqQuestionnaire form={form} set={set} error={errors.parqQuestionnaire} stepLabel={stepPositionLabel('parqQuestionnaire', riskLevel)} />}
          {step === 2 && riskLevel === 'high' && (
            <StepMedicalClearance
              form={form} set={set} error={errors.medicalClearance}
              formId={currentFormId} documents={documents}
              onDocumentUploaded={(doc) => setDocuments((d) => [...d, doc])}
              stepLabel={stepPositionLabel('medicalClearance', riskLevel)}
            />
          )}
          {step === 3 && <StepPastHistory form={form} set={set} error={errors.pastHistory} stepLabel={stepPositionLabel('pastHistory', riskLevel)} />}
          {step === 4 && <StepCurrentHealth form={form} set={set} error={errors.currentHealth} stepLabel={stepPositionLabel('currentHealth', riskLevel)} />}
          {step === 5 && <StepConsent form={form} set={set} error={errors.consent} stepLabel={stepPositionLabel('consent', riskLevel)} />}
          {step === 6 && <ParqReview form={form} onEditStep={setStep} stepLabel={stepPositionLabel('review', riskLevel)} />}
        </m.div>
      </div>

      <div className="page-action-bar" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(15,23,42,0.08)' }}>
        <div className="mx-auto max-w-3xl px-5 sm:px-8 py-3.5 flex items-center justify-between gap-3">
          <Button variant="outline" iconLeft={<ArrowLeft size={14} />} onClick={handleBack} disabled={saving || creatingDraft}>Back</Button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleSaveDraft} disabled={saving}>Save Draft</Button>
            <Button
              iconLeft={!(saving || creatingDraft) ? (isLastStep ? <Check size={14} /> : <ArrowRight size={14} />) : undefined}
              loading={saving || creatingDraft} disabled={saving || creatingDraft}
              onClick={handleNext}
              style={{ background: 'linear-gradient(135deg, #0271EB, #0059CE)', color: '#fff' }}
            >
              {saving ? 'Submitting...' : creatingDraft ? 'Starting...' : isLastStep ? 'Submit' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

/* ─────────────────────────────────────────────────────── POST-SUBMIT */
function SubmitSuccess({ clientName, result, onDone }: { clientName: string; result: SubmitResult; onDone: () => void }) {
  const mailBody = encodeURIComponent(
    `PAR-Q + Health Screening for ${clientName}.${result.pdfUrl ? `\n\nSigned consent PDF: ${result.pdfUrl}` : ''}`,
  );

  // Opens the PDF through our own viewer (pt-os/pdf-viewer) rather than the
  // raw file URL directly. A bare window.open(pdfUrl, '_blank') hands the
  // page entirely to whatever PDF chrome the browser/OS happens to supply —
  // on several real devices that has no visible Share or Download control at
  // all. The viewer always renders its own.
  const viewPdf = () => {
    if (!result.pdfUrl) return;
    const href = `/pt-os/pdf-viewer?url=${encodeURIComponent(result.pdfUrl)}&title=${encodeURIComponent(`PAR-Q - ${clientName}`)}`;
    window.open(href, '_blank', 'noopener');
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'rgba(16,185,129,0.12)' }}>
        <CheckCircle2 size={32} style={{ color: '#10b981' }} />
      </div>
      <h1 className="mt-5 text-[24px] font-[860] tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>PAR-Q Submitted</h1>
      <p className="mt-2 text-[13.5px]" style={{ color: 'var(--text-muted)' }}>
        {clientName}&apos;s PAR-Q + Health Screening and Digital Consent have been recorded.
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Button iconLeft={<Download size={14} />} disabled={!result.pdfUrl} onClick={viewPdf}>
          Download PDF
        </Button>
        <Button variant="outline" iconLeft={<Printer size={14} />} disabled={!result.pdfUrl} onClick={viewPdf}>
          Print
        </Button>
        <Button variant="outline" iconLeft={<Mail size={14} />} onClick={() => { window.location.href = `mailto:?subject=${encodeURIComponent(`PAR-Q — ${clientName}`)}&body=${mailBody}`; }}>
          Email
        </Button>
      </div>
      {!result.pdfUrl && (
        <p className="mt-3 text-[11.5px]" style={{ color: 'var(--text-disabled)' }}>The signed PDF will appear here once it finishes generating — check the screening history shortly.</p>
      )}

      <Button variant="ghost" className="mt-8" onClick={onDone}>Back to Screening History</Button>
    </div>
  );
}
