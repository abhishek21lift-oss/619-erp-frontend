'use client';

/**
 * The Command Center's visual kit: hero, cards, stat tiles and charts.
 *
 * Hand-rolled SVG and CSS, like the console's older chart primitives — the
 * shapes are simple and a charting library would bring its own theming to
 * fight with the CSS variables. Colour comes from ccTheme (category and
 * decoration) and ccState (meaning); nothing here picks a hex of its own.
 *
 * ── The rule every chart here keeps ─────────────────────────────────────
 *
 * No data is drawn as no data. The overview this replaced drew a full-width
 * bar labelled "No model telemetry yet", a 0/1 health score when nothing had
 * been measured, and "LIVE" where a risk score was missing. Here an empty
 * series renders an empty state that says so, a donut with nothing in it is
 * a grey ring reading "No data", and a missing value is an em dash — never a
 * zero standing in for "unknown".
 */

import * as React from 'react';
import { ccGradient, ccMesh, ccSeries, ccTones, ccWash, type CcTone, type CcToneName } from './ccTheme';

export type Tone = CcToneName;
const T = (t: Tone): CcTone => ccTones[t];

export const nfIN = (n: number) => Math.round(n).toLocaleString('en-IN');
export const compact = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e7) return `${(n / 1e7).toFixed(a >= 1e8 ? 0 : 1)}Cr`;
  if (a >= 1e5) return `${(n / 1e5).toFixed(a >= 1e6 ? 0 : 1)}L`;
  if (a >= 1e3) return `${(n / 1e3).toFixed(a >= 1e4 ? 0 : 1)}K`;
  return String(Math.round(n));
};
export const inr = (n: number) => `₹${nfIN(n)}`;
export const inrCompact = (n: number) => `₹${compact(n)}`;

// ── Hero ────────────────────────────────────────────────────────────────────

export function CcHero({ tone, eyebrow, title, subtitle, icon, actions, children }: {
  tone: Tone;
  eyebrow: string;
  title: string;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  /** A row of hero stats under the title. */
  children?: React.ReactNode;
}) {
  const t = T(tone);
  return (
    <section
      className="relative mb-5 overflow-hidden rounded-[26px] p-5 text-white sm:rounded-[30px] sm:p-7"
      style={{ background: ccMesh(t), boxShadow: `0 24px 60px -24px rgba(${t.rgb},0.65)` }}
    >
      <span aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full blur-3xl" style={{ background: t.to, opacity: 0.45 }} />
      <span aria-hidden className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full blur-3xl" style={{ background: t.from, opacity: 0.35 }} />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3.5">
          {icon && (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px]" style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)', backdropFilter: 'blur(10px)' }}>
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-[10.5px] font-[800] uppercase tracking-[0.18em] text-white/75">{eyebrow}</p>
            <h1 className="mt-1 text-[24px] font-[850] leading-[1.1] tracking-[-0.035em] sm:text-[30px]">{title}</h1>
            {subtitle && <p className="mt-1.5 max-w-[720px] text-[12.5px] leading-5 text-white/80">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="relative mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">{children}</div>}
    </section>
  );
}

/** A stat that sits on the hero's glass. */
export function CcHeroStat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-[18px] px-3.5 py-3" style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)', backdropFilter: 'blur(12px)' }}>
      <p className="truncate text-[10px] font-[750] uppercase tracking-[0.12em] text-white/70">{label}</p>
      <p className="mt-0.5 truncate text-[22px] font-[850] tabular-nums tracking-[-0.03em]">{value}</p>
      {sub && <p className="truncate text-[11px] text-white/75">{sub}</p>}
    </div>
  );
}

/** A button styled for the hero. */
export function CcHeroButton({ children, onClick, disabled, label }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; label?: string }) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled} aria-label={label}
      className="flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-[750] text-white transition-opacity disabled:opacity-60"
      style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(10px)' }}
    >
      {children}
    </button>
  );
}

// ── Card ────────────────────────────────────────────────────────────────────

