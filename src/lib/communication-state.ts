/**
 * What a communication log row actually says about a message.
 *
 * The ERP has tracked delivery state correctly for some time — the webhook
 * writes delivered_at and read_at, and the logs endpoint returns them — and
 * none of it was ever rendered. A studio saw a badge reading "sent" for a
 * message WhatsApp had confirmed delivered, and "failed" for one that failed
 * for a reason sitting unread in the same row.
 *
 * The logic lives here rather than in the page so it can be tested against the
 * shapes the backend really produces, including the partial ones.
 */

export interface CommunicationLogRow {
  status?: string | null;
  sent_at?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  failure_reason?: string | null;
}

export interface DeliveryStage {
  label: 'Sent' | 'Delivered' | 'Read';
  at: string;
}

/**
 * The stages this message actually reached, oldest first.
 *
 * Driven by the TIMESTAMPS, not by `status`. They are not redundant: status is
 * a single value that only ever moves forward, so a read message reports
 * 'read' and says nothing about when it was delivered — but delivered_at is
 * still there, and it is the more useful of the two to a studio chasing a
 * client who has not replied.
 *
 * A stage with no timestamp is omitted rather than rendered blank. WhatsApp
 * does not guarantee a delivered receipt arrives before a read one, so
 * delivered_at can legitimately be null on a message that was read.
 */
export function deliveryStages(row: CommunicationLogRow): DeliveryStage[] {
  const stages: DeliveryStage[] = [];
  if (row.sent_at) stages.push({ label: 'Sent', at: row.sent_at });
  if (row.delivered_at) stages.push({ label: 'Delivered', at: row.delivered_at });
  if (row.read_at) stages.push({ label: 'Read', at: row.read_at });
  return stages;
}

/**
 * Plain English for the reason codes the WhatsApp path writes.
 *
 * Every entry says what happened, and where it can be acted on it says that
 * too — "failed" alone tells a studio nothing they can do. `whatsapp_logged_out`
 * is the one production has actually recorded, and it is precisely the case
 * where the studio CAN fix it, in about ten seconds, by rescanning the QR.
 *
 * An unknown code falls through to the raw string rather than a generic
 * apology. A code this map has not learned yet is still a better clue than
 * "Something went wrong", and showing it makes the omission visible instead of
 * hiding it — the backend adds reasons faster than this map will learn them.
 */
const REASON_TEXT: Record<string, string> = {
  whatsapp_logged_out: 'WhatsApp was logged out — reconnect it to resume sending',
  whatsapp_disconnected: 'WhatsApp was disconnected — reconnect it to resume sending',
  not_connected: 'WhatsApp was not connected — reconnect it to resume sending',
  instance_not_connected: 'WhatsApp was not connected — reconnect it to resume sending',
  instance_not_found: 'No WhatsApp connection set up for this studio',
  gateway_not_configured: 'The WhatsApp service is not configured for this deployment',
  gateway_failed: 'The WhatsApp service rejected the message',
  gateway_error: 'The WhatsApp service could not be reached',
  automation_disabled: 'Automation was switched off when this was due to send',
  trainer_not_permitted: "This client's trainer is not permitted to send automated messages",
  duplicate_in_flight: 'An identical message was already on its way — not sent twice',
  no_phone: 'This client has no mobile number on file',
  no_recipient: 'No recipient could be resolved for this message',
  no_organization: 'This message was not attached to a studio',
};

export function failureText(reason?: string | null): string | null {
  if (!reason) return null;
  return REASON_TEXT[reason] || reason;
}

/**
 * `duplicate_in_flight` is not a failure the studio should worry about — it is
 * send-once working. Called out so it can be styled as a note rather than an
 * error, because a red badge for "we correctly declined to message your client
 * twice" trains people to ignore red badges.
 */
export function isBenignFailure(reason?: string | null): boolean {
  return reason === 'duplicate_in_flight';
}

/** Short local time, e.g. "14:15". Dates are shown separately on the row. */
export function shortTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Full timestamp for a title attribute — the truncated row shows the short form. */
export function fullTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}
