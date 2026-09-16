/**
 * The form platform's foundation, tested at its boundaries.
 *
 * Weighted towards the cases that produced real defects rather than towards
 * coverage: the empty-string coercion, the unbounded percentage, the value that
 * survives a hidden field, the date that does not exist. Each test below either
 * pins a bug that was found in the audit or a rule the product depends on.
 */

import { describe, it, expect } from 'vitest';
import {
  toNumberOrNull,
  toTextOrNull,
  toEmailOrNull,
  toPhoneOrNull,
  toMoneyOrNull,
  toDateOrNull,
  toIntegerOrNull,
  toCodeOrNull,
} from '../lib/forms/normalize';
import {
  moneyField,
  percentField,
  integerField,
  decimalField,
  textField,
  emailField,
  phoneField,
  codeField,
  dateField,
  enumField,
  booleanField,
} from '../lib/forms/primitives';
import {
  weightKgField,
  ageField,
  gstRateField,
  commissionPctField,
  trainingFrequencyField,
  caloriesField,
  inspectTemplate,
  templateBodyField,
  refineDateOrder,
  GST_SLABS,
} from '../lib/forms/domain';
import { mapApiError, errorMessage, noErrors, hasErrors } from '../lib/forms/errors';
import { ApiError } from '../lib/http';

/** Convenience: the first message from a failed parse. */
function firstError(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.success ? undefined : result.error!.issues[0]!.message;
}

describe('normalize — absence is not zero', () => {
  // The single most important property in the platform. `Number('') === 0` is
  // what let a cleared price submit as ₹0.
  it.each([['', 'empty'], ['   ', 'whitespace'], [null, 'null'], [undefined, 'undefined']])(
    'treats %s (%s) as absent, not zero',
    (raw) => {
      expect(toNumberOrNull(raw)).toBe(null);
      expect(toMoneyOrNull(raw)).toBe(null);
      expect(toIntegerOrNull(raw)).toBe(null);
    },
  );

  it('keeps a real zero as zero', () => {
    expect(toNumberOrNull('0')).toBe(0);
    expect(toMoneyOrNull('0')).toBe(0);
    expect(toNumberOrNull(0)).toBe(0);
  });

  it('rejects what Number() would coerce through a non-numeric route', () => {
    // Each of these is a value Number() happily converts, and none is a number
    // a user typed into a money field on purpose.
    expect(Number.isNaN(toNumberOrNull('0x10') as number)).toBe(true);
    expect(Number.isNaN(toNumberOrNull('1e999') as number)).toBe(true);
    expect(Number.isNaN(toNumberOrNull('abc') as number)).toBe(true);
    expect(Number.isNaN(toNumberOrNull([]) as number)).toBe(true);
    expect(Number.isNaN(toNumberOrNull({}) as number)).toBe(true);
    expect(Number.isNaN(toNumberOrNull(Infinity) as number)).toBe(true);
    expect(Number.isNaN(toNumberOrNull(NaN) as number)).toBe(true);
  });

  it('accepts what people actually paste into a money field', () => {
    expect(toMoneyOrNull('₹1,200')).toBe(1200);
    expect(toMoneyOrNull(' 1 200.50 ')).toBe(1200.5);
    expect(toMoneyOrNull('1,00,000')).toBe(100000); // Indian grouping
  });

  it('rounds money at the paise without binary float error', () => {
    // (1.005).toFixed(2) is '1.00'. The scaled-integer route gets this right,
    // and money read back a rupee short is the bug that makes people distrust
    // the whole ledger.
    expect(toMoneyOrNull('1.005')).toBe(1.01);
    expect(toMoneyOrNull('0.615')).toBe(0.62);
    expect(toMoneyOrNull('2.675')).toBe(2.68);
  });
});

