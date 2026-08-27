// Check-in scanner logic.
//
// Two things on that page can be wrong while the screen still looks right: a
// repeat scan being read as a fresh arrival, and the same person appearing
// twice in the feed. Neither needs a camera to test.
import { describe, expect, it } from 'vitest';
import { outcomeOf, mergeFeed, feedFromServer, feedTime, type FeedEntry } from '@/lib/checkin';

const entry = (over: Partial<FeedEntry> & { key: string }): FeedEntry => ({
  name: 'Someone', photoUrl: null, memberCode: null, at: null, outcome: 'success', ...over,
});

describe('outcomeOf', () => {
  it('calls a repeat scan a duplicate even though the request succeeded', () => {
    // The whole trap. The server answers success: true — the HTTP call worked
    // — while duplicate: true says no check-in was recorded. Reading success
    // first turns every second scan into a green "Welcome" and inflates the
    // day's count.
    expect(outcomeOf({ success: true, duplicate: true })).toBe('duplicate');
  });

  it('calls a first scan a success', () => {
    expect(outcomeOf({ success: true })).toBe('success');
  });

  it('calls a refused scan rejected', () => {
    // Expired membership: success false, no duplicate flag.
    expect(outcomeOf({ success: false })).toBe('rejected');
  });

  it('treats an absent duplicate flag as not-a-duplicate', () => {
    // The server only sets `duplicate` on that one branch, so undefined has to
    // mean no — never "unknown, assume yes".
    expect(outcomeOf({ success: true, duplicate: undefined })).toBe('success');
    expect(outcomeOf({ success: false, duplicate: false })).toBe('rejected');
  });
});

describe('mergeFeed', () => {
  it('shows a just-scanned member once, not twice, when the poll returns them', () => {
    // The reason this function exists. A scan goes into the local list at
    // once and comes back from the server seconds later under the same
    // attendance id. Two rows would read as two check-ins.
    const local  = [entry({ key: 'att-1', name: 'Hari' })];
    const server = [entry({ key: 'att-1', name: 'Hari' }), entry({ key: 'att-2', name: 'Priya' })];
    const out = mergeFeed(local, server);
    expect(out.map((e) => e.key)).toEqual(['att-1', 'att-2']);
  });

  it('puts what this device just scanned above what the server reported', () => {
    // The poll is up to 30s behind. A desk that scans somebody and sees the
    // list not move scans them again.
    const out = mergeFeed([entry({ key: 'mine' })], [entry({ key: 'theirs' })]);
    expect(out[0].key).toBe('mine');
  });

  it('keeps the local copy when both sides have the same key', () => {
    const out = mergeFeed(
      [entry({ key: 'att-1', name: 'Local name' })],
      [entry({ key: 'att-1', name: 'Server name' })],
    );
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('Local name');
  });

  it('never merges two rejected scans together', () => {
    // A rejection gets no attendance row, so it carries a per-scan key. Two
    // expired members turned away in a row are two events, and collapsing
    // them would hide the second one from the desk.
    const out = mergeFeed(
      [entry({ key: 'local-2', name: 'B', outcome: 'rejected' }),
       entry({ key: 'local-1', name: 'A', outcome: 'rejected' })],
      [],
    );
    expect(out).toHaveLength(2);
  });

  it('caps the list', () => {
    const many = Array.from({ length: 30 }, (_, i) => entry({ key: `k${i}` }));
    expect(mergeFeed(many, [])).toHaveLength(20);
    expect(mergeFeed(many, [], 5)).toHaveLength(5);
  });

  it('survives both sides being empty', () => {
    expect(mergeFeed([], [])).toEqual([]);
  });
});

describe('feedFromServer', () => {
  it('keys server rows on the attendance id, which is what lets the two lists meet', () => {
    // If this used the array index the dedupe above could never fire.
    const out = feedFromServer([{ id: 'att-9', ref_name: 'Hari', check_in_time: '2026-08-06T04:30:00Z' }]);
    expect(out[0].key).toBe('att-9');
    expect(out[0].name).toBe('Hari');
  });

  it('carries the photo and member code through', () => {
    const out = feedFromServer([{ id: 'a', photo_url: '/u/1.jpg', member_code: 'MPS-014' }]);
    expect(out[0].photoUrl).toBe('/u/1.jpg');
    expect(out[0].memberCode).toBe('MPS-014');
  });

  it('does not fall over on rows with missing or wrongly-typed fields', () => {
    // These rows come off a LEFT JOIN against two client tables, so nulls are
    // routine — a row missing a name must render as Unknown, not crash the
    // page that is somebody's front desk.
    // The wrong-type cases are the ones a `?? 'Unknown'` fallback misses: it
    // catches null and undefined and lets a number straight through into the
    // name slot. Only a typeof guard covers both.
    const out = feedFromServer([{}, { ref_name: null, photo_url: 42 }, { ref_name: 42 }, null]);
    expect(out).toHaveLength(4);
    expect(out.every((e) => e.name === 'Unknown')).toBe(true);
    expect(out.every((e) => e.photoUrl === null)).toBe(true);
    expect(new Set(out.map((e) => e.key)).size).toBe(4);
  });

  it('handles an absent list', () => {
    expect(feedFromServer(undefined as unknown as unknown[])).toEqual([]);
  });
});

describe('feedTime', () => {
  it('renders a dash rather than "Invalid Date"', () => {
    expect(feedTime(null)).toBe('—');
    expect(feedTime('not a date')).toBe('—');
  });

  it('renders a real timestamp as a clock time', () => {
    expect(feedTime('2026-08-06T04:30:00Z')).toMatch(/\d{1,2}:\d{2}/);
  });
});
