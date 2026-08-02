'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, Loader2, AlertCircle, FileSignature, Plus,
  X, CheckCircle2, Download, Printer, Mail, History,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Button } from '@/components/ui';
import ClientPicker from '@/components/pt-os/shared/ClientPicker';
import { api } from '@/lib/api';
import type { InformedConsent } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useAutoSaveDraft } from '@/hooks/useAutoSaveDraft';
import StepperTimeline from '@/components/pt-os/shared/StepperTimeline';
import {
  STEPS, type StepId, type InformedConsentFormData,
  initInformedConsentForm, formFromRecord, nextStepId, prevStepId,
  FINAL_ACK_FIELDS, buildCreatePayload, buildUpdatePayload,
} from '@/components/pt-os/informed-consent/types';
import { statusStyle } from '@/components/pt-os/informed-consent/statusConfig';
import StepAgreements from '@/components/pt-os/informed-consent/StepAgreements';
import StepExerciseProgrammeConsent from '@/components/pt-os/informed-consent/StepExerciseProgrammeConsent';
import StepSignatures from '@/components/pt-os/informed-consent/StepSignatures';

interface FormErrors { [key: string]: string | undefined; }

const EASE = [0.16, 1, 0.3, 1] as const;

function validateStep(step: StepId, form: InformedConsentFormData): string | undefined {
  if (step === 1) {
    if (!form.exerciseConsentChecked) return 'Please check the consent acknowledgement to continue.';
    if (!form.exerciseConsentSignature) return 'Client signature is required.';
    if (!form.exerciseConsentDate) return 'Date is required.';
  }
  if (step === 2) {
    const missing = FINAL_ACK_FIELDS.some((f) => !form.acknowledgements[f.key]);
    if (missing) return 'All agreement items must be checked.';
  }
  if (step === 3) {
    if (!form.clientSignature) return 'Client signature is required.';
    if (!form.trainerSignature) return 'Trainer signature is required.';
  }
  return undefined;
}

/** Force a real download of the generated PDF (rather than an inline preview,
 *  which on mobile Safari offers no save option). Fetches the file as a blob
 *  and saves it with a friendly filename; falls back to opening inline if the
 *  blob fetch is blocked (e.g. a cross-origin storage URL). */
async function downloadPdf(url: string, filename: string) {
  try {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = filename.replace(/[/\\?%*:|"<>]/g, '-');
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objUrl), 1500);
  } catch {
    window.open(url, '_blank', 'noopener');
  }
}

export default function InformedConsentPage() {
  return (
    <Guard>
      <AppShell>
        <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#F59E0B' }} /></div>}>
          <InformedConsentContent />
        </Suspense>
      </AppShell>
    </Guard>
  );
}

function InformedConsentContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const { toast } = useToast();
  const clientId = sp.get('client_id') || '';

  if (!clientId) return <ClientPicker title="Informed Consent" icon={<FileSignature size={20} color="#fff" />} basePath="/pt-os/informed-consent" />;
  return <ConsentHub key={clientId} clientId={clientId} router={router} toast={toast} />;
}

/* ─────────────────────────────────────────────────────── HUB */
interface ConsentHubProps {
  clientId: string;
  router: ReturnType<typeof useRouter>;
  toast: ReturnType<typeof useToast>['toast'];
}

