'use client';

import { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  Users, AlertTriangle, CheckCircle, Merge, RefreshCw,
  ChevronDown, ChevronUp, IndianRupee, Calendar, Phone,
  Shield, Trash2, X, Search,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Button } from '@/components/ui';
import { api, type DuplicateGroup, type MergeResult } from '@/lib/api';
import { useToast } from '@/lib/toast';

const fmtINR = (n: number | string | null | undefined) =>
  '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const fmtDate = (d?: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function MergeDuplicatesPage() {
  return (
    <Guard role="admin">
      <AppShell>
        <MergeContent />
      </AppShell>
    </Guard>
  );
}

function MergeContent() {
  const { toast } = useToast();

  const [groups, setGroups]           = useState<DuplicateGroup[]>([]);
  const [summary, setSummary]         = useState({ total_groups: 0, total_records: 0, total_duplicates: 0, total_financial_value: 0 });
  const [loading, setLoading]         = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [merging, setMerging]         = useState(false);
  const [doneReport, setDoneReport]   = useState<MergeResult[] | null>(null);
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [search, setSearch]           = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.pt.duplicates();
      setGroups(res.data ?? []);
      setSummary({
        total_groups: res.total_groups,
        total_records: res.total_records,
        total_duplicates: res.total_duplicates,
        total_financial_value: res.total_financial_value,
      });
    } catch { toast.error('Failed to load duplicates'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleMerge = async () => {
    setMerging(true);
    try {
      const res = await api.pt.mergeDuplicates();
      setDoneReport(res.results);
      setConfirmOpen(false);
      toast.success(`Merge complete — ${res.records_removed} duplicate records removed`);
      // Reload to show clean state
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Merge failed');
    } finally {
      setMerging(false);
    }
  };

  const filtered = groups.filter(g =>
    g.display_name.toLowerCase().includes(search.toLowerCase()) ||
    (g.mobile ?? '').includes(search)
  );

  return (
    <div>
      <div className="mx-auto max-w-screen-xl py-6">

        {/* ── Header ── */}
        <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[14px]"
              style={{ background: 'rgba(245,158,11,0.1)' }}>
              <Merge size={22} style={{ color: '#F59E0B' }} />
            </div>
            <div>
              <h1 className="text-[22px] font-[860] tracking-[-0.03em]" style={{ color: 'rgb(15,23,42)' }}>
                Duplicate Client Merge
              </h1>
              <p className="text-[12px] font-[600] uppercase tracking-[0.06em]" style={{ color: 'rgb(148,163,184)' }}>
                Audit & merge duplicate PT client profiles
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" iconLeft={<RefreshCw size={13} />} onClick={load} loading={loading}>
              Refresh
            </Button>
            {groups.length > 0 && !doneReport && (
              <Button variant="danger" iconLeft={<Merge size={13} />} onClick={() => setConfirmOpen(true)}>
                Execute Merge
              </Button>
            )}
          </div>
        </m.div>

        {/* ── Done Report ── */}
        {doneReport && (
          <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-[20px] p-6 mb-6 border"
            style={{ background: 'rgba(16,185,129,0.06)', borderColor: '#10b98133' }}>
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle size={20} style={{ color: '#10b981' }} />
              <h2 className="text-[16px] font-[760]" style={{ color: 'rgb(15,23,42)' }}>
                Merge Complete — {doneReport.length} groups merged
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr style={{ color: 'rgb(148,163,184)' }}>
                    <th className="text-left py-2 font-[700] uppercase tracking-wider">Client</th>
                    <th className="text-right py-2 font-[700] uppercase tracking-wider">Records Merged</th>
                    <th className="text-right py-2 font-[700] uppercase tracking-wider">Total Billed</th>
                    <th className="text-right py-2 font-[700] uppercase tracking-wider">Total Paid</th>
                    <th className="text-right py-2 font-[700] uppercase tracking-wider">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {doneReport.map(r => (
                    <tr key={r.master_id} className="border-t" style={{ borderColor: 'rgba(15,23,42,0.05)' }}>
                      <td className="py-2 font-[600]" style={{ color: 'rgb(15,23,42)' }}>{r.name.toUpperCase()}</td>
                      <td className="py-2 text-right" style={{ color: 'rgb(148,163,184)' }}>+{r.merged_count}</td>
                      <td className="py-2 text-right font-[600]" style={{ color: 'rgb(15,23,42)' }}>{fmtINR(r.total_final)}</td>
                      <td className="py-2 text-right" style={{ color: '#10b981' }}>{fmtINR(r.total_paid)}</td>
                      <td className="py-2 text-right" style={{ color: r.balance > 0 ? '#f59e0b' : '#10b981' }}>
                        {r.balance > 0 ? fmtINR(r.balance) : '✓ Clear'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </m.div>
        )}

        {loading ? (
          <div className="text-center py-24 text-[14px]" style={{ color: 'rgb(148,163,184)' }}>
            <RefreshCw size={22} className="mx-auto mb-3 animate-spin" />
            Scanning for duplicates...
          </div>
        ) : groups.length === 0 ? (
          <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-[22px] p-16 text-center"
            style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.8)' }}>
            <CheckCircle size={48} style={{ color: '#10b981' }} className="mx-auto mb-4" />
            <h3 className="text-[18px] font-[760]" style={{ color: 'rgb(15,23,42)' }}>No Duplicates Found</h3>
            <p className="text-[13px] mt-2" style={{ color: 'rgb(148,163,184)' }}>
              All PT client profiles are unique. No merge required.
            </p>
          </m.div>
        ) : (
          <>
            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Duplicate Groups', value: summary.total_groups, color: '#F59E0B', icon: <Users size={15} /> },
                { label: 'Total Records', value: summary.total_records, color: '#f59e0b', icon: <AlertTriangle size={15} /> },
                { label: 'Will Be Removed', value: summary.total_duplicates, color: '#7c3aed', icon: <Trash2 size={15} /> },
                { label: 'Total Value', value: fmtINR(summary.total_financial_value), color: '#10b981', icon: <IndianRupee size={15} />, isText: true },
              ].map((c, i) => (
                <m.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="rounded-[16px] p-4"
                  style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span style={{ color: c.color }}>{c.icon}</span>
                    <span className="text-[10px] font-[700] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>{c.label}</span>
                  </div>
                  <p className="text-[22px] font-[820]" style={{ color: c.color }}>
                    {(c as any).isText ? c.value : c.value}
                  </p>
                </m.div>
              ))}
            </div>

            {/* ── Warning Banner ── */}
            <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="rounded-[14px] px-5 py-4 mb-5 flex items-start gap-3"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <Shield size={16} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
              <div className="text-[12.5px] leading-relaxed" style={{ color: 'rgb(100,116,139)' }}>
                <strong style={{ color: 'rgb(15,23,42)' }}>Before merging:</strong> Each group below represents the same client with multiple subscription periods imported as separate records.
                The merge will <strong>keep the oldest record as master</strong>, sum all financials (total lifetime value),
                set the <strong>latest subscription as the current PT assignment</strong>, and soft-delete duplicates (fully recoverable from backup).
              </div>
            </m.div>

            {/* ── Search ── */}
            <div className="relative mb-4" style={{ maxWidth: 340 }}>
              <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgb(148,163,184)', pointerEvents: 'none' }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or phone…"
                className="w-full rounded-[12px] pl-9 pr-4 py-2.5 text-[13px] outline-none"
                style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(15,23,42,0.09)', color: 'rgb(15,23,42)' }} />
            </div>

            {/* ── Duplicate Groups List ── */}
            <div className="space-y-3">
              {filtered.map((grp, i) => {
                const isExpanded = expandedId === grp.master_id;
                const subsCount = (grp.subscription_starts ?? []).length;
                return (
                  <m.div key={grp.master_id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                    className="rounded-[18px] overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>

                    {/* Row header */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : grp.master_id)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/50 transition-all">
                      <div className="flex items-center gap-4 min-w-0">
                        {/* Duplicate count badge */}
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[13px] font-[800]"
                          style={{ background: grp.record_count >= 5 ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)', color: grp.record_count >= 5 ? '#D97706' : '#f59e0b' }}>
                          ×{grp.record_count}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[14px] font-[700] truncate" style={{ color: 'rgb(15,23,42)' }}>{grp.display_name}</p>
                          <p className="text-[11.5px] flex items-center gap-2 mt-0.5 flex-wrap" style={{ color: 'rgb(148,163,184)' }}>
                            {grp.mobile && <span className="flex items-center gap-1"><Phone size={10} />{grp.mobile}</span>}
                            {grp.latest_plan && <span>· {grp.latest_plan}</span>}
                            {grp.trainer_name && <span>· {grp.trainer_name}</span>}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 shrink-0">
                        <div className="hidden sm:flex gap-6 text-right">
                          <div>
                            <p className="text-[10px] font-[600] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Total Billed</p>
                            <p className="text-[14px] font-[720]" style={{ color: 'rgb(15,23,42)' }}>{fmtINR(grp.total_final)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-[600] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Subscriptions</p>
                            <p className="text-[14px] font-[720]" style={{ color: '#6366f1' }}>{subsCount}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-[600] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Balance</p>
                            <p className="text-[14px] font-[720]" style={{ color: Number(grp.balance) > 0 ? '#f59e0b' : '#10b981' }}>
                              {Number(grp.balance) > 0 ? fmtINR(grp.balance) : '✓ Clear'}
                            </p>
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp size={16} style={{ color: 'rgb(148,163,184)' }} /> : <ChevronDown size={16} style={{ color: 'rgb(148,163,184)' }} />}
                      </div>
                    </button>

                    {/* Expanded detail */}
                    <AnimatePresence>
                      {isExpanded && (
                        <m.div
                          initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ overflow: 'hidden', borderTop: '1px solid rgba(15,23,42,0.05)' }}>
                          <div className="px-5 pb-5 pt-4 space-y-4">

                            {/* Merge preview */}
                            <div className="grid grid-cols-3 gap-3 text-center">
                              {[
                                { label: 'Master ID (kept)', value: grp.master_id.slice(0, 8) + '…', color: '#10b981' },
                                { label: 'Records to Remove', value: `${grp.record_count - 1} duplicates`, color: '#F59E0B' },
                                { label: 'First Seen', value: fmtDate(grp.first_seen), color: 'rgb(100,116,139)' },
                              ].map(f => (
                                <div key={f.label} className="rounded-[12px] p-3"
                                  style={{ background: 'rgba(15,23,42,0.03)', border: '1px solid rgba(15,23,42,0.05)' }}>
                                  <p className="text-[10px] font-[600] uppercase tracking-wider mb-1" style={{ color: 'rgb(148,163,184)' }}>{f.label}</p>
                                  <p className="text-[13px] font-[700]" style={{ color: f.color }}>{f.value}</p>
                                </div>
                              ))}
                            </div>

                            {/* Subscription timeline */}
                            {subsCount > 0 && (
                              <div>
                                <p className="text-[11px] font-[700] uppercase tracking-wider mb-2.5" style={{ color: 'rgb(148,163,184)' }}>
                                  Subscription Timeline ({subsCount} periods — all preserved)
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {(grp.subscription_starts ?? []).map((d, idx) => (
                                    <div key={d} className="flex items-center gap-1.5 rounded-[8px] px-3 py-1.5"
                                      style={{ background: idx === subsCount - 1 ? 'rgba(99,102,241,0.1)' : 'rgba(15,23,42,0.04)', border: idx === subsCount - 1 ? '1px solid rgba(99,102,241,0.25)' : '1px solid rgba(15,23,42,0.06)' }}>
                                      <Calendar size={10} style={{ color: idx === subsCount - 1 ? '#6366f1' : 'rgb(148,163,184)' }} />
                                      <span className="text-[11.5px] font-[600]" style={{ color: idx === subsCount - 1 ? '#6366f1' : 'rgb(100,116,139)' }}>
                                        {fmtDate(d)}{idx === subsCount - 1 ? ' (latest)' : ''}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Financial summary after merge */}
                            <div className="rounded-[12px] p-4 grid grid-cols-2 sm:grid-cols-4 gap-3"
                              style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)' }}>
                              <div>
                                <p className="text-[10px] font-[700] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>After Merge: Total Billed</p>
                                <p className="text-[15px] font-[760] mt-0.5" style={{ color: 'rgb(15,23,42)' }}>{fmtINR(grp.total_final)}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-[700] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Total Paid</p>
                                <p className="text-[15px] font-[760] mt-0.5" style={{ color: '#10b981' }}>{fmtINR(grp.total_paid)}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-[700] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Balance</p>
                                <p className="text-[15px] font-[760] mt-0.5" style={{ color: Number(grp.balance) > 0 ? '#f59e0b' : '#10b981' }}>
                                  {Number(grp.balance) > 0 ? fmtINR(grp.balance) : 'Fully Paid ✓'}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] font-[700] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Current Plan</p>
                                <p className="text-[13px] font-[660] mt-0.5" style={{ color: 'rgb(15,23,42)' }}>{grp.latest_plan || '—'}</p>
                              </div>
                            </div>

                          </div>
                        </m.div>
                      )}
                    </AnimatePresence>
                  </m.div>
                );
              })}
            </div>

            {filtered.length === 0 && search && (
              <div className="text-center py-12 text-[13px]" style={{ color: 'rgb(148,163,184)' }}>
                No results for "{search}"
              </div>
            )}

            {/* ── Bottom action ── */}
            {!doneReport && (
              <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="mt-6 flex justify-end">
                <Button variant="danger" iconLeft={<Merge size={14} />} onClick={() => setConfirmOpen(true)}>
                  Execute Merge — Remove {summary.total_duplicates} Duplicate Records
                </Button>
              </m.div>
            )}
          </>
        )}
      </div>

      {/* ── Confirm Modal ── */}
      <AnimatePresence>
        {confirmOpen && (
          <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => !merging && setConfirmOpen(false)}>
            <m.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-[24px] p-7"
              style={{ background: 'white', boxShadow: '0 32px 96px rgba(0,0,0,0.25)' }}
              onClick={e => e.stopPropagation()}>

              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[12px]"
                    style={{ background: 'rgba(245,158,11,0.1)' }}>
                    <Merge size={20} style={{ color: '#F59E0B' }} />
                  </div>
                  <div>
                    <h3 className="text-[17px] font-[760]" style={{ color: 'rgb(15,23,42)' }}>Confirm Merge</h3>
                    <p className="text-[12px]" style={{ color: 'rgb(148,163,184)' }}>This action will modify the database</p>
                  </div>
                </div>
                {!merging && (
                  <button onClick={() => setConfirmOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-100">
                    <X size={15} />
                  </button>
                )}
              </div>

              <div className="rounded-[14px] p-4 mb-5 space-y-2"
                style={{ background: 'rgba(15,23,42,0.03)', border: '1px solid rgba(15,23,42,0.07)' }}>
                {[
                  [`${summary.total_groups} duplicate groups`, 'will be merged'],
                  [`${summary.total_duplicates} extra records`, 'will be soft-deleted (recoverable)'],
                  ['All subscription history', 'preserved chronologically'],
                  ['All financials', 'summed into master record'],
                  ['Full backup', 'created before any changes'],
                  ['All FK references', 'updated to master record'],
                ].map(([bold, rest]) => (
                  <div key={bold} className="flex items-center gap-2.5 text-[12.5px]" style={{ color: 'rgb(71,85,105)' }}>
                    <CheckCircle size={13} style={{ color: '#10b981', flexShrink: 0 }} />
                    <span><strong style={{ color: 'rgb(15,23,42)' }}>{bold}</strong> {rest}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-[12px] px-4 py-3 mb-6 flex items-center gap-2.5"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <AlertTriangle size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
                <p className="text-[12px]" style={{ color: 'rgb(100,116,139)' }}>
                  Soft-deleted records remain in <code>pt_clients_merge_backup</code> and can be restored by your database admin.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={merging}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleMerge} loading={merging} iconLeft={<Merge size={13} />}>
                  {merging ? 'Merging…' : `Merge ${summary.total_duplicates} Records`}
                </Button>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
