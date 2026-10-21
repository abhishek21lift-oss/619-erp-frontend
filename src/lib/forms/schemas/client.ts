/**
 * A new PT client — POST /api/pt-os/clients.
 *
 * Mirrors the validation new-client/page.tsx already applies by hand, promoted
 * to a canonical Zod schema so one rule set governs the create form and its
 * tests. The payload shape is unchanged: `api.pt.create` receives the same
 * keys it always did.
 */
import { z } from 'zod';
import { textField, phoneField, emailField, dateField, enumField, timeField, integerField, moneyField } from '../primitives';
import { CLIENT_SOURCES } from '../../client-intake';
import { MIN_LENGTH } from '../../password-policy';

export const GENDERS = ['Male', 'Female', 'Other'] as const;

export const clientCreateSchema = z
  .object({
    name: textField({ label: 'Full name', required: true, minLength: 3 }),
    gender: enumField(GENDERS, { label: 'Gender', required: true }),
    dob: dateField({ label: 'Date of birth' }),
    mobile: phoneField({ label: 'Mobile number', required: true }),
    whatsapp: phoneField({ label: 'WhatsApp number' }),
    email: emailField({ label: 'Email address' }),
    emergencyContact: textField({ label: 'Emergency contact name' }),
    emergencyPhone: phoneField({ label: 'Emergency contact number' }),
    emergencyRelationship: textField({ label: 'Relationship' }),
  })
  .superRefine((v, ctx) => {
    // Date of birth: dateField already rejects non-real dates. Reject a future
    // dob and an age outside 10-100, matching the form's existing rules.
    if (v.dob) {
      const d = new Date(v.dob);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (d > today) {
        ctx.addIssue({
          code: 'custom',
          path: ['dob'],
          message: 'Date of birth cannot be in the future.',
        });
      } else {
        let age = today.getFullYear() - d.getFullYear();
        const m = today.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
        if (age < 10 || age > 100) {
          ctx.addIssue({
            code: 'custom',
            path: ['dob'],
            message: 'Age must be between 10 and 100 years.',
          });
        }
      }
    }

    // Relationship is required only once there is an emergency contact to
    // relate to. `whatsappSameAsMobile` is UI state, never submitted, so
    // `whatsapp` is validated as a phone whenever it has a value; when it
    // mirrors the mobile it is already a valid phone.
    const hasEmergencyContact = Boolean(
      v.emergencyContact?.trim() || v.emergencyPhone?.trim(),
    );
    if (hasEmergencyContact && !v.emergencyRelationship?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['emergencyRelationship'],
        message: 'Tell us how this person is related to the client.',
      });
    }
  });

export type ClientCreateValues = z.infer<typeof clientCreateSchema>;

export function blankClientCreate(): ClientCreateValues {
  return {
    name: '',
    gender: null,
    dob: '',
    mobile: '',
    whatsapp: '',
    email: '',
    emergencyContact: '',
    emergencyPhone: '',
    emergencyRelationship: '',
  };
}

/**
 * Client account activation — POST /api/client-activation/accept.
 *
 * The first screen a client ever sees of MY PT STUDIO: a public, token-gated
 * page with no session, where the client chooses the password that gates all
 * of their data. It is the client-side analog of the P0 set-password and
 * forgot-password forms, which already carry canonical schemas; this one did
 * not.
 *
 * Validation mirrors `routes/invitations.js` exactly via
 * `checkInvitationPassword` in `lib/password-policy.ts` (≥8 chars, one
 * lowercase, one uppercase, one number, one special character, plus a
 * confirmation match). Every rule is enforced server-side too, so a schema
 * here is defense-in-depth — it stops a weak password being *chosen* before
 * the request ever leaves the browser, and reports which rule failed next to
 * the field rather than handing back a generic server rejection.
 */
export const clientActivateSchema = z
  .object({
    password: textField({ label: 'Password', required: true, minLength: MIN_LENGTH }),
    confirm: textField({ label: 'Confirm password', required: true }),
  })
  .superRefine((v, ctx) => {
    const { password, confirm } = v;

    // Character-class rules, mirroring routes/invitations.js exactly. Each is
    // reported separately so the checklist beside the field flips per rule —
    // matching the existing UX rather than collapsing to one message.
    if (password && !/[a-z]/.test(password)) {
      ctx.addIssue({
        code: 'custom',
        path: ['password'],
        message: 'Password needs: a lowercase letter.',
      });
    }
    if (password && !/[A-Z]/.test(password)) {
      ctx.addIssue({
        code: 'custom',
        path: ['password'],
        message: 'Password needs: an uppercase letter.',
      });
    }
    if (password && !/[0-9]/.test(password)) {
      ctx.addIssue({
        code: 'custom',
        path: ['password'],
        message: 'Password needs: a number.',
      });
    }
    if (password && !/[^A-Za-z0-9]/.test(password)) {
      ctx.addIssue({
        code: 'custom',
        path: ['password'],
        message: 'Password needs: a special character.',
      });
    }

    // Confirmation match.
    if (password && confirm && password !== confirm) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirm'],
        message: 'Passwords do not match.',
      });
    }
  });

export type ClientActivateValues = z.infer<typeof clientActivateSchema>;

export function blankClientActivate(): ClientActivateValues {
  return { password: '', confirm: '' };
}

