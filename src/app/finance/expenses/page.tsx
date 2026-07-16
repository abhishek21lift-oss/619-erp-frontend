'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Button, KpiCard, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import {
  Receipt, Plus, Trash2, Edit2, Loader2, IndianRupee,
  CheckCircle2, Clock, XCircle, Wallet,
} from 'lucide-react';

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  payment_method: string;
  notes: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_by_name?: string;
}

const CATEGORIES = ['rent', 'utilities', 'equipment', 'maintenance', 'marketing', 'salaries', 'supplies', 'insurance', 'other'];
const PAYMENT_METHODS = ['cash', 'card', 'upi', 'bank-transfer', 'cheque'];

const STATUS_STYLE: Record<Expense['status'], { color: string; bg: string; icon: React.ReactNode }> = {
  approved: { color: '#16a34a', bg: 'rgba(22,163,74,0.1)', icon: <CheckCircle2 size={12} /> },
  pending:  { color: '#d97706', bg: 'rgba(217,119,6,0.1)', icon: <Clock size={12} /> },
  rejected: { color: '#dc2626', bg: 'rgba(220,38,38,0.1)', icon: <XCircle size={12} /> },
};

function fmt(n: number): string {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

const blankForm = {
  category: 'other',
  description: '',
  amount: '',
  expense_date: new Date().toISOString().split('T')[0],
  payment_method: 'cash',
  notes: '',
  status: 'approved' as Expense['status'],
};

export default function ExpensesPage() {
  return (
    <Guard role="admin">
      <AppShell>
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Loader2 size={22} className="animate-spin" /></div>}>
          <Inner />
        </Suspense>
      </AppShell>
    </Guard>
  );
}

