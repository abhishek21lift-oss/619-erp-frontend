/**
 * A marketing campaign.
 *
 * ── The vocabulary problem this exists to settle ────────────────────────────
 *
 * `campaigns.status` and `campaigns.type` are plain TEXT columns with no CHECK
 * constraint, defaulting to `'draft'` and `'email'`. The server's own queries
 * read that vocabulary as lower case — `COUNT(*) FILTER (WHERE status =
 * 'active')` is how the stats endpoint counts an active campaign.
 *
 * The page did not. It held
 *
 *     const STATUS_COLOR = { Active: '#10b981', Draft: '#94a3b8', … }
 *
 * and filtered with `c.status === 'Active'`. Against lower-case data every one
 * of those misses:
 *
 *   · the Active KPI read 0 no matter how many were running;
 *   · every campaign's status pill and header stripe fell back to the grey
 *     that means Draft, including the live ones.
 *
 * Nobody caught the pill because `textTransform: capitalize` made the TEXT
 * read "Active" while the colour said draft. The KPI beside it, computed by
 * the server, said something different again — one page, two answers.
 *
 * Channel had the mirror of the problem in the other direction: the form sent
 * `'WhatsApp'`, `'Email'`, `'In-App'` into the same column whose default is
 * `'email'`, so one channel acquired two spellings depending on which code
 * path created the row.
 *
 * So the vocabulary is stated ONCE, here, in the case the database and the
 * server's queries already use. The lookups normalise before reading, which is
 * what keeps every row written before this — in either spelling — rendering
 * correctly.
 */

import { z } from 'zod';
import { textField, dateField, enumField } from '../primitives';
import { refineDateOrder } from '../domain';

/* ── Status ──────────────────────────────────────────────────────────────── */

export const CAMPAIGN_STATUSES = ['draft', 'scheduled', 'active', 'paused', 'completed'] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

const STATUS_META: Record<CampaignStatus, { label: string; color: string }> = {
  draft:     { label: 'Draft',     color: 'var(--text-muted)' },
  scheduled: { label: 'Scheduled', color: 'var(--warning-text, #b45309)' },
  active:    { label: 'Active',    color: 'var(--success-text, #047857)' },
  paused:    { label: 'Paused',    color: 'var(--brand)' },
  completed: { label: 'Completed', color: 'var(--text-secondary)' },
};

/**
 * Read a stored status, whatever case it was written in.
 *
 * An unknown value is NOT coerced to draft. A campaign whose status this build
 * has never heard of is shown under its own name in a neutral colour, because
 * quietly relabelling someone's live campaign as a draft is a worse answer
 * than admitting the word is unfamiliar.
 */
export function campaignStatus(raw: string | null | undefined): {
  key: string; label: string; color: string; known: boolean;
} {
  const key = String(raw ?? '').trim().toLowerCase();
  const meta = (STATUS_META as Record<string, { label: string; color: string }>)[key];
  if (meta) return { key, label: meta.label, color: meta.color, known: true };
  return {
    key,
    label: key ? key.replace(/[_-]+/g, ' ') : 'Unknown',
    color: 'var(--text-muted)',
    known: false,
  };
}

/** Whether a stored status counts as running. The server's own test, mirrored. */
export function isCampaignActive(raw: string | null | undefined): boolean {
  return campaignStatus(raw).key === 'active';
}

/* ── Channel ─────────────────────────────────────────────────────────────── */

export const CAMPAIGN_CHANNELS = ['whatsapp', 'sms', 'email', 'in_app', 'all'] as const;
export type CampaignChannel = (typeof CAMPAIGN_CHANNELS)[number];

const CHANNEL_LABELS: Record<CampaignChannel, string> = {
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  email: 'Email',
  in_app: 'In-App',
  all: 'All Channels',
};

/**
 * Display text for a stored channel.
 *
 * Tolerant of the spellings already in the column: rows written by the old
 * form hold `'WhatsApp'` and `'In-App'`, the server's default writes
 * `'email'`, so the lookup folds case and treats a hyphen or a space as an
 * underscore before reading.
 */
export function campaignChannelLabel(raw: string | null | undefined): string {
  const key = String(raw ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return (CHANNEL_LABELS as Record<string, string>)[key]
    ?? (key === 'all_channels' ? CHANNEL_LABELS.all : String(raw ?? '').trim())
    ?? '';
}

export const CHANNEL_OPTIONS = CAMPAIGN_CHANNELS.map((value) => ({
  value,
  label: CHANNEL_LABELS[value],
}));

/* ── The form ────────────────────────────────────────────────────────────── */

export const campaignSchema = z
  .object({
    // The server refuses only a FALSY name, so a single space passed both its
    // check and the browser's `required` and created a campaign nobody could
    // identify in the list. `textField` trims first.
    name: textField({ label: 'Campaign name', required: true, maxLength: 160 }),
    goal: textField({ label: 'Goal', maxLength: 300 }),
    channel: enumField(CAMPAIGN_CHANNELS, { label: 'Channel', required: true }),
    audience: textField({ label: 'Audience', maxLength: 160 }),
    start: dateField({ label: 'Start date' }),
    end: dateField({ label: 'End date' }),
  })
  // Same day is allowed: a one-day push is an ordinary campaign.
  .superRefine(refineDateOrder('start', 'end', {
    startLabel: 'Start date', endLabel: 'End date', allowSameDay: true,
  }));

export type CampaignValues = z.output<typeof campaignSchema>;

/**
 * The form's raw state — one string per control.
 *
 * A `type` rather than an `interface`, and that is load-bearing: TypeScript
 * gives an object-literal type an implicit index signature and an interface
 * none, so only this spelling satisfies `useAppForm`'s
 * `Record<string, unknown>` bound without widening the field types away.
 */
export type CampaignFormState = {
  name: string;
  goal: string;
  channel: CampaignChannel;
  audience: string;
  start: string;
  end: string;
};

export function blankCampaign(): CampaignFormState {
  return { name: '', goal: '', channel: 'whatsapp', audience: '', start: '', end: '' };
}

/**
 * The create payload.
 *
 * `channel` and `goal` are the names this endpoint accepts for the `type` and
 * `subject` columns — see `routes/campaigns.js`, which reads
 * `type || channel` and `subject || goal` and returns them under the form's
 * names again. Nothing is invented here; the mapping is the server's.
 */
export function toCampaignPayload(v: CampaignValues) {
  return {
    name: v.name as string,
    channel: v.channel as CampaignChannel,
    goal: v.goal ?? undefined,
    audience: v.audience ?? undefined,
    start: v.start ?? undefined,
    end: v.end ?? undefined,
  };
}
