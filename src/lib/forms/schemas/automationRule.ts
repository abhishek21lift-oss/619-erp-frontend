/**
 * An automation rule — the thing that actually sends a WhatsApp message to a
 * real person without anybody pressing a button.
 *
 * ── The vocabulary, read from the engine rather than invented ───────────────
 *
 * `automation.engine.js` renders a rule's template with
 *
 *     String(template).replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (whole, key) =>
 *       context[key] ?? whole)
 *
 * and its own comment explains the `?? whole`: an unknown placeholder is left
 * STANDING rather than replaced, because "Hi {{name}}" is a visible bug a
 * studio will report where "Hi undefined" reads like the product is broken and
 * "Hi " reads like nothing is wrong at all.
 *
 * That is a good decision and it puts the whole burden here: nothing
 * downstream will catch a typo, so a rule saved with `{{clinet_name}}` sends
 * `{{clinet_name}}` to every member it fires for, forever, until somebody
 * notices.
 *
 * The context is built per trigger in `automation.triggers.js`, and the map
 * below is a transcription of it. `name` is outside the map because the engine
 * adds it to every event:
 *
 *     const vars = { ...context, name: context.name || recipient.name };
 *
 * A flat list would be wrong in both directions — `{{amount}}` is real on a
 * payment and not on a birthday — which is why the editor asks for the
 * variables of the trigger that is actually selected.
 */

import { z } from 'zod';
import { textField, integerField, enumField } from '../primitives';
import { templateBodyField, inspectTemplate, type TemplateProblem } from '../domain';

/** Added to every event's context by the engine, from the recipient row. */
export const ALWAYS_AVAILABLE = ['name'] as const;

/**
 * Per-trigger context keys, mirroring `automation.triggers.js`.
 *
 * An event with an empty list is not a mistake: `member_created`,
 * `trial_scheduled` and `birthday` emit `context: {}`, so `{{name}}` is the
 * only placeholder that will ever resolve for them.
 */
export const TRIGGER_CONTEXT: Record<string, readonly string[]> = {
  member_created: [],
  lead_created: ['source', 'package'],
  payment_received: ['amount', 'amount_value'],
  session_low: ['remaining'],
  trial_scheduled: [],
  membership_expiring: ['days', 'expiry_date'],
  membership_expired: ['expiry_date'],
  birthday: [],
  anniversary: ['years'],
  attendance_missed: ['days', 'last_visit'],
  followup_due: ['follow_up_date', 'package'],
};

export const TRIGGER_EVENT_VALUES = Object.keys(TRIGGER_CONTEXT) as [string, ...string[]];

/** Every placeholder that will resolve for `event`, in the order to show them. */
export function variablesFor(event: string): readonly string[] {
  return [...ALWAYS_AVAILABLE, ...(TRIGGER_CONTEXT[event] ?? [])];
}

/** The problems in a template, checked against the selected trigger's variables. */
export function inspectRuleTemplate(template: string, event: string): TemplateProblem[] {
  return inspectTemplate(template, variablesFor(event));
}

/**
 * How far ahead a rule may be scheduled.
 *
 * Seven days. The backend takes `parseInt(delay_minutes) || 0`, which is
 * unbounded — a typo of 100080 rather than 1008 enqueues a job that fires ten
 * weeks late, long after the membership it was about has lapsed. Beyond a week
 * the message is no longer about the event that triggered it.
 */
export const MAX_DELAY_MINUTES = 7 * 24 * 60;

export const automationRuleSchema = z
  .object({
    name: textField({ label: 'Rule name', required: true, maxLength: 120 }),
    triggerEvent: enumField(TRIGGER_EVENT_VALUES, { label: 'Trigger event', required: true }),
    // Zero is meaningful and different from absent: it means send immediately.
    delayMinutes: integerField({
      label: 'Delay', required: true, min: 0, max: MAX_DELAY_MINUTES, unit: 'minutes',
    }),
    // No `variables` here ON PURPOSE. The vocabulary depends on the trigger,
    // which is a sibling field and is not parsed yet, so the placeholder check
    // belongs in the refinement below. The field still enforces "present" and
    // the WhatsApp ceiling.
    template: templateBodyField({ label: 'Message', required: true }),
  })
  .superRefine((v, ctx) => {
    if (typeof v.template !== 'string' || typeof v.triggerEvent !== 'string') return;
    for (const problem of inspectRuleTemplate(v.template, v.triggerEvent)) {
      ctx.addIssue({ code: 'custom', path: ['template'], message: problem.message });
    }
  });

export type AutomationRuleValues = z.output<typeof automationRuleSchema>;

/** The form's raw state — one string per control. See the note in campaign.ts. */
export type AutomationRuleState = {
  name: string;
  triggerEvent: string;
  delayMinutes: string;
  template: string;
};

export function blankAutomationRule(): AutomationRuleState {
  return { name: '', triggerEvent: 'member_created', delayMinutes: '0', template: '' };
}

/**
 * The create/update payload.
 *
 * `channel` is 'whatsapp' and not a form value: the engine serves this channel
 * and no other, so saving a rule as anything else stores one that will not
 * fire. Re-saving a legacy sms rule through this form repairs it rather than
 * preserving the reason it never worked.
 */
export function toAutomationRulePayload(v: AutomationRuleValues) {
  return {
    name: v.name as string,
    trigger_event: v.triggerEvent as string,
    channel: 'whatsapp' as const,
    template: v.template as string,
    delay_minutes: v.delayMinutes as number,
  };
}