describe('normalize — text, email, phone, code', () => {
  it('trims the ends but never the interior', () => {
    // "Iron  Temple" typed with two spaces is the user's content, not a typo
    // we get to fix.
    expect(toTextOrNull('  Iron  Temple  ')).toBe('Iron  Temple');
    expect(toTextOrNull('   ')).toBe(null);
  });

  it('lowercases email so one person is not two accounts', () => {
    expect(toEmailOrNull('  Abhishek@Example.COM ')).toBe('abhishek@example.com');
  });

  it('reduces Indian mobile numbers to their ten significant digits', () => {
    expect(toPhoneOrNull('+91 98765 43210')).toBe('9876543210');
    expect(toPhoneOrNull('098765-43210')).toBe('9876543210');
    expect(toPhoneOrNull('91 9876543210')).toBe('9876543210');
    expect(toPhoneOrNull('9876543210')).toBe('9876543210');
  });

  it('does not rewrite a number that is not a plausible mobile', () => {
    // Stripping unconditionally would turn a mistyped 9-digit number into a
    // different valid-looking one. Better to hand it on and let the schema say
    // it is wrong than to silently invent a number.
    expect(toPhoneOrNull('12345')).toBe('12345');
  });

  it('compacts and uppercases codes, because they are matched exactly', () => {
    expect(toCodeOrNull(' summer 30 ')).toBe('SUMMER30');
  });

  it('reads a Date in local calendar parts, not UTC', () => {
    // toISOString() would report 28 Feb for a 1 March date in IST. Every user
    // of this product is east of Greenwich, so the UTC route is wrong for all
    // of them.
    expect(toDateOrNull(new Date(2026, 2, 1))).toBe('2026-03-01');
    expect(toDateOrNull('2026-03-01T18:30:00.000Z')).toBe('2026-03-01');
    expect(toDateOrNull('')).toBe(null);
  });
});

