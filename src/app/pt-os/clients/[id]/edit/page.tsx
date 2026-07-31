'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import {
  ArrowLeft, Save, User, Dumbbell, Wallet, Trash2, AlertTriangle,
  CheckCircle, Info,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Button } from '@/components/ui';
import FloatInput from '@/components/ui/FloatInput';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

function addMonths(dateStr: string, months: number): string {
  if (!dateStr || !months) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function SectionCard({ title, icon, children, accent = '#F59E0B' }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; accent?: string;
}) {
  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="pb-8 border-b"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px]"
          style={{ background: `${accent}14` }}>
          <span style={{ color: accent }}>{icon}</span>
        </div>
        <h2 className="text-[15px] font-[720]" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      </div>
      {children}
    </m.div>
  );
}

function ReadOnlyField({ label, value, highlight }: { label: string; value: string; highlight?: 'green' | 'red' | 'amber' }) {
  const color = highlight === 'green' ? '#10b981' : highlight === 'red' ? '#ef4444' : highlight === 'amber' ? '#f59e0b' : '#111827';
  return (
    <div className="rounded-[13px] px-4 py-3" style={{ background: 'var(--bg-subtle)', border: '1.5px solid var(--border)' }}>
      <p className="text-[10.5px] font-[600] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-[14px] font-[700]" style={{ color }}>{value}</p>
    </div>
  );
}

