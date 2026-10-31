'use client';

// Remote screening. The client opens this from a one-time link their trainer
// sent and fills the same PAR-Q and informed consent the trainer would have
// filled in the studio — on their own phone, with no login.
//
// The step components are the studio's own, not copies: the wording, the
// conditional fields and the signature pad are exactly what the trainer's
// wizard shows. Only two things differ, and both are props:
//   • StepConsent hides its signature pad — one signature at the end covers
//     the whole document, as it does in the studio flow.
//   • StepSignatures hides the trainer and witness pads — the trainer is not
//     in the room and countersigns later.
//
// The token is the only credential, and the server fills the client's
// identity from pt_clients. Nothing typed here can change whose name is on
// the record.

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import {
  AlertTriangle, ArrowLeft, ArrowRight, Check, Loader2, ShieldCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { FormSigningPreview } from '@/lib/api';
import { errorMessage } from '@/lib/forms/errors';
import { Wordmark } from '@/components/landing/Wordmark';
import { C, CARD, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/landing/tokens';
import StepperTimeline from '@/components/pt-os/shared/StepperTimeline';
import FloatInput from '@/components/ui/FloatInput';
import StepParqQuestionnaire from '@/components/pt-os/parq/StepParqQuestionnaire';
import StepPastHistory from '@/components/pt-os/parq/StepPastHistory';
import StepCurrentHealth from '@/components/pt-os/parq/StepCurrentHealth';
import StepConsent from '@/components/pt-os/parq/StepConsent';
import {
  initParqForm, PARQ_QUESTIONS, CONSENT_CHECKBOX_FIELDS,
  type ParqFormData,
} from '@/components/pt-os/parq/types';
import { buildFormPayload } from '@/components/pt-os/parq/mappers';
import StepExerciseProgrammeConsent from '@/components/pt-os/informed-consent/StepExerciseProgrammeConsent';
import StepAgreements from '@/components/pt-os/informed-consent/StepAgreements';
import StepSignatures from '@/components/pt-os/informed-consent/StepSignatures';
import {
  initInformedConsentForm, EXERCISE_PROGRAMME_CONSENT_PARAGRAPHS, FINAL_ACK_FIELDS,
  type InformedConsentFormData,
} from '@/components/pt-os/informed-consent/types';

const EASE = [0.16, 1, 0.3, 1] as const;

const STEPS = [
  { id: 1, label: 'PAR-Q' },
  { id: 2, label: 'History' },
  { id: 3, label: 'Health' },
  { id: 4, label: 'Consent' },
  { id: 5, label: 'Sign' },
] as const;

type StepId = typeof STEPS[number]['id'];
const LAST_STEP = STEPS.length;

/** Bump when the saved form shape changes; an old draft is then ignored
 *  rather than half-restored into a form that no longer has those fields. */
const DRAFT_VERSION = 1;

function Shell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center px-4 py-8 sm:py-10" style={{ background: C.canvasAlt }}>
      <div className={`w-full ${wide ? 'max-w-[680px]' : 'max-w-[420px]'}`}>
        <div className="mb-5 flex justify-center">
          <Wordmark size={26} priority />
        </div>
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="rounded-[20px] p-5 sm:p-7"
          style={{ background: CARD.background, border: CARD.border, boxShadow: CARD.boxShadow }}
        >
          {children}
        </m.div>
        <p className="mt-5 text-center text-[12px]" style={{ color: C.muted }}>
          Need help? <a href="mailto:support@myptstudio.com" style={{ color: C.blueHi }}>support@myptstudio.com</a>
        </p>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <Shell>
      <div className="text-center">{children}</div>
    </Shell>
  );
}

function DeadLink({ message }: { message: string }) {
  return (
    <Centered>
      <div
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[14px]"
        style={{ background: C.redSoft, color: C.red }}
      >
        <AlertTriangle size={22} />
      </div>
      <h1 className="mb-2 text-[20px] font-[600] tracking-[-0.02em]" style={{ color: C.ink }}>
        This link can&rsquo;t be used
      </h1>
      <p className="text-[13.5px] leading-[1.55]" style={{ color: C.muted }}>{message}</p>
      <p className="mt-4 text-[12.5px] leading-[1.5]" style={{ color: C.faint }}>
        Signing links work once and expire. Ask your trainer to send you a new one.
      </p>
    </Centered>
  );
}

function Submitted({ studio, riskLevel }: { studio: string; riskLevel: string }) {
  return (
    <Centered>
      <m.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: C.emeraldSoft, color: C.emerald }}
      >
        <Check size={28} strokeWidth={2.5} />
      </m.div>
      <h1 className="mb-2 text-[22px] font-[600] tracking-[-0.02em]" style={{ color: C.ink }}>
        Screening submitted
      </h1>
      <p className="text-[13.5px] leading-[1.55]" style={{ color: C.muted }}>
        {studio} has your PAR-Q and signed consent. Your trainer will review them and add their
        countersignature before your first session.
      </p>
      {riskLevel === 'high' && (
        <p
          className="mt-4 rounded-[12px] p-3.5 text-left text-[13px] leading-[1.5]"
          style={{ background: C.goldSoft, color: C.body }}
        >
          Some of your answers need a doctor&rsquo;s clearance before training starts. Your trainer
          will tell you what to bring.
        </p>
      )}
    </Centered>
  );
}

