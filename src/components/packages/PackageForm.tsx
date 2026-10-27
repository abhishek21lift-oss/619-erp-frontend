'use client';

// The package form, shared by the dedicated Create Package page and the edit
// dialog. It is one form because the fields and the rules are identical — the
// difference is only the chrome around it.
//
// Its price is what every enrolment against it charges, and `parseFloat`
// parses a PREFIX — so "8,000", which is how a studio owner writes a price,
// created an ₹8 package. See `schemas/ptPackage.ts` for the rest.

import { m } from 'framer-motion';
import { Check } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useAppForm } from '@/lib/forms/useAppForm';
import {
  ptPackageSchema, blankPtPackage, ptPackageToFormValues, toPtPackagePayload,
  PACKAGE_GOAL_OPTIONS,
} from '@/lib/forms/schemas/ptPackage';
import {
  TextField, NumberField, SelectField, TextAreaField, FormErrorBanner,
} from '@/components/ui/form';

const a = '#F59E0B';
const grad = `linear-gradient(135deg,${a},#D97706)`;

export interface PtPackage {
  id: string; name: string; session_count: number; duration_days: number;
  price: number; goal_type: string | null; description: string | null; is_active: boolean;
}

function Spin() {
  return (
    <svg style={{ width: 15, height: 15, animation: 'spin 0.8s linear infinite' }} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
      <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" opacity="0.75" />
    </svg>
  );
}

export function PackageForm({ editing, onCancel, onSaved }: {
  editing: PtPackage | null;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const f = useAppForm({
    schema: ptPackageSchema,
    defaultValues: editing ? ptPackageToFormValues(editing) : blankPtPackage(),
    onSubmit: async (values) => {
      const payload = toPtPackagePayload(values);
      if (editing) await api.automation.ptPackages.update(editing.id, payload);
      else await api.automation.ptPackages.create(payload);
      toast.success(editing ? 'Package updated' : 'Package created');
    },
    onSuccess: () => { void onSaved(); },
  });

  const { form, isSubmitting } = f;

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); void f.submit(); }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormErrorBanner errors={f.errors} onRetry={() => void f.submit()} />

        {/* The examples stay as placeholders — a price field called
            "e.g. 8000" is the failure; a price field called "Price"
            showing "e.g. 8000" is the point. */}
        <form.Field name="name">
          {(field) => (
            <TextField field={field} label="Package name" required maxLength={120}
              placeholder="e.g. Fat Loss Starter"
              serverError={f.errors.fieldErrors.name} />
          )}
        </form.Field>

        <div className="grid gap-3 sm:grid-cols-3">
          <form.Field name="session_count">
            {(field) => (
              <NumberField field={field} label="Sessions" required mode="integer"
                placeholder="e.g. 12" serverError={f.errors.fieldErrors.session_count} />
            )}
          </form.Field>
          <form.Field name="duration_days">
            {(field) => (
              <NumberField field={field} label="Duration" required mode="integer" suffix="d"
                placeholder="e.g. 30" serverError={f.errors.fieldErrors.duration_days} />
            )}
          </form.Field>
          <form.Field name="price">
            {(field) => (
              <NumberField field={field} label="Price" required mode="money" suffix="₹"
                placeholder="e.g. 8000" serverError={f.errors.fieldErrors.price} />
            )}
          </form.Field>
        </div>

        <form.Field name="goal_type">
          {(field) => (
            <SelectField field={field} label="Goal type" options={PACKAGE_GOAL_OPTIONS}
              serverError={f.errors.fieldErrors.goal_type} />
          )}
        </form.Field>

        <form.Field name="description">
          {(field) => (
            <TextAreaField field={field} label="Description"
              description="Shown to members on the package card."
              rows={3} maxLength={1000} showCount
              serverError={f.errors.fieldErrors.description} />
          )}
        </form.Field>
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-2.5">
        <button type="button" onClick={onCancel} disabled={isSubmitting}
          className="h-[44px] rounded-[10px] px-4 text-[13px] font-[600]"
          style={{ border: '1px solid #cbd5e1', background: 'var(--bg-subtle)', color: 'var(--text-secondary)', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>Cancel</button>
        {/* No longer gated on four boxes being non-empty. The old button
            was disabled until something was typed and then accepted
            whatever it was — so a blank price could not be submitted but
            "8,000" could, as ₹8. */}
        <m.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          disabled={isSubmitting}
          className="inline-flex h-[44px] items-center gap-2 rounded-[10px] px-5 text-[13px] font-[700] text-white"
          style={{ border: 'none', background: grad, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.6 : 1, boxShadow: `0 4px 16px ${a}44` }}>
          {isSubmitting ? <Spin /> : <Check size={15} />}
          {editing ? 'Update' : 'Create'}
        </m.button>
      </div>
    </form>
  );
}
