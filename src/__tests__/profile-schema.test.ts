/**
 * The profile schema, against the server it mirrors.
 *
 * `619-erp-backend/src/lib/profileFields.js` refuses the ENTIRE profile save
 * on the first problem it finds, with one sentence naming a positional index.
 * That sentence used to arrive in a bar at the bottom of a page several
 * screens long, with nothing highlighted. These tests pin the client's answer:
 * the same rules, evaluated before anything is sent, with each message
 * addressed to the input that caused it.
 */

import { describe, it, expect } from 'vitest';
import type { ProfileAchievement, ProfileEducation, ProfileGym, WorkingHours } from '@/lib/api';
import {
  profileIssues, issueMap, issueSummary,
  educationIssues, achievementIssues, gymIssues, workingHoursIssues, certificationIssues,
  maxProfileYear, PROFILE_LIMITS, PROFILE_MAX, profileParity,
} from '@/lib/forms/schemas/profile';

const NOW = new Date('2026-09-16T00:00:00Z');

const edu = (over: Partial<ProfileEducation> = {}): ProfileEducation => ({
  id: 'e1', institution: '', degree: '', field: '', year: null, ...over,
});
const ach = (over: Partial<ProfileAchievement> = {}): ProfileAchievement => ({
  id: 'a1', title: '', kind: 'competition', issuer: '', year: null, detail: '', ...over,
});
const gym = (over: Partial<ProfileGym> = {}): ProfileGym => ({
  id: 'g1', name: '', role: '', from: null, to: null, ...over,
});

const paths = (issues: { path: string }[]) => issues.map((i) => i.path);

describe('education', () => {
  it('leaves a completely blank row alone — it is a row someone just added', () => {
    expect(educationIssues([edu()], NOW)).toEqual([]);
  });

  it('asks for the institution rather than letting the row be discarded', () => {
    // The server drops a row with no institution, taking the degree and the
    // year with it and saying nothing. That is typing the coach never gets back.
    const issues = educationIssues([edu({ degree: 'B.Sc', year: 2016 })], NOW);
    expect(paths(issues)).toEqual(['education.0.institution']);
    expect(issues[0].message).toMatch(/remove this entry/i);
  });

  it('rejects a year before 1900', () => {
    const issues = educationIssues([edu({ institution: 'K11', year: 1 })], NOW);
    expect(paths(issues)).toEqual(['education.0.year']);
    expect(issues[0].message).toContain('1900');
  });

  it('rejects a year further ahead than next year', () => {
    const issues = educationIssues([edu({ institution: 'K11', year: 9999 })], NOW);
    expect(paths(issues)).toEqual(['education.0.year']);
  });

  it('allows next year, because a degree can be scheduled', () => {
    expect(educationIssues([edu({ institution: 'K11', year: maxProfileYear(NOW) })], NOW)).toEqual([]);
  });

  it('allows no year at all', () => {
    expect(educationIssues([edu({ institution: 'K11' })], NOW)).toEqual([]);
  });

  it('reports the row index, so the message can be placed', () => {
    const issues = educationIssues(
      [edu({ institution: 'A' }), edu({ institution: 'B', year: 12 })],
      NOW,
    );
    expect(paths(issues)).toEqual(['education.1.year']);
  });

  it('reports an institution past the column the server would silently cut', () => {
    const issues = educationIssues(
      [edu({ institution: 'K'.repeat(PROFILE_LIMITS.institution + 3) })],
      NOW,
    );
    expect(paths(issues)).toEqual(['education.0.institution']);
    expect(issues[0].message).toContain('3 characters too long');
  });

  it('caps the list at the number the server takes', () => {
    const rows = Array.from({ length: PROFILE_MAX.education + 1 }, (_, i) =>
      edu({ id: `e${i}`, institution: `School ${i}` }));
    expect(paths(educationIssues(rows, NOW))).toContain('education');
  });
});

describe('achievements', () => {
  it('asks for the title rather than letting the row be discarded', () => {
    const issues = achievementIssues([ach({ detail: 'Snatch 92kg', year: 2024 })], NOW);
    expect(paths(issues)).toEqual(['achievements.0.title']);
  });

  it("reports a detail past the 600-character column, which the server cuts", () => {
    const issues = achievementIssues(
      [ach({ title: 'Nationals', detail: 'd'.repeat(PROFILE_LIMITS.detail + 1) })],
      NOW,
    );
    expect(paths(issues)).toEqual(['achievements.0.detail']);
    expect(issues[0].message).toContain('1 character too long');
  });

  it('bounds the year exactly as education does', () => {
    expect(paths(achievementIssues([ach({ title: 'Nationals', year: 1899 })], NOW)))
      .toEqual(['achievements.0.year']);
  });

  it('accepts an undated entry — it simply sorts last', () => {
    expect(achievementIssues([ach({ title: 'Nationals' })], NOW)).toEqual([]);
  });
});