function SigningForm() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const draftKey = token ? `pt-sign:${token}` : '';

  const [preview, setPreview] = useState<FormSigningPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [dead, setDead] = useState<string | null>(null);
  const [result, setResult] = useState<{ studio: string; riskLevel: string } | null>(null);

  const [step, setStep] = useState<StepId>(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [parq, setParq] = useState<ParqFormData>(initParqForm);
  const [consent, setConsent] = useState<InformedConsentFormData>(initInformedConsentForm);

  const setParqField = useCallback(<K extends keyof ParqFormData,>(key: K, val: ParqFormData[K]) => {
    setParq((prev) => ({ ...prev, [key]: val }));
  }, []);
  const setConsentField = useCallback(<K extends keyof InformedConsentFormData,>(key: K, val: InformedConsentFormData[K]) => {
    setConsent((prev) => ({ ...prev, [key]: val }));
  }, []);

  useEffect(() => {
    if (!token) {
      setDead('The link is missing its signing code. Use the link your trainer sent you.');
      setLoading(false);
      return;
    }
    api.formSigning.preview(token)
      .then((r) => setPreview(r.data))
      .catch((e: unknown) => {
        const status = (e as { status?: number })?.status;
        setDead(status === 404
          ? 'This signing link has expired or has already been used.'
          : errorMessage(e, 'This signing link is not valid.'));
      })
      .finally(() => setLoading(false));
  }, [token]);

  // Restore a half-filled form after a reload. The signature is deliberately
  // not saved: a legal signature should not sit in browser storage waiting to
  // be reused.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!preview || !draftKey) return;
    try {
      const raw = localStorage.getItem(draftKey);
      const saved = raw ? JSON.parse(raw) : null;
      if (saved?.v === DRAFT_VERSION) {
        if (saved.parq) setParq({ ...initParqForm(), ...saved.parq });
        if (saved.consent) setConsent({ ...initInformedConsentForm(), ...saved.consent, clientSignature: '' });
      }
    } catch {
      // Unreadable or unavailable storage: start fresh rather than fail.
    }
    setReady(true);
  }, [preview, draftKey]);

  useEffect(() => {
    if (!ready || !draftKey) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({
          v: DRAFT_VERSION, parq, consent: { ...consent, clientSignature: '' },
        }));
      } catch {
        // Storage full or blocked. The form still works; it just won't resume.
      }
    }, 600);
    return () => clearTimeout(t);
  }, [ready, draftKey, parq, consent]);

  const unanswered = useMemo(
    () => parq.parqAnswers.filter((a) => !a.answer).length,
    [parq.parqAnswers],
  );

  /** What must be true to leave the current step. Mirrors the studio wizard's
   *  own gates, minus the trainer-only ones (clearance upload, countersign). */
  const validate = (current: StepId): string | undefined => {
    if (current === 1 && unanswered > 0) {
      return `Answer all ${PARQ_QUESTIONS.length} questions (${unanswered} left).`;
    }
    if (current === 4) {
      if (!consent.exerciseConsentChecked) return 'Please accept the exercise programme consent.';
      if (consent.physicianAdvisedAgainst == null) return 'Answer whether a doctor has advised against exercise.';
      if (consent.physicianAdvisedAgainst && !consent.medicalCondition.trim()) {
        return 'Describe the condition the doctor advised about.';
      }
      if (FINAL_ACK_FIELDS.some((f) => !consent.acknowledgements[f.key])) {
        return 'All agreement items must be checked.';
      }
    }
    if (current === 5) {
      if (!CONSENT_CHECKBOX_FIELDS.every((f) => parq.consentCheckboxes[f.key])) {
        return 'Please confirm your answers are true.';
      }
      if (!consent.clientSignature) return 'Please sign at the bottom.';
    }
    return undefined;
  };

  const next = async () => {
    const problem = validate(step);
    if (problem) { setError(problem); return; }
    setError('');
    if (step < LAST_STEP) { setStep((step + 1) as StepId); return; }

    setBusy(true);
    try {
      // The PAR-Q half of the body comes from the wizard's own mapper, then
      // only the fields the public endpoint accepts are sent. Identity is
      // filled server-side from the client record.
      const p = buildFormPayload(parq, '');
      const res = await api.formSigning.submit(token, {
        height_cm: p.height_cm,
        weight_kg: p.weight_kg,
        current_health: p.current_health,
        past_history: p.past_history,
        family_history: p.family_history,
        parq_answers: p.parq_answers,
        acknowledgements: consent.acknowledgements,
        physician_advised_against: consent.physicianAdvisedAgainst,
        physician_name: consent.physicianName.trim() || undefined,
        hospital: consent.physicianHospital.trim() || undefined,
        medical_condition: consent.medicalCondition.trim() || undefined,
        exercise_consent_checked: consent.exerciseConsentChecked,
        exercise_consent_text: EXERCISE_PROGRAMME_CONSENT_PARAGRAPHS.join('\n\n'),
        signature: consent.clientSignature,
      });
      try { localStorage.removeItem(draftKey); } catch { /* nothing to clean up */ }
      setResult({ studio: preview?.studio_name || 'Your studio', riskLevel: res.data.risk_level });
    } catch (e: unknown) {
      const status = (e as { status?: number })?.status;
      const code = (e as { code?: string })?.code;
      // The link died while the form sat open, or a second tab already sent
      // it. Neither is fixed by pressing Submit again.
      if (status === 404 || code === 'LINK_USED') {
        setDead('This screening has already been submitted, or the link has expired.');
        return;
      }
      setError(errorMessage(e, 'Could not submit your screening. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const back = () => {
    setError('');
    if (step > 1) setStep((step - 1) as StepId);
  };

  if (loading) {
    return (
      <Centered>
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 size={24} className="animate-spin" style={{ color: C.blueHi }} />
          <p className="text-[13px]" style={{ color: C.muted }}>Checking your link…</p>
        </div>
      </Centered>
    );
  }
  if (dead) return <DeadLink message={dead} />;
  if (result) return <Submitted studio={result.studio} riskLevel={result.riskLevel} />;
  if (!preview) return null;

  const stepLabel = `Step ${step} of ${LAST_STEP}`;

  return (
    <Shell wide>
      <div className="mb-5">
        <div className="mb-3 flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
            style={{ background: C.blueWash, color: C.blueHi }}
          >
            <ShieldCheck size={17} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-[600]" style={{ color: C.ink }}>{preview.studio_name}</p>
            <p className="truncate text-[12px]" style={{ color: C.muted }}>
              Health screening &amp; informed consent
            </p>
          </div>
        </div>
        <h1 className="text-[22px] font-[600] tracking-[-0.02em]" style={{ color: C.ink }}>
          {preview.client_name ? `Hello ${preview.client_name}` : 'Your health screening'}
        </h1>
        <p className="mt-1 text-[13.5px] leading-[1.5]" style={{ color: C.muted }}>
          A few minutes now saves the paperwork on your first session. Your answers go straight to
          your trainer.
        </p>
      </div>

      <div className="mb-6">
        <StepperTimeline steps={STEPS} current={step} onStep={(id) => { if (id < step) setStep(id as StepId); }} />
      </div>

      <m.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
        {step === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FloatInput label="Height (cm)" numeric="decimal" value={parq.heightCm} onChange={(v) => setParqField('heightCm', v)} />
              <FloatInput label="Weight (kg)" numeric="decimal" value={parq.weightKg} onChange={(v) => setParqField('weightKg', v)} />
            </div>
            <StepParqQuestionnaire form={parq} set={setParqField} stepLabel={stepLabel} />
          </div>
        )}
        {step === 2 && <StepPastHistory form={parq} set={setParqField} stepLabel={stepLabel} />}
        {step === 3 && <StepCurrentHealth form={parq} set={setParqField} stepLabel={stepLabel} />}
        {step === 4 && (
          <div className="space-y-8">
            <StepExerciseProgrammeConsent form={consent} set={setConsentField} stepLabel={stepLabel} />
            <StepAgreements form={consent} set={setConsentField} stepLabel={stepLabel} />
          </div>
        )}
        {step === 5 && (
          <div className="space-y-8">
            <StepConsent form={parq} set={setParqField} stepLabel={stepLabel} hideSignature />
            <StepSignatures form={consent} set={setConsentField} clientOnly />
          </div>
        )}
      </m.div>

      {error && (
        <p role="alert" className="mt-5 text-[12.5px] font-[550]" style={{ color: C.red }}>{error}</p>
      )}

      <div className="mt-7 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={back}
          disabled={step === 1 || busy}
          className={`${SECONDARY_BUTTON} h-11 px-5 text-[14px]`}
        >
          <ArrowLeft size={15} /> Back
        </button>
        <button
          type="button"
          onClick={next}
          disabled={busy}
          className={`${PRIMARY_BUTTON} h-11 px-6 text-[14px]`}
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : step === LAST_STEP ? <Check size={15} /> : <ArrowRight size={15} />}
          {busy ? 'Submitting…' : step === LAST_STEP ? 'Submit & sign' : 'Next'}
        </button>
      </div>

      <p className="mt-4 text-center text-[11.5px] leading-[1.5]" style={{ color: C.faint }}>
        This link works once and expires{' '}
        {new Date(preview.expires_at).toLocaleString('en-IN', {
          day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
        })}
        . Your answers are saved on this device as you go.
      </p>
    </Shell>
  );
}

export default function SignPage() {
  return (
    <Suspense fallback={
      <Shell>
        <div className="flex justify-center py-6">
          <Loader2 size={24} className="animate-spin" style={{ color: C.blueHi }} />
        </div>
      </Shell>
    }>
      <SigningForm />
    </Suspense>
  );
}
