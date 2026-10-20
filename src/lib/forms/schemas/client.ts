/**
 * A new PT client — POST /api/pt-os/clients.
 *
 * Mirrors the validation new-client/page.tsx already applies by hand, promoted
 * to a canonical Zod schema so one rule set governs the create form and its
 * tests. The payload shape is unchanged: `api.pt.create` receives the same
 * keys it always did.
 */
import { z } from 'zod';
import { textField, phoneField, emailField, dateField, enumField, timeField, booleanField, moneyField } from '../primitives';
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
 * Enrolment writes the client's first PT term (status, dates, duration,
 * schedule) together with the enrolment payment (final amount, amount paid,
 * payment method). It is a money-and-membership boundary: the backend locks
 * the client row and recomputes `balance_amount` server-side, so the schema's
 * job is to refuse impossible input before the request ever leaves the
 * browser — never to replace server validation.
 *
 * LENIENT on legacy values: every field except `startDate`, `duration`,
 * `sessionsPerWeek`, `finalAmount` and `amountPaid` is optional. A legacy
 * client whose record holds a malformed optional value can still be enrolled
 * after an unrelated edit because only changed fields are validated by the
 * page's change detection — the schema itself validates whatever it is given.
 *
 * Backend contract (src/modules/pt-os/pt-os.routes.js PATCH /clients/:id):
 *   - duration_months: whole number 1-60
 *   - final_amount: >= 0 (zero is legitimate: complimentary / trial)
 *   - paid_amount: >= 0, cannot be lowered below what is already recorded
 *   - paid_amount <= final_amount
 *   - payment_method: closed set CASH | UPI | CARD | BANK_TRANSFER | SPLIT
 *   - client_source: closed set (empty string cleared to NULL)
 *   - mobile / whatsapp / emergency_phone: 10-digit Indian mobile or blank
 *   - email: valid address or blank
 *   - dob / pt_start_date / pt_end_date: real calendar date (YYYY-MM-DD)
 *   - status: 'active' only with a running term (enforced server-side)
 *   - training_mode: closed set Offline | Online | Hybrid
 */
export const ENROLL_DURATIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] as const;
export const ENROLL_SESSIONS_PER_WEEK = ['1', '2', '3', '4', '5', '6', '7'] as const;
export const ENROLL_TRAINING_MODES = ['Offline', 'Online', 'Hybrid'] as const;
export const ENROLL_EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced', 'athlete'] as const;
export const ENROLL_PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'SPLIT'] as const;

/** The backend expects `HH:MM`; `timeField` normalises '6:05' → '06:05'. */
export const clientEnrollSchema = z
  .object({
    startDate: dateField({ label: 'PT Start Date', required: true }),
    duration: enumField(ENROLL_DURATIONS, { label: 'PT Duration', required: true }),
    trainerId: textField({ label: 'Trainer' }),
    trainerName: textField({ label: 'Trainer Name' }),
    trainingMode: enumField(ENROLL_TRAINING_MODES, { label: 'Training Mode' }),
    workoutExperienceLevel: enumField(ENROLL_EXPERIENCE_LEVELS, { label: 'Workout Experience' }),
    previousTrainerExperience: booleanField(),
    workoutTime: timeField({ label: 'Preferred Workout Time' }),
    trainingDays: z.unknown().transform((raw, ctx) => {
      const arr = Array.isArray(raw) ? raw.filter((v) => typeof v === 'string' && v.trim() !== '') : [];
      if (arr.length === 0) {
        ctx.addIssue({ code: 'custom', message: 'Select at least 1 training day.' });
        return z.NEVER;
      }
      return arr;
    }),
    sessionsPerWeek: enumField(ENROLL_SESSIONS_PER_WEEK, { label: 'Sessions Per Week', required: true }),
    finalAmount: moneyField({ label: 'Final / Selling Price', required: true, min: 0 }),
    amountPaid: moneyField({ label: 'Amount Paid', required: true, min: 0 }),
    paymentMethod: enumField(ENROLL_PAYMENT_METHODS, { label: 'Payment Method' }),
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
    // End date not before start date. endDate = startDate + duration months.
    if (v.startDate && v.duration) {
      const start = new Date(v.startDate);
      const end = new Date(start);
      end.setMonth(end.getMonth() + Number(v.duration));
      if (end < start) {
        ctx.addIssue({
          code: 'custom',
          path: ['duration'],
          message: 'The PT end date cannot be before the start date.',
        });
      }
    }

    // Date of birth: reject a future dob and an age outside 10-100, matching
    // the create form's rules.
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

    // Amount Paid cannot exceed Final Selling Price — the rule that protects
    // the ledger. (Amount Paid cannot be lowered below what is already
    // recorded is enforced server-side against the stored value.)
    if (v.amountPaid !== null && v.finalAmount !== null && v.amountPaid > v.finalAmount) {
      ctx.addIssue({
        code: 'custom',
        path: ['amountPaid'],
        message: 'Amount Paid cannot exceed Final Selling Price.',
      });
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

export type ClientEnrollValues = z.infer<typeof clientEnrollSchema>;

export function blankClientEnroll(): ClientEnrollValues {
  return {
    startDate: '',
    duration: null,
    trainerId: '',
    trainerName: '',
    trainingMode: null,
    workoutExperienceLevel: null,
    previousTrainerExperience: false,
    workoutTime: null,
    trainingDays: [],
    sessionsPerWeek: null,
    finalAmount: null,
    amountPaid: null,
    paymentMethod: null,
    mobile: '',
    email: '',
    gender: null,
    dob: null,
    address: '',
    emergency_contact: '',
    emergency_phone: '',
    emergency_contact_relationship: '',
    client_source: null,
  };
}