export function CcCard({ title, eyebrow, icon, tone = 'blue', action, children, className = '', pad = true }: {
  title?: React.ReactNode;
  eyebrow?: string;
  icon?: React.ReactNode;
  tone?: Tone;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  pad?: boolean;
}) {
  const t = T(tone);
  return (
    <section
      className={`relative min-w-0 overflow-hidden rounded-[24px] ${pad ? 'p-4 sm:p-5' : ''} ${className}`}
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}
    >
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[3px]" style={{ background: ccGradient(t, 90) }} />
      {(title || eyebrow || action) && (
        <header className={`mb-4 flex items-start justify-between gap-3 ${pad ? '' : 'px-4 pt-4 sm:px-5 sm:pt-5'}`}>
          <div className="flex min-w-0 items-center gap-3">
            {icon && <CcIcon tone={tone}>{icon}</CcIcon>}
            <div className="min-w-0">
              {eyebrow && <p className="text-[10px] font-[800] uppercase tracking-[0.16em]" style={{ color: t.ink }}>{eyebrow}</p>}
              {title && <h2 className="truncate text-[16px] font-[800] tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>{title}</h2>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

/** The gradient squircle every icon sits in. */
export function CcIcon({ tone, children, size = 36 }: { tone: Tone; children: React.ReactNode; size?: number }) {
  const t = T(tone);
  return (
    <span
      className="flex shrink-0 items-center justify-center text-white"
      style={{ width: size, height: size, borderRadius: size * 0.32, background: ccGradient(t), boxShadow: `0 6px 16px -6px rgba(${t.rgb},0.7), inset 0 1px 0 rgba(255,255,255,0.3)` }}
    >
      {children}
    </span>
  );
}

export function CcLink({ children, onClick, tone = 'blue' }: { children: React.ReactNode; onClick: () => void; tone?: Tone }) {
  const t = T(tone);
  return (
    <button type="button" onClick={onClick} className="rounded-full px-3 py-1.5 text-[11px] font-[750] transition-opacity hover:opacity-80" style={{ color: t.ink, background: ccWash(t, 0.1) }}>
      {children}
    </button>
  );
}

// ── Stat tile ───────────────────────────────────────────────────────────────

export function CcStat({ label, value, sub, icon, tone, onClick }: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ReactNode;
  tone: Tone;
  onClick?: () => void;
}) {
  const t = T(tone);
  const body = (
    <>
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl" style={{ background: t.to, opacity: 0.16 }} />
      <div className="relative flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-[10.5px] font-[800] uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <CcIcon tone={tone} size={32}>{icon}</CcIcon>
      </div>
      <p className="relative mt-2 truncate text-[26px] font-[850] tabular-nums tracking-[-0.04em]" style={{ color: 'var(--text-primary)' }}>{value}</p>
      {sub && <p className="relative mt-0.5 truncate text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </>
  );
  const cls = 'relative min-w-0 overflow-hidden rounded-[22px] p-4 text-left';
  const style: React.CSSProperties = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' };
  return onClick
    ? <button type="button" onClick={onClick} className={`${cls} transition-transform hover:-translate-y-0.5`} style={style}>{body}</button>
    : <div className={cls} style={style}>{body}</div>;
}

// ── Empty ───────────────────────────────────────────────────────────────────

export function CcEmpty({ title, body, height = 160 }: { title: string; body?: string; height?: number }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[18px] px-4 text-center" style={{ minHeight: height, background: 'var(--bg-subtle)', border: '1px dashed var(--border-2)' }}>
      <p className="text-[12.5px] font-[700]" style={{ color: 'var(--text-secondary)' }}>{title}</p>
      {body && <p className="mt-1 max-w-[320px] text-[11.5px] leading-4" style={{ color: 'var(--text-muted)' }}>{body}</p>}
    </div>
  );
}

// ── Donut ───────────────────────────────────────────────────────────────────

export type Slice = { label: string; value: number; color?: string };

export function CcDonut({ data, centerLabel, centerValue, size = 168, format = nfIN, empty = 'No data yet', legend = true, stack = false }: {
  data: Slice[];
  centerLabel: string;
  /** Defaults to the total. */
  centerValue?: React.ReactNode;
  size?: number;
  format?: (n: number) => string;
  empty?: string;
  legend?: boolean;
  /** Keep the legend under the ring at every width — for narrow cards. */
  stack?: boolean;
}) {
  const slices = data.map((d, i) => ({ ...d, color: d.color ?? ccSeries[i % ccSeries.length] }));
  const total = slices.reduce((a, s) => a + Math.max(0, s.value), 0);
  const r = 42; const c = 2 * Math.PI * r; const gap = total > 0 && slices.filter((s) => s.value > 0).length > 1 ? 1.6 : 0;
  let offset = 0;
  const summary = total > 0 ? slices.filter((s) => s.value > 0).map((s) => `${s.label} ${format(s.value)}`).join(', ') : empty;
  return (
    <div className={`flex flex-col items-center gap-4 ${legend && !stack ? 'sm:flex-row sm:items-center' : ''}`}>
      <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${centerLabel}: ${summary}`}>
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="var(--bg-subtle)" strokeWidth="11" />
          {total > 0 && slices.map((s) => {
            if (s.value <= 0) return null;
            const len = (s.value / total) * c;
            const node = (
              <circle key={s.label} cx="50" cy="50" r={r} fill="none" stroke={s.color} strokeWidth="11" strokeLinecap={gap ? 'butt' : 'round'}
                strokeDasharray={`${Math.max(0.01, len - gap)} ${c}`} strokeDashoffset={-offset} className="cc-draw" />
            );
            offset += len;
            return node;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[22px] font-[850] tabular-nums tracking-[-0.04em]" style={{ color: 'var(--text-primary)' }}>
            {total > 0 ? (centerValue ?? format(total)) : '—'}
          </span>
          <span className="max-w-[70%] text-[9.5px] font-[750] uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
            {total > 0 ? centerLabel : empty}
          </span>
        </div>
      </div>
      {legend && (
        <ul className="w-full min-w-0 flex-1 space-y-1.5">
          {slices.map((s) => {
            const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
            return (
              <li key={s.label} className="flex items-center gap-2.5 rounded-[12px] px-2.5 py-1.5" style={{ background: 'var(--bg-subtle)' }}>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color, boxShadow: `0 0 0 3px color-mix(in srgb, ${s.color} 20%, transparent)` }} />
                <span className="min-w-0 flex-1 truncate text-[12px] font-[650]" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                <span className="text-[12px] font-[800] tabular-nums" style={{ color: 'var(--text-primary)' }}>{format(s.value)}</span>
                <span className="w-9 text-right text-[10.5px] tabular-nums" style={{ color: 'var(--text-muted)' }}>{total > 0 ? `${pct}%` : '—'}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── Vertical bars ───────────────────────────────────────────────────────────

export type Bar = { label: string; value: number; title?: string };

export function CcBars({ data, tone = 'blue', format = nfIN, height = 150, empty = 'Nothing recorded in this window', rainbow = false }: {
  data: Bar[];
  tone?: Tone;
  format?: (n: number) => string;
  height?: number;
  empty?: string;
  /** Colour each bar from the series — for categories, never for a time axis. */
  rainbow?: boolean;
}) {
  const t = T(tone);
  const max = Math.max(0, ...data.map((d) => d.value));
  if (!data.length || max <= 0) return <CcEmpty title={empty} height={height + 28} />;
  const peak = data.reduce((a, d) => (d.value > a.value ? d : a), data[0]);
  const labelEvery = data.length > 16 ? Math.ceil(data.length / 8) : data.length > 8 ? 2 : 1;
  return (
    <div role="img" aria-label={`Peak ${peak.label}: ${format(peak.value)}`}>
      <div className="relative flex items-end gap-[3px] sm:gap-1.5" style={{ height }}>
        {[0.25, 0.5, 0.75].map((g) => (
          <span key={g} aria-hidden className="pointer-events-none absolute inset-x-0 border-t border-dashed" style={{ bottom: `${g * 100}%`, borderColor: 'var(--border)' }} />
        ))}
        {data.map((d, i) => {
          const h = d.value > 0 ? Math.max(3, (d.value / max) * 100) : 0;
          const fill = rainbow ? ccSeries[i % ccSeries.length] : undefined;
          return (
            <div key={`${d.label}-${i}`} className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end" title={`${d.title ?? d.label}: ${format(d.value)}`}>
              <div
                className="cc-rise w-full max-w-[44px] rounded-t-[7px] rounded-b-[3px] transition-opacity group-hover:opacity-80"
                style={{
                  height: `${h}%`, animationDelay: `${Math.min(i * 25, 400)}ms`,
                  background: fill ? `linear-gradient(180deg, ${fill}, color-mix(in srgb, ${fill} 60%, transparent))` : ccGradient(t, 180),
                  boxShadow: d === peak ? `0 8px 18px -8px rgba(${t.rgb},0.8)` : undefined,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-[3px] sm:gap-1.5">
        {data.map((d, i) => (
          <span key={`${d.label}-l-${i}`} className="min-w-0 flex-1 truncate text-center text-[9.5px] font-[650]" style={{ color: 'var(--text-muted)' }}>
            {i % labelEvery === 0 ? d.label : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Horizontal ranking bars ─────────────────────────────────────────────────

export type Row = { label: string; value: number; sub?: string; color?: string };

export function CcHBars({ rows, format = nfIN, empty = 'Nothing to rank yet', max: maxOverride }: {
  rows: Row[];
  format?: (n: number) => string;
  empty?: string;
  /** A shared scale, e.g. 100 for percentages. */
  max?: number;
}) {
  const max = maxOverride ?? Math.max(0, ...rows.map((r) => r.value));
  if (!rows.length) return <CcEmpty title={empty} />;
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => {
        const color = r.color ?? ccSeries[i % ccSeries.length];
        const w = max > 0 ? Math.max(r.value > 0 ? 2 : 0, (r.value / max) * 100) : 0;
        return (
          <li key={`${r.label}-${i}`}>
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-[12px] font-[650]" style={{ color: 'var(--text-secondary)' }}>{r.label}</span>
              <span className="shrink-0 text-[12px] font-[800] tabular-nums" style={{ color: 'var(--text-primary)' }}>{r.sub ?? format(r.value)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full" style={{ background: 'var(--bg-subtle)' }}>
              <div className="cc-grow h-full rounded-full" style={{ width: `${w}%`, animationDelay: `${i * 50}ms`, background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 55%, white))` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ── Area ────────────────────────────────────────────────────────────────────

export function CcArea({ values, labels, tone = 'blue', format = nfIN, height = 150, empty = 'Nothing recorded in this window' }: {
  values: number[];
  labels: string[];
  tone?: Tone;
  format?: (n: number) => string;
  height?: number;
  empty?: string;
}) {
  const t = T(tone);
  const id = React.useId().replace(/:/g, '');
  const max = Math.max(0, ...values);
  if (!values.length || max <= 0) return <CcEmpty title={empty} height={height + 28} />;
  const n = values.length;
  const x = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);
  const y = (v: number) => 94 - (v / max) * 84;
  const line = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const last = values[n - 1];
  return (
    <div>
      <div className="relative" style={{ height }} role="img" aria-label={`Latest ${labels[n - 1]}: ${format(last)}, peak ${format(max)}`}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
          <defs>
            <linearGradient id={`a${id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={t.to} stopOpacity="0.38" />
              <stop offset="1" stopColor={t.from} stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`l${id}`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor={t.from} />
              <stop offset="1" stopColor={t.to} />
            </linearGradient>
          </defs>
          {[25, 50, 75].map((g) => <line key={g} x1="0" x2="100" y1={g} y2={g} stroke="var(--border)" strokeDasharray="1.5 2" vectorEffect="non-scaling-stroke" />)}
          <polygon points={`0,100 ${line} 100,100`} fill={`url(#a${id})`} />
          <polyline points={line} fill="none" stroke={`url(#l${id})`} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${x(n - 1)}%`, top: `${y(last)}%`, background: t.to, boxShadow: `0 0 0 4px rgba(${t.rgb},0.22)` }} />
      </div>
      <div className="mt-2 flex justify-between text-[9.5px] font-[650]" style={{ color: 'var(--text-muted)' }}>
        <span>{labels[0]}</span>
        {n > 2 && <span>{labels[Math.floor((n - 1) / 2)]}</span>}
        <span>{labels[n - 1]}</span>
      </div>
    </div>
  );
}

// ── Ring ────────────────────────────────────────────────────────────────────

/** A single-measure ring. `pct` null draws an empty ring and an em dash. */
export function CcRing({ pct, tone = 'blue', size = 120, label, sub, color }: {
  pct: number | null;
  tone?: Tone;
  size?: number;
  label: string;
  sub?: string;
  /** Override the gradient with a state colour. */
  color?: string;
}) {
  const t = T(tone);
  const id = React.useId().replace(/:/g, '');
  const r = 40; const c = 2 * Math.PI * r;
  const v = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${pct == null ? 'not measured' : `${Math.round(v)}%`}`}>
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <defs>
            <linearGradient id={`r${id}`} x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor={color ?? t.from} />
              <stop offset="1" stopColor={color ?? t.to} />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r={r} fill="none" stroke="var(--bg-subtle)" strokeWidth="10" />
          {v > 0 && <circle cx="50" cy="50" r={r} fill="none" stroke={`url(#r${id})`} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(v / 100) * c} ${c}`} className="cc-draw" />}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[20px] font-[850] tabular-nums tracking-[-0.04em]" style={{ color: 'var(--text-primary)' }}>{pct == null ? '—' : `${Math.round(v)}%`}</span>
        </div>
      </div>
      <p className="text-center text-[11.5px] font-[750]" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      {sub && <p className="-mt-1 text-center text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  );
}

// ── Chips ───────────────────────────────────────────────────────────────────

export function CcChip({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-[800] uppercase tracking-[0.06em]" style={{ color, background: `color-mix(in srgb, ${color} 13%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 28%, transparent)` }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}

// ── Month series ────────────────────────────────────────────────────────────

/**
 * Fill a sparse monthly series to a continuous run of `months`, ending this
 * month. The backend groups by month and so omits a month with no rows; a bar
 * chart that skips it would put June next to August and hide the gap.
 */
export function fillMonths<R extends { month: string }>(rows: R[], months: number, pick: (r: R) => number): Bar[] {
  const byKey = new Map(rows.map((r) => [String(r.month).slice(0, 7), pick(r)]));
  const now = new Date();
  const out: Bar[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    out.push({ label: d.toLocaleString('en-IN', { month: 'short' }), value: byKey.get(key) ?? 0, title: `${d.toLocaleString('en-IN', { month: 'short', year: 'numeric' })}` });
  }
  return out;
}
