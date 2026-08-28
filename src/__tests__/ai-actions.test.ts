// The action registry, and the two decisions in it that can quietly be wrong.
//
// First: context-awareness must REORDER and never FILTER. A shortcut that
// disappears because you happen to be on the wrong screen is not context
// awareness, it is a menu that hides things, and the failure is invisible —
// the grid still looks full.
//
// Second: clientIdFromPath feeds `client_id` on the chat request. Handing the
// model a non-id — the string "birthdays", say — sends it looking for a client
// that does not exist, and it answers about nothing in particular rather than
// erroring. Nothing in the UI reveals that.

import { describe, expect, it } from 'vitest';
import {
  AI_ACTIONS, AI_INPUT_EXAMPLES, actionsForPath, clientIdFromPath, resolveHref,
} from '@/lib/ai-actions';

const UUID = '3f1a2b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b';

describe('the action registry', () => {
  it('every shortcut leads somewhere', () => {
    expect(AI_ACTIONS.length).toBeGreaterThanOrEqual(10);
    for (const a of AI_ACTIONS) {
      expect(a.emoji).toBeTruthy();
      expect(a.label).toBeTruthy();
      // A tile that does nothing is worse than no tile.
      expect(Boolean(a.prompt) || Boolean(a.href) || Boolean(a.actionId)).toBe(true);
      if (a.kind === 'route') expect(a.href).toBeTruthy();
      if (a.kind === 'ask') expect(a.prompt).toBeTruthy();
      if (a.kind === 'execute') expect(a.actionId).toBeTruthy();
    }
  });

  it('an execute action carries no prompt, so it can never be mistaken for a question', () => {
    // runAction branches on kind. If an execute action also had a prompt, a
    // reordered branch would silently turn "send to 40 people" into a chat
    // message — the failure would look like nothing happening.
    for (const a of AI_ACTIONS.filter((x) => x.kind === 'execute')) {
      expect(a.prompt).toBeUndefined();
      expect(a.href).toBeUndefined();
    }
  });

  it('names the three executable actions the server actually exposes', () => {
    expect(AI_ACTIONS.filter((a) => a.kind === 'execute').map((a) => a.actionId).sort())
      .toEqual(['dues_reminders', 'lead_followup', 'renewal_reminders']);
  });

  it('has no duplicate ids', () => {
    expect(new Set(AI_ACTIONS.map((a) => a.id)).size).toBe(AI_ACTIONS.length);
  });

  it('offers the five example questions', () => {
    expect(AI_INPUT_EXAMPLES).toHaveLength(5);
  });
});

describe('actionsForPath', () => {
  it('never drops an action, whatever the page', () => {
    for (const path of ['/dashboard', '/finance/dues', '/pt-os/today', '/nowhere', '', '/']) {
      const got = actionsForPath(path);
      expect(got).toHaveLength(AI_ACTIONS.length);
      expect(new Set(got.map((a) => a.id))).toEqual(new Set(AI_ACTIONS.map((a) => a.id)));
    }
  });

  it('floats the relevant ones to the front', () => {
    const onFinance = actionsForPath('/finance/dues').slice(0, 3).map((a) => a.id);
    expect(onFinance).toContain('renewal-opportunities');
    expect(onFinance).toContain('renew-clients');

    const onToday = actionsForPath('/pt-os/today').slice(0, 3).map((a) => a.id);
    expect(onToday).toContain('today-priorities');
    expect(onToday).toContain('call-today');
  });

  it('prefers the more specific prefix', () => {
    // /pt-os/clients/<id> is about a client, so the client-shaped tools should
    // outrank things merely tagged to a broader area.
    const first = actionsForPath(`/pt-os/clients/${UUID}`).slice(0, 4).map((a) => a.id);
    expect(first).toContain('create-workout');
    expect(first).toContain('generate-diet');
  });

  it('keeps declaration order for equally relevant actions', () => {
    // On an unrelated page nothing scores, so the grid must not reshuffle.
    expect(actionsForPath('/nowhere').map((a) => a.id)).toEqual(AI_ACTIONS.map((a) => a.id));
  });

  it('does not treat /pt-os/clientsomething as /pt-os/clients', () => {
    // Prefix matching on a raw string would; matching on a path boundary does not.
    const ranked = actionsForPath('/pt-os/clientsomething').map((a) => a.id);
    expect(ranked).toEqual(AI_ACTIONS.map((a) => a.id));
  });
});

describe('clientIdFromPath', () => {
  it('finds the id on a client page and its sub-pages', () => {
    expect(clientIdFromPath(`/pt-os/clients/${UUID}`)).toBe(UUID);
    expect(clientIdFromPath(`/pt-os/clients/${UUID}/workout-log`)).toBe(UUID);
    expect(clientIdFromPath(`/pt-os/clients/${UUID}/edit`)).toBe(UUID);
  });

  it('returns null where there is no client', () => {
    expect(clientIdFromPath('/pt-os/clients')).toBeNull();
    expect(clientIdFromPath('/dashboard')).toBeNull();
    expect(clientIdFromPath(null)).toBeNull();
    expect(clientIdFromPath(undefined)).toBeNull();
  });

  it('refuses a path segment that is not an id', () => {
    // /pt-os/clients/birthdays is a page. Passing "birthdays" as client_id
    // would have the model answer about a client that does not exist.
    expect(clientIdFromPath('/pt-os/clients/birthdays')).toBeNull();
    expect(clientIdFromPath('/pt-os/clients/new')).toBeNull();
  });
});

describe('resolveHref', () => {
  const route = AI_ACTIONS.find((a) => a.id === 'create-workout')!;

  it('threads the current client into the target', () => {
    expect(resolveHref(route, UUID)).toBe(`/ai/workout-generator?client_id=${UUID}`);
  });

  it('still opens the page when there is no client', () => {
    expect(resolveHref(route, null)).toBe('/ai/workout-generator');
  });

  it('returns nothing for an ask action', () => {
    const ask = AI_ACTIONS.find((a) => a.kind === 'ask')!;
    expect(resolveHref(ask, UUID)).toBeNull();
  });

  it('declines to build a broken URL when the action needs a client and has none', () => {
    expect(resolveHref({ ...route, needsClient: true }, null)).toBeNull();
  });
});
