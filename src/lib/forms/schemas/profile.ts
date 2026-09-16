/**
 * The coach's own profile — the professional-history half of /settings/profile.
 *
 * ── What was wrong ──────────────────────────────────────────────────────────
 *
 * This page holds twenty pieces of state behind ONE save. The server validates
 * all of them properly (`lib/profileFields.js`), and on the first problem it
 * returns a single sentence naming a positional index:
 *
 *     "Education 2 has an invalid year"
 *     "Gym 3 has an invalid end month"
 *     "tue has overlapping time ranges"
 *
 * That sentence was rendered in the sticky bar pinned to the bottom of a page
 * that scrolls for several screens. Nothing was highlighted, nothing scrolled,
 * and the user was left counting rows to work out which "Education 2" meant.
 * Worse, the whole save was refused — twenty correct fields went nowhere
 * because one year said `19`.
 *
 * So this schema mirrors the server field for field and reports each problem
 * on the row and the input that carries it, before anything is sent.
 *
 * ── Why the client is slightly STRICTER, in one direction only ──────────────
 *
 * The server DROPS a row whose name/institution/title is blank — a row someone
 * added and abandoned should not raise an error. But that also silently
 * discards a row where the year and the degree were filled in and only the
 * institution was missed: the coach's typing disappears on save with no
 * message. Here, a row with content but no name is flagged rather than
 * dropped. Every value this schema accepts, the server accepts; the extra
 * strictness only ever asks for a name before throwing work away.
 *
 * ── Parity, stated once ─────────────────────────────────────────────────────
 *
 * The limits, the month and time patterns, the year window, the per-day range
 * cap, the "ends before it starts" and overlap rules below are copies of
 * `619-erp-backend/src/lib/profileFields.js`. `profileParity` at the bottom
 * exports them so a test can assert they have not drifted.
 */

import { z } from 'zod';
import type {
  ProfileAchievement, ProfileEducation, ProfileGym, TimeRange, WorkingHours,
} from '@/lib/api';

/* ── The server's constants, mirrored ────────────────────────────────────── */

export const PROFILE_MAX = {
  certifications: 40,
  languages: 15,
  coachingModes: 5,
  previousGyms: 20,
  education: 15,
  achievements: 40,
  hoursPerDay: 4,
} as const;

export const PROFILE_LIMITS = {
  // From `lib/credentials.js`, which owns the certification columns.
  certificationName: 120,
  certificationIssuer: 120,
  credentialId: 80,
  language: 40,
  gymName: 120,
  role: 80,
  institution: 140,
  degree: 120,
  field: 120,
  title: 160,
  issuer: 120,
  detail: 600,
  designation: 120,
  philosophy: 2000,
  trainingStyle: 600,
  freeText: 2000,
} as const;

export const PROFILE_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type ProfileDay = (typeof PROFILE_DAYS)[number];

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const YEAR_MIN = 1900;

/** The latest year the server will take. A degree or a meet can be scheduled. */
export function maxProfileYear(now: Date = new Date()): number {
  return now.getUTCFullYear() + 1;
}

/**
 * A real calendar date, mirroring `cleanDate` on the server.
 *
 * The roll-over check is the point: `new Date('2026-02-31')` is a valid Date
 * object pointing at 3 March, so a pattern test alone would let a typo through
 * as a different day than the one that was typed.
 */
function isRealDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/* ── Issues ──────────────────────────────────────────────────────────────── */

/**
 * A problem, addressed to one control.
 *
 * `path` is the dotted address the UI uses to find the input — `education.2.year`,
 * `previousGyms.0.to`, `workingHours.tue.1.to`. Sections look their rows up in
 * the map rather than being handed a list to search, so adding a field is one
 * key, not a new prop.
 */
export type ProfileIssue = { path: string; message: string };
export type ProfileIssueMap = Readonly<Record<string, string>>;

/** The first message for each path — a control shows one error, not a stack. */
export function issueMap(issues: readonly ProfileIssue[]): ProfileIssueMap {
  const out: Record<string, string> = {};
  for (const { path, message } of issues) {
    if (!(path in out)) out[path] = message;
  }
  return out;
}

/**
 * A sentence for the save bar when the page cannot scroll the user to the
 * problem — it names how many and where, so the summary is never just
 * "check the form".
 */
export function issueSummary(issues: readonly ProfileIssue[]): string {
  if (issues.length === 0) return '';
  if (issues.length === 1) return issues[0].message;
  return `${issues[0].message} (and ${issues.length - 1} other ${issues.length === 2 ? 'problem' : 'problems'})`;
}