describe('primitives — absent, unparseable and out-of-range are three answers', () => {
  it('reports required separately from unparseable', () => {
    // Collapsing these produces "Required" on a field the user did fill in,
    // which is the most confusing message a form can show.
    expect(firstError(moneyField({ label: 'Amount', required: true }).safeParse('')))
      .toBe('Amount is required.');
    expect(firstError(moneyField({ label: 'Amount' }).safeParse('abc')))
      .toBe('Amount must be a number.');
  });

  it('lets an optional field be genuinely absent', () => {
    expect(moneyField({ label: 'Amount' }).safeParse('').data).toBe(null);
  });

  it('bounds a percentage at 100', () => {
    // The offers form shipped with min={1} and no max, so 500% was submittable.
    expect(percentField({ label: 'Discount' }).safeParse('100').data).toBe(100);
    expect(firstError(percentField({ label: 'Discount' }).safeParse('101')))
      .toBe('Discount cannot be more than 100 %.');
    expect(firstError(percentField({ label: 'Discount' }).safeParse('500')))
      .toBe('Discount cannot be more than 100 %.');
  });

  it('refuses negative money by default and says so plainly', () => {
    expect(firstError(moneyField({ label: 'Price' }).safeParse('-1')))
      .toBe('Price cannot be negative.');
  });

  it('allows negative only where a call site asks for it', () => {
    expect(moneyField({ label: 'Adjustment', min: -10000 }).safeParse('-250').data).toBe(-250);
  });

  it('names the fraction when an integer field gets one', () => {
    // "must be a number" would send the user hunting for a typo that is not
    // there. Rounding 2.5 sessions to 3 would invent a session nobody bought.
    expect(firstError(integerField({ label: 'Sessions' }).safeParse('2.5')))
      .toBe('Sessions must be a whole number.');
  });

  it('reports the overshoot on a too-long text field', () => {
    const r = textField({ label: 'Notes', maxLength: 10 }).safeParse('12345678901');
    expect(firstError(r)).toBe('Notes cannot be more than 10 characters (currently 11).');
  });

  it('accepts real email addresses and rejects shapes that cannot be delivered', () => {
    expect(emailField({ label: 'Email' }).safeParse('a.b+tag@sub.example.co.in').data)
      .toBe('a.b+tag@sub.example.co.in');
    expect(emailField({ label: 'Email' }).safeParse('no-at-sign').success).toBe(false);
    expect(emailField({ label: 'Email' }).safeParse('two@@example.com').success).toBe(false);
    expect(emailField({ label: 'Email' }).safeParse('trailing@dot.').success).toBe(false);
  });

  it('accepts the whole allocated Indian mobile range and nothing outside it', () => {
    for (const lead of ['6', '7', '8', '9']) {
      expect(phoneField({ label: 'Mobile' }).safeParse(`${lead}876543210`).success).toBe(true);
    }
    // 5-series is not allocated to mobile; a landline can never receive the
    // OTP or the WhatsApp message this field exists to enable.
    expect(phoneField({ label: 'Mobile' }).safeParse('5876543210').success).toBe(false);
    expect(phoneField({ label: 'Mobile' }).safeParse('98765').success).toBe(false);
  });

  it('rejects a date that does not exist rather than rolling it forward', () => {
    // new Date('2026-02-31') silently becomes 3 March, so a date the user never
    // chose would be stored as if they had.
    expect(dateField({ label: 'Start' }).safeParse('2026-02-31').success).toBe(false);
    expect(firstError(dateField({ label: 'Start' }).safeParse('2026-02-31')))
      .toBe('Start is not a real date.');
    expect(dateField({ label: 'Start' }).safeParse('2024-02-29').data).toBe('2024-02-29'); // leap
    expect(dateField({ label: 'Start' }).safeParse('2026-02-29').success).toBe(false); // not leap
  });

  it('narrows an enum instead of asserting it', () => {
    const type = enumField(['percent', 'flat', 'free'] as const, { label: 'Type' });
    expect(type.safeParse('flat').data).toBe('flat');
    // The `as any` casts on select handlers asserted this and never checked it.
    expect(type.safeParse('gift').success).toBe(false);
    expect(firstError(type.safeParse('gift'))).toBe('Type is not a valid choice.');
  });

  it('reads a checkbox as false when absent, never as invalid', () => {
    expect(booleanField().safeParse(undefined).data).toBe(false);
    expect(booleanField().safeParse('on').data).toBe(true);
    expect(booleanField().safeParse(true).data).toBe(true);
  });

  it('constrains a code to what can be matched exactly', () => {
    expect(codeField({ label: 'Code' }).safeParse(' summer 30 ').data).toBe('SUMMER30');
    expect(codeField({ label: 'Code' }).safeParse('ab').success).toBe(false); // too short
    expect(codeField({ label: 'Code' }).safeParse('SUM!MER').success).toBe(false);
  });
});

describe('domain — plausibility bounds', () => {
  it('admits every real member and catches the trailing-zero slip', () => {
    expect(weightKgField().safeParse('70').data).toBe(70);
    expect(weightKgField().safeParse('22.5').data).toBe(22.5);
    expect(weightKgField().safeParse('700').success).toBe(false); // 70 with a stray 0
    expect(weightKgField().safeParse('5').success).toBe(false);
  });

  it('bounds age without excluding anyone who trains', () => {
    expect(ageField().safeParse('72').data).toBe(72);
    expect(ageField().safeParse('8').data).toBe(8);
    expect(ageField().safeParse('0').success).toBe(false);
    expect(ageField().safeParse('130').success).toBe(false);
  });

  it('restricts GST to the statutory slabs, not to 0–100', () => {
    // A 14% invoice is not a slightly wrong tax, it is an invalid tax document.
    for (const slab of GST_SLABS) {
      expect(gstRateField().safeParse(String(slab)).success).toBe(true);
    }
    expect(gstRateField().safeParse('14').success).toBe(false);
    expect(firstError(gstRateField().safeParse('14'))).toContain('must be one of');
  });

  it('bounds commission, training frequency and calories', () => {
    expect(commissionPctField().safeParse('101').success).toBe(false);
    expect(commissionPctField().safeParse('12.5').data).toBe(12.5);
    expect(trainingFrequencyField().safeParse('14').success).toBe(true); // two-a-days
    expect(trainingFrequencyField().safeParse('70').success).toBe(false);
    expect(caloriesField().safeParse('300').success).toBe(false);
    expect(caloriesField().safeParse('2200').data).toBe(2200);
  });

  it('reports an end-before-start on the end field, not the start field', () => {
    // The end date is the one the user chose second and will change. An error
    // on the start date sends them to edit a value that is probably right.
    const refine = refineDateOrder<{ validFrom: string; validUntil: string }>(
      'validFrom',
      'validUntil',
      { startLabel: 'Valid from', endLabel: 'Valid until' },
    );
    const issues: { path?: PropertyKey[]; message: string }[] = [];
    const ctx = {
      addIssue: (i: { path?: PropertyKey[]; message: string }) => issues.push(i),
    } as unknown as Parameters<typeof refine>[1];

    refine({ validFrom: '2026-03-10', validUntil: '2026-03-01' }, ctx);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.path).toEqual(['validUntil']);
    expect(issues[0]!.message).toBe('Valid until cannot be before valid from.');

    issues.length = 0;
    refine({ validFrom: '2026-03-01', validUntil: '2026-03-01' }, ctx);
    expect(issues).toHaveLength(0); // a one-day offer is real
  });
});

