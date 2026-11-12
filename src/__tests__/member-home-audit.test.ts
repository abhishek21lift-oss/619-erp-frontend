// The member Home audit, held to the source: contrast tokens, honest plan
// data, a real <main>, and a nav that stays legible at 320px. Several of these
// are decisions a rendering test cannot see — the colour a token resolves to,
// or whether a label sits at 10px — so they are asserted where they live.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { srcPath } from '@/__tests__/helpers/app-routes';
import { MC } from '@/components/member/MemberUI';
import { heroMesh } from '@/components/member/memberTheme';
import { NAV_GROUPS } from '@/lib/nav-config';

const read = (...parts: string[]) => readFileSync(srcPath(...parts), 'utf8');
const dashboard = read('app', '(bare)', 'member', 'dashboard', 'page.tsx');
const hero = read('components', 'member', 'HomeHero.tsx');
const highlights = read('components', 'member', 'HomeHighlights.tsx');
const today = read('components', 'member', 'TodayCard.tsx');
const shell = read('components', 'member', 'MemberShell.tsx');
const nav = read('components', 'member', 'MemberNav.tsx');

describe('member text tokens', () => {
  it('uses the theme text tones for status words, and the 500s only for fills', () => {
    expect(MC.primaryText).toBe('var(--action-text)');
    expect(MC.successText).toBe('var(--success-text)');
    expect(MC.warningText).toBe('var(--warning-text)');
  });

  it('paints the paid-up balance and the weight delta with those tones', () => {
    expect(dashboard).toContain('C.successText');
    expect(dashboard).toContain('C.warningText');
  });
});

describe('the plan card tells the truth', () => {
  it('reads membership through planFacts and never invents a package or status', () => {
    expect(dashboard).toContain('planFacts({');
    expect(dashboard).not.toContain("'Personal Training'");
    expect(dashboard).not.toContain("profile.status || 'active'");
  });

  it('shows an unknown balance rather than "Paid up" when the read failed', () => {
    expect(dashboard).toMatch(/balance == null/);
    expect(dashboard).toMatch(/planLoaded/);
  });

  it('puts the payment action on a gradient that clears white text', () => {
    expect(dashboard).toContain("heroGradient('plan')");
    expect(dashboard).not.toContain("accentGradient('plan')");
  });

  it('gives the plan card a real heading', () => {
    expect(dashboard).toMatch(/<h2[^>]*>Current plan<\/h2>/);
  });
});

describe('member Home surfaces', () => {
  it('darkens the hero mesh enough for 12px white text', () => {
    expect(heroMesh.base).toContain('#BE185D');
  });

  it('gives the hero stat strip a dark tint and full-white labels', () => {
    expect(hero).toContain('rgba(15,23,42,0.22)');
    expect(hero).not.toContain('opacity-85');
    expect(hero).toContain('label="Total sessions"');
  });

  it('stacks the two Home actions at 320px', () => {
    expect(hero).toContain('min-[360px]:grid-cols-2');
  });

  it('uses a weight icon for weight and marks decorative icons', () => {
    expect(dashboard).toMatch(/\bWeight\b/);
    expect(dashboard).toContain('CreditCard size={15} aria-hidden');
  });

  it('handles a measurement failure instead of calling it "not recorded"', () => {
    expect(dashboard).toContain('measFailed');
    expect(dashboard).toMatch(/LoadError/);
  });

  it('builds the current month from the local clock', () => {
    expect(dashboard).toContain('getFullYear()');
    expect(dashboard).not.toContain('toISOString().slice(0, 7)');
  });
});

describe('Home highlights', () => {
  it('marks the recap tile as a link on both sides', () => {
    expect(highlights.match(/ChevronRight/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it('animates the goal bar without animating width', () => {
    expect(highlights).toContain('scaleX');
  });

  it('lifts the dark recap tile off the dark canvas', () => {
    expect(highlights).toContain('palette.gray[800]');
    expect(highlights).toContain('rgba(255,255,255,0.10)');
  });
});

describe('Today card copy', () => {
  it('does not cut the check-in explanation mid-word', () => {
    expect(today).toContain('Weight, sleep, energy, how the week went.');
    expect(today).not.toContain('Two minutes');
  });
});

describe('the member shell and nav', () => {
  it('gives every member page a main landmark and a skip target', () => {
    expect(shell).toMatch(/<main id="main-content"/);
    expect(shell.indexOf('</main>')).toBeLessThan(shell.indexOf('<MemberNav'));
  });

  it('keeps five legible tabs rather than seven at 10px', () => {
    const account = NAV_GROUPS.find((g) => g.id === 'my-account')!;
    expect(account.items.map((i) => i.label)).toEqual([
      'Home', 'Workout', 'Diet', 'Check-in', 'Profile',
    ]);
    expect(nav).toContain('text-[11px]');
    expect(nav).not.toContain('text-[10px]');
  });

  it('uses the theme text tones in the tab bar', () => {
    expect(nav).toContain('var(--action-text)');
    expect(nav).toContain('var(--text-muted)');
    expect(nav).not.toContain('palette.gray[500]');
  });
});
