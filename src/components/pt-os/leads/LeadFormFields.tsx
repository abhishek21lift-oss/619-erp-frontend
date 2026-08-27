'use client';

// Shared between the leads list's edit dialog and the standalone Add Lead
// page — one set of fields, options and section styling, so the two forms
// cannot drift apart the way copy-pasted ones eventually do.

import { FloatInput } from '@/components/ui';
import SearchableSelect from '@/components/pt-os/SearchableSelect';

export const SOURCE_OPTIONS = [
  { value: 'walk-in', label: 'Walk-in' },
  { value: 'referral', label: 'Referral' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'website', label: 'Website' },
  { value: 'phone', label: 'Phone Enquiry' },
  { value: 'other', label: 'Other' },
];

export interface LeadFormState {
  name: string;
  mobile: string;
  email: string;
  source: string;
  interested_package: string;
  trainer_id: string;
  trainer_name: string;
  follow_up_date: string;
  notes: string;
}

export const emptyLeadForm: LeadFormState = {
  name: '', mobile: '', email: '', source: 'walk-in', interested_package: '',
  trainer_id: '', trainer_name: '', follow_up_date: '', notes: '',
};

/**
 * A titled group of fields inside the lead form.
 *
 * The label wears the same micro-label treatment as the KPI captions on the
 * leads page, so the form reads as part of that product rather than a
 * generic wizard dropped on top of it.
 */
export function FormSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      {/* The trailing rule is doing real work, not decoration. SearchableSelect
          renders its own uppercase label above the field ("SOURCE", "TRAINER"),
          so a group heading in the same case and a similar size reads as a
          competing sibling rather than a level above it. The rule and the
          darker ink settle which is which. */}
      <div className="flex items-center gap-2.5">
        <h3
          className="shrink-0 text-[10.5px] font-[750] uppercase tracking-wide"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </h3>
        <span aria-hidden className="h-px flex-1" style={{ background: 'var(--border)' }} />
      </div>
      {children}
    </section>
  );
}

export function LeadFormFields({
  form, set, trainers,
}: {
  form: LeadFormState;
  set: <K extends keyof LeadFormState>(key: K, val: LeadFormState[K]) => void;
  trainers: { id: string; name: string }[];
}) {
  return (
    <div className="flex flex-col gap-5">
      <FormSection label="Contact">
        <FloatInput label="Full Name" required value={form.name} onChange={(v) => set('name', v)} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FloatInput label="Mobile" type="tel" value={form.mobile} onChange={(v) => set('mobile', v)} />
          <FloatInput label="Email" type="email" value={form.email} onChange={(v) => set('email', v)} />
        </div>
      </FormSection>

      <FormSection label="Where they came from">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SearchableSelect
            label="Source" allowCustom={false}
            value={form.source} onChange={(v) => set('source', v)}
            options={SOURCE_OPTIONS}
          />
          <SearchableSelect
            label="Trainer" allowCustom={false}
            value={form.trainer_id}
            onChange={(v) => {
              set('trainer_id', v);
              set('trainer_name', trainers.find((t) => t.id === v)?.name || '');
            }}
            options={trainers.map((t) => ({ value: t.id, label: t.name }))}
            placeholder="Unassigned"
          />
        </div>
      </FormSection>

      <FormSection label="What they want">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FloatInput label="Interested Package" value={form.interested_package} onChange={(v) => set('interested_package', v)} />
          <FloatInput label="Follow-up Date" type="date" value={form.follow_up_date} onChange={(v) => set('follow_up_date', v)} />
        </div>
      </FormSection>

      <FormSection label="Notes">
        <FloatInput label="Anything worth remembering" multiline rows={3} value={form.notes} onChange={(v) => set('notes', v)} />
      </FormSection>
    </div>
  );
}
