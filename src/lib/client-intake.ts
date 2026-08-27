// The two option lists the client intake form and the client edit form share.
//
// They live here rather than in either page because both pages ask the same
// two questions about the same two columns, and a list that exists twice
// drifts: the edit form quietly loses an option the intake form gained, and
// the studio can no longer correct a value it was able to enter.

/**
 * How the emergency contact is related to the client.
 *
 * A suggested list, not a closed one — the fields using it leave
 * SearchableSelect's freeform entry on, because family structures do not fit
 * twelve options and nothing groups a report by this column.
 */
export const RELATIONSHIPS = [
  'Spouse', 'Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister',
  'Friend', 'Relative', 'Colleague', 'Guardian', 'Other',
] as const;

/**
 * How the client found the studio.
 *
 * A CLOSED set, and the fields using it pass allowCustom={false}. This column
 * exists to be grouped by — "what did Instagram bring us last quarter" — and
 * a freeform entry makes "Instagram", "instagram" and "IG" three channels in
 * the report and one in the owner's head.
 *
 * The backend enforces the same list (CLIENT_SOURCES in
 * src/modules/pt-os/pt-os.routes.js) and rejects anything outside it on both
 * create and update, so this array is the UI half of a pair. Adding an option
 * means adding it in both places — the server-side list is the one that
 * decides, and a value only here would be refused with a 400.
 */
export const CLIENT_SOURCES = [
  'Walk-in', 'Instagram', 'WhatsApp', 'Referral',
  'Existing Member', 'Google', 'Website', 'Other',
] as const;

export type ClientSource = (typeof CLIENT_SOURCES)[number];
