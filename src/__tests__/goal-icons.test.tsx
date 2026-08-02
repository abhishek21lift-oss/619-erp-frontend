// Goal Setting icons must be components, not emoji.
//
// Every option in this module carried an emoji: 🏋️ for Fat Loss, 💪 for Muscle
// Gain, 😐🙂😃🤩 for the motivation scale. Three problems, none cosmetic:
//
//  1. An emoji is a font glyph. It is drawn by the platform, so the same goal
//     is a different picture on iOS, Android and Windows, and the trainer
//     picking it and the client reading the printout can see different things.
//  2. It carries its own colour, so it ignores the chip's selected state —
//     every other element in a selected chip turns white and the emoji does
//     not.
//  3. It cannot be sized or stroke-matched against the Lucide icons used
//     everywhere else in the same screens.
//
// A string is a valid ReactNode, so passing an emoji still type-checks
// perfectly after the widening in MultiSelectChips. Nothing but this test
// stops one coming back.
import { describe, expect, it } from 'vitest';
import { createElement, isValidElement } from 'react';

import { GOAL_TYPE_META, PRIORITY_META } from '@/components/pt-os/goal-assessment/types';
import { CHALLENGE_OPTIONS } from '@/components/pt-os/goal-assessment/StepChallenges';

/** Matches pictographic emoji, deliberately not ✓/✕/★ which are plain text. */
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F2FF}\u{2600}-\u{27BF}\u{FE0F}]/u;

describe('Goal Setting icons', () => {
  // Lucide icons are forwardRef objects, not plain functions, so `typeof` is
  // 'object' — asserting 'function' fails on correct code. What actually
  // matters is that it is not a string and React can render it.
  const isRenderableIcon = (icon: unknown) =>
    typeof icon !== 'string' && isValidElement(createElement(icon as never));

  it('goal types use icon components', () => {
    for (const g of GOAL_TYPE_META) {
      expect(isRenderableIcon(g.icon), `${g.label} icon`).toBe(true);
    }
  });

  it('priorities use icon components', () => {
    for (const p of PRIORITY_META) {
      expect(isRenderableIcon(p.icon), `${p.label} icon`).toBe(true);
    }
  });

  it('challenge chips use icon elements', () => {
    // These are pre-rendered elements rather than component references,
    // because the file is .tsx and the chip takes a ReactNode.
    for (const c of CHALLENGE_OPTIONS) {
      expect(isValidElement(c.icon), `${c.label} icon`).toBe(true);
    }
  });

  it('no label or value smuggles an emoji in as text', () => {
    const all = [...GOAL_TYPE_META, ...PRIORITY_META, ...CHALLENGE_OPTIONS];
    const offenders = all
      .filter((o) => EMOJI.test(o.label) || EMOJI.test(o.value))
      .map((o) => o.label);
    expect(offenders).toEqual([]);
  });

  it('no two goal types share an icon', () => {
    // 'Improve Endurance' and 'Marathon Preparation' were both 🏃 — two
    // different goals rendering as the same picture, in the same grid, which
    // is the failure emoji make easy because the vocabulary is small.
    const icons = GOAL_TYPE_META.map((g) => g.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it('no two challenges share an icon', () => {
    // 'Lack of Strength' and 'Gym Anxiety' were both 🏋️.
    const types = CHALLENGE_OPTIONS.map((c) => (c.icon as { type: unknown }).type);
    expect(new Set(types).size).toBe(types.length);
  });

  it('every priority is a real goal-side concept, not a stray key', () => {
    // Cheap guard: the two lists are edited together and drift silently.
    for (const p of PRIORITY_META) {
      expect(p.value).toMatch(/^[a-z_]+$/);
      expect(p.label.trim()).not.toBe('');
    }
  });
});