/* ── Row-level checks, each returning the issues it found ────────────────── */

/** Everything a row carries apart from the field that names it. */
function hasContent(...values: (string | number | null | undefined)[]): boolean {
  return values.some((v) => (typeof v === 'number' ? true : !!v && String(v).trim() !== ''));
}

/**
 * A text field against the column that will hold it.
 *
 * The server does not reject an over-long value — `cleanText` silently
 * `.slice()`s it. So a pasted institution name came back cut mid-word with
 * nothing said, which is worse than a refusal: the coach has no reason to look
 * at it again. Checked here so the overshoot is reported while the text is
 * still on screen and still theirs to edit.
 */
function lengthIssues(
  value: string,
  path: string,
  label: string,
  limit: number,
): ProfileIssue[] {
  if (value.length <= limit) return [];
  return [{
    path,
    message: `${label} is ${value.length - limit} character${value.length - limit === 1 ? '' : 's'} too long — the limit is ${limit}.`,
  }];
}

function yearIssues(
  year: number | null,
  path: string,
  label: string,
  now: Date,
): ProfileIssue[] {
  if (year === null) return [];
  const max = maxProfileYear(now);
  if (!Number.isInteger(year) || year < YEAR_MIN || year > max) {
    return [{ path, message: `${label} must be between ${YEAR_MIN} and ${max}.` }];
  }
  return [];
}

export function gymIssues(gyms: readonly ProfileGym[]): ProfileIssue[] {
  const out: ProfileIssue[] = [];
  if (gyms.length > PROFILE_MAX.previousGyms) {
    out.push({ path: 'previousGyms', message: `That is more than ${PROFILE_MAX.previousGyms} gyms.` });
  }
  gyms.forEach((g, i) => {
    const name = g.name.trim();
    if (!name) {
      // Flagged rather than dropped: the server would discard the role and the
      // months alongside it, and the coach would never be told.
      if (hasContent(g.role, g.from, g.to)) {
        out.push({ path: `previousGyms.${i}.name`, message: 'Name the gym, or remove this entry.' });
      }
      return;
    }
    out.push(...lengthIssues(name, `previousGyms.${i}.name`, 'The gym name', PROFILE_LIMITS.gymName));
    out.push(...lengthIssues(g.role.trim(), `previousGyms.${i}.role`, 'The role', PROFILE_LIMITS.role));
    if (g.from && !MONTH_RE.test(g.from)) {
      out.push({ path: `previousGyms.${i}.from`, message: 'Use a month like 2019-04.' });
    }
    if (g.to && !MONTH_RE.test(g.to)) {
      out.push({ path: `previousGyms.${i}.to`, message: 'Use a month like 2019-04.' });
    }
    if (g.from && g.to && MONTH_RE.test(g.from) && MONTH_RE.test(g.to) && g.to < g.from) {
      out.push({ path: `previousGyms.${i}.to`, message: 'This is before the start month.' });
    }
  });
  return out;
}

export function educationIssues(
  rows: readonly ProfileEducation[],
  now: Date = new Date(),
): ProfileIssue[] {
  const out: ProfileIssue[] = [];
  if (rows.length > PROFILE_MAX.education) {
    out.push({ path: 'education', message: `That is more than ${PROFILE_MAX.education} entries.` });
  }
  rows.forEach((e, i) => {
    if (!e.institution.trim()) {
      if (hasContent(e.degree, e.field, e.year)) {
        out.push({ path: `education.${i}.institution`, message: 'Name the institution, or remove this entry.' });
      }
      return;
    }
    out.push(...lengthIssues(e.institution.trim(), `education.${i}.institution`, 'The institution', PROFILE_LIMITS.institution));
    out.push(...lengthIssues(e.degree.trim(), `education.${i}.degree`, 'The qualification', PROFILE_LIMITS.degree));
    out.push(...lengthIssues(e.field.trim(), `education.${i}.field`, 'The field', PROFILE_LIMITS.field));
    out.push(...yearIssues(e.year, `education.${i}.year`, 'Year', now));
  });
  return out;
}