describe('domain — WhatsApp templates (§8)', () => {
  // The vocabulary is a PARAMETER, not a constant. There used to be a
  // TEMPLATE_VARIABLES list here listing client_name, studio_name, due_amount
  // and six others — a plausible set that nothing in this product substitutes.
  // Only these tests ever imported it, which is the only reason it never did
  // damage: wired into the automation editor as it stood it would have
  // rejected {{name}}, the one placeholder every trigger provides, and waved
  // through {{client_name}}, which reaches a member's WhatsApp as literal
  // braces. The real per-trigger map lives in schemas/automationRule.ts.
  const VARS = ['name', 'amount', 'expiry_date'] as const;

  it('accepts the variables it is given', () => {
    for (const v of VARS) {
      expect(inspectTemplate(`Hello {{${v}}}`, VARS)).toEqual([]);
    }
  });

  it('names an unknown variable and lists the ones available here', () => {
    const [problem] = inspectTemplate('Hi {{cleint_name}}', VARS);
    expect(problem!.kind).toBe('unknown');
    expect(problem!.message).toContain('cleint_name');
    expect(problem!.message).toContain('name');
  });

  it('says so plainly when the trigger provides nothing', () => {
    const [problem] = inspectTemplate('Hi {{amount}}', []);
    expect(problem!.message).toContain('no variables');
  });

  it('rejects a variable that is real on another trigger but not this one', () => {
    // {{amount}} resolves on a payment and is sent as literal braces on a
    // birthday. A flat list could not tell those apart.
    expect(inspectTemplate('Hi {{amount}}', ['name'])).toHaveLength(1);
    expect(inspectTemplate('Hi {{amount}}', ['name', 'amount'])).toEqual([]);
  });

  it('catches an unclosed placeholder', () => {
    const problems = inspectTemplate('Hi {{name, your plan expires', VARS);
    expect(problems.some((p) => p.kind === 'unclosed')).toBe(true);
  });

  it('catches a single-brace near-miss and shows the fix', () => {
    // "{name}" sent verbatim to a member is the §8 failure.
    const problems = inspectTemplate('Hi {name}', VARS);
    expect(problems.some((p) => p.kind === 'malformed')).toBe(true);
    expect(problems[0]!.message).toContain('{{name}}');
  });

  it('catches an empty placeholder and a stray closer', () => {
    expect(inspectTemplate('Hi {{}}', VARS)[0]!.kind).toBe('empty');
    expect(inspectTemplate('Hi }} there', VARS).some((p) => p.kind === 'malformed')).toBe(true);
  });

  it('does not mistake a valid placeholder for a stray brace', () => {
    expect(inspectTemplate('{{name}} — {{amount}}', VARS)).toEqual([]);
  });

  it('reports every problem at once, not one per save', () => {
    const problems = inspectTemplate('{{bad_one}} and {{bad_two}} and {{name}}', VARS);
    expect(problems).toHaveLength(2);
  });

  it('rejects an empty template and one past the WhatsApp ceiling', () => {
    const field = templateBodyField({ variables: VARS });
    expect(field.safeParse('   ').success).toBe(false);
    expect(field.safeParse('x'.repeat(4097)).success).toBe(false);
    expect(field.safeParse('x'.repeat(4096)).success).toBe(true);
  });

  it('rejects a body whose placeholders are not in the given vocabulary', () => {
    expect(templateBodyField({ variables: VARS }).safeParse('Hi {{nope}}').success).toBe(false);
  });
});

