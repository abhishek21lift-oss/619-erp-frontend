'use client';
import { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import Guard from '@/components/Guard';
import { PageContainer, PageHero } from '@/components/ui';
import { Send, Target, TrendingUp, Users, Plus, Trash2, Calendar, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

const STATUS_COLOR: Record<string, string> = { Active: '#10b981', Draft: '#94a3b8', Scheduled: '#f59e0b', Paused: '#0067e0', Completed: '#0067e0' };
const CHANNELS = ['WhatsApp', 'SMS', 'Email', 'In-App', 'All Channels'];

interface Campaign { id: string; name: string; goal: string; channel: string; audience: string; status: string; start: string; end: string; sent: number; opened: number; converted: number; }

const KPIS = [
  { label: 'Active', color: '#10b981', icon: <TrendingUp size={18} />, bg: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))' },
  { label: 'Total Sent', color: '#0067e0', icon: <Send size={18} />, bg: 'linear-gradient(135deg, rgba(0,103,224,0.1), rgba(0,103,224,0.05))' },
  { label: 'Conversions', color: '#0067e0', icon: <CheckCircle2 size={18} />, bg: 'linear-gradient(135deg, rgba(0,103,224,0.1), rgba(0,89,206,0.05))' },
  { label: 'Conv. Rate', color: '#0067e0', icon: <Target size={18} />, bg: 'linear-gradient(135deg, rgba(0,103,224,0.1), rgba(0,103,224,0.05))' },
];

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] } } };

export default function CampaignsPage() { return <Guard role="admin"><CampaignContent /></Guard>; }

