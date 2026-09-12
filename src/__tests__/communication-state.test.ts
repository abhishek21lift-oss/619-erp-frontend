// What the ERP says happened to a message.
//
// The backend has written delivered_at and read_at since the webhook started
// applying receipts, and the logs endpoint returns them with SELECT *. None of
// it reached a screen: a studio saw "sent" for a message WhatsApp had
// confirmed delivered, and "failed" for one whose reason was sitting unread in
// the same row.
//
// The rows below are the shapes production really holds — checked against the
// live table, including the partial ones — rather than tidy fixtures.

import { describe, expect, it } from 'vitest';
import {
  deliveryStages,
  failureText,
  isBenignFailure,
  shortTime,
  fullTimestamp,
  failureTone,
  failureLine,
} from '@/lib/communication-state';

describe('which stages a message reached', () => {
  it('reads the timestamps, not the status', () => {
    // The two are not redundant. `status` is a single forward-only value, so a
    // read message reports 'read' and says nothing about when it was
    // delivered — while delivered_at is still on the row, and is the figure a
    // studio chasing a silent client actually wants.
    const stages = deliveryStages({
      status: 'read',
      sent_at: '2026-09-11T11:21:49Z',
      delivered_at: '2026-09-11T11:23:15Z',
      read_at: '2026-09-11T11:40:02Z',
    });
    expect(stages.map((s) => s.label)).toEqual(['Sent', 'Delivered', 'Read']);
  });

  it('omits a stage with no timestamp rather than rendering it blank', () => {
    // WhatsApp does not guarantee a delivered receipt arrives before a read
    // one, so delivered_at is legitimately null on a message that was read.
    const stages = deliveryStages({
      status: 'read',
      sent_at: '2026-09-11T11:21:49Z',
      delivered_at: null,
      read_at: '2026-09-11T11:40:02Z',
    });
    expect(stages.map((s) => s.label)).toEqual(['Sent', 'Read']);
  });

  it('handles the shape production actually holds today', () => {
    // Every sent row in the live table: a real sent_at, and nulls after it.
    // Four such rows exist, and the UI rendered nothing for any of them.
    const stages = deliveryStages({
      status: 'sent',
      sent_at: '2026-09-11T14:15:04Z',
      delivered_at: null,
      read_at: null,
    });
    expect(stages).toHaveLength(1);
    expect(stages[0].label).toBe('Sent');
  });

  it('shows nothing for a message that never went out', () => {
    // The failed row in production has sent_at null — there is no timeline to
    // draw, and the failure reason carries the whole story instead.
    expect(deliveryStages({ status: 'failed', sent_at: null })).toEqual([]);
    expect(deliveryStages({})).toEqual([]);
  });
});

describe('why a message failed', () => {
  it('explains the reason production has actually recorded', () => {
    // whatsapp_logged_out is the one in the live table. It is also the case
    // the studio can fix themselves in about ten seconds, which is exactly
    // what "failed" alone never told them.
    const text = failureText('whatsapp_logged_out');
    expect(text).toMatch(/logged out/i);
    expect(text).toMatch(/reconnect/i);
  });

  it('names the recovery where there is one', () => {
    for (const reason of ['not_connected', 'instance_not_connected']) {
      expect(failureText(reason)).toMatch(/reconnect/i);
    }
  });

  it('falls through to the raw code for a reason it has not learned', () => {
    // The backend adds reasons faster than this map will learn them. A code is
    // still a better clue than "Something went wrong", and showing it makes
    // the gap visible instead of hiding it behind a generic apology.
    expect(failureText('some_new_backend_reason')).toBe('some_new_backend_reason');
  });

  it('says nothing when there is nothing to say', () => {
    expect(failureText(null)).toBeNull();
    expect(failureText(undefined)).toBeNull();
    expect(failureText('')).toBeNull();
  });

  it('treats send-once declining a duplicate as a note, not an error', () => {
    // duplicate_in_flight is the guarantee working. A red badge for "we
    // correctly declined to message your client twice" teaches people to
    // ignore red badges.
    expect(isBenignFailure('duplicate_in_flight')).toBe(true);
    expect(isBenignFailure('whatsapp_logged_out')).toBe(false);
    expect(isBenignFailure(null)).toBe(false);
  });
});

describe('timestamps', () => {
  it('formats a short 24-hour time', () => {
    expect(shortTime('2026-09-11T11:23:15Z')).toMatch(/^\d{2}:\d{2}$/);
  });

  it('gives a full timestamp for the title attribute', () => {
    // The row shows the short form; the full one is what a hover reveals,
    // rather than truncating the date away with no path back to it.
    const full = fullTimestamp('2026-09-11T11:23:15Z');
    expect(full).toMatch(/2026/);
    expect(full).toMatch(/Sep/);
  });

  it('renders nothing rather than "Invalid Date" for a bad value', () => {
    // A malformed timestamp must not put "Invalid Date" in front of a studio.
    expect(shortTime('not-a-date')).toBe('');
    expect(fullTimestamp('')).toBe('');
  });
});

describe('how loudly to say a failure reason', () => {
  // The worker now leaves a row 'queued' between delivery attempts and records
  // the reason the last one hit — because marking it 'failed' on the first
  // attempt is what silently disabled the retry budget in the backend. That
  // puts a reason on a row that has NOT failed, and the UI has to say which it
  // is: red beside a grey QUEUED badge tells a studio their message is lost
  // while it is still on its way.

  it('a queued row is retrying, not failed', () => {
    const row = { status: 'queued', failure_reason: 'gateway_unreachable' };
    expect(failureTone(row)).toBe('retrying');
    expect(failureLine(row)).toMatch(/^Last attempt:/);
    expect(failureLine(row)).toMatch(/trying again/);
  });

  it('a failed row is an error', () => {
    const row = { status: 'failed', failure_reason: 'whatsapp_logged_out' };
    expect(failureTone(row)).toBe('error');
    // No hedging prefix: this one IS the outcome.
    expect(failureLine(row)).toBe(failureText('whatsapp_logged_out'));
  });

  it('send-once declining a duplicate stays a note whatever the status', () => {
    // Benign wins over retrying: nothing is being retried, and nothing went
    // wrong. It is the guarantee working.
    expect(failureTone({ status: 'queued', failure_reason: 'duplicate_in_flight' })).toBe('note');
    expect(failureTone({ status: 'failed', failure_reason: 'duplicate_in_flight' })).toBe('note');
  });

  it('says nothing when the row carries no reason', () => {
    expect(failureLine({ status: 'sent' })).toBeNull();
    expect(failureLine({ status: 'queued', failure_reason: null })).toBeNull();
  });

  it('an unknown code still gets the retrying framing', () => {
    // The prefix comes from the row's status, not from the map — so a reason
    // the map has not learned is still correctly described as in flight.
    expect(failureLine({ status: 'queued', failure_reason: 'some_new_reason' }))
      .toBe('Last attempt: some_new_reason — trying again');
  });
});