/**
 * An existing PT client — PATCH /api/pt-os/clients/:id.
 *
 * LENIENT UPDATE SCHEMA. Differs from `clientCreateSchema` deliberately:
 *
 * - Only `name` is required. `gender`, `mobile`, `email`, `dob` and every
 *   other field are optional — the edit workflow never forces a trainer to
 *   fill in data the client didn't have when they were created.
 * - An optional field is validated only when it has a non-blank value, so a
 *   legacy client whose record already holds a malformed optional value can
 *   still be saved after an unrelated edit (for example correcting a phone
 *   number). The field's existing value is preserved unless the user actively
 *   replaces it.
 *
 * The payload shape sent to `api.pt.updateClient` is unchanged: the page maps
 * blank optionals to `null`, which the endpoint treats as "clear this column",
 * and omits nothing the form renders.
 */
export const clientUpdateSchema = z
  .object({
    name: textField({ label: 'Full name', required: true, minLength: 3 }),
    mobile: phoneField({ label: 'Mobile number' }),
    email: emailField({ label: 'Email address' }),
    gender: enumField(GENDERS, { label: 'Gender' }),
    dob: dateField({ label: 'Date of birth' }),
    address: textField({ label: 'Address' }),
    emergency_contact: textField({ label: 'Emergency contact name' }),
    emergency_phone: phoneField({ label: 'Emergency contact number' }),
    emergency_contact_relationship: textField({ label: 'Relationship' }),
    client_source: enumField(CLIENT_SOURCES, { label: 'Client source' }),
  })
  .superRefine((v, ctx) => {
    // Date of birth: dateField already rejects non-real dates. Reject a future
    // dob and an age outside 10-100, matching the create form's rules.
    if (v.dob) {
      const d = new Date(v.dob);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (d > today) {
        ctx.addIssue({
          code: 'custom',
          path: ['dob'],
          message: 'Date of birth cannot be in the future.',
        });
      } else {
        let age = today.getFullYear() - d.getFullYear();
        const m = today.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
        if (age < 10 || age > 100) {
          ctx.addIssue({
            code: 'custom',
            path: ['dob'],
            message: 'Age must be between 10 and 100 years.',
          });
        }
      }
    }

    // Relationship is required only once there is an emergency contact to
    // relate to.
    const hasEmergencyContact = Boolean(
      v.emergency_contact?.trim() || v.emergency_phone?.trim(),
    );
    if (hasEmergencyContact && !v.emergency_contact_relationship?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['emergency_contact_relationship'],
        message: 'Tell us how this person is related to the client.',
      });
    }
  });

export type ClientUpdateValues = z.infer<typeof clientUpdateSchema>;

export function blankClientUpdate(): ClientUpdateValues {
  return {
    name: '',
    mobile: '',
    email: '',
    gender: null,
    dob: '',
    address: '',
    emergency_contact: '',
    emergency_phone: '',
    emergency_contact_relationship: '',
    client_source: null,
  };
}

/**
 * Client PT enrolment — PATCH /api/pt-os/clients/:id.
 *
 * Mirrors exactly what the enrolment form already validates by hand before it
 * opens the agreement: the eight editable fields the PATCH actually carries —
 * start date, duration, training mode, workout time, training days, sessions
 * per week, final amount and amount paid. Trainer, experience level, previous
 * trainer experience and payment method are deliberately NOT in this shape:
 * they are either informational or re-checked by the backend, and a legacy
 * value the trainer never touched must not block the enrolment.
 *
 * Cross-field rules live here because they cannot be expressed field-by-field:
 *   - Final Selling Price must be greater than zero.
 *   - Amount Paid cannot exceed Final Selling Price — the rule that protects
 *     the ledger. The backend additionally refuses to lower Amount Paid below
 *     what the ledger already records; that needs the stored value, so it
 *     stays server-side.
 *
 * Backend contract (src/modules/pt-os/pt-os.routes.js PATCH /clients/:id):
 * duration_months is a whole number 1-60 and the server recomputes
 * balance_amount itself — this schema never replaces server validation.
 */
export const ENROLL_SESSIONS_PER_WEEK = ['1', '2', '3', '4', '5', '6', '7'] as const;

export const clientEnrollSchema = z
  .object({
    startDate: dateField({ label: 'Start date', required: true }),
    // 1-60 (the backend's range), not the 1-12 the select offers: a legacy
    // term longer than a year must still be re-saveable.
    duration: integerField({ label: 'PT Duration', required: true, min: 1, max: 60 }),
    trainingMode: textField({ label: 'Training mode', required: true }),
    workoutTime: timeField({ label: 'Workout time', required: true }),
    trainingDays: z.unknown().transform((raw, ctx) => {
      const arr = Array.isArray(raw) ? raw.filter((v) => typeof v === 'string' && v.trim() !== '') : [];
      if (arr.length === 0) {
        ctx.addIssue({ code: 'custom', message: 'Select at least 1 training day.' });
        return z.NEVER;
      }
      return arr;
    }),
    sessionsPerWeek: enumField(ENROLL_SESSIONS_PER_WEEK, { label: 'Sessions per week', required: true }),
    finalAmount: moneyField({ label: 'Final Selling Price', required: true }),
    amountPaid: moneyField({ label: 'Amount Paid', required: true }),
  })
  .superRefine((v, ctx) => {
    if (typeof v.finalAmount === 'number' && v.finalAmount <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['finalAmount'],
        message: 'Final Selling Price must be greater than zero.',
      });
    }
    if (
      typeof v.amountPaid === 'number' &&
      typeof v.finalAmount === 'number' &&
      v.amountPaid > v.finalAmount
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['amountPaid'],
        message: 'Amount Paid cannot exceed Final Selling Price.',
      });
    }
  });

export type ClientEnrollValues = z.infer<typeof clientEnrollSchema>;

export function blankClientEnroll(): ClientEnrollValues {
  return {
    startDate: '',
    duration: null,
    trainingMode: '',
    workoutTime: null,
    trainingDays: [],
    sessionsPerWeek: null,
    finalAmount: null,
    amountPaid: null,
  };
}
