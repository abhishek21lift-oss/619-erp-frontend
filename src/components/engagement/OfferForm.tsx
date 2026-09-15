'use client';

/**
 * The offer create/edit form — the first form on the universal platform.
 *
 * Chosen to go first because it carried the clearest defect in the audit and
 * exercises every layer at once: a cross-field rule (type/value), money and
 * percentage, an enum, a date pair, a code, and a submit that can fail
 * server-side with a field-attributable error.
 *
 * What changed, beyond the bug:
 *
 *   · the raw `<input>`/`<select>` set is gone, so every field now has a real
 *     label, `aria-describedby`, `aria-invalid` and a 44px touch target — none
 *     of which it had;
 *   · `Number(e.target.value)` is gone, so a cleared box is absent rather than
 *     zero;
 *   · `payload as any` is gone: the payload is derived from the schema's
 *     output, so a renamed field is a compile error;
 *   · submitting twice is guarded, and a failure is shown rather than toasted
 *     and forgotten.
 *
 * The card, heading, spacing and action row are the page's own and are
 * unchanged. The fields inside them now render through `FormField`, which is
 * the app's own design-system primitive — so the labels move from this page's
 * bespoke uppercase caption to the shared one. That is a visual change to one
 * form, and it is toward the design system rather than away from it.
 */

import { Gift, Plus, Loader2 } from 'lucide-react';
import { useAppForm } from '../../lib/forms/useAppForm';
import {
  offerFormSchema,
  blankOffer,
  offerToFormValues,
  toOfferPayload,
  OFFER_TYPE_OPTIONS,
  OFFER_FIELD_HINTS,
  type OfferFormValues,
} from '../../lib/forms/schemas/offer';
import {
  TextField,
  NumberField,
  SelectField,
  DateFieldControl,
  FormErrorBanner,
  SubmitStatus,
} from '../ui/form';

export interface OfferRecord {
  id: string;
  name: string;
  type: string;
  value: number;
  code: string;
  plan: string;
  validFrom: string;
  validUntil: string;
  usageLimit: number;
}

export interface OfferFormProps {
  /** The offer being edited, or null to create. */
  editing: OfferRecord | null;
  onSubmit: (payload: ReturnType<typeof toOfferPayload>) => Promise<void>;
  onCancel: () => void;
}

/**
 * A short random coupon code.
 *
 * `Math.random` is fine here and would not be elsewhere: this is a suggestion
 * the user can edit, uniqueness is enforced by the per-studio unique index on
 * `offers.code`, and a collision surfaces as "you already have an offer with
 * this code" rather than as a security problem. Nothing secret is derived.
 */
function generateCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

const card: React.CSSProperties = {
  borderRadius: 20,
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  padding: 24,
};

