'use client';

// Campaigns — plan, launch and track a multi-channel push.
//
// ── Three things this page used to get wrong about its own data ─────────────
//
// 1. STATUS. `campaigns.status` is a TEXT column defaulting to 'draft', and
//    the server's own stats query counts a live campaign with `status =
//    'active'`. The page held `{ Active: '#10b981', Draft: '#94a3b8', … }` and
//    filtered with `c.status === 'Active'`. Against lower-case data every one
//    of those misses: the Active KPI read 0 however many were running, and
//    every campaign's pill and header stripe fell back to the grey that means
//    Draft — including the live ones. Nobody caught the pill because
//    `textTransform: capitalize` made the TEXT read "Active" while the colour
//    said draft.
//
// 2. THE KPIs. `campaigns.stats()` exists, is computed by the server over the
//    whole table with the correct comparison, and was never called. The page
//    re-derived all four from the rows it happened to have loaded — so a page
//    showing a server-side total beside a client-side one could, and did,
//    disagree with itself.
//
// 3. DARK MODE. The form card, every campaign card and the empty state were
//    `background: '#ffffff'` with `color: 'var(--text-primary)'` text. In dark
//    mode that is near-white text on a white card: the entire list unreadable,
//    from four hard-coded hex values.
//
// The vocabulary now lives in `lib/forms/schemas/campaign.ts`, in the case the
// database already uses, and every lookup normalises before reading so rows
// written in either spelling still render.

import { useState, useEffect, useCallback } from 'react';
import { m } from 'framer-motion';
import Guard from '@/components/Guard';
import { PageContainer, PageHero } from '@/components/ui';
import {
  TextField, SelectField, DateFieldControl, FormErrorBanner,
} from '@/components/ui/form';
import { Send, Target, TrendingUp, Users, Plus, Trash2, Calendar, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { errorMessage } from '@/lib/forms/errors';
import { useAppForm } from '@/lib/forms/useAppForm';
import {
  campaignSchema, blankCampaign, toCampaignPayload,
  campaignStatus, campaignChannelLabel, CHANNEL_OPTIONS,
  type CampaignValues,
} from '@/lib/forms/schemas/campaign';

interface Campaign {
  id: string; name: string; goal: string; channel: string; audience: string;
  status: string; start: string; end: string;
  sent: number; opened: number; converted: number;
}

/** What the server counts, over the whole table rather than the loaded page. */
interface CampaignStats { active: number; total_sent: number; conversions: number; conv_rate: number }

const KPIS = [
  { label: 'Active', color: '#10b981', icon: <TrendingUp size={18} />, bg: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))' },
  { label: 'Total Sent', color: '#0067e0', icon: <Send size={18} />, bg: 'linear-gradient(135deg, rgba(0,103,224,0.1), rgba(0,103,224,0.05))' },
  { label: 'Conversions', color: '#0067e0', icon: <CheckCircle2 size={18} />, bg: 'linear-gradient(135deg, rgba(0,103,224,0.1), rgba(0,89,206,0.05))' },
  { label: 'Conv. Rate', color: '#0067e0', icon: <Target size={18} />, bg: 'linear-gradient(135deg, rgba(0,103,224,0.1), rgba(0,103,224,0.05))' },
];

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] } } };

/** The one card surface on this page. Token-driven, so dark mode works. */
const CARD = {
  borderRadius: 20,
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
} as const;

export default function CampaignsPage() { return <Guard role="admin"><CampaignContent /></Guard>; }

