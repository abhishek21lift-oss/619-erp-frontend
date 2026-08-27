'use client';

// The queue of studios asking to join.
//
// Nothing is provisioned until someone here approves it, so this tab is the
// gate between a landing-page form and a live tenant. Approving creates the
// organisation, the trainer and the admin user, and starts the 3-day trial
// from that moment — an application that sat here for two days must not arrive
// with one day left on it.
import { useCallback, useEffect, useState } from 'react';
import {
  Building2, Check, Clock, Loader2, Mail, MessageCircle, Phone, RefreshCw, User, X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import type { StudioRegistration } from '@/lib/api/endpoints/platform';

type Filter = 'pending' | 'approved' | 'rejected' | 'all';

const STATUS_META: Record<string, { label: string; fg: string; bg: string }> = {
  pending:  { label: 'Pending',  fg: '#D97706', bg: 'rgba(245,158,11,0.12)' },
  approved: { label: 'Approved', fg: '#059669', bg: 'rgba(16,185,129,0.12)' },
  rejected: { label: 'Rejected', fg: '#DC2626', bg: 'rgba(220,38,38,0.10)' },
};

/** "2 Aug 2026, 19:42" — the applicant's own submission time, in the reader's zone. */
function stamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** wa.me wants digits only; the column already stores them normalised. */
const waLink = (mobile: string, text: string) =>
  `https://wa.me/${mobile.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;

export default function RegistrationsTab() {
  const { toast } = useToast();
  const [rows, setRows] = useState<StudioRegistration[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<Filter>('pending');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (f: Filter) => {
    setLoading(true);
    try {
      const res = await api.superAdmin.registrations(f);
      setRows(res.data ?? []);
      setCounts(res.counts ?? {});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load registrations.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(filter); }, [filter, load]);

  const approve = useCallback(async (r: StudioRegistration) => {
    if (!window.confirm(`Approve ${r.business_name} and start their 3-day trial now?`)) return;
    setBusyId(r.id);
    try {
      await api.superAdmin.approveRegistration(r.id);
      toast.success(`${r.business_name} is live. ${r.full_name} can sign in now.`);
      await load(filter);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not approve this application.');
    } finally { setBusyId(null); }
  }, [filter, load, toast]);

  const reject = useCallback(async (r: StudioRegistration) => {
    // Prompt rather than a silent reject: the note is the only record of why,
    // and support will be asked about it later.
    const note = window.prompt(`Reject ${r.business_name}? Add a short reason (optional):`, '');
    if (note === null) return;
    setBusyId(r.id);
    try {
      await api.superAdmin.rejectRegistration(r.id, note);
      toast.success('Application rejected.');
      await load(filter);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reject this application.');
    } finally { setBusyId(null); }
  }, [filter, load, toast]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['pending', 'approved', 'rejected', 'all'] as Filter[]).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className="flex h-11 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-[700] capitalize transition"
            style={filter === f
              ? { background: '#0F172A', color: '#fff' }
              : { background: 'var(--bg-subtle)', color: '#64748B' }}>
            {f}
            {counts[f] != null && f !== 'all' && (
              <span className="rounded-full px-1.5 text-[10.5px] tabular-nums"
                style={{ background: filter === f ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.06)' }}>
                {counts[f]}
              </span>
            )}
          </button>
        ))}
        <button type="button" onClick={() => load(filter)} aria-label="Refresh"
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-full"
          style={{ background: 'var(--bg-subtle)', color: '#64748B' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && rows.length === 0 && (
        <p className="py-10 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>Loading applications…</p>
      )}

      {!loading && rows.length === 0 && (
        <div className="rounded-[18px] p-10 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <Clock size={22} style={{ color: '#94A3B8' }} className="mx-auto" />
          <p className="mt-2 text-[13.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>
            {filter === 'pending' ? 'No applications waiting' : `No ${filter} applications`}
          </p>
          <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
            New sign-ups from the landing page land here.
          </p>
        </div>
      )}

      <div className="space-y-2.5">
        {rows.map((r) => {
          const meta = STATUS_META[r.status] ?? STATUS_META.pending;
          const busy = busyId === r.id;
          return (
            <div key={r.id} className="rounded-[16px] p-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[14px] font-[780]" style={{ color: 'var(--text-primary)' }}>
                    <Building2 size={14} style={{ color: '#94A3B8' }} /> {r.business_name}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
                    <User size={12} /> {r.full_name}
                  </p>
                </div>
                <span className="shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-[800] uppercase tracking-wide"
                  style={{ background: meta.bg, color: meta.fg }}>
                  {meta.label}
                </span>
              </div>

              <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                <a href={`mailto:${r.email}`} className="flex items-center gap-1.5 hover:underline">
                  <Mail size={12} /> {r.email}
                </a>
                <a href={`tel:+${r.mobile.replace(/\D/g, '')}`} className="flex items-center gap-1.5 hover:underline">
                  <Phone size={12} /> {r.mobile}
                </a>
                <span className="flex items-center gap-1.5 tabular-nums">
                  <Clock size={12} /> {stamp(r.created_at)}
                </span>
              </div>

              {r.review_note && (
                <p className="mt-2 rounded-[10px] px-3 py-2 text-[12px]"
                  style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                  {r.reviewed_by ? `${r.reviewed_by}: ` : ''}{r.review_note}
                </p>
              )}

              {r.status === 'pending' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => approve(r)} disabled={busy}
                    className="flex h-10 items-center gap-1.5 rounded-[10px] px-3.5 text-[12.5px] font-[750] text-white transition active:scale-[0.98] disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}>
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve &amp; Activate
                  </button>
                  <button type="button" onClick={() => reject(r)} disabled={busy}
                    className="flex h-10 items-center gap-1.5 rounded-[10px] px-3.5 text-[12.5px] font-[750] transition active:scale-[0.98] disabled:opacity-50"
                    style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626' }}>
                    <X size={14} /> Reject
                  </button>
                  <a
                    href={waLink(r.mobile, `Hi ${r.full_name}, this is MY PT STUDIO about your studio application for ${r.business_name}.`)}
                    target="_blank" rel="noopener noreferrer"
                    className="flex h-10 items-center gap-1.5 rounded-[10px] px-3.5 text-[12.5px] font-[750] transition active:scale-[0.98]"
                    style={{ background: 'rgba(0,103,224,0.08)', color: '#0059ce' }}>
                    <MessageCircle size={14} /> Contact Applicant
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
