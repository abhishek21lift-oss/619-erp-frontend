// The Command Center shell: one of it, and truthful about what it measured.

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { TONE, toneFor, bySeverity, metaFor } from '@/components/platform/mission-control/tokens';

const ROOT = join(__dirname, '..', '..');
const MC = join(ROOT, 'src', 'components', 'platform', 'mission-control');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

describe('there is one shell, and the old one is gone', () => {
  it('removed CommandCenterRoot and the parts only it used', () => {
    for (const gone of ['CommandCenterRoot', 'Header', 'HeroHealth', 'KPISection', 'CardGrid']) {
      expect(existsSync(join(ROOT, 'src', 'components', 'platform', `${gone}.tsx`))).toBe(false);
    }
  });

  it('routes the console at the mission-control shell', () => {
    const panels = read('src/app/(platform)/platform/_shared/panels.tsx');
    expect(panels).toMatch(/mission-control\/MissionControl/);
    expect(panels).not.toMatch(/CommandCenterRoot/);
  });

  it('keeps Card.tsx as the drill-down rather than writing a second renderer', () => {
    // Card.tsx knows how to render all eight collector payloads. A second
    // renderer beside it would drift from the first one silently.
    const matrix = read('src/components/platform/mission-control/HealthMatrix.tsx');
    expect(matrix).toMatch(/from '@\/components\/platform\/Card'/);
  });
});

describe('every status has a distinct, non-colour-only tone', () => {
  const STATUSES = ['healthy', 'degraded', 'warning', 'timeout', 'critical', 'unavailable'] as const;

  it('covers all six', () => {
    for (const s of STATUSES) expect(TONE[s]).toBeDefined();
  });

  it('gives each one its own glyph, so colour is never the only channel', () => {
    // A red/green colour-blind operator has to be able to read this screen.
    const icons = STATUSES.map((s) => TONE[s].Icon);
    expect(new Set(icons).size).toBe(STATUSES.length);
  });

  it('does not paint degraded and warning the same', () => {
    // Degraded means WORKING, in a reduced mode; warning means past a
    // threshold. Sharing a colour would lose the difference between "know
    // this" and "act now" at exactly a glance.
    expect(TONE.degraded.color).not.toBe(TONE.warning.color);
  });

  it('ranks severity the way the backend does', () => {
    // registry.js SEVERITY_ORDER: healthy, unavailable, degraded, warning,
    // timeout, critical. If these disagree the console sorts an incident list
    // differently from the way the server graded it.
    const ranks = STATUSES.map((s) => TONE[s].rank);
    expect(TONE.healthy.rank).toBeLessThan(TONE.unavailable.rank);
    expect(TONE.unavailable.rank).toBeLessThan(TONE.degraded.rank);
    expect(TONE.degraded.rank).toBeLessThan(TONE.warning.rank);
    expect(TONE.warning.rank).toBeLessThan(TONE.timeout.rank);
    expect(TONE.timeout.rank).toBeLessThan(TONE.critical.rank);
    expect(new Set(ranks).size).toBe(STATUSES.length);
  });

  it('falls back to "not measured" for a status this build has not heard of', () => {
    // Forward compatibility: a newer backend status must not crash the console
    // or, worse, render as healthy.
    expect(toneFor('something_new').label).toBe(TONE.unavailable.label);
    expect(toneFor(undefined).label).toBe(TONE.unavailable.label);
    expect(toneFor(null).label).not.toBe(TONE.healthy.label);
  });
});

describe('the matrix puts the worst thing first', () => {
  it('sorts worst-first regardless of registration order', () => {
    const cards = [
      { name: 'a', status: 'healthy' },
      { name: 'b', status: 'critical' },
      { name: 'c', status: 'warning' },
      { name: 'd', status: 'degraded' },
    ];
    expect(bySeverity(cards, (c) => c.status).map((c) => c.name))
      .toEqual(['b', 'c', 'd', 'a']);
  });

  it('does not mutate the input', () => {
    const cards = [{ name: 'a', status: 'healthy' }, { name: 'b', status: 'critical' }];
    bySeverity(cards, (c) => c.status);
    expect(cards[0].name).toBe('a');
  });
});

describe('card metadata never leaves a card nameless', () => {
  it('names every collector the backend registers', () => {
    for (const n of ['runtime', 'http', 'database', 'redis', 'queues', 'ai', 'security', 'smtp']) {
      expect(metaFor(n).title).toBeTruthy();
      expect(metaFor(n).Icon).toBeTruthy();
    }
  });

  it('degrades to the raw name for a collector it has not heard of', () => {
    expect(metaFor('future_collector').title).toBe('future_collector');
    expect(metaFor('future_collector').Icon).toBeTruthy();
  });
});

describe('the shell shows what it could not measure', () => {
  const shell = read('src/components/platform/mission-control/MissionControl.tsx');
  const status = read('src/components/platform/mission-control/GlobalStatus.tsx');
  const bar = read('src/components/platform/mission-control/ObservabilityBar.tsx');

  it('renders the observability bar, not just a status', () => {
    expect(shell).toMatch(/<ObservabilityBar/);
    expect(bar).toMatch(/coverage/);
    expect(bar).toMatch(/blind/);
  });

  it('draws coverage as its own arc rather than folding it into health', () => {
    // A single "87% healthy" donut says how many cards came back green; it
    // does not say how many came back at all. Six failed probes and two green
    // ones read as 100% on that donut.
    expect(status).toMatch(/coverage/);
    expect(status.match(/<Arc/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('leads the headline with coverage when coverage is the problem', () => {
    expect(status).toMatch(/could not run/);
    expect(status).toMatch(/covers part of the platform/);
  });

  it('surfaces contract drift rather than leaving it to CI', () => {
    expect(bar).toMatch(/contract_violations/);
  });
});

describe('the topology reads the real degradation, not a hand-drawn diagram', () => {
  const topo = read('src/components/platform/mission-control/Topology.tsx');

  it('renders per-queue modes from the backend payload', () => {
    expect(topo).toMatch(/degradation\??\.queues/);
    expect(topo).toMatch(/stopped/);
    expect(topo).toMatch(/deferred/);
    expect(topo).toMatch(/inline/);
  });

  it('shows each queue its real impact sentence', () => {
    // Not a label the UI invents — the text the backend derived from the
    // producer code.
    expect(topo).toMatch(/\{q\.impact\}/);
  });
});

describe('no new hues were invented', () => {
  it('takes every colour from the app palette', () => {
    // lib/palette.ts: an earlier refactor cut 226 hex values to 47 because
    // colour carried no information. On an operations console that argument is
    // stronger — every decorative hue is one an operator learns to ignore.
    const files = readdirSync(MC).filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));
    const strays: string[] = [];
    for (const f of files) {
      const src = readFileSync(join(MC, f), 'utf8');
      for (const m of src.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) strays.push(`${f}: ${m[0]}`);
    }
    expect(strays).toEqual([]);
  });
});