describe('errors — every failure produces a message (§12)', () => {
  it('never returns an empty error for a failure', () => {
    // A form that fails silently is indistinguishable from one that succeeded.
    const cases: unknown[] = [
      new ApiError('HTTP 400', 400),
      new ApiError('boom', 500),
      new ApiError('nope', 403),
      new TypeError('Failed to fetch'),
      new Error('something'),
      'a bare string',
      null,
      undefined,
      { weird: true },
    ];
    for (const c of cases) {
      expect(hasErrors(mapApiError(c))).toBe(true);
    }
  });

  it('maps each status to an actionable sentence and the right retryability', () => {
    expect(mapApiError(new ApiError('x', 401)).kind).toBe('auth');
    expect(mapApiError(new ApiError('x', 401)).retryable).toBe(false);
    expect(mapApiError(new ApiError('x', 403)).kind).toBe('permission');
    expect(mapApiError(new ApiError('x', 404)).kind).toBe('notFound');
    expect(mapApiError(new ApiError('x', 409)).kind).toBe('conflict');
    expect(mapApiError(new ApiError('x', 429)).kind).toBe('rateLimit');
    expect(mapApiError(new ApiError('x', 429)).retryable).toBe(true);
    expect(mapApiError(new ApiError('x', 504)).kind).toBe('timeout');
    expect(mapApiError(new TypeError('Failed to fetch')).kind).toBe('network');
    expect(mapApiError(new TypeError('Failed to fetch')).retryable).toBe(true);
  });

  it('never shows a 5xx body to a user', () => {
    // A 5xx can carry a stack or a SQL error. §14 forbids putting either in
    // front of a studio owner.
    const e = mapApiError(
      new ApiError('ERROR: null value in column "org_id" violates not-null', 500),
    );
    expect(e.formError).toBe('The server had a problem saving this. Try again in a moment.');
    expect(e.formError).not.toContain('org_id');
  });

  it('uses a field name the server supplied', () => {
    const e = mapApiError(
      new ApiError('must be greater than 0', 400, 'VALIDATION', {
        error: { code: 'VALIDATION', message: 'must be greater than 0', field: 'discount_value' },
      }),
    );
    expect(e.fieldErrors).toEqual({ discount_value: 'must be greater than 0' });
    expect(e.formError).toBe(null);
  });

  it('uses a reviewed hint when the server supplies no field', () => {
    const e = mapApiError(new ApiError('discount_value must be greater than 0', 400), {
      fieldHints: { 'discount_value must be greater than 0': 'value' },
    });
    expect(e.fieldErrors).toEqual({ value: 'discount_value must be greater than 0' });
  });

  it('falls back to a form-level error rather than guessing a field', () => {
    // A wrong attribution puts a red message under a field that is fine, and
    // the user "fixes" a correct value. None is better than wrong.
    const e = mapApiError(new ApiError('Something about a value somewhere', 400));
    expect(e.fieldErrors).toEqual({});
    expect(e.formError).toBe('Something about a value somewhere');
    expect(e.kind).toBe('validation');
  });

  it('suppresses the placeholder HTTP message', () => {
    // "HTTP 400" is not a sentence anyone can act on.
    const e = mapApiError(new ApiError('HTTP 400', 400));
    expect(e.formError).toBe('Some of the details are not valid.');
  });

  it('noErrors is genuinely empty', () => {
    expect(hasErrors(noErrors())).toBe(false);
  });
});