describe('previous gyms', () => {
  it('asks for the name when the row carries anything else', () => {
    expect(paths(gymIssues([gym({ role: 'Head Coach' })]))).toEqual(['previousGyms.0.name']);
  });

  it('leaves an entirely blank row alone', () => {
    expect(gymIssues([gym()])).toEqual([]);
  });

  it('rejects an end month before the start month', () => {
    const issues = gymIssues([gym({ name: 'Gold 24/7', from: '2021-06', to: '2020-01' })]);
    expect(paths(issues)).toEqual(['previousGyms.0.to']);
    expect(issues[0].message).toMatch(/before the start month/i);
  });

  it('accepts an empty end month — that is what "still there" means', () => {
    expect(gymIssues([gym({ name: 'Gold 24/7', from: '2021-06', to: null })])).toEqual([]);
  });

  it('rejects a malformed month', () => {
    expect(paths(gymIssues([gym({ name: 'Gold 24/7', from: '2021-13' })])))
      .toEqual(['previousGyms.0.from']);
  });
});

describe('working hours', () => {
  it('accepts a split shift, which is the ordinary case in this trade', () => {
    const hours: WorkingHours = { tue: [{ from: '06:00', to: '10:00' }, { from: '17:00', to: '21:00' }] };
    expect(workingHoursIssues(hours)).toEqual([]);
  });

  it('marks the empty side of a half-filled range', () => {
    // The server saw one valid time and one empty string, failed HH:MM, and
    // refused the whole profile with "Invalid time on mon — use HH:MM".
    const issues = workingHoursIssues({ mon: [{ from: '06:00', to: '' }] });
    expect(paths(issues)).toEqual(['workingHours.mon.0.to']);
    expect(issues[0].message).toMatch(/end time/i);
  });

  it('leaves a range that is empty on both sides alone', () => {
    expect(workingHoursIssues({ mon: [{ from: '', to: '' }] })).toEqual([]);
  });

  it('rejects a zero-length shift, which reads as a slot nobody can book', () => {
    expect(paths(workingHoursIssues({ wed: [{ from: '09:00', to: '09:00' }] })))
      .toEqual(['workingHours.wed.0.to']);
  });

  it('rejects an end before the start', () => {
    expect(paths(workingHoursIssues({ wed: [{ from: '18:00', to: '09:00' }] })))
      .toEqual(['workingHours.wed.0.to']);
  });

  it('reports an overlap on the row the user can see, not on a sorted position', () => {
    // Entered out of order on purpose: the later shift is row 0.
    const hours: WorkingHours = {
      thu: [{ from: '17:00', to: '21:00' }, { from: '09:00', to: '18:00' }],
    };
    const issues = workingHoursIssues(hours);
    expect(paths(issues)).toEqual(['workingHours.thu.0.from']);
    expect(issues[0].message).toMatch(/overlaps/i);
  });

  it('caps the ranges per day at what the server takes', () => {
    const many = Array.from({ length: PROFILE_MAX.hoursPerDay + 1 }, () => ({ from: '', to: '' }));
    expect(paths(workingHoursIssues({ fri: many }))).toContain('workingHours.fri');
  });
});

describe('the whole draft', () => {
  const blank = {
    designation: '', bio: '', philosophy: '', trainingStyle: '',
    certifications: [], previousGyms: [], education: [],
    achievements: [], workingHours: {}, languages: [],
  };

  it('finds nothing wrong with an empty profile', () => {
    expect(profileIssues(blank, NOW)).toEqual([]);
  });

  it('rejects text past the column the server would silently cut', () => {
    const issues = profileIssues(
      { ...blank, designation: 'x'.repeat(PROFILE_LIMITS.designation + 1) },
      NOW,
    );
    expect(paths(issues)).toEqual(['designation']);
  });

  it('collects every problem, not only the first — the server stops at one', () => {
    const issues = profileIssues({
      ...blank,
      education: [edu({ institution: 'K11', year: 12 })],
      achievements: [ach({ title: 'Nationals', year: 1 })],
      workingHours: { mon: [{ from: '06:00', to: '' }] },
    }, NOW);
    expect(paths(issues).sort()).toEqual([
      'achievements.0.year', 'education.0.year', 'workingHours.mon.0.to',
    ]);
  });
});

