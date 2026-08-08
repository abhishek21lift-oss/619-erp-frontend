// Every page sits where the dashboard sits.
//
// The report pages had each grown their own shell: a pale `--bg-subtle` slab
// with `borderRadius: '0 0 36px 36px'` for the title, then a content block
// with `padding: '24px 32px'`. That 32px is applied INSIDE `.shell-main`,
// which already pays 16px on a phone — so these pages sat at 48px from the
// screen edge while the dashboard sat at 16, and flicking between them the
// content visibly jumped inward.
//
// The fix is that `PageContainer` carries the dashboard's own measurements,
// character for character. The test below is that claim, checked rather than
// asserted in a comment — because the failure mode is a one-word edit to
// either side that nothing else notices.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const code = (s: string) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const src = (...p: string[]) => code(readFileSync(join(__dirname, '..', ...p), 'utf8'));

const shell = src('components', 'ui', 'PageHero.tsx');
const dashboard = src('components', 'dashboards', 'PtOsDashboard.tsx');

/** The classes PageContainer passes to cn(), flattened to one string. */
function containerClasses(): string {
  const block = shell.slice(shell.indexOf('export function PageContainer'));
  const args = block.slice(block.indexOf('cn('), block.indexOf('className,'));
  return (args.match(/'([^']+)'/g) ?? []).map((s) => s.slice(1, -1)).join(' ').split(/\s+/).join(' ');
}

/** The dashboard's own scroll container. */
function dashboardClasses(): string {
  const m = /className="(relative mx-auto w-full max-w-7xl[^"]*)"/.exec(dashboard);
  if (!m) throw new Error('dashboard scroll container not found — did its classes change?');
  return m[1].split(/\s+/).join(' ');
}

describe('the page container is the dashboard container', () => {
  it('matches it exactly', () => {
    expect(containerClasses()).toBe(dashboardClasses());
  });

  it('leaves the gap under the top bar to pt-1, as the dashboard does', () => {
    expect(containerClasses()).toContain('pt-1');
  });

  it('adds no horizontal padding of its own', () => {
    // The gutter is `.shell-main`'s job — 16px on mobile, 24px from sm up. A
    // px-* here would be added on top of it and put the page out of line with
    // every other page in the app.
    expect(containerClasses()).not.toMatch(/\bp[xl]-/);
  });

  it('clears the mobile bottom nav', () => {
    expect(containerClasses()).toContain('env(safe-area-inset-bottom,0px)');
  });
});

