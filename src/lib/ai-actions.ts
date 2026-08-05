/**
 * What the assistant can be asked to do, and which of those things matter on
 * the screen you are looking at.
 *
 * Two kinds of action, and the difference is honest rather than cosmetic:
 *
 *   kind: 'ask'   — sends a question to /api/ai/chat and streams the answer
 *                   back into the panel. The backend's tool layer resolves it
 *                   against this studio's own data.
 *   kind: 'route' — the studio already has a purpose-built screen for this
 *                   (the workout generator, the diet generator), and a chat
 *                   answer would be a worse version of it. The action opens
 *                   that screen instead of pretending to do it inline.
 *   kind: 'execute' — this one really does something: it messages clients.
 *                   The model never runs it. Tapping it asks the server for a
 *                   plan — who exactly, saying exactly what — and nothing
 *                   happens until the operator confirms that plan.
 *
 * Marking the second group honestly is the point. An assistant that answers
 * "sure, I've created the workout" without creating one is worse than a button
 * that takes you where the workout is actually created.
 */

export type AiActionKind = 'ask' | 'route' | 'execute';

export interface AiAction {
  id: string;
  /** Emoji is part of the spec for this surface — it is what makes a ten-item
   *  grid scannable at a glance on a phone. */
  emoji: string;
  label: string;
  kind: AiActionKind;
  /** kind: 'ask' — the prompt sent to the model. */
  prompt?: string;
  /** kind: 'route' — where to go. `:id` is filled from the current client. */
  href?: string;
  /** kind: 'execute' — the server-side action id. */
  actionId?: string;
  /** Route actions that need a client, when the current page has none, fall
   *  back to asking instead of navigating to a broken URL. */
  needsClient?: boolean;
  /** Path prefixes this action is especially relevant to. Used for ordering,
   *  never for hiding — every action stays reachable from every screen. */
  relevantTo?: string[];
}

export const AI_ACTIONS: AiAction[] = [
  {
    id: 'call-today',
    emoji: '🔥',
    label: 'Who should I call today?',
    kind: 'ask',
    prompt:
      'Who should I call today? Rank the clients by urgency — expiring packages, unpaid balances and missed sessions first — and give me one line on why for each.',
    relevantTo: ['/pt-os/today', '/dashboard', '/pt-os/clients'],
  },
  {
    id: 'create-workout',
    emoji: '🏋️',
    label: 'Create workout',
    kind: 'route',
    href: '/ai/workout-generator',
    relevantTo: ['/pt-os/clients', '/pt-os/workout-plans', '/pt-os/exercise-library'],
  },
  {
    id: 'generate-diet',
    emoji: '🥗',
    label: 'Generate diet',
    kind: 'route',
    href: '/ai/diet-generator',
    relevantTo: ['/pt-os/clients', '/pt-os/nutrition-assessment'],
  },
  {
    // Was a question that listed who is due. It now offers to actually message
    // them — behind a confirmation screen naming every recipient. The
    // informational version did not disappear: "Highest renewal
    // opportunities" below still answers who and how much.
    id: 'renew-clients',
    emoji: '💳',
    label: 'Send renewal reminders',
    kind: 'execute',
    actionId: 'renewal_reminders',
    relevantTo: ['/finance', '/pt-os/clients'],
  },
  {
    id: 'dues-reminders',
    emoji: '🧾',
    label: 'Send payment reminders',
    kind: 'execute',
    actionId: 'dues_reminders',
    relevantTo: ['/finance', '/finance/dues'],
  },
  {
    id: 'message-everyone',
    emoji: '📲',
    label: 'Message everyone',
    kind: 'ask',
    prompt:
      'Draft a short, warm broadcast message I can send to all active clients this week. Keep it under 40 words and make it specific to a personal training studio.',
    relevantTo: ['/engagement'],
  },
  {
    id: 'analyze-progress',
    emoji: '📈',
    label: 'Analyze client progress',
    kind: 'route',
    href: '/ai/progress-analysis',
    relevantTo: ['/pt-os/clients', '/pt-os/progress-photos', '/training'],
  },
  {
    id: 'at-risk',
    emoji: '⚠️',
    label: 'Clients at risk of leaving',
    kind: 'ask',
    prompt:
      'Which clients look at risk of leaving? Use attendance drop-off, expiring packages and unpaid balances, and tell me what to do about each one.',
    relevantTo: ['/dashboard', '/pt-os/clients', '/attendance'],
  },
  {
    id: 'renewal-opportunities',
    emoji: '💰',
    label: 'Highest renewal opportunities',
    kind: 'ask',
    prompt:
      'Where is my biggest renewal revenue right now? Rank by value, not just by date, and tell me who to approach first.',
    relevantTo: ['/finance', '/dashboard'],
  },
  {
    id: 'today-priorities',
    emoji: '📅',
    label: "Today's priorities",
    kind: 'ask',
    prompt:
      'What are my top priorities today? Sessions, follow-ups, renewals and collections — shortest useful list, most urgent first.',
    relevantTo: ['/pt-os/today', '/dashboard', '/pt-os/schedule-session'],
  },
  {
    id: 'studio-insights',
    emoji: '📊',
    label: 'Studio insights',
    kind: 'route',
    href: '/ai/business-insights',
    relevantTo: ['/dashboard', '/finance', '/platform'],
  },
];

