'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Repeat, CheckCircle, IndianRupee, Calendar, User, Dumbbell, FileText } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Button } from '@/components/ui';
import FloatInput from '@/components/ui/FloatInput';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

const fmtINR = (n: number | string | null | undefined) =>
  '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const fmtDate = (d?: string | null) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

interface Client {
  id: string; name: string; mobile?: string; trainer_name?: string;
  package_type?: string; pt_end_date?: string; final_amount: number;
  paid_amount: number; balance_amount: number;
}

function ReadOnly({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div className="rounded-[13px] px-4 py-3.5" style={{ background: 'var(--bg-subtle)', border: '1.5px solid rgba(0,0,0,0.07)' }}>
      <p className="text-[10px] font-[700] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-[15px] font-[700]" style={{ color: highlight || '#111827' }}>{value}</p>
    </div>
  );
}

export default function RenewPtPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [client, setClient] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    finalAmount: '',
    paidNow: '',
    startDate: '',
    durationMonths: '',
    notes: '',
  });

  const final = Number(form.finalAmount) || 0;
  const paidNow = Number(form.paidNow) || 0;
  const balance = Math.max(final - paidNow, 0);

  const endDate = (() => {
    if (!form.startDate || !form.durationMonths) return null;
    const d = new Date(form.startDate);
    d.setMonth(d.getMonth() + Number(form.durationMonths));
    return d.toISOString().slice(0, 10);
  })();

  useEffect(() => {
    Promise.allSettled([api.pt.client(id)]).then(([cRes]) => {
      if (cRes.status === 'fulfilled') {
        const c = (cRes.value as any)?.data;
        setClient(c);
        setForm(f => ({
          ...f,
          finalAmount: String(c?.final_amount || ''),
          startDate: new Date().toISOString().slice(0, 10),
        }));
      }
    });
  }, [id]);

  const handleSubmit = async () => {
    if (!form.startDate || !form.durationMonths) {
      toast.error('Start date and duration are required');
      return;
    }
    setSaving(true);
    try {
      await api.clients.renewPt(id, {
        final_amount: final,
        paid_amount: paidNow,
        monthly_pt_amount: form.durationMonths ? Math.round(final / Number(form.durationMonths)) : 0,
        pt_start_date: form.startDate,
        duration_months: Number(form.durationMonths),
        notes: form.notes || undefined,
      });
      toast.success('PT renewed successfully');
      router.push(`/pt-os/clients/${id}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to renew PT');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Guard>
      <AppShell>
        <div className="mx-auto max-w-2xl py-6">

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => router.back()}
              className="flex h-9 w-9 items-center justify-center rounded-[10px] transition hover:bg-zinc-100"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <ArrowLeft size={15} style={{ color: 'var(--text-secondary)' }} />
            </button>
            <div>
              <h1 className="text-[20px] font-[800] tracking-tight" style={{ color: 'var(--text-primary)' }}>Renew PT</h1>
              {client && <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{client.name}</p>}
            </div>
          </div>

          {/* Current subscription summary */}
          {client && (
            <div className="rounded-[18px] p-5 mb-6"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <p className="text-[10px] font-[700] uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Current Subscription</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Plan', value: client.package_type || '—' },
                  { label: 'Expires', value: fmtDate(client.pt_end_date) },
                  { label: 'Total Paid', value: fmtINR(client.paid_amount) },
                  { label: 'Balance Due', value: fmtINR(client.balance_amount), red: client.balance_amount > 0 },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                    <p className="text-[14px] font-[700]" style={{ color: item.red ? '#ef4444' : '#111827' }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form sections (flat — no wrapper card) */}
          <div className="space-y-6">

            {/* Section: Plan */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-[8px]" style={{ background: 'rgba(139,92,246,0.12)' }}>
                  <Dumbbell size={13} style={{ color: '#8b5cf6' }} />
                </div>
                <h2 className="text-[13px] font-[700]" style={{ color: 'var(--text-primary)' }}>Package Details</h2>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <FloatInput label="Start Date *" type="date" value={form.startDate} onChange={v => setForm(f => ({ ...f, startDate: v }))} />
                  <FloatInput label="Duration (months) *" type="number" value={form.durationMonths} onChange={v => setForm(f => ({ ...f, durationMonths: v }))} />
                </div>
                {endDate && (
                  <div className="rounded-[10px] px-4 py-2.5 flex items-center gap-2"
                    style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <Calendar size={13} style={{ color: '#10b981' }} />
                    <span className="text-[12px] font-[600]" style={{ color: '#10b981' }}>
                      New end date: <strong>{fmtDate(endDate)}</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--bg-subtle)' }} />

            {/* Section: Financials */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-[8px]" style={{ background: 'rgba(16,185,129,0.12)' }}>
                  <IndianRupee size={13} style={{ color: '#10b981' }} />
                </div>
                <h2 className="text-[13px] font-[700]" style={{ color: 'var(--text-primary)' }}>Financial Details</h2>
              </div>
              <div className="space-y-4">
                <FloatInput label="Final Amount (₹) *" type="number" value={form.finalAmount}
                  onChange={v => setForm(f => ({ ...f, finalAmount: v }))} />
                <FloatInput label="Amount Paid Now (₹)" type="number" value={form.paidNow}
                  onChange={v => setForm(f => ({ ...f, paidNow: v }))} />

                {/* Computed summary */}
                <div className="grid grid-cols-3 gap-3 pt-1">
                  <ReadOnly label="Final Amount" value={fmtINR(final)} highlight="#111827" />
                  <ReadOnly label="Paid Now" value={fmtINR(paidNow)} highlight="#10b981" />
                  <ReadOnly label="Balance Due" value={fmtINR(balance)} highlight={balance > 0 ? '#dc2626' : '#10b981'} />
                </div>
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--bg-subtle)' }} />

            {/* Notes */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-[8px]" style={{ background: 'rgba(245,158,11,0.12)' }}>
                  <FileText size={13} style={{ color: '#f59e0b' }} />
                </div>
                <h2 className="text-[13px] font-[700]" style={{ color: 'var(--text-primary)' }}>Notes (optional)</h2>
              </div>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={3} placeholder="Any notes about this renewal…"
                className="w-full rounded-[13px] px-4 py-3 text-[13px] outline-none resize-none"
                style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button variant="success" loading={saving}
                disabled={!form.startDate || !form.durationMonths || !form.finalAmount}
                onClick={handleSubmit}
                iconLeft={<CheckCircle size={14} />}>
                Confirm Renewal
              </Button>
            </div>
          </div>
        </div>
      </AppShell>
    </Guard>
  );
}