export function OfferForm({ editing, onSubmit, onCancel }: OfferFormProps) {
  const f = useAppForm({
    schema: offerFormSchema,
    // Reconstructed from the record rather than patched onto whatever was
    // here before — §11. The parent also keys this component on the record's
    // id, so switching from offer A to offer B remounts rather than mutates.
    defaultValues: editing ? offerToFormValues(editing) : blankOffer(),
    fieldHints: OFFER_FIELD_HINTS,
    onSubmit: async (values: OfferFormValues) => {
      await onSubmit(toOfferPayload(values));
    },
  });

  const { form } = f;

  return (
    <div style={card}>
      <h3
        style={{
          margin: '0 0 20px',
          fontSize: 15,
          fontWeight: 700,
          color: '#0F172A',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <Gift size={16} color="#0067e0" /> {editing ? 'Edit Offer' : 'Create New Offer'}
      </h3>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void f.submit();
        }}
        style={{ display: 'grid', gap: 16 }}
      >
        <FormErrorBanner errors={f.errors} onRetry={() => void f.submit()} />

        <form.Field name="name">
          {(field) => (
            <TextField
              field={field}
              label="Offer name"
              required
              placeholder="e.g. Summer Splash 30% Off"
              serverError={f.errors.fieldErrors.name}
            />
          )}
        </form.Field>

        <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 14 }}>
          <form.Field name="type">
            {(field) => (
              <SelectField
                field={field}
                label="Discount type"
                required
                options={OFFER_TYPE_OPTIONS}
                serverError={f.errors.fieldErrors.type}
              />
            )}
          </form.Field>

          {/* The value input is still hidden for a free offer — that part of the
              design was right. What changed is that the schema now DERIVES the
              submitted value from the type, so whatever is left in this field
              cannot reach the server. */}
          <form.Subscribe selector={(s) => s.values.type}>
            {(type) =>
              type === 'free' ? null : (
                <form.Field name="value">
                  {(field) => (
                    <NumberField
                      field={field}
                      label={type === 'percent' ? 'Discount' : 'Amount'}
                      required
                      mode={type === 'percent' ? 'percent' : 'money'}
                      suffix={type === 'percent' ? '%' : '₹'}
                      placeholder={type === 'percent' ? '30' : '500'}
                      serverError={f.errors.fieldErrors.value}
                    />
                  )}
                </form.Field>
              )
            }
          </form.Subscribe>

          <form.Field name="usageLimit">
            {(field) => (
              <NumberField
                field={field}
                label="Usage limit"
                mode="integer"
                description="Leave blank for unlimited"
                serverError={f.errors.fieldErrors.usageLimit}
              />
            )}
          </form.Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14 }}>
          <form.Field name="code">
            {(field) => (
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <TextField
                  field={field}
                  label="Coupon code"
                  placeholder="e.g. SUMMER30"
                  description="Letters, numbers, hyphens and underscores"
                  serverError={f.errors.fieldErrors.code}
                  className="flex-1 min-w-0"
                />
                {/* The page's own Auto-generate, kept. It writes through the
                    field's handleChange rather than to a state object, so the
                    generated code is dirty-tracked and validated like a typed
                    one — the previous version bypassed both. */}
                <button
                  type="button"
                  onClick={() => field.handleChange(generateCode())}
                  style={{
                    marginTop: 22,
                    flexShrink: 0,
                    fontSize: 12,
                    fontWeight: 700,
                    height: 44,
                    padding: '0 14px',
                    borderRadius: 10,
                    border: '1px solid #0067e0',
                    background: 'rgba(0,103,224,0.08)',
                    color: '#0067e0',
                    cursor: 'pointer',
                  }}
                >
                  Auto
                </button>
              </div>
            )}
          </form.Field>

          <form.Field name="plan">
            {(field) => (
              <TextField
                field={field}
                label="Applicable plan"
                placeholder="All Plans / Quarterly…"
                serverError={f.errors.fieldErrors.plan}
              />
            )}
          </form.Field>

          <form.Field name="validFrom">
            {(field) => (
              <DateFieldControl
                field={field}
                label="Valid from"
                serverError={f.errors.fieldErrors.validFrom}
              />
            )}
          </form.Field>

          <form.Field name="validUntil">
            {(field) => (
              <DateFieldControl
                field={field}
                label="Valid until"
                serverError={f.errors.fieldErrors.validUntil}
              />
            )}
          </form.Field>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <SubmitStatus isSubmitting={f.isSubmitting} />
          <button
            type="button"
            onClick={onCancel}
            disabled={f.isSubmitting}
            style={{
              fontSize: 12,
              fontWeight: 700,
              padding: '8px 18px',
              borderRadius: 10,
              border: '1px solid #cbd5e1',
              background: 'transparent',
              color: '#64748b',
              cursor: f.isSubmitting ? 'not-allowed' : 'pointer',
              opacity: f.isSubmitting ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            // The real guard is the in-flight ref inside useAppForm; this only
            // communicates the state. See useAppForm's note on why `disabled`
            // alone cannot stop a double submit.
            disabled={f.isSubmitting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 700,
              padding: '8px 20px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #0067e0, #0059ce)',
              color: '#fff',
              border: 'none',
              cursor: f.isSubmitting ? 'not-allowed' : 'pointer',
              opacity: f.isSubmitting ? 0.7 : 1,
              boxShadow: '0 4px 16px rgba(0,103,224,0.35)',
            }}
          >
            {f.isSubmitting ? (
              <Loader2 size={13} className="animate-spin" aria-hidden />
            ) : (
              <Plus size={13} aria-hidden />
            )}
            {editing ? 'Save Changes' : 'Create Offer'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default OfferForm;
