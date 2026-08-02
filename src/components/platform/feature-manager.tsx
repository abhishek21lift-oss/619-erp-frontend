'use client';

// Feature Manager — the Control Centre's switchboard for what the product does.
//
// Three levels, and the UI's job is to make it obvious which one is in play:
//
//   Global      the kill switch. One flip, every studio, no exceptions.
//   Plan        which tiers include the feature (only when it is plan-gated).
//   Per-studio  an override, set from the studio row in Studios.
//
// Everything here reaches live studios, so every destructive flip confirms and
// says how many studios already override the feature — the number that turns
// "switch off the AI Suite" from an abstraction into a decision.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  ToggleLeft, ToggleRight, Lock, Loader2, AlertTriangle, ChevronDown,
  Search, Users, ShieldCheck, Info,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { FeatureCatalogue, PlatformFeature, FeatureOverrideRow } from '@/lib/api';
import { useToast } from '@/lib/toast';

const cardStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)' } as const;

const CATEGORY_LABEL: Record<string, string> = {
  core: 'Core', operations: 'Operations', training: 'Training', business: 'Business',
  engagement: 'Engagement', ai: 'AI', administration: 'Administration', general: 'General',
};

function Switch({ on, disabled, onClick, label }: {
  on: boolean; disabled?: boolean; onClick: () => void; label: string;
}) {
  return (
    <button
      role="switch" aria-checked={on} aria-label={label}
      disabled={disabled} onClick={onClick}
      className="flex h-8 items-center rounded-full transition-opacity disabled:opacity-40"
      style={{ color: on ? 'var(--success)' : 'var(--text-disabled)' }}
    >
      {on ? <ToggleRight size={30} /> : <ToggleLeft size={30} />}
    </button>
  );
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ── One feature row ─────────────────────────────────────────────────────── */
function FeatureRow({ feature, plans, planRow, onChanged }: {
  feature: PlatformFeature;
  plans: FeatureCatalogue['plans'];
  planRow: Record<string, boolean>;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [overrides, setOverrides] = useState<FeatureOverrideRow[] | null>(null);

  const core = feature.is_core;

  useEffect(() => {
    if (!open || overrides || !feature.override_count) return;
    api.superAdmin.featureOverrides(feature.key)
      .then((r) => setOverrides(r.data))
      .catch(() => setOverrides([]));
  }, [open, overrides, feature.key, feature.override_count]);

  const patch = async (body: Parameters<typeof api.superAdmin.updateFeature>[1], confirmMsg?: string) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(true);
    try {
      await api.superAdmin.updateFeature(feature.key, body);
      onChanged();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not update the feature'); }
    finally { setBusy(false); }
  };

  const togglePlan = async (code: string) => {
    const next = { ...planRow, [code]: !(planRow[code] ?? true) };
    setBusy(true);
    try {
      await api.superAdmin.setFeaturePlans(feature.key, next);
      onChanged();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not update the plan matrix'); }
    finally { setBusy(false); }
  };

  // The sentence an operator needs before flipping the global switch: not
  // "are you sure" but "here is what you are about to reach".
  const killConfirm = feature.global_enabled
    ? `Switch off ${feature.name} for EVERY studio?\n\n`
      + `This overrides plans and per-studio settings. `
      + (feature.override_count
        ? `${feature.override_count} studio${feature.override_count === 1 ? '' : 's'} currently override this feature and will lose it too.`
        : 'No studio currently overrides this feature.')
    : undefined;

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex min-h-[64px] items-center gap-3 px-3 py-2.5 sm:px-4">
        <button
          onClick={() => setOpen((v) => !v)} aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[13px] font-[750]" style={{ color: 'var(--text-primary)' }}>{feature.name}</span>
              {core && (
                <span className="flex items-center gap-1 rounded-[6px] px-1.5 py-0.5 text-[10px] font-[700]"
                  style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                  <Lock size={9} /> Core
                </span>
              )}
              {feature.is_plan_gated && (
                <span className="rounded-[6px] px-1.5 py-0.5 text-[10px] font-[700]"
                  style={{ background: 'rgba(0,103,224,0.12)', color: '#0067e0' }}>
                  Plan-gated
                </span>
              )}
              {!feature.global_enabled && (
                <span className="rounded-[6px] px-1.5 py-0.5 text-[10px] font-[750]"
                  style={{ background: 'rgba(239,68,68,0.12)', color: '#dc2626' }}>
                  Off everywhere
                </span>
              )}
              {feature.override_count > 0 && (
                // A badge, not part of the description: this is the number that
                // says how much a global flip is about to disturb, and on a
                // phone the truncating description was cutting it off.
                <span className="flex items-center gap-1 rounded-[6px] px-1.5 py-0.5 text-[10px] font-[700]"
                  style={{ background: 'rgba(245,158,11,0.14)', color: '#b45309' }}>
                  <Users size={9} /> {feature.override_count}
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
              {feature.description}
            </p>
          </div>
          <ChevronDown size={15} className="shrink-0 transition-transform"
            style={{ color: 'var(--text-disabled)', transform: open ? 'rotate(180deg)' : 'none' }} />
        </button>

        {busy
          ? <Loader2 size={16} className="animate-spin shrink-0" style={{ color: 'var(--brand)' }} />
          : <Switch
              on={feature.global_enabled} disabled={core}
              label={`${feature.name} available platform-wide`}
              onClick={() => patch({ global_enabled: !feature.global_enabled }, killConfirm)}
            />}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <m.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }} className="overflow-hidden"
          >
            <div className="space-y-3.5 px-3 pb-4 sm:px-4">
              {core ? (
                <p className="flex items-start gap-1.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                  <Info size={12} className="mt-0.5 shrink-0" />
                  Core to the product. Included in every plan and cannot be switched off — a studio
                  without it would have nothing to use.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox" checked={feature.is_plan_gated} className="h-4 w-4"
                        onChange={() => patch({ is_plan_gated: !feature.is_plan_gated })}
                      />
                      <span className="text-[12px] font-[650]" style={{ color: 'var(--text-secondary)' }}>
                        Restrict to plans
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox" checked={feature.default_enabled} className="h-4 w-4"
                        onChange={() => patch({ default_enabled: !feature.default_enabled })}
                      />
                      <span className="text-[12px] font-[650]" style={{ color: 'var(--text-secondary)' }}>
                        On by default
                      </span>
                    </label>
                  </div>

                  <div>
                    <p className="mb-1.5 text-[10px] font-[750] uppercase tracking-[0.08em]" style={{ color: 'var(--text-disabled)' }}>
                      Included in plan
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {plans.map((p) => {
                        const on = planRow[p.code] ?? true;
                        return (
                          <button
                            key={p.code} disabled={busy || !feature.is_plan_gated}
                            onClick={() => togglePlan(p.code)}
                            aria-pressed={on}
                            className="min-h-[32px] rounded-[9px] px-2.5 text-[11.5px] font-[700] transition disabled:opacity-45"
                            style={on
                              ? { background: 'rgba(16,185,129,0.12)', color: '#059669', border: '1px solid rgba(16,185,129,0.25)' }
                              : { background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                          >
                            {p.name}
                          </button>
                        );
                      })}
                    </div>
                    {!feature.is_plan_gated && (
                      // Without this the greyed-out row reads as broken rather
                      // than inactive-by-design.
                      <p className="mt-1.5 text-[11px]" style={{ color: 'var(--text-disabled)' }}>
                        The plan matrix applies only when the feature is restricted to plans.
                      </p>
                    )}
                  </div>
                </>
              )}

              {feature.override_count > 0 && (
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-[750] uppercase tracking-[0.08em]" style={{ color: 'var(--text-disabled)' }}>
                    <Users size={11} /> Studios overriding this
                  </p>
                  {overrides === null && (
                    <Loader2 size={14} className="animate-spin" style={{ color: 'var(--brand)' }} />
                  )}
                  {overrides?.map((o) => (
                    <div key={o.organization_id} className="flex items-start justify-between gap-3 py-1.5 text-[11.5px]"
                      style={{ borderTop: '1px solid var(--border)' }}>
                      <div className="min-w-0">
                        <p className="truncate font-[650]" style={{ color: 'var(--text-secondary)' }}>{o.organization_name}</p>
                        {o.reason && <p className="truncate" style={{ color: 'var(--text-muted)' }}>{o.reason}</p>}
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="font-[700]" style={{ color: o.enabled ? '#059669' : '#dc2626' }}>
                          {o.enabled ? 'Granted' : 'Removed'}
                        </span>
                        {o.expires_at && (
                          <p style={{ color: 'var(--text-disabled)' }}>until {fmtDate(o.expires_at)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Panel ───────────────────────────────────────────────────────────────── */
export default function FeatureManager() {
  const [cat, setCat] = useState<FeatureCatalogue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  const load = useCallback(() => {
    setError('');
    api.superAdmin.features()
      .then((r) => setCat(r.data))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load the feature catalogue.'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const grouped = useMemo(() => {
    if (!cat) return [];
    const needle = q.trim().toLowerCase();
    const rows = needle
      ? cat.features.filter((f) =>
        f.name.toLowerCase().includes(needle)
        || f.key.includes(needle)
        || (f.description ?? '').toLowerCase().includes(needle))
      : cat.features;
    const by = new Map<string, PlatformFeature[]>();
    for (const f of rows) {
      if (!by.has(f.category)) by.set(f.category, []);
      by.get(f.category)!.push(f);
    }
    return [...by.entries()];
  }, [cat, q]);

  const offCount = cat?.features.filter((f) => !f.global_enabled).length ?? 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-2.5 py-16">
        <Loader2 size={22} className="animate-spin" style={{ color: 'var(--brand)' }} />
        <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>Loading features…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2.5 py-16 text-center">
        <AlertTriangle size={22} style={{ color: 'var(--danger)' }} />
        <p className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{error}</p>
        <button onClick={load} className="mt-1 text-[12px] font-[700]" style={{ color: 'var(--brand)' }}>Try again</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[14px] p-3.5" style={cardStyle}>
        <p className="flex items-start gap-2 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
          <ShieldCheck size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--brand)' }} />
          <span>
            The master switch is <strong>global</strong> — it beats plans and per-studio overrides alike,
            so it is the lever for pulling a misbehaving feature without a deploy. Per-studio
            exceptions are set from the studio itself, under <strong>Studios</strong>.
          </span>
        </p>
        {offCount > 0 && (
          <p className="mt-2 flex items-center gap-1.5 text-[12px] font-[650]" style={{ color: '#b45309' }}>
            <AlertTriangle size={12} />
            {offCount} feature{offCount === 1 ? ' is' : 's are'} currently off platform-wide.
          </p>
        )}
      </div>

      <div className="relative max-w-xs">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-disabled)' }} />
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Find a feature…" aria-label="Search features"
          className="h-10 w-full rounded-[11px] pl-9 pr-3 text-[12.5px] outline-none"
          style={{ ...cardStyle, color: 'var(--text-primary)' }}
        />
      </div>

      {grouped.length === 0 && (
        <p className="py-10 text-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
          No feature matches “{q}”.
        </p>
      )}

      {grouped.map(([category, rows]) => (
        <div key={category}>
          <p className="mb-1.5 text-[10px] font-[750] uppercase tracking-[0.08em]" style={{ color: 'var(--text-disabled)' }}>
            {CATEGORY_LABEL[category] ?? category}
          </p>
          <div className="overflow-hidden rounded-[16px]" style={cardStyle}>
            {rows.map((f) => (
              <FeatureRow
                key={f.key} feature={f}
                plans={cat!.plans}
                // plan_matrix arrives keyed plan → feature; the row wants it
                // keyed by plan for one feature. Missing means included:
                // a plan the matrix has no row for has not been excluded.
                planRow={Object.fromEntries(
                  cat!.plans.map((p) => [p.code, cat!.plan_matrix[p.code]?.[f.key] ?? true]),
                )}
                onChanged={load}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