describe('issue helpers', () => {
  it('keeps the first message per path, so a control shows one error', () => {
    const map = issueMap([
      { path: 'education.0.year', message: 'first' },
      { path: 'education.0.year', message: 'second' },
    ]);
    expect(map['education.0.year']).toBe('first');
  });

  it('summarises a single problem as itself', () => {
    expect(issueSummary([{ path: 'a', message: 'Year must be between 1900 and 2027.' }]))
      .toBe('Year must be between 1900 and 2027.');
  });

  it('counts the rest rather than saying "check the form"', () => {
    const summary = issueSummary([
      { path: 'a', message: 'Year is wrong.' },
      { path: 'b', message: 'Name it.' },
      { path: 'c', message: 'End time.' },
    ]);
    expect(summary).toBe('Year is wrong. (and 2 other problems)');
  });

  it('says "problem", singular, when there is one other', () => {
    expect(issueSummary([
      { path: 'a', message: 'Year is wrong.' },
      { path: 'b', message: 'Name it.' },
    ])).toBe('Year is wrong. (and 1 other problem)');
  });
});

describe('parity with the server', () => {
  // These are copies of constants in `619-erp-backend/src/lib/profileFields.js`.
  // A drift here is a client that accepts what the server refuses, which shows
  // up as the whole-save rejection this schema exists to prevent.
  it('mirrors the server list caps', () => {
    expect(profileParity.MAX).toEqual({
      certifications: 40, languages: 15, coachingModes: 5, previousGyms: 20,
      education: 15, achievements: 40, hoursPerDay: 4,
    });
  });

  it('mirrors the server column budgets', () => {
    expect(profileParity.LIMITS).toEqual({
      certificationName: 120, certificationIssuer: 120, credentialId: 80,
      language: 40, gymName: 120, role: 80, institution: 140, degree: 120,
      field: 120, title: 160, issuer: 120, detail: 600, designation: 120,
      philosophy: 2000, trainingStyle: 600, freeText: 2000,
    });
  });

  it('mirrors the server patterns and year floor', () => {
    expect(profileParity.MONTH_RE).toBe('^\\d{4}-(0[1-9]|1[0-2])$');
    expect(profileParity.TIME_RE).toBe('^([01]\\d|2[0-3]):([0-5]\\d)$');
    expect(profileParity.YEAR_MIN).toBe(1900);
    expect(profileParity.DAYS).toEqual(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
  });
});

describe('certifications', () => {
  const cert = (over: Partial<{
    id: string; name: string; issuer: string;
    issued_on: string | null; expires_on: string | null; credential_id: string;
  }> = {}) => ({
    id: 'c1', name: '', issuer: '', issued_on: null, expires_on: null, credential_id: '', ...over,
  });

  it('asks for a name on a blank row instead of losing the whole save', () => {
    // The one list where the server ERRORS rather than dropping: pressing Add
    // and saving used to cost every other edit on the page.
    const issues = certificationIssues([cert()]);
    expect(paths(issues)).toEqual(['certifications.0.name']);
  });

  it('rejects an expiry before the issue date', () => {
    const issues = certificationIssues([
      cert({ name: 'NASM CPT', issued_on: '2024-06-01', expires_on: '2023-06-01' }),
    ]);
    expect(paths(issues)).toEqual(['certifications.0.expires_on']);
    expect(issues[0].message).toMatch(/before the issue date/i);
  });

  it('rejects a date that is not a real day', () => {
    // `new Date('2026-02-31')` is a valid object pointing at 3 March, so a
    // pattern test alone would store a different day than the one typed.
    expect(paths(certificationIssues([cert({ name: 'NASM CPT', expires_on: '2026-02-31' })])))
      .toEqual(['certifications.0.expires_on']);
  });

  it('accepts a certificate with no expiry — that is "unknown", not invalid', () => {
    expect(certificationIssues([cert({ name: 'NASM CPT', issued_on: '2024-06-01' })])).toEqual([]);
  });

  it('accepts an expiry on the issue date', () => {
    expect(certificationIssues([
      cert({ name: 'NASM CPT', issued_on: '2024-06-01', expires_on: '2024-06-01' }),
    ])).toEqual([]);
  });

  it('caps the list at the number the server takes', () => {
    const rows = Array.from({ length: PROFILE_MAX.certifications + 1 }, (_, i) =>
      cert({ id: `c${i}`, name: `Cert ${i}` }));
    expect(paths(certificationIssues(rows))).toContain('certifications');
  });
});
