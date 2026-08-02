// Enrolment state on the Book PT Session dialog.
//
// The dialog listed three clients out of twenty-two, and all three were
// expired. It fetched with api.pt.clients({ trainer_id }), and only three
// pt_clients rows have a trainer_id set at all — so the one screen whose job
// is booking a session could not book one for anybody currently training.
//
// It now lists every client in the studio and says which of them is Active,
// Expired or Not enrolled. Booking for an expired or unenrolled client is
// still allowed — a trainer may be booking the very session that renews them —
// but it should never be a surprise found out afterwards.
import { describe, expect, it } from 'vitest';
import { enrolmentState } from '@/lib/enrolment';

const TODAY = new Date(2026, 7, 2); // 2 Aug 2026, local

describe('enrolmentState', () => {
  it('is not_enrolled when no package end date exists', () => {
    // Real rows look like this: status 'pending', pt_end_date null. Someone
    // added as a lead or part-way through onboarding.
    expect(enrolmentState({ id: '1', name: 'Shailendra Shukla', status: 'pending', pt_end_date: null }, TODAY))
      .toBe('not_enrolled');
    expect(enrolmentState({ id: '2', name: 'No field at all' }, TODAY)).toBe('not_enrolled');
    expect(enrolmentState({ id: '3', name: 'Empty string', pt_end_date: '' }, TODAY)).toBe('not_enrolled');
  });

  it('is expired once the end date has passed', () => {
    expect(enrolmentState({ id: '4', name: 'Hari Narayan Singh', pt_end_date: '2025-10-19' }, TODAY)).toBe('expired');
  });

  it('is active while the end date is still ahead', () => {
    expect(enrolmentState({ id: '5', name: 'Ajeet Yadav', pt_end_date: '2026-09-17' }, TODAY)).toBe('active');
  });

  it('counts the last day as active, not expired', () => {
    // A package ending today has not run out today.
    expect(enrolmentState({ id: '6', name: 'Ends today', pt_end_date: '2026-08-02' }, TODAY)).toBe('active');
    expect(enrolmentState({ id: '7', name: 'Ended yesterday', pt_end_date: '2026-08-01' }, TODAY)).toBe('expired');
  });

  it('reads the date out of a timestamp without shifting the day', () => {
    // The API sends dates; some rows carry a time. Comparing whole timestamps
    // in UTC would expire an Indian studio's package at 05:30 local.
    expect(enrolmentState({ id: '8', name: 'Ends today, midnight', pt_end_date: '2026-08-02T00:00:00.000Z' }, TODAY))
      .toBe('active');
  });

  it('trusts the date over the status column', () => {
    // status is written at enrolment and does not move on its own, so a row
    // can read 'active' well after its package ran out.
    expect(enrolmentState({ id: '9', name: 'Stale status', status: 'active', pt_end_date: '2025-01-01' }, TODAY))
      .toBe('expired');
    expect(enrolmentState({ id: '10', name: 'Stale the other way', status: 'expired', pt_end_date: '2027-01-01' }, TODAY))
      .toBe('active');
  });

  it('classifies the real client list the way a trainer would read it', () => {
    // Straight from production: 22 clients, 3 with a trainer assigned and all
    // 3 expired — which is exactly the set the old dialog showed.
    const rows = [
      { id: 'a', name: 'Ajeet Yadav', pt_end_date: '2026-09-17' },
      { id: 'b', name: 'Akash sir morning', pt_end_date: null },
      { id: 'c', name: 'Hari Narayan Singh', pt_end_date: '2025-10-19' },
      { id: 'd', name: 'Rashi Bhatia', pt_end_date: '2025-07-23' },
      { id: 'e', name: 'Vipul Bhatia', pt_end_date: '2025-07-23' },
      { id: 'f', name: 'Navneet Katiyar', pt_end_date: '2027-08-02' },
    ];
    const byState = rows.map((r) => enrolmentState(r, TODAY));
    expect(byState).toEqual(['active', 'not_enrolled', 'expired', 'expired', 'expired', 'active']);

    // The three the dialog used to show were all expired — that is the bug in
    // one line, and it is why this file exists.
    const oldDialogShowed = ['Hari Narayan Singh', 'Rashi Bhatia', 'Vipul Bhatia'];
    const states = rows.filter((r) => oldDialogShowed.includes(r.name)).map((r) => enrolmentState(r, TODAY));
    expect(new Set(states)).toEqual(new Set(['expired']));
  });
});