describe('errorMessage — what 205 call sites now get instead of err.message', () => {
  // The whole tree used to write `err instanceof Error ? err.message : FALLBACK`.
  // These are the cases where that string was the wrong thing to show someone,
  // and they are why the conversion was worth doing across 89 files.

  it('turns a failed fetch into a sentence about the connection', () => {
    // fetch() rejects with a TypeError when the request never reached a
    // server. Its `.message` is "Failed to fetch" in Chrome and "NetworkError
    // when attempting to fetch resource." in Firefox — browser diagnostics,
    // rendered to a studio owner as if the app had said them.
    expect(errorMessage(new TypeError('Failed to fetch'), 'Could not save'))
      .toBe('Could not reach the server. Check your connection and try again.');
  });

  it('turns an aborted request into a sentence about cancellation', () => {
    const abort = new DOMException('The user aborted a request.', 'AbortError');
    expect(errorMessage(abort, 'Could not save')).toBe('The request was cancelled.');
  });

  it('turns a 401 into something actionable rather than "Unauthorized"', () => {
    expect(errorMessage(new ApiError('Unauthorized', 401), 'Could not save'))
      .toBe('Your session has expired. Sign in again to continue.');
  });

  it('turns a 429 into a wait rather than a status phrase', () => {
    expect(errorMessage(new ApiError('Too Many Requests', 429), 'Could not save'))
      .toBe('Too many attempts. Wait a moment and try again.');
  });

  it('refuses to show a 5xx body, whatever it contains', () => {
    // In production the backend already scrubs this to "An internal error
    // occurred". Outside production it sends `err.message`, which is the SQL
    // error — and a staging deployment is not a reason to put one on screen.
    const leak = new ApiError('duplicate key value violates unique constraint "users_email_key"', 500);
    expect(errorMessage(leak, 'Could not save'))
      .toBe('The server had a problem saving this. Try again in a moment.');
  });

  it('KEEPS the server\'s own sentence where it is the useful one', () => {
    // 400, 403, 404 and 409 say something specific and true. Replacing those
    // with a generic message would be the opposite mistake.
    for (const status of [400, 403, 404, 409]) {
      expect(errorMessage(new ApiError('That code is already in use.', status), 'Could not save'))
        .toBe('That code is already in use.');
    }
  });

  it('falls back to the caller\'s message for a non-Error rejection', () => {
    expect(errorMessage(undefined, 'Could not save')).toBe('Could not save');
    expect(errorMessage(null, 'Could not save')).toBe('Could not save');
  });

  it('never returns an empty string', () => {
    // A failed submit that renders nothing is indistinguishable from one that
    // worked, which is the defect this codebase has already shipped twice.
    const cases: unknown[] = [
      new ApiError('', 400), new ApiError('HTTP 500', 500), new Error(''),
      '', 0, [], {}, undefined,
    ];
    for (const c of cases) {
      expect(errorMessage(c, 'Could not save').length).toBeGreaterThan(0);
    }
  });

  it('prefers a field message over the fallback when the mapper attributed one', () => {
    // `mapApiError(...).formError ?? FALLBACK` — the hand-written form — is
    // null exactly when the mapper managed to attribute the failure, so it
    // threw away the most specific sentence available.
    const attributed = new ApiError('bad', 400, undefined, {
      error: { message: 'Discount must be above zero', field: 'value' },
    });
    expect(errorMessage(attributed, 'Could not save')).toBe('Discount must be above zero');
  });
});

describe('decimal field passes through unbounded when no bounds given', () => {
  it('accepts any finite number', () => {
    expect(decimalField({ label: 'X' }).safeParse('-999999.25').data).toBe(-999999.25);
  });
});