export default function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    // Personal
    name: '', mobile: '', email: '', gender: '', dob: '', address: '', emergency_contact: '', emergency_phone: '',
    // PT Assignment
    pt_start_date: '', pt_end_date: '', duration_months: '',
    // Financial
    final_amount: '', paid_amount: '',
  });

  // Derived (read-only)
  const balance = Math.max(0, (parseFloat(form.final_amount) || 0) - (parseFloat(form.paid_amount) || 0));

  const set = (key: keyof typeof form) => (v: string) =>
    setForm(p => ({ ...p, [key]: v }));

  // When start date or duration changes → recalculate end date
  const recalcEndDate = useCallback((startDate: string, months: string) => {
    const monthsNum = parseInt(months, 10);
    if (startDate && monthsNum > 0) {
      setForm(p => ({ ...p, pt_end_date: addMonths(startDate, monthsNum) }));
    }
  }, []);

  // Load client data
  useEffect(() => {
    (async () => {
      try {
        const clientRes = await api.pt.client(id);
        const c = (clientRes as any)?.data;
        if (c) {
          setForm({
            name: c.name ?? '',
            mobile: c.mobile ?? '',
            email: c.email ?? '',
            gender: c.gender ?? '',
            dob: c.dob ? String(c.dob).slice(0, 10) : '',
            address: c.address ?? '',
            emergency_contact: c.emergency_contact ?? '',
            emergency_phone: c.emergency_phone ?? '',
            pt_start_date: c.pt_start_date ? String(c.pt_start_date).slice(0, 10) : '',
            pt_end_date: c.pt_end_date ? String(c.pt_end_date).slice(0, 10) : '',
            duration_months: c.duration_months != null ? String(c.duration_months) : '',
            final_amount: c.final_amount != null ? String(c.final_amount) : '',
            paid_amount: c.paid_amount != null ? String(c.paid_amount) : '',
          });
        }
      } catch (err: any) {
        toast.error(err?.message || 'Failed to load client');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ── Deleting a client ──
  //
  // This used to be a tile in the profile's Quick Actions grid, one row from
  // "Photos" and two from "Diet Plans" — a destructive, irreversible action
  // sitting among navigation. It belongs behind the deliberate act of opening
  // Edit, at the bottom, behind a typed confirmation.
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await api.pt.deleteClient(id);
      toast.success('Client deleted.');
      router.push('/pt-os/clients');
    } catch {
      toast.error('Failed to delete client');
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const num  = (v: string) => v.trim() !== '' ? Number(v) : null;
      const str  = (v: string) => v.trim() || null;
      await api.pt.updateClient(id, {
        name: form.name.trim(),
        mobile: str(form.mobile),
        email: str(form.email),
        gender: str(form.gender),
        dob: str(form.dob),
        address: str(form.address),
        emergency_contact: str(form.emergency_contact),
        emergency_phone: str(form.emergency_phone),
        pt_start_date: str(form.pt_start_date),
        pt_end_date: str(form.pt_end_date),
        duration_months: num(form.duration_months),
        final_amount: num(form.final_amount),
        paid_amount: num(form.paid_amount),
      });
      toast.success('Client updated successfully');
      router.push(`/pt-os/clients/${id}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const fmtINR = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

  if (loading) {
    return (
      <Guard>
        <AppShell>
          <div className="animate-pulse space-y-6 p-6 max-w-3xl mx-auto">
            <div className="h-16 rounded-[20px]" style={{ background: 'var(--bg-subtle)' }} />
            {[1,2,3].map(i => <div key={i} className="h-48 rounded-[20px]" style={{ background: 'var(--bg-subtle)' }} />)}
          </div>
        </AppShell>
      </Guard>
    );
  }

  return (
    <Guard>
      <AppShell>
        <div className="min-h-screen">
          <div className="mx-auto max-w-3xl py-6 space-y-5">

            {/* ── Header ── */}
            <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => router.push(`/pt-os/clients/${id}`)}
                  className="flex h-9 w-9 items-center justify-center rounded-[10px] transition hover:bg-zinc-50"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <ArrowLeft size={15} style={{ color: 'var(--text-disabled)' }} />
                </button>
                <div>
                  <h1 className="text-[20px] font-[780] tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
                    Edit Client
                  </h1>
                  <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>All changes auto-save on submit</p>
                </div>
              </div>
              <Button variant="primary" iconLeft={<Save size={14} />} onClick={handleSave} loading={saving}>
                Save Changes
              </Button>
            </m.div>

            {/* ── Personal Info ── */}
            <SectionCard title="Personal Information" icon={<User size={16} />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FloatInput label="Full Name" required value={form.name} onChange={set('name')} />
                <FloatInput label="Phone Number" type="tel" value={form.mobile} onChange={set('mobile')} />
                <FloatInput label="Email Address" type="email" value={form.email} onChange={set('email')} />
                <div>
                  <label className="block text-[11px] font-[600] mb-2" style={{ color: 'var(--text-disabled)' }}>Gender</label>
                  <select
                    value={form.gender}
                    onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}
                    className="w-full rounded-[13px] px-4 py-3.5 text-[13.5px] font-[500] outline-none appearance-none transition-all"
                    style={{
                      background: 'var(--bg-card)', color: form.gender ? '#111827' : '#6b7280',
                      border: '1.5px solid var(--border)',
                    }}>
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <FloatInput label="Date of Birth" type="date" value={form.dob} onChange={set('dob')} />
                <div className="sm:col-span-2">
                  <FloatInput label="Address" value={form.address} onChange={set('address')} />
                </div>
                <FloatInput label="Emergency Contact" value={form.emergency_contact} onChange={set('emergency_contact')} />
                <FloatInput label="Emergency Number" type="tel" value={form.emergency_phone} onChange={set('emergency_phone')} />
              </div>
            </SectionCard>

            {/* ── PT Assignment ── */}
            <SectionCard title="PT Assignment" icon={<Dumbbell size={16} />} accent="#6366f1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <FloatInput
                  label="PT Start Date"
                  type="date"
                  value={form.pt_start_date}
                  onChange={v => {
                    setForm(p => ({ ...p, pt_start_date: v }));
                    recalcEndDate(v, form.duration_months);
                  }}
                />

                <FloatInput
                  label="Duration (months)"
                  type="number"
                  value={form.duration_months}
                  onChange={v => {
                    setForm(p => ({ ...p, duration_months: v }));
                    recalcEndDate(form.pt_start_date, v);
                  }}
                />

                <FloatInput
                  label="PT End Date"
                  type="date"
                  value={form.pt_end_date}
                  onChange={set('pt_end_date')}
                  suffix={
                    form.pt_start_date && form.duration_months
                      ? <span style={{ fontSize: 10, color: '#6366f1', fontWeight: 600 }}>auto</span>
                      : undefined
                  }
                />

              </div>
            </SectionCard>

            {/* ── Financial ── */}
            <SectionCard title="Financial Details" icon={<Wallet size={16} />} accent="#10b981">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <FloatInput
                  label="Final / Selling Price (₹)"
                  type="number"
                  value={form.final_amount}
                  onChange={set('final_amount')}
                />

                <FloatInput
                  label="Amount Paid (₹)"
                  type="number"
                  value={form.paid_amount}
                  onChange={set('paid_amount')}
                />

                {/* Balance — auto-calculated, read-only */}
                <ReadOnlyField
                  label="Balance Due (auto)"
                  value={balance > 0 ? fmtINR(balance) : 'Fully Paid ✓'}
                  highlight={balance > 0 ? 'red' : 'green'}
                />

              </div>

              {/* Info hint */}
              <div className="mt-4 flex items-start gap-2 rounded-[10px] px-3.5 py-2.5"
                style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.12)' }}>
                <Info size={12} style={{ color: '#6366f1', marginTop: 2, flexShrink: 0 }} />
                <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--text-disabled)' }}>
                  Balance = Final − Paid. This recalculates automatically as you type.
                </p>
              </div>
            </SectionCard>

            {/* ── Save footer ── */}
            <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center justify-between rounded-[16px] px-5 py-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 2px 12px rgba(15,23,42,0.04)' }}>
              <div className="flex items-center gap-2">
                <CheckCircle size={15} style={{ color: '#10b981' }} />
                <span className="text-[12.5px] font-[550]" style={{ color: 'var(--text-disabled)' }}>
                  Review all fields before saving
                </span>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => router.push(`/pt-os/clients/${id}`)}>
                  Cancel
                </Button>
                <Button variant="primary" iconLeft={<Save size={14} />} onClick={handleSave} loading={saving}>
                  Save Changes
                </Button>
              </div>
            </m.div>

            {/* ── Danger zone ──
                Last on the page, visually separated, and gated on typing the
                client's name. A confirm dialog alone is a reflex to dismiss;
                typing the name makes you look at who you are about to remove. */}
            <div className="mt-6 rounded-[16px] p-5"
              style={{ background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.25)' }}>
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: '#dc2626' }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-[780]" style={{ color: '#b91c1c' }}>Delete this client</p>
                  <p className="mt-0.5 max-w-[60ch] text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                    Removes {form.name || 'this client'} along with their assessments, payments and
                    workout history. This cannot be undone.
                  </p>

                  {!deleteOpen ? (
                    <button type="button" onClick={() => setDeleteOpen(true)}
                      className="mt-3 flex h-[44px] items-center gap-2 rounded-[12px] px-4 text-[12.5px] font-[720]"
                      style={{ background: 'var(--bg-card)', border: '1px solid rgba(220,38,38,0.35)', color: '#b91c1c' }}>
                      <Trash2 size={14} /> Delete client
                    </button>
                  ) : (
                    <div className="mt-3 space-y-2.5">
                      <label className="block text-[11px] font-[700]" style={{ color: 'var(--text-muted)' }}>
                        Type <span style={{ color: '#b91c1c' }}>{form.name}</span> to confirm
                      </label>
                      <input
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder={form.name}
                        className="w-full max-w-[320px] rounded-[10px] px-3 text-[13px] outline-none"
                        style={{
                          height: 44, background: 'var(--bg-card)',
                          border: '1px solid rgba(220,38,38,0.3)', color: 'var(--text-primary)',
                        }}
                      />
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={handleDelete}
                          disabled={deleting || confirmText.trim() !== (form.name ?? '').trim() || !form.name}
                          className="flex h-[44px] items-center gap-2 rounded-[12px] px-4 text-[12.5px] font-[720] text-white disabled:opacity-45"
                          style={{ background: '#dc2626' }}>
                          <Trash2 size={14} /> {deleting ? 'Deleting…' : 'Delete permanently'}
                        </button>
                        <button type="button"
                          onClick={() => { setDeleteOpen(false); setConfirmText(''); }}
                          className="flex h-[44px] items-center rounded-[12px] px-4 text-[12.5px] font-[720]"
                          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </AppShell>
    </Guard>
  );
}