describe('no page draws a container box around its own title', () => {
  // The specific shape that was on four pages. `0 0 36px 36px` is a slab
  // squared off against the top bar; it reads as a box drawn around the
  // heading rather than as the page's header.
  const pages = [
    ['app', 'reports', 'page.tsx'],
    ['app', 'insights', 'renewal', 'page.tsx'],
    ['app', 'insights', 'traffic', 'page.tsx'],
    ['app', 'insights', 'sessions', 'page.tsx'],
    ['app', 'operations', 'leaderboard', 'page.tsx'],
    ['app', 'attendance', 'page.tsx'],
    ['app', 'pt-os', 'clients', 'page.tsx'],
    ['app', 'pt-os', 'clients', 'birthdays', 'page.tsx'],
    ['app', 'pt-os', 'leads', 'page.tsx'],
    ['app', 'pt-os', 'new-client', 'page.tsx'],
    ['app', 'pt-os', 'today', 'page.tsx'],
    ['app', 'pt-os', 'workout-plans', 'page.tsx'],
    ['app', 'pt-os', 'exercise-library', 'page.tsx'],
    ['app', 'pt-os', 'diet-plans', 'page.tsx'],
    ['app', 'finance', 'forecast', 'page.tsx'],
    ['app', 'finance', 'dues', 'page.tsx'],
    ['app', 'finance', 'invoices', 'page.tsx'],
    ['app', 'finance', 'collected-payments', 'page.tsx'],
    ['app', 'pt-os', 'balance-sheet', 'page.tsx'],
    ['app', 'insights', 'revenue', 'page.tsx'],
    ['app', 'engagement', 'automation', 'page.tsx'],
    ['app', 'engagement', 'campaigns', 'page.tsx'],
    ['app', 'engagement', 'feedback', 'page.tsx'],
    ['app', 'engagement', 'notifications', 'page.tsx'],
    ['app', 'engagement', 'offers', 'page.tsx'],
    ['app', 'engagement', 'whatsapp', 'page.tsx'],
    ['app', 'ai', 'workout-generator', 'page.tsx'],
    ['app', 'ai', 'diet-generator', 'page.tsx'],
    ['app', 'ai', 'progress-analysis', 'page.tsx'],
    ['app', 'ai', 'business-insights', 'page.tsx'],
    ['app', 'ai-coach', 'knowledge', 'page.tsx'],
    ['app', 'pt-os', 'clients', '[id]', 'enroll', 'page.tsx'],
    ['app', 'pt-os', 'clients', '[id]', 'renew', 'page.tsx'],
    ['app', 'pt-os', 'goals', 'page.tsx'],
    ['app', 'pt-os', 'sessions', 'page.tsx'],
    ['app', 'pt-os', 'strength-tracking', 'page.tsx'],
    ['app', 'pt-os', 'clients', '[id]', 'training', 'assigned', 'page.tsx'],
    ['app', 'pt-os', 'clients', '[id]', 'training', 'analytics', 'page.tsx'],
    ['app', 'pt-os', 'clients', '[id]', 'payments', 'page.tsx'],
    ['app', 'pt-os', 'session-balance', 'page.tsx'],
    ['app', 'pt-os', 'progress-photos', 'page.tsx'],
  ];

  it.each(pages)('%s/%s/%s has no slab header', (...p) => {
    expect(src(...p)).not.toContain("borderRadius: '0 0 36px 36px'");
  });

  it.each(pages)('%s/%s/%s pays no gutter of its own', (...p) => {
    const s = src(...p);
    expect(s).not.toMatch(/padding: '52px 32px/);
    expect(s).not.toMatch(/padding: '24px 32px'/);
    expect(s).not.toMatch(/padding: '0 32px/);
  });

  it.each(pages)('%s/%s/%s uses the shared hero and container', (...p) => {
    const s = src(...p);
    expect(s).toContain('<PageContainer>');
    expect(s).toContain('<PageHero');
  });

  it.each(pages)('%s/%s/%s is off the double-padding legacy scaffold', (...p) => {
    // `.page-main` sets its own 16px inside `.shell-main`'s 16px.
    expect(src(...p)).not.toContain('className="page-main"');
  });
});

describe('attendance reports merged into the attendance page', () => {
  const reports = src('app', 'attendance', 'reports', 'page.tsx');
  const attendance = src('app', 'attendance', 'page.tsx');

  it('leaves the old path as a redirect, not a 404', () => {
    // The path is in browser bookmarks and in whatever the studio has pinned.
    // Deleting the file turns a page that still exists under a different name
    // into a support call.
    expect(reports).toContain("router.replace('/attendance?tab=insights')");
  });

  it('lands on the tab the content actually moved to', () => {
    // A redirect to ?tab=insights that the target ignores is a redirect to the
    // member list — the promise the URL makes has to be one the page keeps.
    expect(attendance).toContain('useSearchParams');
    expect(attendance).toContain("sp.get('tab') === 'insights' ? 'insights'");
  });

  it('carries the parts of the old page that held information', () => {
    expect(attendance).toContain('function MethodBreakdown');
    expect(attendance).toContain('function MonthlySummary');
    expect(attendance).toContain('function RangeBar');
  });

  it('drops the card that was labelled a trend and had no time axis', () => {
    // "Footfall Trend" drew one bar per STATUS — present, late, absent. It
    // could not show a trend. The weekly chart beside it does plot days.
    expect(attendance).not.toContain('Footfall Trend');
    expect(attendance).toContain('Weekly Attendance Trends');
  });

  it('sends the two buttons that opened it to the tab instead', () => {
    expect(attendance).not.toContain("router.push('/attendance/reports')");
    expect(attendance).toContain("onGenerateReport={() => setActiveTab('insights')}");
  });

  it('does not fetch 90 days of history until the tab is opened', () => {
    // Two extra requests on a page whose landing tab is the member list.
    expect(attendance).toContain("if (activeTab !== 'insights') return;");
  });

  it('averages a month over the days it was open, not over its own rows', () => {
    // The old page divided a month's check-ins by the number of records in
    // that month — checkins/checkins — so "Avg Daily" printed 1 every month.
    expect(attendance).toContain('d.checkins / Math.max(d.days.size, 1)');
  });
});

describe('pages that had their own width and their own top gap', () => {
  // Each of these set a container of its own instead of the dashboard's:
  // max-w-[1600px] with mt-1 on two of them (320px wider than the dashboard,
  // a pixel higher), maxWidth 1100 with a further 20px of side padding INSIDE
  // .shell-main's 16px on another, and pt-1 with a bare max-w-3xl on the form.
  const own = [
    ['app', 'pt-os', 'clients', 'page.tsx'],
    ['app', 'pt-os', 'leads', 'page.tsx'],
  ];

  it.each(own)('%s/%s/%s no longer sets max-w-[1600px]', (...p) => {
    expect(src(...p)).not.toContain('max-w-[1600px]');
  });

  it('the birthday page pays no gutter inside the shell gutter', () => {
    expect(src('app', 'pt-os', 'clients', 'birthdays', 'page.tsx'))
      .not.toContain("padding: '24px 20px 60px'");
  });

  it('the new-client form keeps a reading measure but not its own top gap', () => {
    // max-w-3xl is right for a column of inputs — 1280px of text fields is
    // unusable. What was wrong was the page starting at pt-1.
    const form = src('app', 'pt-os', 'new-client', 'page.tsx');
    expect(form).toContain('max-w-3xl');
    expect(form).not.toContain('className="pt-1"');
  });

  it('the birthday page drops the two-hue tile that read as an emoji badge', () => {
    // A 48px blue-to-amber gradient square with a white cake in it. Nothing
    // else in the app mixes two hues in one icon tile, and at that size it
    // read as a coloured emoji stuck to the corner of the page.
    //
    // Scoped to the header tile, not to the gradient: the same two hues are
    // still on the small TODAY pill in a birthday row, where a celebratory
    // badge is what it is meant to be and it is not "the top of the page".
    const bd = src('app', 'pt-os', 'clients', 'birthdays', 'page.tsx');
    expect(bd).not.toContain('<Cake size={22} color="#fff" />');
    expect(bd).toContain('icon={<Cake size={20} />}');
  });
});

describe('the five module pages', () => {
  it('the client picker is a hero, not a coloured banner strip', () => {
    // One strip served ten tools — Workout Log, Goals, Progress Photos and the
    // rest — so all ten move together. It also carried per-title-length type
    // stepping to stop long names running into the icon tile; the hero wraps,
    // so that goes with it.
    const picker = src('components', 'pt-os', 'shared', 'ClientPicker.tsx');
    expect(picker).toContain('<PageHero');
    expect(picker).toContain('<PageContainer>');
    expect(picker).not.toContain('max-w-4xl pt-3 pb-6');
    expect(picker).not.toContain("title.length > 18");
  });

  it('exercise library stops paying its gutter twice', () => {
    // max-w-[1600px] with px-4 sm:px-6 INSIDE .shell-main's own gutter.
    const lib = src('app', 'pt-os', 'exercise-library', 'page.tsx');
    expect(lib).not.toContain('max-w-[1600px] px-4');
  });

  it('workout plans drops the tinted gradient panel around its header', () => {
    // A lavender-to-pink card with its own corner glows and its own
    // max-w-[1400px] — a different surface from every other page's header, and
    // 120px wider than the dashboard. The KPI tiles inside it were tiles on a
    // tile; they are cards on the page now.
    const wp = src('app', 'pt-os', 'workout-plans', 'page.tsx');
    expect(wp).not.toContain('max-w-[1400px]');
    expect(wp).not.toContain('from-indigo-500/10 via-violet-500/10 to-pink-500/10');
  });

  it('today keeps its progress bar, on the hero', () => {
    const today = src('app', 'pt-os', 'today', 'page.tsx');
    expect(today).toContain('role="progressbar"');
    expect(today).not.toContain('max-w-screen-md px-4');
  });
});

describe('the diet page adds its macros instead of concatenating them', () => {
  // protein/carbs/fats are Postgres `numeric`, and node-postgres returns
  // numeric as a STRING to avoid losing precision. So `0 + "25.0"` was the
  // string "025.0" — the stray leading zero on the rings.
  //
  // With one meal it only looks wrong. With two it is "025.0" + "30.0" =
  // "025.030.0", and the ring fill, the macro donut and the remaining-kcal
  // figure downstream of it are all NaN. calories is an `integer` column and
  // comes back as a number, which is why it was the only one of the four that
  // ever added up.
  const diet = src('app', 'pt-os', 'diet-plans', 'page.tsx');

  it('coerces every macro before summing it', () => {
    expect(diet).toContain('const num = (v: unknown) => Number(v) || 0;');
    for (const k of ['calories', 'protein', 'carbs', 'fats']) {
      expect(diet).toContain(`s + num(m.${k})`);
    }
  });

  it('no longer adds a raw field straight onto the accumulator', () => {
    expect(diet).not.toMatch(/s \+ \(m\.(protein|carbs|fats|calories) \|\| 0\)/);
  });

  it('rounds for display, because summing floats gives 25.400000000000002', () => {
    expect(diet).toContain('Math.round(macro.value * 10) / 10');
  });
});

describe('the finance pages', () => {
  // All five set `maxWidth: 1280` with their own 16–20px of side padding,
  // INSIDE .shell-main's 16px. Balance Sheet then added a further 40px on the
  // header block, putting its title 76px from the screen edge on a phone where
  // the dashboard sits at 16.
  const finance = [
    ['app', 'finance', 'forecast', 'page.tsx'],
    ['app', 'finance', 'dues', 'page.tsx'],
    ['app', 'finance', 'invoices', 'page.tsx'],
    ['app', 'finance', 'collected-payments', 'page.tsx'],
    ['app', 'pt-os', 'balance-sheet', 'page.tsx'],
  ];

  it.each(finance)('%s/%s/%s sets no 1280px container of its own', (...p) => {
    const s = src(...p);
    expect(s).not.toMatch(/maxWidth: 1280/);
    expect(s).not.toContain("maxWidth: '1280px'");
    expect(s).not.toContain('max-w-[1280px]');
  });

  it('invoices no longer nests a second container inside the first', () => {
    // A hero container at maxWidth 1280 and then a content container at
    // maxWidth 1280 with its own padding — two, neither of them the
    // dashboard's. The width assertion above catches both; this one catches
    // the padding the inner container paid.
    //
    // Scoped to that padding rather than to `marginLeft: 'auto'`, which the
    // file still uses legitimately to right-align a skeleton row and a toolbar
    // spacer.
    const inv = src('app', 'finance', 'invoices', 'page.tsx');
    expect(inv).not.toContain("isSm ? '24px 32px 112px' : '24px 16px 112px'");
  });

  it('collected payments drops the tinted gradient card around its header', () => {
    const cp = src('app', 'finance', 'collected-payments', 'page.tsx');
    expect(cp).not.toContain('from-cyan-500/10 via-blue-500/10 to-violet-500/10');
  });

  it('the KPI rows are two-up on a phone, not one', () => {
    // auto-fit/auto-fill minmax(180–220px, 1fr) gives one full-width tile per
    // row at 390px: four figures over four screenfuls.
    for (const p of [
      ['app', 'finance', 'invoices', 'page.tsx'],
      ['app', 'pt-os', 'balance-sheet', 'page.tsx'],
    ]) {
      const s = src(...p);
      expect(s).not.toMatch(/minmax\(\s*(180|220)px/);
      expect(s).toContain('grid-cols-2');
    }
  });
});

describe('the engagement section (Communication)', () => {
  // All six pages set `maxWidth: 1280` with 20px of their own side padding,
  // INSIDE .shell-main's 16px, and a pale/light hero instead of the dashboard's
  // navy one. Three of the six (automation, feedback, offers) carried a
  // human-authored `HERO — DO NOT CHANGE` comment from an earlier pass that
  // fixed contrast below the hero but deliberately left it alone; that
  // decision is superseded here on explicit instruction to bring every
  // engagement page onto the shared hero and gutters.
  const engagement = [
    ['app', 'engagement', 'automation', 'page.tsx'],
    ['app', 'engagement', 'campaigns', 'page.tsx'],
    ['app', 'engagement', 'feedback', 'page.tsx'],
    ['app', 'engagement', 'notifications', 'page.tsx'],
    ['app', 'engagement', 'offers', 'page.tsx'],
    ['app', 'engagement', 'whatsapp', 'page.tsx'],
  ];

  it.each(engagement)('%s/%s/%s sets no 1280px container of its own', (...p) => {
    expect(src(...p)).not.toMatch(/maxWidth:\s*1280/);
  });

  it.each(engagement)('%s/%s/%s carries no leftover DO-NOT-CHANGE marker', (...p) => {
    expect(src(...p)).not.toMatch(/DO NOT CHANGE/);
  });

  it('the four pages with a primary action move it into the hero actions slot', () => {
    // Campaigns, Notifications and Offers already put "New X" beside the
    // title; Automation's "New Rule" sat in its own row below the KPIs
    // instead, which is now consistent with the other three.
    for (const p of [
      ['app', 'engagement', 'automation', 'page.tsx'],
      ['app', 'engagement', 'campaigns', 'page.tsx'],
      ['app', 'engagement', 'notifications', 'page.tsx'],
      ['app', 'engagement', 'offers', 'page.tsx'],
    ]) {
      const s = src(...p);
      expect(s).toContain('actions={');
      expect(s).toContain("background: 'rgba(255,255,255,0.12)'");
    }
  });

  it('the KPI rows are two-up on a phone, not one column that only widens past four', () => {
    // repeat(auto-fit, minmax(150px, 1fr)) does collapse on a phone, but not
    // to the app's usual two-column rhythm — it is replaced with the same
    // grid-cols-2 lg:grid-cols-N every other converted KPI row uses.
    for (const p of engagement) {
      const s = src(...p);
      expect(s).not.toMatch(/minmax\(150px/);
    }
  });

  it('no engagement page still asks for a fixed multi-column grid that cannot collapse', () => {
    // gridTemplateColumns: '1fr 1fr' / '1fr 1fr 1fr' / '1fr 380px' — three or
    // four across, or one fixed 380px column, on a 390px phone. Every one of
    // these is now a responsive Tailwind grid instead.
    for (const p of engagement) {
      const s = src(...p);
      expect(s).not.toMatch(/gridTemplateColumns:\s*'1fr 1fr/);
      expect(s).not.toMatch(/gridTemplateColumns:\s*'1fr 380px'/);
    }
  });

  it('whatsapp stacks the member list above the template panel on a phone', () => {
    // The fixed 1fr 380px split put a 380px-wide panel on a 390px screen —
    // 10px left for everything else. It is one column until lg now.
    const wa = src('app', 'engagement', 'whatsapp', 'page.tsx');
    expect(wa).toContain("grid-cols-1 lg:grid-cols-[1fr_380px]");
  });
});

describe('the AI suite (Workout/Diet Generator, Progress Analyzer, Business Insights, Knowledge Base)', () => {
  // Each page built its own colourful gradient hero card instead of the
  // dashboard's navy one — a different accent per page (blue, green, amber,
  // violet, blue again) — inside a bare maxWidth wrapper rather than
  // PageContainer's gutter.
  const aiPages = [
    ['app', 'ai', 'workout-generator', 'page.tsx'],
    ['app', 'ai', 'diet-generator', 'page.tsx'],
    ['app', 'ai', 'progress-analysis', 'page.tsx'],
    ['app', 'ai', 'business-insights', 'page.tsx'],
    ['app', 'ai-coach', 'knowledge', 'page.tsx'],
  ];

  it.each(aiPages)('%s/%s/%s/%s no longer passes a title to AppShell', (...p) => {
    // PageHero supplies the title now; AppShell's own `title` prop renders a
    // second, plainer heading above it — the two together would print the
    // page name twice.
    expect(src(...p)).not.toMatch(/<AppShell title=/);
  });

  it('workout and diet generators drop their own gradient hero card', () => {
    for (const p of [
      ['app', 'ai', 'workout-generator', 'page.tsx'],
      ['app', 'ai', 'diet-generator', 'page.tsx'],
    ]) {
      const s = src(...p);
      expect(s).not.toMatch(/radial-gradient\(circle 220px/);
      expect(s).not.toContain('rounded-[28px]');
    }
  });

  it('the feature-pill rows restyle for the navy hero instead of their own tint', () => {
    // 'rgba(255,255,255,0.75)' pills on a pale card become translucent white
    // on navy — the same chip balance-sheet and leads use in PageHero.
    for (const p of [
      ['app', 'ai', 'workout-generator', 'page.tsx'],
      ['app', 'ai', 'diet-generator', 'page.tsx'],
      ['app', 'ai', 'progress-analysis', 'page.tsx'],
    ]) {
      const s = src(...p);
      expect(s).not.toContain('rgba(255,255,255,0.75)');
      expect(s).toContain("background: 'rgba(255,255,255,0.14)'");
    }
  });

  it('progress analyzer drops its own 52px icon tile and marginBottom-40 hero block', () => {
    const pa = src('app', 'ai', 'progress-analysis', 'page.tsx');
    expect(pa).not.toContain('width: 52, height: 52');
    expect(pa).not.toContain('marginBottom: 40');
  });

  it('business insights drops the hardcoded icon-plus-h1 header row', () => {
    const bi = src('app', 'ai', 'business-insights', 'page.tsx');
    expect(bi).not.toContain('<h1 className="text-2xl font-bold text-gray-900">AI Business Insights</h1>');
    expect(bi).not.toContain('p-2.5 rounded-xl bg-violet-500/10');
  });

  it('knowledge base moves Upload Document into the hero actions slot', () => {
    const kb = src('app', 'ai-coach', 'knowledge', 'page.tsx');
    // The old header's own 48px gradient icon tile is gone — PageHero draws
    // its own — and the button that used to sit beside a plain h1 is now in
    // the actions slot.
    expect(kb).not.toContain('width: 48, height: 48, borderRadius: 14');
    expect(kb).toContain('actions={');
    expect(kb).toContain('Upload Document');
  });
});

describe('the client-scoped PT pages (enroll, renew, goals, sessions, strength tracking)', () => {
  it('enroll keeps the per-client fact chips, restyled for the navy hero', () => {
    // "Member since" / "Age" / "Weight" / "Goal" — conditional, so a client
    // missing a date of birth or a goal gets a shorter row rather than a row
    // of dashes. The chip itself moves from a dark-on-light tint to a
    // translucent white one; the avatar it used to sit beside is gone —
    // PageHero's icon slot draws its own tile and cannot host a photo.
    const enroll = src('app', 'pt-os', 'clients', '[id]', 'enroll', 'page.tsx');
    expect(enroll).toContain('heroFacts.map');
    expect(enroll).toContain("background: 'rgba(255,255,255,0.14)'");
    expect(enroll).not.toContain('<ClientAvatar');
  });

  it('the goal wizard progress timeline is readable on navy, not near-black-on-navy', () => {
    // GoalProgressTimeline was built for a light page background: the active
    // step's circle was #0f172a (near-black) and its label was the same
    // #0f172a on top of it — invisible once the component moved inside
    // PageHero's navy gradient. Fixed at the source since this component
    // has exactly one caller.
    const timeline = src('components', 'pt-os', 'goal-assessment', 'GoalProgressTimeline.tsx');
    expect(timeline).not.toContain("active ? '#0f172a'");
    expect(timeline).not.toContain("background: '#e2e8f0'");
  });

  it('the goals list and goal wizard headers both use PageHero', () => {
    // Two return paths in one file — the client's goal list and the
    // multi-step wizard for creating/editing one — each had its own ad-hoc
    // header. Both convert, not just the one the screenshot showed.
    const goals = src('app', 'pt-os', 'goals', 'page.tsx');
    expect((goals.match(/<PageHero/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect((goals.match(/<PageContainer>/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('sessions moves refresh into the hero actions slot', () => {
    const sessions = src('app', 'pt-os', 'sessions', 'page.tsx');
    expect(sessions).toContain('actions={');
    expect(sessions).not.toContain("bg-[rgba(0,103,224,0.08)] text-[#0067E0]");
  });

  it('strength tracking keeps the missing-bodyweight warning, recoloured for navy', () => {
    const st = src('app', 'pt-os', 'strength-tracking', 'page.tsx');
    expect(st).toContain('No bodyweight on file');
    expect(st).not.toContain("mt-2 text-[12.5px]");
    expect(st).toContain("color: '#FDE68A'");
  });

  it('renew PT gets a hero instead of a bare h1', () => {
    const renew = src('app', 'pt-os', 'clients', '[id]', 'renew', 'page.tsx');
    expect(renew).not.toContain('text-[20px] font-[800] tracking-tight');
    expect(renew).toContain('title="Renew PT"');
  });
});

describe('the training/payments/session-balance/photo pages', () => {
  it('assigned workouts and progress analytics drop their bare h1', () => {
    for (const p of [
      ['app', 'pt-os', 'clients', '[id]', 'training', 'assigned', 'page.tsx'],
      ['app', 'pt-os', 'clients', '[id]', 'training', 'analytics', 'page.tsx'],
    ]) {
      const s = src(...p);
      expect(s).not.toContain('text-[20px] font-[800]');
      expect(s).not.toContain('max-w-screen-md px-4 py-4');
    }
  });

  it('client payments moves Profile and Record Payment into the hero actions slot', () => {
    const payments = src('app', 'pt-os', 'clients', '[id]', 'payments', 'page.tsx');
    expect(payments).toContain('actions={');
    expect(payments).toContain('Record Payment');
    expect(payments).toContain('Profile');
  });

  it('the local StatusBadge tint is strong enough to read as a pill on navy', () => {
    // It sat at ~9% alpha (hex suffix 18) on a white card; on the hero that
    // is indistinguishable from the background, leaving only the coloured
    // text. Bumped to ~20% (suffix 33) since this component has one caller.
    const payments = src('app', 'pt-os', 'clients', '[id]', 'payments', 'page.tsx');
    expect(payments).not.toContain("bg: '#10b98118'");
    expect(payments).toContain("bg: '#10b98133'");
  });

  it('session balance and progress photos both use the shared hero', () => {
    for (const p of [
      ['app', 'pt-os', 'session-balance', 'page.tsx'],
      ['app', 'pt-os', 'progress-photos', 'page.tsx'],
    ]) {
      const s = src(...p);
      expect(s).toContain('<PageHero');
      expect(s).not.toContain("mb-6");
    }
  });
});

describe('revenue analytics loses its own icon tile and header row', () => {
  // The lone stray in an otherwise-converted section: renewal, sessions and
  // traffic all used PageHero already, this one still built its own h1 next
  // to a bare `--bg-subtle` rounded square.
  const revenue = src('app', 'insights', 'revenue', 'page.tsx');

  it('has no header-local icon tile', () => {
    expect(revenue).not.toContain('h-11 w-11 shrink-0 items-center justify-center rounded-2xl');
    expect(revenue).not.toContain('<header className="flex flex-wrap items-center justify-between');
  });

  it('moves refresh into the hero actions slot, styled for the navy surface', () => {
    // The old button sat on `--bg-subtle`, which resolves light-on-light
    // against the page background. On the hero it needs the same translucent
    // white chip exercise-library and leads use for their own hero actions.
    expect(revenue).toContain('actions={');
    expect(revenue).toContain("background: 'rgba(255,255,255,0.12)'");
  });
});

describe('the hero', () => {
  it('carries the dashboard hero\'s shape and gradient', () => {
    expect(shell).toContain('rounded-[24px]');
    expect(shell).toContain('sm:rounded-[30px]');
    expect(shell).toContain('linear-gradient(158deg, #0F172A 0%, #0050AD 42%, #0F172A 72%, #0050AD 100%)');
  });

  it('does not copy the infinite sheen sweep', () => {
    // One perpetual animation on the screen you land on is a flourish. The
    // same loop on every report page is motion for its own sake, and it runs
    // forever on a page whose job is to be read.
    expect(shell).not.toContain('repeat: Infinity');
  });

  it('skips its entrance under prefers-reduced-motion', () => {
    expect(shell).toContain('useReducedMotion');
    expect(shell).toContain('initial={reduce ? false');
  });

  it('keeps the decoration behind the text and out of the tab order', () => {
    expect(shell).toContain('pointer-events-none');
    expect(shell).toContain('aria-hidden');
  });
});

describe('what the phone screenshots showed', () => {
  it('the reports KPI row is not four hard columns any more', () => {
    // `repeat(4,1fr)` at 390px left each tile ~85px, so the values rendered
    // as "₹..", "J.." and "₹90...".
    const reports = src('app', 'reports', 'page.tsx');
    expect(reports).not.toContain("gridTemplateColumns: 'repeat(4,1fr)'");
    expect(reports).toContain('grid-cols-2');
  });

  it('the attendance date fields cannot outgrow their column', () => {
    // `<input type="date">` sizes to its own content, which is how the "To"
    // field ended up off the right of the screen.
    const traffic = src('app', 'insights', 'traffic', 'page.tsx');
    expect(traffic).toContain('w-full min-w-0');
  });

  it('the 17-hour chart scrolls inside its card instead of squeezing', () => {
    const traffic = src('app', 'insights', 'traffic', 'page.tsx');
    expect(traffic).toContain('overflow-x-auto');
    expect(traffic).toContain('min-w-[520px]');
  });

  it('the attendance hero no longer repeats the KPI row', () => {
    // Present today / Attendance rate / Late arrivals / Unmarked sat in the
    // hero, and the KPI row directly below has all four plus Absent and Total.
    // On a phone both stacks are one-per-row, so the page opened with the same
    // four figures twice and you scrolled two screens to reach a member.
    const att = src('app', 'attendance', 'page.tsx');
    expect(att).not.toContain("label: 'Present today'");
    expect(att).not.toContain("label: 'Attendance rate'");
    expect(att).not.toContain("label: 'Late arrivals'");
  });

  it('the attendance hero claims no hardware it never asked about', () => {
    // "Live sync active" with a pulsing green dot, and "Biometric device
    // connected", were literals with no socket, handshake or state behind
    // them. An indicator that is always green is worse than none, because a
    // trainer believes it and stops checking.
    const att = src('app', 'attendance', 'page.tsx');
    expect(att).not.toContain('Live sync active');
    expect(att).not.toContain('Biometric device connected');
  });

  it('the report tabs use labels that fit', () => {
    // Measured: the full labels lay out at 400px in a strip that is 318px
    // wide on a 390px phone, which is why each one wrapped onto two lines.
    const reports = src('app', 'reports', 'page.tsx');
    expect(reports).toContain("short: 'Revenue'");
    expect(reports).toContain('aria-label={t.label}');
  });
});
