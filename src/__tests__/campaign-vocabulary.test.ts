/**
 * One page, two answers about the same campaign.
 *
 * `campaigns.status` is a TEXT column defaulting to 'draft', and the server's
 * stats endpoint counts a live campaign with `COUNT(*) FILTER (WHERE status =
 * 'active')`. The page held
 *
 *     const STATUS_COLOR = { Active: '#10b981', Draft: '#94a3b8', … }
 *
 * and filtered with `c.status === 'Active'`. Against lower-case data every one
 * of those misses: the Active KPI read 0 however many were running, and every
 * campaign's pill and header stripe fell back to the grey that means Draft —
 * including the live ones. `textTransform: capitalize` is why nobody noticed:
 * the TEXT read "Active" while the colour said draft.
 *
 * Channel had the mirror of it. The form posted 'WhatsApp' and 'In-App' into
 * the same column whose server-side default is 'email', so one channel
 * acquired two spellings depending on which code path created the row.
 */

import { describe, it, expect } from 'vitest';
import {
  campaignStatus, isCampaignActive, campaignChannelLabel,
  campaignSchema, blankCampaign, toCampaignPayload,
  CAMPAIGN_STATUSES, CAMPAIGN_CHANNELS, CHANNEL_OPTIONS,
} from '@/lib/forms/schemas/campaign';

describe('reading a stored status', () => {
  it('recognises the case the database and the server actually use', () => {
    const s = campaignStatus('active');
    expect(s.known).toBe(true);
    expect(s.label).toBe('Active');
    expect(s.color).not.toBe('var(--text-muted)');
  });

  it.each(['Active', 'ACTIVE', '  active  '])('normalises %p to the same answer', (raw) => {
    expect(campaignStatus(raw)).toEqual(campaignStatus('active'));
  });

  it('counts a live campaign as live, which the old comparison never did', () => {
    expect(isCampaignActive('active')).toBe(true);
    expect(isCampaignActive('Active')).toBe(true);
    expect(isCampaignActive('draft')).toBe(false);
  });

  it('gives each known status its own colour, so Active does not read as Draft', () => {
    const colors = CAMPAIGN_STATUSES.map((s) => campaignStatus(s).color);
    expect(new Set(colors).size).toBe(CAMPAIGN_STATUSES.length);
  });

  it('does not relabel an unfamiliar status as a draft', () => {
    // Quietly calling someone's live campaign a draft is a worse answer than
    // admitting the word is unfamiliar.
    const s = campaignStatus('archived');
    expect(s.known).toBe(false);
    expect(s.label).toBe('archived');
  });

  it('says Unknown for a missing status rather than crashing or blanking', () => {
    expect(campaignStatus(null).label).toBe('Unknown');
    expect(campaignStatus(undefined).label).toBe('Unknown');
    expect(campaignStatus('').label).toBe('Unknown');
  });
});

describe('reading a stored channel', () => {
  it('reads the canonical value', () => {
    expect(campaignChannelLabel('whatsapp')).toBe('WhatsApp');
    expect(campaignChannelLabel('in_app')).toBe('In-App');
  });

  it.each([
    ['WhatsApp', 'WhatsApp'],
    ['In-App', 'In-App'],
    ['All Channels', 'All Channels'],
    ['Email', 'Email'],
    ['email', 'Email'],
    ['SMS', 'SMS'],
  ])('still reads %p, written by the old form, as %p', (stored, label) => {
    expect(campaignChannelLabel(stored)).toBe(label);
  });

  it('shows an unrecognised channel under its own name', () => {
    expect(campaignChannelLabel('carrier pigeon')).toBe('carrier pigeon');
  });

  it('offers exactly the canonical channels for new campaigns', () => {
    expect(CHANNEL_OPTIONS.map((o) => o.value)).toEqual([...CAMPAIGN_CHANNELS]);
  });
});

describe('creating a campaign', () => {
  const draft = blankCampaign();

  it('refuses a name that is only whitespace', () => {
    // The server refuses only a FALSY name, so ' ' passed both its check and
    // the browser's `required`, and created a campaign nobody could identify.
    const r = campaignSchema.safeParse({ ...draft, name: '   ' });
    expect(r.success).toBe(false);
    expect(r.success === false && r.error.issues[0].path[0]).toBe('name');
  });

  it('trims the name it does accept', () => {
    const r = campaignSchema.safeParse({ ...draft, name: '  Summer Drive  ' });
    expect(r.success && r.data.name).toBe('Summer Drive');
  });

  it('refuses an end date before the start', () => {
    const r = campaignSchema.safeParse({
      ...draft, name: 'Summer Drive', start: '2026-06-01', end: '2026-05-01',
    });
    expect(r.success).toBe(false);
    expect(r.success === false && r.error.issues[0].path[0]).toBe('end');
  });

  it('allows a one-day campaign', () => {
    const r = campaignSchema.safeParse({
      ...draft, name: 'Flash', start: '2026-06-01', end: '2026-06-01',
    });
    expect(r.success).toBe(true);
  });

  it('allows no dates at all', () => {
    const r = campaignSchema.safeParse({ ...draft, name: 'Evergreen' });
    expect(r.success).toBe(true);
    expect(r.success && r.data.start).toBeNull();
  });

  it('refuses a channel that is not one of the offered ones', () => {
    const r = campaignSchema.safeParse({ ...draft, name: 'X', channel: 'telepathy' });
    expect(r.success).toBe(false);
  });

  it('posts the canonical channel, not the display label', () => {
    const r = campaignSchema.safeParse({ ...draft, name: 'X', channel: 'whatsapp' });
    expect(r.success).toBe(true);
    if (r.success) expect(toCampaignPayload(r.data).channel).toBe('whatsapp');
  });

  it('omits an empty optional rather than sending an empty string', () => {
    const r = campaignSchema.safeParse({ ...draft, name: 'X' });
    if (r.success) {
      const payload = toCampaignPayload(r.data);
      expect(payload.goal).toBeUndefined();
      expect(payload.start).toBeUndefined();
    }
  });

  it('starts blank on whatsapp, the channel this studio actually uses', () => {
    expect(blankCampaign().channel).toBe('whatsapp');
    expect(blankCampaign().name).toBe('');
  });
});
