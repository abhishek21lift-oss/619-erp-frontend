'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, Loader2, Search, Users, AlertCircle,
  ShieldCheck, Plus, X, History, CheckCircle2, Download, Printer, Mail,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Button, EmptyState } from '@/components/ui';
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

interface ClientOption { id: string; name: string; }

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
        <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#F59E0B' }} /></div>}>
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

  if (!clientId) return <ClientPicker />;
  return <ParqHub key={clientId} clientId={clientId} router={router} toast={toast} />;
}

/* ─────────────────────────────────────────────────────── CLIENT PICKER */
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #10b981, #34d399)',
  'linear-gradient(135deg, #f59e0b, #fbbf24)',
  'linear-gradient(135deg, #ec4899, #f472b6)',
  'linear-gradient(135deg, #06b6d4, #22d3ee)',
  'linear-gradient(135deg, #ef4444, #f87171)',
];

function ClientAvatar({ name }: { name: string }) {
  const idx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_GRADIENTS.length;
  const initials = name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  return (
    <div
      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-[700] text-white"
      style={{ background: AVATAR_GRADIENTS[idx] }}
    >
      {initials || '?'}
    </div>
  );
}

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
    <div className="mx-auto w-full max-w-4xl px-4 pt-3 pb-6 sm:px-6">
      <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="mb-5 flex items-center gap-3 rounded-[20px] px-5 py-4"
        style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fffbeb 100%)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
        <div
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px]"
          style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 8px 24px rgba(245,158,11,0.3)' }}
        >
          <ShieldCheck size={20} color="#fff" />
        </div>
        <h1 className="text-[20px] sm:text-[26px] font-[860] tracking-[-0.03em] leading-[1.08]" style={{ color: 'var(--text-primary)' }}>
          Medical Clearance &amp; Digital Consent
        </h1>
      </m.div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-disabled)' }} />
          <input
            type="text" placeholder="Search clients..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[12px] py-2.5 pl-9 pr-3 text-[13px] outline-none transition-colors focus:border-amber-400"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
        {!loading && !loadError && (
          <span className="flex-shrink-0 text-[12px] font-[600]" style={{ color: 'var(--text-disabled)' }}>
            {filtered.length} {filtered.length === 1 ? 'client' : 'clients'}
          </span>
        )}
      </div>

      {loading && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex animate-pulse items-center gap-3 rounded-[16px] p-3.5" style={{ background: 'var(--bg-subtle)' }}>
                <div className="h-10 w-10 rounded-full" style={{ background: 'var(--border)' }} />
                <div className="h-3 w-24 rounded-full" style={{ background: 'var(--border)' }} />
              </div>
            ))}
          </div>
        )}

        {loadError && (
          <EmptyState
            icon={<AlertCircle size={20} />}
            title="Could not load clients"
            description="Something went wrong while fetching your client list."
          />
        )}

        {!loading && !loadError && filtered.length === 0 && (
          <EmptyState
            icon={<Users size={20} />}
            title="No clients found"
            description={search ? `No clients match "${search}".` : 'Add a client to get started.'}
          />
        )}

        {!loading && !loadError && filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => router.push(`/pt-os/parq?client_id=${c.id}`)}
                className="group flex items-center gap-3 rounded-[16px] p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
              >
                <ClientAvatar name={c.name} />
                <span className="flex-1 truncate text-[13.5px] font-[650]" style={{ color: 'var(--text-primary)' }}>{c.name}</span>
                <ArrowRight size={14} className="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100" style={{ color: 'var(--text-disabled)' }} />
              </button>
            ))}
          </div>
        )}
    </div>
  );
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
    return <ParqWizard clientId={clientId} clientName={clientName} formId={editingId} toast={toast} onDone={closeWizard} />;
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 sm:px-8 py-6 space-y-5">
      <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[24px] p-8 sm:p-10"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: 'var(--bg-subtle)' }}>
                <ShieldCheck size={16} style={{ color: 'var(--text-muted)' }} />
              </div>
              <span className="text-[11px] font-[650] uppercase tracking-[0.08em]" style={{ color: 'var(--text-disabled)' }}>PAR-Q + Health Screening</span>
            </div>
            <h1 className="text-[26px] sm:text-[32px] font-[860] tracking-[-0.03em] leading-tight" style={{ color: 'var(--text-primary)' }}>
              {clientName}&apos;s PAR-Q
            </h1>
          </div>
          <Button iconLeft={<Plus size={14} />} onClick={() => openWizard(null)} style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff' }}>
            New Screening
          </Button>
        </div>
      </m.div>

      <div className="space-y-3">
        {forms.length === 0 && (
          <div className="rounded-[20px] p-10 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-[14px] font-[600] text-slate-500">No PAR-Q screenings yet.</p>
            <Button className="mt-4" iconLeft={<Plus size={14} />} onClick={() => openWizard(null)} style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff' }}>
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
    </div>
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
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#F59E0B' }} /></div>;
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
    <div className="min-h-screen pb-28" style={{ background: 'linear-gradient(160deg,#f8fafc 0%,#f1f5f9 60%,#fafafe 100%)' }}>
      {/* Header — in normal flow on the page background (no sticky card). */}
      <div className="pt-1">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px]" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 6px 18px rgba(245,158,11,0.3)' }}>
              <ShieldCheck size={18} color="#fff" />
            </div>
            <div>
              <h1 className="text-[19px] font-[860] tracking-[-0.03em] text-slate-900 leading-none sm:text-[22px]">{currentFormId ? 'Edit Screening' : 'New Screening'}</h1>
              <p className="text-[12px] font-[600] text-slate-400 mt-1">{clientName}</p>
            </div>
          </div>
          <button type="button" onClick={() => onDone(false)} className="flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-[650] transition-colors hover:bg-white" style={{ color: '#64748b', border: '1px solid rgba(15,23,42,0.08)' }}>
            <X size={12} /> Cancel
          </button>
        </div>
        <div className="mx-auto max-w-3xl px-5 sm:px-8 pb-3">
          <StepperTimeline steps={stepperSteps} current={step} onStep={(id) => setStep(id as StepId)} />
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 sm:px-8 py-6 space-y-5">
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
              style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff' }}
            >
              {saving ? 'Submitting...' : creatingDraft ? 'Starting...' : isLastStep ? 'Submit' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
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
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-5 py-10 text-center">
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