export function achievementIssues(
  rows: readonly ProfileAchievement[],
  now: Date = new Date(),
): ProfileIssue[] {
  const out: ProfileIssue[] = [];
  if (rows.length > PROFILE_MAX.achievements) {
    out.push({ path: 'achievements', message: `That is more than ${PROFILE_MAX.achievements} achievements.` });
  }
  rows.forEach((a, i) => {
    if (!a.title.trim()) {
      if (hasContent(a.issuer, a.year, a.detail)) {
        out.push({ path: `achievements.${i}.title`, message: 'Say what you achieved, or remove this entry.' });
      }
      return;
    }
    out.push(...lengthIssues(a.title.trim(), `achievements.${i}.title`, 'The title', PROFILE_LIMITS.title));
    out.push(...lengthIssues(a.issuer.trim(), `achievements.${i}.issuer`, 'The issuer', PROFILE_LIMITS.issuer));
    out.push(...lengthIssues(a.detail.trim(), `achievements.${i}.detail`, 'The detail', PROFILE_LIMITS.detail));
    out.push(...yearIssues(a.year, `achievements.${i}.year`, 'Year', now));
  });
  return out;
}

/**
 * Certifications.
 *
 * The one list on this page where a blank row is FATAL rather than dropped:
 * `validateCertificate` returns "Certification 1 needs a name" and refuses the
 * whole profile. So pressing Add and saving — which is what someone does when
 * they are interrupted — used to cost every other edit on the page.
 *
 * A name is asked for here instead, on the row that is missing one.
 */
export function certificationIssues(
  rows: readonly ProfileCertificationDraft[],
): ProfileIssue[] {
  const out: ProfileIssue[] = [];
  if (rows.length > PROFILE_MAX.certifications) {
    out.push({ path: 'certifications', message: `That is more than ${PROFILE_MAX.certifications} certifications.` });
  }
  rows.forEach((c, i) => {
    const name = c.name.trim();
    if (!name) {
      out.push({ path: `certifications.${i}.name`, message: 'Name the certification, or remove this entry.' });
      return;
    }
    out.push(...lengthIssues(name, `certifications.${i}.name`, 'The name', PROFILE_LIMITS.certificationName));
    out.push(...lengthIssues((c.issuer || '').trim(), `certifications.${i}.issuer`, 'The issuing body', PROFILE_LIMITS.certificationIssuer));
    out.push(...lengthIssues((c.credential_id || '').trim(), `certifications.${i}.credential_id`, 'The credential ID', PROFILE_LIMITS.credentialId));

    const issued = c.issued_on || '';
    const expires = c.expires_on || '';
    if (issued && !isRealDate(issued)) {
      out.push({ path: `certifications.${i}.issued_on`, message: 'That is not a real date.' });
    }
    if (expires && !isRealDate(expires)) {
      out.push({ path: `certifications.${i}.expires_on`, message: 'That is not a real date.' });
    }
    // Stored unchallenged this renders as permanently lapsed with no way to
    // see why, which is the state the expiry banner exists to report.
    if (issued && expires && isRealDate(issued) && isRealDate(expires) && expires < issued) {
      out.push({
        path: `certifications.${i}.expires_on`,
        message: 'This is before the issue date.',
      });
    }
  });
  return out;
}

/**
 * Working hours.
 *
 * The half-filled range is the case worth naming. Someone presses "Add hours",
 * types 06:00, is interrupted, and saves. The server sees one valid time and
 * one empty string, fails `HH:MM`, and refuses the entire profile from the
 * bottom of the page. Here the empty side is marked, on that input.
 */
export function workingHoursIssues(hours: WorkingHours): ProfileIssue[] {
  const out: ProfileIssue[] = [];
  for (const day of PROFILE_DAYS) {
    const ranges: TimeRange[] = hours[day] ?? [];
    if (ranges.length > PROFILE_MAX.hoursPerDay) {
      out.push({ path: `workingHours.${day}`, message: `More than ${PROFILE_MAX.hoursPerDay} time ranges on one day.` });
    }

    const filled: { from: string; to: string; index: number }[] = [];
    ranges.forEach((r, i) => {
      const from = (r.from || '').trim();
      const to = (r.to || '').trim();
      // Both empty is an abandoned row, not an error — matching the server.
      if (!from && !to) return;
      if (!TIME_RE.test(from)) {
        out.push({
          path: `workingHours.${day}.${i}.from`,
          message: from ? 'Use a time like 06:00.' : 'Set a start time, or remove this row.',
        });
        return;
      }
      if (!TIME_RE.test(to)) {
        out.push({
          path: `workingHours.${day}.${i}.to`,
          message: to ? 'Use a time like 21:00.' : 'Set an end time, or remove this row.',
        });
        return;
      }
      if (to <= from) {
        out.push({
          path: `workingHours.${day}.${i}.to`,
          // Equal is rejected too: a zero-length shift reads as an open slot
          // nobody can book.
          message: 'This is not after the start time.',
        });
        return;
      }
      filled.push({ from, to, index: i });
    });

    // Overlap is checked in time order but reported on the row the user can
    // see, so the message lands on an input rather than on a sorted position.
    const sorted = [...filled].sort((a, b) => a.from.localeCompare(b.from));
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i].from < sorted[i - 1].to) {
        out.push({
          path: `workingHours.${day}.${sorted[i].index}.from`,
          message: 'This overlaps another range on the same day.',
        });
      }
    }
  }
  return out;
}

