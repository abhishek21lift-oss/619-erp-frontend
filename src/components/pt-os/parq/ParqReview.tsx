'use client';

import { Pencil, ClipboardCheck } from 'lucide-react';
import RiskLevelBanner from '@/components/pt-os/shared/RiskLevelBanner';
import { calcAge, calcBMI, computeParqRisk } from '@/lib/parq-calculations';
import type { ParqFormData, StepId } from './types';
import { PARQ_QUESTIONS } from './types';

interface ParqReviewProps {
  form: ParqFormData;
  onEditStep: (id: StepId) => void;
}

function SectionCard({ title, stepId, onEdit, children }: { title: string; stepId: StepId; onEdit: (id: StepId) => void; children: React.ReactNode }) {
  return (
    <div className="rounded-[20px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(15,23,42,0.05)' }}>
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
        <h3 className="text-[14px] font-[800] text-slate-900">{title}</h3>
        <button type="button" onClick={() => onEdit(stepId)} className="flex items-center gap-1 text-[11.5px] font-[650]" style={{ color: '#d97706' }}>
          <Pencil size={11} /> Edit
        </button>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: '#94a3b8' }}>{label}</p>
      <p className="mt-0.5 text-[13px] font-[600]" style={{ color: '#1e293b' }}>{value || '—'}</p>
    </div>
  );
}

export function ParqReview({ form, onEditStep }: ParqReviewProps) {
  const age = calcAge(form.dob);
  const bmi = calcBMI(parseFloat(form.heightCm) || null, parseFloat(form.weightKg) || null);
  const risk = computeParqRisk(form.parqAnswers);
  const yesAnswers = form.parqAnswers.filter((a) => a.answer === 'yes');
  const flaggedFamily = form.familyHistory.filter((r) => r.relation);
  const clearanceFilled = Boolean(form.medicalClearance.doctor_name || form.medicalClearance.hospital);

  return (
    <div className="space-y-5">
      <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
        <div className="p-7 sm:p-10">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
              <ClipboardCheck size={20} color="#F59E0B" />
            </div>
            <div>
              <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Review &amp; Submit</h2>
              <p className="text-[13px] text-slate-400 mt-1.5">Step 9 of 9 — confirm everything below, then submit.</p>
            </div>
          </div>
        </div>
      </div>

      <RiskLevelBanner level={risk.riskLevel} stat={`${risk.yesCount} of ${PARQ_QUESTIONS.length} PAR-Q questions flagged YES`} />

      <SectionCard title="Client Details" stepId={1} onEdit={onEditStep}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Full Name" value={form.fullName} />
          <Field label="Gender" value={form.gender} />
          <Field label="Age" value={age != null ? `${age} yrs` : null} />
          <Field label="Mobile" value={form.mobile} />
          <Field label="Blood Group" value={form.bloodGroup} />
          <Field label="BMI" value={bmi} />
        </div>
      </SectionCard>

      <SectionCard title="Current Health" stepId={2} onEdit={onEditStep}>
        <div className="flex flex-wrap gap-2">
          {[
            form.currentHealth.known_disease && 'Known Disease', form.currentHealth.smoking && 'Smoking',
            form.currentHealth.alcohol && 'Alcohol', form.currentHealth.medications && 'On Medications',
            form.currentHealth.has_pain && 'Currently in Pain',
          ].filter(Boolean).map((label) => (
            <span key={String(label)} className="rounded-full px-3 py-1 text-[11.5px] font-[700]" style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626' }}>{label}</span>
          ))}
          {![form.currentHealth.known_disease, form.currentHealth.smoking, form.currentHealth.alcohol, form.currentHealth.medications, form.currentHealth.has_pain].some(Boolean) && (
            <span className="text-[12.5px] font-[600] text-slate-400">No flagged current-health items.</span>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Past Medical History" stepId={3} onEdit={onEditStep}>
        <div className="flex flex-wrap gap-2">
          {Object.entries(form.pastHistory).filter(([, v]) => v === true).map(([k]) => (
            <span key={k} className="rounded-full px-3 py-1 text-[11.5px] font-[700]" style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706' }}>{k.replace(/_/g, ' ')}</span>
          ))}
          {Object.entries(form.pastHistory).filter(([, v]) => v === true).length === 0 && (
            <span className="text-[12.5px] font-[600] text-slate-400">No conditions selected.</span>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Family Medical History" stepId={4} onEdit={onEditStep}>
        {flaggedFamily.length === 0 ? (
          <span className="text-[12.5px] font-[600] text-slate-400">No family history added.</span>
        ) : (
          <div className="space-y-1.5">
            {flaggedFamily.map((r) => (
              <p key={r._key} className="text-[12.5px] font-[600] capitalize" style={{ color: '#334155' }}>{r.relation}</p>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="PAR-Q Questionnaire" stepId={5} onEdit={onEditStep}>
        {yesAnswers.length === 0 ? (
          <span className="text-[12.5px] font-[600] text-slate-400">No YES answers.</span>
        ) : (
          <div className="space-y-1.5">
            {yesAnswers.map((a) => (
              <p key={a.question_id} className="text-[12.5px] font-[600]" style={{ color: '#dc2626' }}>
                Q{a.question_id}: {PARQ_QUESTIONS.find((q) => q.id === a.question_id)?.text}
              </p>
            ))}
          </div>
        )}
      </SectionCard>

      {risk.riskLevel === 'high' && (
        <SectionCard title="Medical Clearance" stepId={6} onEdit={onEditStep}>
          {clearanceFilled ? (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Doctor" value={form.medicalClearance.doctor_name} />
              <Field label="Hospital" value={form.medicalClearance.hospital} />
              <Field label="Clearance Date" value={form.medicalClearance.clearance_date} />
              <Field label="Status" value={form.medicalClearance.approval_status} />
            </div>
          ) : (
            <span className="text-[12.5px] font-[700]" style={{ color: '#dc2626' }}>Not yet provided — required before submitting.</span>
          )}
        </SectionCard>
      )}

      <SectionCard title="Trainer Notes" stepId={7} onEdit={onEditStep}>
        <p className="text-[12.5px] font-[600]" style={{ color: '#334155' }}>{form.trainerNotes.summary || 'No summary added.'}</p>
      </SectionCard>

      <SectionCard title="Digital Consent" stepId={8} onEdit={onEditStep}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="All Boxes Checked" value={Object.values(form.consentCheckboxes).every(Boolean) ? 'Yes' : 'No'} />
          <Field label="Client Signature" value={form.clientSignature ? 'Captured' : 'Missing'} />
          <Field label="Trainer Signature" value={form.trainerSignature ? 'Captured' : 'Missing'} />
          <Field label="Location" value={form.consentLocation} />
        </div>
      </SectionCard>
    </div>
  );
}

export default ParqReview;