function ConsentHub({ clientId, toast }: ConsentHubProps) {
  const [clientName, setClientName] = useState('');
  const [record, setRecord] = useState<InformedConsent | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [view, setView] = useState<'summary' | 'wizard'>('summary');

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [clientRes, listRes] = await Promise.all([
        api.pt.client(clientId) as Promise<{ data?: Record<string, unknown> }>,
        api.progress.informedConsent.list({ client_id: clientId }),
      ]);
      const c = clientRes?.data;
      if (!c) { setLoadError('Client not found.'); setLoading(false); return; }
      setClientName(String(c.name ?? ''));
      const rows = listRes?.data ?? [];
      // Rows are ordered by created_at DESC — the newest row is always the
      // current version (an archived row is always superseded by a newer one).
      setRecord(rows[0] ?? null);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load client.');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { loadData(); }, [loadData]);

  const openWizard = () => setView('wizard');
  const closeWizard = (refresh: boolean) => { setView('summary'); if (refresh) loadData(); };

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
    return <ConsentWizard clientId={clientId} clientName={clientName} record={record} toast={toast} onDone={closeWizard} />;
  }

  const canStartFresh = !record || record.status === 'revoked';
  const style = record ? statusStyle(record.status) : null;

  return (
    <div className="mx-auto w-full max-w-3xl py-6 space-y-5">
      <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[24px] p-8 sm:p-10"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: 'var(--bg-subtle)' }}>
                <FileSignature size={16} style={{ color: 'var(--text-muted)' }} />
              </div>
              <span className="text-[11px] font-[650] uppercase tracking-[0.08em]" style={{ color: 'var(--text-disabled)' }}>📝 Informed Consent</span>
            </div>
            <h1 className="text-[26px] sm:text-[32px] font-[860] tracking-[-0.03em] leading-tight" style={{ color: 'var(--text-primary)' }}>
              {clientName}
            </h1>
          </div>
          {canStartFresh && (
            <Button iconLeft={<Plus size={14} />} onClick={openWizard} style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff' }}>
              Start Consent
            </Button>
          )}
        </div>
      </m.div>

      {!record && (
        <div className="rounded-[20px] p-10 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-[14px] font-[600] text-slate-500">No informed consent on file yet.</p>
        </div>
      )}

      {record && (
        <div className="rounded-[20px] p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full px-3 py-1 text-[11.5px] font-[700]" style={{ background: style!.bg, color: style!.color }}>
                {style!.label}
              </span>
              <span className="text-[11.5px] font-[650] text-slate-400">Version {record.version}</span>
            </div>
            {record.status !== 'completed' && record.status !== 'revoked' && record.status !== 'archived' && (
              <Button size="sm" iconLeft={<ArrowRight size={13} />} onClick={openWizard}>Continue</Button>
            )}
            {record.status === 'completed' && (
              <Button size="sm" variant="outline" onClick={openWizard}>Amend / New Version</Button>
            )}
          </div>

          {record.status === 'completed' && (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="sm" iconLeft={<Download size={13} />} disabled={!record.pdf_url}
                onClick={() => { if (record.pdf_url) downloadPdf(record.pdf_url, `Informed Consent - ${clientName || 'client'}.pdf`); }}
              >
                Download PDF
              </Button>
              <Button
                size="sm" variant="outline" iconLeft={<Printer size={13} />} disabled={!record.pdf_url}
                onClick={() => { if (record.pdf_url) window.open(record.pdf_url, '_blank', 'noopener'); }}
              >
                Print
              </Button>
            </div>
          )}

          {canStartFresh && record.status === 'revoked' && (
            <p className="text-[12.5px] text-slate-400 mt-2">This consent was revoked. Start a new one above.</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────── WIZARD */
interface ConsentWizardProps {
  clientId: string;
  clientName: string;
  record: InformedConsent | null;
  toast: ReturnType<typeof useToast>['toast'];
  onDone: (refresh: boolean) => void;
}

interface SubmitResult { pdfUrl?: string; }

function ConsentWizard({ clientId, clientName, record, toast, onDone }: ConsentWizardProps) {
  const isResume = Boolean(record && record.status !== 'completed' && record.status !== 'revoked' && record.status !== 'archived');
  const [form, setForm] = useState<InformedConsentFormData>(() => (isResume && record ? formFromRecord(record) : initInformedConsentForm()));
  const [errors, setErrors] = useState<FormErrors>({});
  const [step, setStep] = useState<StepId>(1);
  const [saving, setSaving] = useState(false);
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(isResume && record ? record.id : null);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const initFormRef = useRef<InformedConsentFormData>(form);
  const restoredRef = useRef(false);

  const draftKey = `informed-consent-draft.v1:${clientId}`;
  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initFormRef.current), [form]);
  const { restore, clear, saveNow } = useAutoSaveDraft({ key: draftKey, data: form, isDirty });

  // Auto-fill from the client profile when starting fresh (no existing record).
  useEffect(() => {
    if (isResume) return;
    let cancelled = false;
    async function load() {
      setDetailLoading(true);
      let base = initInformedConsentForm();
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
            emergencyContact: String(c.emergency_contact ?? ''),
            address: String(c.address ?? ''),
            occupation: String(c.occupation ?? ''),
          };
        }
      } catch { /* non-fatal — leave fields blank for manual entry */ }
      if (cancelled) return;

      if (!restoredRef.current) {
        restoredRef.current = true;
        const draft = restore();
        if (draft) { base = { ...base, ...draft }; toast.info('Restored your unsaved draft.'); }
      }
      initFormRef.current = base;
      setForm(base);
      setDetailLoading(false);
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const set = useCallback(<K extends keyof InformedConsentFormData>(key: K, val: InformedConsentFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  const stepperSteps = useMemo(() => STEPS.map((s) => ({ id: s.id, label: s.label })), []);
  const isLastStep = nextStepId(step) == null;

  // Persists whatever has been filled in so far. Returns the (possibly new,
  // if this PATCH versioned a completed record) record id.
  const persist = useCallback(async (): Promise<string> => {
    if (!currentId) {
      const res = await api.progress.informedConsent.create(buildCreatePayload(form, clientId));
      const id = res?.data?.id;
      if (!id) throw new Error('Server did not return a record id.');
      setCurrentId(id);
      return id;
    }
    const res = await api.progress.informedConsent.update(currentId, buildUpdatePayload(form));
    const id = res?.data?.id;
    if (!id) throw new Error('Server did not return a record id.');
    if (id !== currentId) setCurrentId(id);
    return id;
  }, [currentId, form, clientId]);

  const handleFinish = useCallback(async () => {
    setSaving(true);
    try {
      const id = await persist();
      await api.progress.informedConsent.sign(id, { signer: 'client', signature: form.clientSignature });
      const res = await api.progress.informedConsent.sign(id, { signer: 'trainer', signature: form.trainerSignature });
      let final = res?.data;
      if (form.witnessSignature) {
        const wRes = await api.progress.informedConsent.sign(id, {
          signer: 'witness', signature: form.witnessSignature, witness_name: form.witnessName || undefined,
        });
        final = wRes?.data ?? final;
      }
      clear();
      toast.success('Informed consent completed.');
      setSubmitResult({ pdfUrl: final?.pdf_url ?? undefined });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to complete the consent.');
    } finally {
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, persist]);

  const handleNext = async () => {
    const err = validateStep(step, form);
    setErrors((e) => ({ ...e, [`step${step}`]: err }));
    if (err) { toast.error(err); return; }

    setCreatingDraft(!currentId);
    try {
      await persist();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not save progress.');
      setCreatingDraft(false);
      return;
    }
    setCreatingDraft(false);

    const next = nextStepId(step);
    if (next == null) { await handleFinish(); return; }
    setStep(next);
  };

  const handleBack = () => {
    const prev = prevStepId(step);
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
    return <SubmitSuccess clientName={clientName} result={submitResult} onDone={() => onDone(true)} />;
  }

  return (
    <div className="pb-28">
      {/* Header — in normal flow, directly on the page background. The old
          sticky white card floated at a safe-area-dependent offset, which on
          notched phones opened a large blank band under the top bar. */}
      <div className="mx-auto max-w-3xl pt-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px]"
              style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 6px 18px rgba(245,158,11,0.3)' }}
            >
              <FileSignature size={18} color="#fff" />
            </div>
            <div>
              <h1 className="text-[19px] font-[860] tracking-[-0.03em] text-slate-900 leading-none sm:text-[22px]">{currentId ? 'Continue Consent' : 'New Informed Consent'}</h1>
              <p className="text-[12px] font-[600] text-slate-400 mt-1">{clientName}</p>
            </div>
          </div>
          <button
            type="button" onClick={() => onDone(false)}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-[650] transition-colors hover:bg-white"
            style={{ color: '#64748b', border: '1px solid rgba(15,23,42,0.08)' }}
          >
            <X size={12} /> Cancel
          </button>
        </div>
        <div className="mt-4">
          <StepperTimeline steps={stepperSteps} current={step} onStep={(id) => setStep(id as StepId)} />
        </div>
      </div>

      <div className="mx-auto max-w-3xl py-5 space-y-5">
        <m.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
          {step === 1 && <StepExerciseProgrammeConsent form={form} set={set} error={errors.step1} />}
          {step === 2 && <StepAgreements form={form} set={set} error={errors.step2} />}
          {step === 3 && <StepSignatures form={form} set={set} error={errors.step3} />}
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
              {saving ? 'Finishing...' : creatingDraft ? 'Saving...' : isLastStep ? 'Finish' : 'Next'}
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
    `Personal Training Informed Consent for ${clientName}.${result.pdfUrl ? `\n\nSigned consent PDF: ${result.pdfUrl}` : ''}`,
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'rgba(16,185,129,0.12)' }}>
        <CheckCircle2 size={32} style={{ color: '#10b981' }} />
      </div>
      <h1 className="mt-5 text-[24px] font-[860] tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>Consent Completed</h1>
      <p className="mt-2 text-[13.5px]" style={{ color: 'var(--text-muted)' }}>
        {clientName}&apos;s Personal Training Informed Consent has been signed and recorded.
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Button
          iconLeft={<Download size={14} />} disabled={!result.pdfUrl}
          onClick={() => { if (result.pdfUrl) downloadPdf(result.pdfUrl, `Informed Consent - ${clientName || 'client'}.pdf`); }}
        >
          Download PDF
        </Button>
        <Button
          variant="outline" iconLeft={<Printer size={14} />} disabled={!result.pdfUrl}
          onClick={() => { if (result.pdfUrl) window.open(result.pdfUrl, '_blank', 'noopener'); }}
        >
          Print
        </Button>
        <Button variant="outline" iconLeft={<Mail size={14} />} onClick={() => { window.location.href = `mailto:?subject=${encodeURIComponent(`Informed Consent — ${clientName}`)}&body=${mailBody}`; }}>
          Email
        </Button>
      </div>
      {!result.pdfUrl && (
        <p className="mt-3 text-[11.5px]" style={{ color: 'var(--text-disabled)' }}>The signed PDF will appear here once it finishes generating — check back shortly.</p>
      )}

      <Button variant="ghost" className="mt-8" iconLeft={<History size={13} />} onClick={onDone}>Back to Consent</Button>
    </div>
  );
}