/* ── Free text ───────────────────────────────────────────────────────────── */

/**
 * The text fields, in one schema.
 *
 * Length is the only rule: the server truncates silently at these limits, so a
 * pasted 200-character institution name came back cut mid-word with no
 * explanation. The inputs now carry `maxLength` so the browser stops the paste,
 * and this is the backstop for anything that gets past it.
 */
export const profileTextSchema = z.object({
  designation: z.string().max(PROFILE_LIMITS.designation, `Keep the designation under ${PROFILE_LIMITS.designation} characters.`),
  bio: z.string().max(PROFILE_LIMITS.freeText, `Keep the bio under ${PROFILE_LIMITS.freeText} characters.`),
  philosophy: z.string().max(PROFILE_LIMITS.philosophy, `Keep this under ${PROFILE_LIMITS.philosophy} characters.`),
  trainingStyle: z.string().max(PROFILE_LIMITS.trainingStyle, `Keep this under ${PROFILE_LIMITS.trainingStyle} characters.`),
});

export type ProfileTextValues = z.infer<typeof profileTextSchema>;

/* ── The whole professional section ──────────────────────────────────────── */

/**
 * A certification as the page edits it.
 *
 * `status` and `daysLeft` are the server's to compute and are deliberately
 * absent — a stale browser must not be able to assert that a certificate is
 * still valid.
 */
export interface ProfileCertificationDraft {
  id: string;
  name: string;
  issuer: string;
  issued_on: string | null;
  expires_on: string | null;
  credential_id: string;
}

export interface ProfileDraft extends ProfileTextValues {
  certifications: readonly ProfileCertificationDraft[];
  previousGyms: readonly ProfileGym[];
  education: readonly ProfileEducation[];
  achievements: readonly ProfileAchievement[];
  workingHours: WorkingHours;
  languages: readonly string[];
}

/**
 * Every problem in the draft, in the order the page renders them, so the first
 * one is the one to scroll to.
 */
export function profileIssues(draft: ProfileDraft, now: Date = new Date()): ProfileIssue[] {
  const out: ProfileIssue[] = [];

  const text = profileTextSchema.safeParse({
    designation: draft.designation,
    bio: draft.bio,
    philosophy: draft.philosophy,
    trainingStyle: draft.trainingStyle,
  });
  if (!text.success) {
    for (const issue of text.error.issues) {
      out.push({ path: String(issue.path[0]), message: issue.message });
    }
  }

  if (draft.languages.length > PROFILE_MAX.languages) {
    out.push({ path: 'languages', message: `That is more than ${PROFILE_MAX.languages} languages.` });
  }
  draft.languages.forEach((language, i) => {
    out.push(...lengthIssues(language.trim(), `languages.${i}`, `“${language.slice(0, 20)}”`, PROFILE_LIMITS.language));
  });

  out.push(...certificationIssues(draft.certifications));
  out.push(...gymIssues(draft.previousGyms));
  out.push(...workingHoursIssues(draft.workingHours));
  out.push(...educationIssues(draft.education, now));
  out.push(...achievementIssues(draft.achievements, now));
  return out;
}

/**
 * Which tab holds a given problem, so a save that fails can open the tab the
 * offending row is on. An error on a panel the user cannot see is the same as
 * no error at all.
 */
export function issueTab(path: string): 'overview' | 'professional' | 'education' | 'achievements' {
  const head = path.split('.')[0];
  if (head === 'education') return 'education';
  if (head === 'achievements') return 'achievements';
  if (head === 'previousGyms' || head === 'workingHours' || head === 'designation') return 'professional';
  return 'overview';
}

/** The mirrored constants, exported so a parity test can compare them. */
export const profileParity = {
  MAX: PROFILE_MAX,
  LIMITS: PROFILE_LIMITS,
  DAYS: PROFILE_DAYS,
  YEAR_MIN,
  MONTH_RE: MONTH_RE.source,
  TIME_RE: TIME_RE.source,
} as const;