function CampaignContent() {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  /**
   * Re-read the KPIs from the server.
   *
   * A failure sets them to null, which renders as "—". That is the whole
   * point: the alternative is leaving the PREVIOUS figures on screen after a
   * create or a delete has already changed them, so a number nobody could
   * refresh goes on being read as current. A failure and a quiet day must not
   * be the same pixels.
   *
   * It never throws, because it is called beside a list load and after a
   * successful write, and neither of those should be reported as failed
   * because a count could not be refreshed.
   */
  const refreshStats = useCallback(async () => {
    try {
      setStats(await api.campaigns.stats());
    } catch {
      setStats(null);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      // The KPIs come from the server, which counts over the whole table with
      // its own definition of "active". Deriving them here from the loaded
      // rows is what produced two different answers on one screen.
      const [rows] = await Promise.all([
        api.campaigns.list() as Promise<Campaign[]>,
        refreshStats(),
      ]);
      setCampaigns(Array.isArray(rows) ? rows : []);
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to load campaigns'));
    } finally {
      setLoading(false);
    }
  }, [refreshStats]);

  async function deleteCampaign(id: string) {
    try {
      await api.campaigns.delete(id);
      setCampaigns(p => p.filter(x => x.id !== id));
      toast.success('Campaign deleted');
      // The KPIs are the server's, and the delete has just changed them.
      await refreshStats();
    } catch (err: unknown) {
      toast.error(errorMessage(err, 'Failed to delete campaign'));
    }
  }

  useEffect(() => { load(); }, [load]);

  const f = useAppForm({
    schema: campaignSchema,
    defaultValues: blankCampaign(),
    onSubmit: async (values: CampaignValues) => {
      const res = await api.campaigns.create(toCampaignPayload(values)) as { campaign?: Campaign };
      if (res.campaign) setCampaigns(p => [res.campaign as Campaign, ...p]);
      else await load();
    },
    onSuccess: () => {
      setShowForm(false);
      toast.success('Campaign created successfully');
      refreshStats();
    },
  });

  const kpiVals = stats
    ? [stats.active, stats.total_sent, stats.conversions, `${stats.conv_rate}%`]
    : ['—', '—', '—', '—'];

  return (
    <PageContainer>
      <PageHero
        icon={<Send size={20} />}
        title="Campaigns"
        subtitle="Plan, launch & track multi-channel marketing campaigns."
        actions={
          <button type="button" onClick={() => setShowForm(v => !v)}
            className="inline-flex items-center gap-1.5 rounded-full h-9 px-3.5 text-[12px] font-semibold transition active:scale-95"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff' }}>
            <Plus size={14} /> {showForm ? 'Cancel' : 'New Campaign'}
          </button>
        }
      />

      {error && (
        <div style={{
          borderRadius: 14, padding: '14px 20px',
          background: 'var(--danger-soft, rgba(239,68,68,0.08))',
          border: '1px solid var(--danger-border, rgba(239,68,68,0.25))',
          color: 'var(--danger-text, #dc2626)', fontWeight: 600, fontSize: 13,
        }}>{error}</div>
      )}

      {/* ── KPI CARDS ── */}
      <m.div variants={containerVariants} initial="hidden" animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPIS.map((k, i) => (
          <m.div key={k.label} variants={itemVariants}
            style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, padding: '22px 24px', background: k.bg, border: `1px solid ${k.color}22`, boxShadow: 'var(--shadow-xs)', cursor: 'default' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${k.color}18` }}>{k.icon}</div>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>{k.label}</span>
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, color: k.color, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
              {loading ? '—' : kpiVals[i]}
            </div>
          </m.div>
        ))}
      </m.div>

      {/* ── CREATE FORM ── */}
      {showForm && (
        <m.div initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          style={{ ...CARD, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: 24 }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <TrendingUp size={16} color="#0067e0" /> Create Campaign
          </h3>
          <form
            noValidate
            onSubmit={(e) => { e.preventDefault(); f.submit(); }}
            style={{ display: 'grid', gap: 16 }}
          >
            <FormErrorBanner errors={f.errors} />
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14 }}>
              <f.form.Field name="name">
                {(field) => (
                  <TextField
                    field={field} label="Campaign Name" required density="compact"
                    placeholder="e.g. Summer Fitness Drive" maxLength={160}
                    serverError={f.errors.fieldErrors.name}
                  />
                )}
              </f.form.Field>
              <f.form.Field name="goal">
                {(field) => (
                  <TextField
                    field={field} label="Goal" density="compact"
                    placeholder="e.g. Increase renewals by 20%" maxLength={300}
                    serverError={f.errors.fieldErrors.goal}
                  />
                )}
              </f.form.Field>
              <f.form.Field name="channel">
                {(field) => (
                  <SelectField
                    field={field} label="Channel" density="compact"
                    options={CHANNEL_OPTIONS}
                    serverError={f.errors.fieldErrors.channel}
                  />
                )}
              </f.form.Field>
              <f.form.Field name="audience">
                {(field) => (
                  <TextField
                    field={field} label="Target Audience" density="compact"
                    placeholder="e.g. Expiring This Month" maxLength={160}
                    serverError={f.errors.fieldErrors.audience}
                  />
                )}
              </f.form.Field>
              <f.form.Field name="start">
                {(field) => (
                  <DateFieldControl
                    field={field} label="Start Date" density="compact"
                    serverError={f.errors.fieldErrors.start}
                  />
                )}
              </f.form.Field>
              <f.form.Field name="end">
                {(field) => (
                  <DateFieldControl
                    field={field} label="End Date" density="compact"
                    serverError={f.errors.fieldErrors.end}
                  />
                )}
              </f.form.Field>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowForm(false)}
                style={{ fontSize: 12, fontWeight: 700, padding: '8px 18px', borderRadius: 10, border: '1px solid var(--border-2)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={!f.canSubmit}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, padding: '8px 20px', borderRadius: 12, background: 'linear-gradient(135deg, #0067e0, #0059ce)', color: '#fff', border: 'none', cursor: f.isSubmitting ? 'not-allowed' : 'pointer', opacity: f.isSubmitting ? 0.7 : 1, boxShadow: '0 4px 16px rgba(0,103,224,0.35)' }}>
                {f.isSubmitting ? <><Loader2 size={13} className="animate-spin" /> Creating…</> : <><Plus size={13} /> Create Campaign</>}
              </button>
            </div>
          </form>
        </m.div>
      )}

      {/* ── CAMPAIGN LIST ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Loader2 size={32} style={{ color: 'var(--text-disabled)', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <m.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: 'grid', gap: 12 }}>
          {campaigns.map(c => {
            const openRate = c.sent > 0 ? ((c.opened / c.sent) * 100).toFixed(0) : '—';
            const convR = c.sent > 0 ? ((c.converted / c.sent) * 100).toFixed(1) : '—';
            // Normalised before reading, so a row stored as 'active', 'Active'
            // or 'ACTIVE' reaches the same colour.
            const status = campaignStatus(c.status);
            const sc = status.color;
            return (
              <m.div key={c.id} variants={itemVariants}
                style={{ ...CARD, boxShadow: 'var(--shadow-xs)', overflow: 'hidden', transition: 'all 0.2s ease' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                <div style={{ height: 4, background: sc, opacity: 0.85 }} />
                <div style={{ padding: '18px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{c.name}</span>
                        {/* No textTransform. The label is the vocabulary's own
                            word, so a status this build does not recognise
                            reads as itself rather than being dressed up as one
                            it does. */}
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: 'var(--bg-subtle)', color: sc, border: `1px solid ${sc}33` }}>
                          {status.label}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20, background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                          {campaignChannelLabel(c.channel)}
                        </span>
                      </div>
                      {c.goal && <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--text-secondary)' }}>🎯 {c.goal}</p>}
                      {c.audience && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Users size={11}/>{c.audience}</p>}
                    </div>
                    <button type="button" onClick={() => deleteCampaign(c.id)} aria-label={`Delete ${c.name}`}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.08)', color: '#dc2626', cursor: 'pointer' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                  {c.start && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: c.sent > 0 ? 12 : 0 }}>
                      <Calendar size={11}/> {c.start}{c.end ? ` → ${c.end}` : ''}
                    </div>
                  )}
                  {c.sent > 0 && (
                    <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
                      {[
                        { label: 'Sent', value: c.sent, color: 'var(--text-muted)' },
                        { label: 'Opened', value: c.opened, color: '#0067e0' },
                        { label: 'Open Rate', value: openRate + '%', color: '#d97706' },
                        { label: 'Converted', value: `${c.converted} (${convR}%)`, color: '#10b981' },
                      ].map(metric => (
                        <div key={metric.label} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: metric.color }}>{metric.value}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{metric.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </m.div>
            );
          })}
          {campaigns.length === 0 && (
            <div style={{ ...CARD, padding: '64px 20px', textAlign: 'center' }}>
              <Send size={36} style={{ color: 'var(--text-disabled)', marginBottom: 14 }} />
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-secondary)', margin: 0 }}>No campaigns yet</p>
              <p style={{ fontSize: 12, color: 'var(--text-disabled)', marginTop: 4 }}>
                Click “New Campaign” to launch your first campaign.
              </p>
            </div>
          )}
        </m.div>
      )}
    </PageContainer>
  );
}