function CampaignContent() {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', goal: '', channel: CHANNELS[0], audience: '', start: '', end: '' });

  async function load() {
    setLoading(true); setError(null);
    try { const data = await api.campaigns.list() as Campaign[]; setCampaigns(Array.isArray(data) ? data : []); }
    catch (err: any) { setError(err?.message || 'Failed to load campaigns'); }
    finally { setLoading(false); }
  }

  async function addCampaign(e: React.FormEvent) {
    e.preventDefault(); if (!form.name) return;
    setSaving(true);
    try {
      const res = await api.campaigns.create(form) as { campaign: Campaign };
      if (res.campaign) setCampaigns(p => [res.campaign as Campaign, ...p]); else await load();
      setForm({ name: '', goal: '', channel: CHANNELS[0], audience: '', start: '', end: '' });
      setShowForm(false);
      toast.success('Campaign created successfully');
    } catch (err: any) { toast.error(err?.message || 'Failed to create campaign'); }
    finally { setSaving(false); }
  }

  async function deleteCampaign(id: string) {
    try { await api.campaigns.delete(id); setCampaigns(p => p.filter(x => x.id !== id)); toast.success('Campaign deleted'); }
    catch (err: any) { toast.error(err?.message || 'Failed to delete campaign'); }
  }

  useEffect(() => { load(); }, []);

  const active = campaigns.filter(c => c.status === 'Active').length;
  const totalSent = campaigns.reduce((s, c) => s + c.sent, 0);
  const totalConv = campaigns.reduce((s, c) => s + c.converted, 0);
  const convRate = totalSent > 0 ? ((totalConv / totalSent) * 100).toFixed(1) : '0';
  const kpiVals = [active, totalSent, totalConv, convRate + '%'];

  const inp = { width: '100%', border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', background: 'var(--bg-subtle)', fontFamily: 'inherit' } as const;

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
        <div style={{ borderRadius: 14, padding: '14px 20px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 600, fontSize: 13 }}>{error}</div>
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
            <div style={{ fontSize: 30, fontWeight: 800, color: k.color, lineHeight: 1.2, letterSpacing: '-0.02em' }}>{loading ? '—' : kpiVals[i]}</div>
          </m.div>
        ))}
      </m.div>

      {/* ── CREATE FORM ── */}
      {showForm && (
        <m.div initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          style={{ borderRadius: 20, background: '#ffffff', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: 24 }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', gap: 8, alignItems: 'center' }}><TrendingUp size={16} color="#0067e0" /> Create Campaign</h3>
          <form onSubmit={addCampaign} style={{ display: 'grid', gap: 16 }}>
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14 }}>
              {[
                { label: 'Campaign Name *', key: 'name', type: 'text', placeholder: 'e.g. Summer Fitness Drive' },
                { label: 'Goal', key: 'goal', type: 'text', placeholder: 'e.g. Increase renewals by 20%' },
              ].map(fd => (
                <label key={fd.key} style={{ display: 'grid', gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>{fd.label}</span>
                  <input value={(form as any)[fd.key]} onChange={e => setForm(f => ({ ...f, [fd.key]: e.target.value }))} placeholder={fd.placeholder} required={fd.key === 'name'} style={inp} />
                </label>
              ))}
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>Channel</span>
                <select value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))} style={inp}>
                  {CHANNELS.map(c => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>Target Audience</span>
                <input value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))} placeholder="e.g. Expiring This Month" style={inp} />
              </label>
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>Start Date</span>
                <input type="date" value={form.start} onChange={e => setForm(f => ({ ...f, start: e.target.value }))} style={inp} />
              </label>
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>End Date</span>
                <input type="date" value={form.end} onChange={e => setForm(f => ({ ...f, end: e.target.value }))} style={inp} />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowForm(false)}
                style={{ fontSize: 12, fontWeight: 700, padding: '8px 18px', borderRadius: 10, border: '1px solid #cbd5e1', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, padding: '8px 20px', borderRadius: 12, background: 'linear-gradient(135deg, #0067e0, #0059ce)', color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: '0 4px 16px rgba(0,103,224,0.35)' }}>
                {saving ? <><Loader2 size={13} /> Creating…</> : <><Plus size={13} /> Create Campaign</>}
              </button>
            </div>
          </form>
        </m.div>
      )}

      {/* ── CAMPAIGN LIST ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}><Loader2 size={32} color="#cbd5e1" style={{ animation: 'spin 1s linear infinite' }} /></div>
      ) : (
        <m.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: 'grid', gap: 12 }}>
          {campaigns.map(c => {
            const openRate = c.sent > 0 ? ((c.opened / c.sent) * 100).toFixed(0) : '—';
            const convR = c.sent > 0 ? ((c.converted / c.sent) * 100).toFixed(1) : '—';
            const sc = STATUS_COLOR[c.status] || '#94a3b8';
            return (
              <m.div key={c.id} variants={itemVariants}
                style={{ borderRadius: 20, background: '#ffffff', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)', overflow: 'hidden', transition: 'all 0.2s ease' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                <div style={{ height: 4, background: `linear-gradient(90deg, ${sc}, ${sc}bb)` }} />
                <div style={{ padding: '18px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{c.name}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: `${sc}18`, color: sc, textTransform: 'capitalize' }}>{c.status}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20, background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{c.channel}</span>
                      </div>
                      {c.goal && <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--text-secondary)' }}>🎯 {c.goal}</p>}
                      {c.audience && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Users size={11}/>{c.audience}</p>}
                    </div>
                    <button onClick={() => deleteCampaign(c.id)}
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
                      ].map(m => (
                        <div key={m.label} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: m.color }}>{m.value}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{m.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </m.div>
            );
          })}
          {campaigns.length === 0 && (
            <div style={{ padding: '64px 20px', textAlign: 'center', background: '#ffffff', borderRadius: 20, border: '1px solid var(--border)' }}>
              <Send size={36} color="#cbd5e1" style={{ marginBottom: 14 }} />
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-secondary)', margin: 0 }}>No campaigns yet</p>
              <p style={{ fontSize: 12, color: 'var(--text-disabled)', marginTop: 4 }}>Click "New Campaign" to launch your first campaign.</p>
            </div>
          )}
        </m.div>
      )}
    </PageContainer>
  );
}
