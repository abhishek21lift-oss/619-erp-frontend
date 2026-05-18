'use client';

import { useState, useEffect } from 'react';
import { api, StaffTarget, StaffMember } from '@/lib/api';

interface Props {
  staff: StaffMember[];
  editTarget: StaffTarget | null;
  month: string;
  onClose: () => void;
  onSaved: () => void;
}

const INR = (n: number) =>
  n >= 100000
    ? `₹${(n / 100000).toFixed(1)}L`
    : n >= 1000
    ? `₹${(n / 1000).toFixed(0)}K`
    : n
    ? `₹${n}`
    : '—';

const calcProbability = (rev: number, cli: number): number => {
  if (!rev && !cli) return 0;
  const base = 55;
  const revScore = Math.min(rev / 100000, 1) * 25;
  const cliScore = Math.min(cli / 20, 1) * 20;
  return Math.min(Math.round(base + revScore + cliScore), 97);
};

export default function SetTargetModal({
  staff,
  editTarget,
  month,
  onClose,
  onSaved,
}: Props) {
  const [staffId, setStaffId] = useState(editTarget?.staff_id ?? '');
  const [revenue, setRevenue] = useState(
    editTarget?.target_revenue ? String(editTarget.target_revenue) : ''
  );
  const [clients, setClients] = useState(
    editTarget?.target_clients ? String(editTarget.target_clients) : ''
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const revNum = parseInt(revenue.replace(/,/g, '')) || 0;
  const cliNum = parseInt(clients) || 0;
  const probability = calcProbability(revNum, cliNum);
  const selectedStaff = staff.find((s) => s.id === staffId);

  const monthLabel = new Date(month + '-01').toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId) { setError('Please select a staff member'); return; }
    if (!revNum) { setError('Please enter a revenue target'); return; }
    if (!cliNum) { setError('Please enter a client target'); return; }
    setError('');
    setSaving(true);
    try {
      const payload = {
        staff_id: staffId,
        month,
        target_revenue: revNum,
        target_clients: cliNum,
      };
      if (editTarget) {
        await api.staff.targets.update(editTarget.id, payload);
      } else {
        await api.staff.targets.create(payload);
      }
      setSaved(true);
      setTimeout(onSaved, 900);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save target';
      setError(msg);
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-md md:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Set Staff Target"
    >
      <div className="relative w-full max-w-3xl overflow-hidden rounded-[28px] border border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(248,250,252,0.88)_100%)] shadow-[0_40px_120px_rgba(2,6,23,.32)] backdrop-blur-2xl">
        {/* Gradient top strip */}
        <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 z-10 grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close modal"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="grid md:grid-cols-[1.1fr_0.9fr]">
          {/* ── Left: Form ── */}
          <div className="p-7 md:p-8">
            {/* Modal header */}
            <div className="mb-7">
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-[0_8px_24px_rgba(99,102,241,0.30)]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <h2 className="text-[22px] font-[750] tracking-[-0.04em] text-slate-950">
                {editTarget ? 'Update Target' : 'Set Monthly Target'}
              </h2>
              <p className="mt-1 text-[13px] text-slate-500">
                {monthLabel} · Performance goals
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Staff selector */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Staff Member
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-violet-400">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                    </svg>
                  </div>
                  <select
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    disabled={!!editTarget}
                    className="h-12 w-full appearance-none rounded-2xl border border-slate-200/80 bg-white/80 pl-10 pr-4 text-[14px] font-medium text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_4px_12px_rgba(15,23,42,.05)] transition focus:border-violet-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-100 disabled:opacity-60"
                  >
                    <option value="">Select a staff member…</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {s.role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Revenue target */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Revenue Target
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[14px] font-semibold text-violet-500">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 80000"
                    value={revenue}
                    onChange={(e) => setRevenue(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200/80 bg-white/80 pl-8 pr-4 text-[15px] font-[600] tracking-[-0.02em] text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_4px_12px_rgba(15,23,42,.05)] [font-variant-numeric:tabular-nums] placeholder:font-normal placeholder:text-slate-400 transition focus:border-violet-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-100"
                  />
                </div>
                {revNum > 0 && (
                  <p className="mt-1 text-[12px] font-medium text-violet-600">
                    {INR(revNum)} monthly revenue goal
                  </p>
                )}
              </div>

              {/* Client target */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Client Target
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-violet-400">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 16"
                    value={clients}
                    onChange={(e) => setClients(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200/80 bg-white/80 pl-10 pr-4 text-[15px] font-[600] tracking-[-0.02em] text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_4px_12px_rgba(15,23,42,.05)] [font-variant-numeric:tabular-nums] placeholder:font-normal placeholder:text-slate-400 transition focus:border-violet-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-100"
                  />
                </div>
                {cliNum > 0 && (
                  <p className="mt-1 text-[12px] font-medium text-violet-600">
                    {cliNum} active clients per month
                  </p>
                )}
              </div>

              {/* Quick suggestions */}
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Quick suggestions
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Starter', rev: 40000, cli: 10 },
                    { label: 'Standard', rev: 70000, cli: 15 },
                    { label: 'Elite', rev: 100000, cli: 20 },
                  ].map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => {
                        setRevenue(String(s.rev));
                        setClients(String(s.cli));
                      }}
                      className="rounded-full border border-violet-200/70 bg-violet-50 px-3 py-1.5 text-[12px] font-semibold text-violet-700 transition hover:border-violet-300 hover:bg-violet-100"
                    >
                      {s.label} · {INR(s.rev)} / {s.cli}c
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-[13px] font-medium text-rose-700 ring-1 ring-rose-200/60">
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={saving || saved}
                className="group flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-[14px] font-semibold text-white shadow-[0_12px_36px_rgba(99,102,241,0.32)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(99,102,241,0.42)] disabled:translate-y-0 disabled:opacity-60"
              >
                {saved ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Target Saved!
                  </>
                ) : saving ? (
                  <>
                    <svg
                      className="animate-spin"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Saving…
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="6" />
                      <circle cx="12" cy="12" r="2" />
                    </svg>
                    {editTarget ? 'Update Target' : 'Set Target'}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* ── Right: Preview Panel ── */}
          <div className="hidden border-l border-slate-100/80 bg-gradient-to-b from-slate-50/60 to-violet-50/40 p-7 md:block">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Live Preview
            </p>

            {/* Preview card */}
            <div className="mb-5 overflow-hidden rounded-2xl border border-white/80 bg-white/80 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.07)] backdrop-blur-xl">
              {selectedStaff ? (
                <>
                  <div className="mb-3 flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-[12px] font-bold text-white">
                      {selectedStaff.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-slate-900">
                        {selectedStaff.name}
                      </p>
                      <p className="text-[11px] text-slate-500">{selectedStaff.role}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">Revenue</p>
                      <p className="mt-0.5 text-[16px] font-[700] text-slate-900 [font-variant-numeric:tabular-nums]">
                        {INR(revNum)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">Clients</p>
                      <p className="mt-0.5 text-[16px] font-[700] text-slate-900 [font-variant-numeric:tabular-nums]">
                        {cliNum || '—'}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="py-6 text-center text-[13px] text-slate-400">
                  Select a staff member to preview
                </p>
              )}
            </div>

            {/* Achievement probability */}
            {(revNum > 0 || cliNum > 0) && (
              <div className="mb-4">
                <div className="mb-2 flex justify-between text-[12px]">
                  <span className="font-semibold text-slate-600">Achievement probability</span>
                  <span className="font-[700] text-violet-700 [font-variant-numeric:tabular-nums]">
                    {probability}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-700"
                    style={{ width: `${probability}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  {probability >= 80
                    ? 'High confidence — well within team capacity'
                    : probability >= 60
                    ? 'Moderate — achievable with consistent effort'
                    : 'Ambitious — may require extra support'}
                </p>
              </div>
            )}

            {/* AI insight */}
            <div className="rounded-2xl border border-cyan-200/60 bg-cyan-50/70 p-4">
              <div className="mb-2 flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-800">
                  AI Insight
                </p>
              </div>
              <p className="text-[12px] leading-5 text-slate-600">
                {revNum >= 100000
                  ? `Elite-tier target. Achievable with 4+ premium clients and consistent renewal.`
                  : revNum >= 60000
                  ? `Solid mid-range target. Average coach at this level closes ${INR(revNum)} in 21 days. Recommend weekly check-ins.`
                  : revNum > 0
                  ? `Conservative target — good for onboarding. Encourage stretch goals as confidence builds.`
                  : `Enter a revenue amount above to see a performance prediction.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