/** Placeholder rotation for the input. Every one is a question the backend's
 *  tool layer can actually resolve against this studio's data. */
export const AI_INPUT_EXAMPLES = [
  'Which clients missed this week?',
  'Generate a fat loss program.',
  'Show pending PT renewals.',
  'Who needs follow-up today?',
  'Send reminders to expiring members.',
];

/**
 * The client id in a PT-OS client URL, if we are on one.
 *
 * /pt-os/clients/<uuid>            → the id
 * /pt-os/clients/<uuid>/workout-log → the id
 * /pt-os/clients                   → null
 * /pt-os/clients/birthdays         → null, because that is a page and not a
 *                                    client, and passing it as client_id
 *                                    would send the model looking for a
 *                                    client that does not exist.
 */
const UUID_ISH = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function clientIdFromPath(pathname: string | null | undefined): string | null {
  if (!pathname) return null;
  const m = pathname.match(/\/pt-os\/clients\/([^/?#]+)/);
  if (!m) return null;
  return UUID_ISH.test(m[1]) ? m[1] : null;
}

/**
 * The same ten actions, reordered so the ones that belong to this screen come
 * first. Nothing is removed — an assistant that hides a capability because you
 * happen to be on the wrong page is just a worse menu.
 *
 * Ties keep their declared order, so the grid does not reshuffle between two
 * pages that are equally relevant.
 */
export function actionsForPath(pathname: string | null | undefined, actions: AiAction[] = AI_ACTIONS): AiAction[] {
  const path = pathname ?? '';
  const score = (a: AiAction) => {
    if (!a.relevantTo?.length) return 0;
    // Longest matching prefix wins: /pt-os/clients/x is more specifically
    // about a client than it is about /pt-os.
    let best = 0;
    for (const prefix of a.relevantTo) {
      if (path === prefix || path.startsWith(`${prefix}/`)) best = Math.max(best, prefix.length);
    }
    return best;
  };
  return actions
    .map((a, i) => ({ a, i, s: score(a) }))
    .sort((x, y) => (y.s - x.s) || (x.i - y.i))
    .map(({ a }) => a);
}

/** Where a route action should actually go, given the current client. */
export function resolveHref(action: AiAction, clientId: string | null): string | null {
  if (action.kind !== 'route' || !action.href) return null;
  if (action.needsClient && !clientId) return null;
  return clientId ? `${action.href}?client_id=${encodeURIComponent(clientId)}` : action.href;
}