function Inner() {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<{ summary: { total_expenses: number; total_amount: number; avg_amount: number }; byCategory: { category: string; total: number }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | Expense['status']>('all');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [listRes, statsRes] = await Promise.all([
        api.expenses.list({ limit: 500 }),
        api.expenses.stats(),
      ]);
      setExpenses((listRes.expenses as unknown as Expense[]) || []);
      setStats(statsRes as unknown as NonNullable<typeof stats>);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (searchParams.get('new') === '1') openNewForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function openNewForm() {
    setForm(blankForm);
    setEditingId(null);
    setShowModal(true);
  }

  function openEditForm(e: Expense) {
    setForm({
      category: e.category,
      description: e.description,
      amount: String(e.amount),
      expense_date: e.expense_date?.slice(0, 10) || blankForm.expense_date,
      payment_method: e.payment_method,
      notes: e.notes || '',
      status: e.status,
    });
    setEditingId(e.id);
    setShowModal(true);
  }

  async function handleSubmit() {
    if (!form.description.trim() || !form.amount || Number(form.amount) <= 0) {
      toast.error('Description and a positive amount are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        category: form.category,
        description: form.description.trim(),
        amount: Number(form.amount),
        expense_date: form.expense_date,
        payment_method: form.payment_method,
        notes: form.notes.trim() || null,
        status: form.status,
      };
      if (editingId) {
        await api.expenses.update(editingId, payload);
        toast.success('Expense updated');
      } else {
        await api.expenses.create(payload);
        toast.success('Expense added');
      }
      setShowModal(false);
      setEditingId(null);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await api.expenses.delete(id);
      setExpenses(p => p.filter(e => e.id !== id));
      toast.success('Expense deleted');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete expense');
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = useMemo(() => expenses.filter(e =>
    (categoryFilter === 'all' || e.category === categoryFilter) &&
    (statusFilter === 'all' || e.status === statusFilter)
  ), [expenses, categoryFilter, statusFilter]);

  const inp = { width: '100%', border: '1px solid var(--border-2)', borderRadius: 10, padding: '9px 12px', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', background: 'var(--bg-subtle)', outline: 'none', fontFamily: 'inherit' } as const;
  const label = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.04em', color: 'var(--text-muted)' };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-subtle)' }}>
      {/* Hero */}
      <div className="relative overflow-hidden rounded-none sm:rounded-[28px] mx-0 sm:mx-6 mt-0 sm:mt-6 p-6 sm:p-8"
        style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[14px]" style={{ background: 'rgba(245,158,11,0.12)' }}>
              <Receipt size={20} style={{ color: '#F59E0B' }} />
            </div>
            <div>
              <h1 className="text-[26px] sm:text-[30px] font-[860] tracking-[-0.03em] leading-[1.2]" style={{ color: 'var(--text-primary)' }}>Expenses</h1>
              <p className="mt-1 text-[13px]" style={{ color: 'var(--text-muted)' }}>Track and manage studio overheads and operating costs</p>
            </div>
          </div>
          <Button variant="primary" iconLeft={<Plus size={16} />} onClick={openNewForm}>Add Expense</Button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
            <KpiCard icon={<IndianRupee size={16} />} label="Total Approved" value={fmt(stats.summary.total_amount)} accent="coral" />
            <KpiCard icon={<Receipt size={16} />} label="Approved Count" value={stats.summary.total_expenses} accent="amber" />
            <KpiCard icon={<Wallet size={16} />} label="Avg Expense" value={fmt(stats.summary.avg_amount)} accent="graphite" />
          </div>
        )}
      </div>

      {error && (
        <div className="mx-5 sm:mx-8 mt-6 rounded-[13px] p-3.5 text-[13px] font-[500]" style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239' }}>
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 px-5 sm:px-8 mt-6 mb-4">
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          style={{ ...inp, width: 'auto' }}>
          <option value="all">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
          style={{ ...inp, width: 'auto' }}>
          <option value="all">All statuses</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div className="px-5 sm:px-8 pb-8">
        <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="rounded-[22px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={26} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 px-6">
              <Receipt size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
              <p className="text-[14px] font-[700]" style={{ color: 'var(--text-primary)' }}>No expenses found</p>
              <p className="mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>Click &quot;Add Expense&quot; to record one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    {['Date', 'Description', 'Category', 'Method', 'Status', 'Amount', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[11px] font-[700] uppercase tracking-[0.06em] whitespace-nowrap"
                        style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => {
                    const st = STATUS_STYLE[e.status] || STATUS_STYLE.pending;
                    return (
                      <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="px-4 py-3 text-[12.5px] whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{e.expense_date?.slice(0, 10)}</td>
                        <td className="px-4 py-3 text-[13px] font-[600]" style={{ color: 'var(--text-primary)' }}>{e.description}</td>
                        <td className="px-4 py-3 text-[12.5px] capitalize" style={{ color: 'var(--text-secondary)' }}>{e.category}</td>
                        <td className="px-4 py-3 text-[12.5px] capitalize" style={{ color: 'var(--text-secondary)' }}>{e.payment_method}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-[700] capitalize" style={{ background: st.bg, color: st.color }}>
                            {st.icon}{e.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[13px] font-[800] text-right tabular-nums" style={{ color: 'var(--text-primary)' }}>{fmt(e.amount)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 justify-end">
                            <button onClick={() => openEditForm(e)}
                              className="flex h-7 w-7 items-center justify-center rounded-[7px]"
                              style={{ border: '1px solid var(--border-2)', color: 'var(--text-muted)' }}>
                              <Edit2 size={12} />
                            </button>
                            <button onClick={() => handleDelete(e.id)} disabled={deletingId === e.id}
                              className="flex h-7 w-7 items-center justify-center rounded-[7px]"
                              style={{ border: 'none', background: 'rgba(239,68,68,0.08)', color: '#dc2626' }}>
                              {deletingId === e.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </m.div>
      </div>

      {/* Add/Edit modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="grid gap-1.5">
              <span style={label}>Description *</span>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Monthly equipment maintenance" style={inp} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1.5">
                <span style={label}>Amount (₹) *</span>
                <input type="number" min={1} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={inp} />
              </label>
              <label className="grid gap-1.5">
                <span style={label}>Date</span>
                <input type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} style={inp} />
              </label>
              <label className="grid gap-1.5">
                <span style={label}>Category</span>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inp}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5">
                <span style={label}>Payment Method</span>
                <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} style={inp}>
                  {PAYMENT_METHODS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </label>
            </div>
            <label className="grid gap-1.5">
              <span style={label}>Status</span>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Expense['status'] }))} style={inp}>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
            <label className="grid gap-1.5">
              <span style={label}>Notes (optional)</span>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={inp} />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} loading={saving}>{editingId ? 'Save Changes' : 'Add Expense'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
