'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import { Cake, Search, PartyPopper, Phone, MessageCircle, Sparkles } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { PullToRefresh } from '@/components/ui';
import { useAsync } from '@/lib/use-async';
import { api, ClientBirthday } from '@/lib/api';

type FilterKey = 'upcoming' | 'today' | 'week' | 'month';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
];

const fmtBirthday = (dob: string) => {
  const d = new Date(dob);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' });
};

const daysLabel = (days: number) => {
  if (days === 0) return 'Today!';
  if (days === 1) return 'Tomorrow';
  return `in ${days} days`;
};

const initials = (name: string) =>
  name.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

const whatsappHref = (phone?: string | null, name?: string, age?: number) => {
  const p = (phone ?? '').replace(/\D/g, '');
  if (!p) return null;
  const num = p.startsWith('91') ? p : `91${p}`;
  const msg = `Happy Birthday ${name ?? 'there'}! 🎉 Wishing you a fantastic ${age ? `${age}th ` : ''}year ahead — from all of us at the studio!`;
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
};

export default function ClientBirthdaysPage() {
  const router = useRouter();
  const bd = useAsync<{ data: ClientBirthday[]; total: number; today_count: number }>(
    () => api.pt.clientBirthdays(),
    [],
  );
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('upcoming');

  const todayCount = bd.data?.today_count ?? 0;

  const clients = useMemo(() => bd.data?.data ?? [], [bd.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      const matchQ = !q || c.name.toLowerCase().includes(q) || (c.mobile || '').includes(q) || (c.trainer_name || '').toLowerCase().includes(q);
      const matchF =
        filter === 'upcoming' ? true :
        filter === 'today' ? c.is_today :
        filter === 'week' ? c.days_until_birthday <= 7 :
        c.days_until_birthday <= 31;
      return matchQ && matchF;
    });
  }, [clients, search, filter]);

  return (
    <Guard roles={['admin', 'manager', 'trainer']}>
      <AppShell>
        <PullToRefresh onRefresh={bd.refetch}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px 60px' }}>

            {/* Hero */}
            <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              style={{ padding: '28px 4px 24px', marginBottom: 8, borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #0067e0, #f59e0b)', boxShadow: '0 4px 20px rgba(0,103,224,0.35)', flexShrink: 0 }}>
                  <Cake size={22} color="#fff" />
                </div>
                <div>
                  <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Clients Birthday</h1>
                  <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Never miss a client&apos;s birthday — sorted by who&apos;s up next</p>
                </div>
              </div>

              {todayCount > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: 'rgba(0,103,224,0.1)', border: '1px solid rgba(0,103,224,0.25)' }}>
                  <PartyPopper size={15} style={{ color: '#0067e0' }} />
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0067e0' }}>
                    {todayCount} {todayCount === 1 ? 'client has' : 'clients have'} a birthday today — say hi!
                  </span>
                </div>
              )}
            </m.div>

            {/* Search + filters */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled)', pointerEvents: 'none' }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search client, trainer, phone…"
                  style={{ width: '100%', paddingLeft: 36, paddingRight: 14, paddingTop: 9, paddingBottom: 9, borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {FILTERS.map((f) => {
                  const active = filter === f.key;
                  return (
                    <button key={f.key} onClick={() => setFilter(f.key)}
                      style={{ fontSize: 11, fontWeight: 700, padding: '7px 14px', borderRadius: 10, border: `1.5px solid ${active ? 'rgba(0,103,224,0.3)' : 'var(--border)'}`, background: active ? 'rgba(0,103,224,0.1)' : 'transparent', color: active ? '#0067e0' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}>
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* List */}
            {bd.loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{ height: 96, borderRadius: 16, background: 'var(--bg-subtle)', opacity: 0.6, animation: 'pulse 1.5s ease-in-out infinite' }} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 20px', textAlign: 'center' }}>
                <Cake size={32} style={{ color: 'var(--text-disabled)', opacity: 0.5, marginBottom: 12 }} />
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', margin: 0 }}>
                  {search || filter !== 'upcoming' ? 'No matching clients' : 'No clients with a date of birth on file yet'}
                </p>
                {!search && filter === 'upcoming' && (
                  <p style={{ fontSize: 12, color: 'var(--text-disabled)', margin: '6px 0 0', maxWidth: 320 }}>
                    Add a date of birth from a client&apos;s Edit page to see them here.
                  </p>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {filtered.map((c, i) => {
                  const wa = whatsappHref(c.mobile, c.name, c.turning_age);
                  return (
                    <m.div key={c.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}
                      onClick={() => router.push(`/pt-os/clients/${c.id}`)}
                      style={{ cursor: 'pointer', borderRadius: 16, padding: 16, background: 'var(--bg-card)', border: c.is_today ? '1.5px solid rgba(0,103,224,0.35)' : '1px solid var(--border)', boxShadow: c.is_today ? '0 4px 20px rgba(0,103,224,0.12)' : '0 1px 4px rgba(0,0,0,0.04)', transition: 'transform 0.15s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 12, flexShrink: 0, fontSize: 15, fontWeight: 800, color: '#0067e0', background: 'rgba(0,103,224,0.12)' }}>
                          {c.is_today ? <PartyPopper size={18} /> : initials(c.name)}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--text-muted)' }}>
                            {fmtBirthday(c.dob)} · Turning {c.turning_age}
                          </p>
                          {c.trainer_name && (
                            <p style={{ margin: '2px 0 0', fontSize: 10.5, color: 'var(--text-disabled)' }}>{c.trainer_name}</p>
                          )}
                        </div>
                        <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', padding: '4px 9px', borderRadius: 20, color: c.is_today ? '#fff' : '#0067e0', background: c.is_today ? 'linear-gradient(135deg, #0067e0, #f59e0b)' : 'rgba(0,103,224,0.1)' }}>
                          {daysLabel(c.days_until_birthday)}
                        </span>
                      </div>
                      {(c.mobile || wa) && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
                          {c.mobile && (
                            <a href={`tel:${c.mobile}`}
                              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '6px 10px', borderRadius: 9, background: 'rgba(0,103,224,0.1)', color: '#0067e0', textDecoration: 'none' }}>
                              <Phone size={11} /> Call
                            </a>
                          )}
                          {wa && (
                            <a href={wa} target="_blank" rel="noopener noreferrer"
                              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '6px 10px', borderRadius: 9, background: 'rgba(16,185,129,0.1)', color: '#10b981', textDecoration: 'none' }}>
                              <MessageCircle size={11} /> {c.is_today ? 'Wish on WhatsApp' : 'WhatsApp'}
                            </a>
                          )}
                        </div>
                      )}
                    </m.div>
                  );
                })}
              </div>
            )}

            {!bd.loading && filtered.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 20 }}>
                <Sparkles size={12} style={{ color: 'var(--text-disabled)' }} />
                <span style={{ fontSize: 11.5, color: 'var(--text-disabled)' }}>
                  Showing {filtered.length} of {clients.length} clients with a date of birth on file
                </span>
              </div>
            )}

            <style>{`
              @keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 0.3; } }
            `}</style>
          </div>
        </PullToRefresh>
      </AppShell>
    </Guard>
  );
}
