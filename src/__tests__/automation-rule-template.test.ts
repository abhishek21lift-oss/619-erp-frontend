/**
 * An automation rule is the thing that sends a WhatsApp message to a real
 * person without anybody pressing a button.
 *
 * `automation.engine.js` renders its template with
 *
 *     String(template).replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi,
 *       (whole, key) => context[key] ?? whole)
 *
 * and the `?? whole` is a deliberate, good decision — "Hi {{name}}" is a
 * visible bug a studio will report, where "Hi undefined" reads like the
 * product is broken and "Hi " reads like nothing is wrong at all.
 *
 * It also means nothing downstream catches a typo. A rule saved with
 * `{{clinet_name}}` sends `{{clinet_name}}` to every member it fires for,
 * forever, until somebody notices. The editor had no validation at all.
 *
 * The map below is a transcription of `automation.triggers.js`. A drift in it
 * is a placeholder that ships to a member as literal braces.
 */

import { describe, it, expect } from 'vitest';
import {
  automationRuleSchema, blankAutomationRule, toAutomationRulePayload,
  variablesFor, inspectRuleTemplate,
  TRIGGER_CONTEXT, ALWAYS_AVAILABLE, MAX_DELAY_MINUTES,
} from '@/lib/forms/schemas/automationRule';

const draft = blankAutomationRule();
const valid = { ...draft, name: 'Welcome', template: 'Hi {{name}}, welcome!' };

describe('the variable vocabulary', () => {
  it('gives every trigger {{name}}, which the engine always adds', () => {
    // `const vars = { ...context, name: context.name || recipient.name }`
    for (const event of Object.keys(TRIGGER_CONTEXT)) {
      expect(variablesFor(event)).toContain('name');
    }
    expect(ALWAYS_AVAILABLE).toEqual(['name']);
  });

  it('mirrors each trigger context from automation.triggers.js', () => {
    expect(TRIGGER_CONTEXT).toEqual({
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
    });
  });

  it('is per event, not one flat list', () => {
    // {{amount}} resolves on a payment and is sent as literal braces on a
    // birthday. The list that used to live in domain.ts could not say that —
    // and listed eight variables no trigger has ever provided.
    expect(variablesFor('payment_received')).toContain('amount');
    expect(variablesFor('birthday')).not.toContain('amount');
  });

  it('gives an unknown event just the always-available one', () => {
    expect(variablesFor('not_a_real_event')).toEqual(['name']);
  });
});

describe('inspecting a template against its trigger', () => {
  it('passes a template using only what the trigger provides', () => {
    expect(inspectRuleTemplate('Hi {{name}}, we received {{amount}}.', 'payment_received'))
      .toEqual([]);
  });

  it('catches a variable that is real on another trigger', () => {
    const problems = inspectRuleTemplate('Happy birthday {{name}}! Here is {{amount}}.', 'birthday');
    expect(problems).toHaveLength(1);
    expect(problems[0]!.kind).toBe('unknown');
  });

  it('catches the typo that would reach a member verbatim', () => {
    const problems = inspectRuleTemplate('Hi {{clinet_name}}', 'member_created');
    expect(problems[0]!.message).toContain('clinet_name');
  });

  it('catches a single brace, the most common near-miss', () => {
    const problems = inspectRuleTemplate('Hi {name}', 'member_created');
    expect(problems.some((p) => p.message.includes('{{name}}'))).toBe(true);
  });

  it('says plainly when a trigger provides nothing beyond the name', () => {
    const problems = inspectRuleTemplate('Hi {{plan_name}}', 'birthday');
    expect(problems[0]!.message).toContain('name');
  });
});

describe('saving a rule', () => {
  it('accepts a sound rule', () => {
    expect(automationRuleSchema.safeParse(valid).success).toBe(true);
  });

  it('refuses a template whose placeholder will not resolve', () => {
    const r = automationRuleSchema.safeParse({
      ...valid, triggerEvent: 'birthday', template: 'Hi {{name}}, you owe {{amount}}.',
    });
    expect(r.success).toBe(false);
    expect(r.success === false && r.error.issues.some((i) => i.path[0] === 'template')).toBe(true);
  });

  it('refuses a name that is only whitespace', () => {
    expect(automationRuleSchema.safeParse({ ...valid, name: '   ' }).success).toBe(false);
  });

  it('refuses an empty template', () => {
    expect(automationRuleSchema.safeParse({ ...valid, template: '  ' }).success).toBe(false);
  });

  it('refuses a trigger the engine does not emit', () => {
    // `trial_completed` is a value the column allows and nothing writes, so a
    // rule bound to it could never fire.
    expect(automationRuleSchema.safeParse({ ...valid, triggerEvent: 'trial_completed' }).success)
      .toBe(false);
  });

  it('keeps a delay of zero, which means send immediately', () => {
    const r = automationRuleSchema.safeParse({ ...valid, delayMinutes: '0' });
    expect(r.success && r.data.delayMinutes).toBe(0);
  });

  it('refuses a blank delay rather than turning it into zero', () => {
    // The backend takes `parseInt(delay_minutes) || 0`, so a blank box became
    // "send immediately" — a different rule from the one being written.
    expect(automationRuleSchema.safeParse({ ...valid, delayMinutes: '' }).success).toBe(false);
  });

  it('refuses a delay past a week', () => {
    // `parseInt` is unbounded on the server: a typo of 100080 rather than 1008
    // enqueues a job that fires ten weeks late, long after the membership it
    // was about has lapsed.
    expect(automationRuleSchema.safeParse({ ...valid, delayMinutes: '100080' }).success).toBe(false);
    expect(automationRuleSchema.safeParse({ ...valid, delayMinutes: String(MAX_DELAY_MINUTES) }).success).toBe(true);
  });

  it('refuses a negative delay', () => {
    expect(automationRuleSchema.safeParse({ ...valid, delayMinutes: '-5' }).success).toBe(false);
  });

  it('refuses a fractional delay rather than rounding it', () => {
    expect(automationRuleSchema.safeParse({ ...valid, delayMinutes: '2.5' }).success).toBe(false);
  });

  it('always posts whatsapp, the only channel the engine serves', () => {
    const r = automationRuleSchema.safeParse(valid);
    expect(r.success && toAutomationRulePayload(r.data).channel).toBe('whatsapp');
  });

  it('posts the delay as a number, not a string', () => {
    const r = automationRuleSchema.safeParse({ ...valid, delayMinutes: '30' });
    expect(r.success && toAutomationRulePayload(r.data).delay_minutes).toBe(30);
  });
});
