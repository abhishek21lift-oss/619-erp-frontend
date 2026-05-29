'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Phone, Mail, Calendar, MapPin, FileText, Download,
  Printer, Send, Edit3, Trash2, XCircle, CheckCircle2,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CARD', label: 'Card' },
  { value: 'BANK', label: 'Bank Transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
];

const PAYMENT_STATUSES = [
  { value: 'PAID', label: 'Paid' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'REFUNDED', label: 'Refunded' },
];

export default function PaymentDetailsPage() {
  return <Guard><Inner /></Guard>;
}

function Inner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [client, setClient] = useState<any>(null);
  const [planData, setPlanData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [igst, setIgst] = useState('no');
  const [billRep, setBillRep] = useState('619 Fitness Studio');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [receiptPlan, setReceiptPlan] = useState('');
  const [receiptNo, setReceiptNo] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentStatus, setPaymentStatus] = useState('PAID');
  const [receiptNotes, setReceiptNotes] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('subscription_plan_data');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPlanData(parsed);
        if (parsed.plan_rows?.length > 0) {
          setReceiptPlan(parsed.plan_rows[0].plan);
        }
        const total = parsed.plan_rows?.reduce(
          (s: number, r: any) => s + (parseFloat(r.sellingPrice) || 0), 0
        ) || 0;
        setReceivedAmount(String(total));
      } catch {}
    }
    api.clients.get(id)
      .then((c: any) => {
        setClient(c);
        setEmail(c.email || '');
        setDob(c.dob?.slice(0, 10) || '');
        setAddress(c.address || '');
        setNotes(c.notes || '');
      })
      .catch((e: any) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [id, toast]);

  const fmt = (n: number) => '₹\u202f' + n.toLocaleString('en-IN');

  const planRows = planData?.plan_rows || [];
  const totalMrp = planRows.reduce((s: number, r: any) => s + (parseFloat(r.basePrice) || 0), 0);
  const totalNet = planRows.reduce((s: number, r: any) => s + (parseFloat(r.sellingPrice) || 0), 0);
  const totalDiscount = Math.max(0, totalMrp - totalNet);
  const receivedNum = parseFloat(receivedAmount) || 0;
  const balanceNum  = Math.max(0, totalNet - receivedNum);

  const balColor = balanceNum === 0 ? '#10B981' : receivedNum > 0 ? '#F59E0B' : '#EF4444';

  const statusIcons: Record<string, { icon: React.ReactNode; cls: string }> = {
    PAID:     { icon: <CheckCircle2 size={11} />,     cls: 'bg-[rgba(16,185,129,0.10)] text-[#10B981]' },
    PARTIAL:  { icon: <CheckCircle2 size={11} />,     cls: 'bg-[rgba(245,158,11,0.10)] text-[#F59E0B]' },
    PENDING:  { icon: <CheckCircle2 size={11} />,     cls: 'bg-[rgba(239,68,68,0.10)] text-[#EF4444]' },
    REFUNDED: { icon: <CheckCircle2 size={11} />,     cls: 'bg-[rgba(100,116,139,0.10)] text-[#64748B]' },
  };
  const payStatus = balanceNum === 0 ? 'PAID' : receivedNum > 0 ? 'PARTIAL' : 'PENDING';
  const { icon: statusIcon, cls: statusClass } = statusIcons[paymentStatus] || statusIcons.PENDING;

  async function handleSubmit() {
    setSaving(true);
    try {
      const payload = {
        ...planData,
        sale_amount:    totalNet,
        paid_amount:    receivedNum,
        balance_amount: balanceNum,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        receipt_no:     receiptNo,
        receipt_date:   receiptDate,
        notes:          receiptNotes || notes || null,
      };
      const result = await api.clients.addSubscription(id, payload);
      toast.success(result?.message || 'Subscription added successfully!');
      sessionStorage.removeItem('subscription_plan_data');
      setTimeout(() => router.push(`/clients/${id}`), 900);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add subscription');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-white flex items-center justify-center">
          <div className="animate-pulse text-[#4A4E57] text-[13px] font-medium">Loading payment details...</div>
        </div>
      </AppShell>
    );
  }

  const memberName = client?.name || 'Member';
  const memberMobile = client?.mobile || '—';
  const initial = memberName.charAt(0).toUpperCase();

  return (
    <AppShell>
      <div className="min-h-screen bg-gradient-to-br from-[#F5F5F7] via-[#FAFAFA] to-white pb-24">
        <div className="mx-auto max-w-[1000px] px-4 py-6 sm:px-6 sm:py-8 space-y-6">

          {/* ── Header ── */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-[rgba(0,0,0,0.04)] text-[#4A4E57] hover:bg-[#F5F5F7] transition-colors"
              >
                <ArrowLeft size={16} strokeWidth={1.8} />
              </button>
              <div>
                <h1 className="text-[20px] sm:text-[24px] font-bold tracking-[-0.025em] text-[#0B0B0F] leading-tight">
                  Payments Details
                </h1>
                <p className="text-[12px] text-[#4A4E57] mt-0.5">Membership billing & receipt management</p>
              </div>
            </div>
            <button
              onClick={() => router.push(`/clients/${id}/receipts`)}
              className="inline-flex items-center gap-2 rounded-xl bg-white border border-[rgba(0,0,0,0.04)] px-4 py-2 text-[12px] font-bold text-[#4A4E57] hover:bg-[#F5F5F7] transition-colors"
            >
              <FileText size={14} strokeWidth={1.8} />
              Go to Receipt Register
            </button>
          </div>

          {/* ── Top Action Buttons ── */}
          <div className="rounded-[24px] bg-white/70 backdrop-blur-[20px] border border-white/25 shadow-[0_8px_32px_rgba(11,11,15,0.06)] p-5 space-y-3">
            <div className="flex flex-wrap gap-2">
              <button className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2 text-[12px] font-bold text-white shadow-[0_2px_8px_rgba(37,211,102,0.20)] hover:shadow-[0_4px_16px_rgba(37,211,102,0.30)] transition-all">
                <Send size={13} strokeWidth={2} />
                Send Direct WhatsApp
              </button>
              <button className="inline-flex items-center gap-2 rounded-xl bg-white border border-[rgba(0,0,0,0.04)] px-4 py-2 text-[12px] font-bold text-[#4A4E57] hover:bg-[#F5F5F7] transition-colors">
                <Printer size={13} strokeWidth={1.8} />
                Print Receipt
              </button>
              <button className="inline-flex items-center gap-2 rounded-xl bg-white border border-[rgba(0,0,0,0.04)] px-4 py-2 text-[12px] font-bold text-[#4A4E57] hover:bg-[#F5F5F7] transition-colors">
                <Mail size={13} strokeWidth={1.8} />
                Email Receipt
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-4 py-2 text-[12px] font-bold text-white shadow-[0_2px_8px_rgba(59,130,246,0.20)] hover:shadow-[0_4px_16px_rgba(59,130,246,0.30)] transition-all">
                <Edit3 size={13} strokeWidth={2} />
                Edit Bill Amount
              </button>
              <button className="inline-flex items-center gap-2 rounded-xl bg-[#EF4444] px-4 py-2 text-[12px] font-bold text-white shadow-[0_2px_8px_rgba(239,68,68,0.20)] hover:shadow-[0_4px_16px_rgba(239,68,68,0.30)] transition-all">
                <Trash2 size={13} strokeWidth={2} />
                Delete Subscription
              </button>
              <button className="inline-flex items-center gap-2 rounded-xl bg-[#EF4444] px-4 py-2 text-[12px] font-bold text-white shadow-[0_2px_8px_rgba(239,68,68,0.20)] hover:shadow-[0_4px_16px_rgba(239,68,68,0.30)] transition-all">
                <XCircle size={13} strokeWidth={2} />
                Cancel Subscription
              </button>
              <button className="inline-flex items-center gap-2 rounded-xl bg-[rgba(59,130,246,0.10)] border border-[rgba(59,130,246,0.15)] px-4 py-2 text-[12px] font-bold text-[#3B82F6] hover:bg-[rgba(59,130,246,0.15)] transition-colors">
                <Send size={13} strokeWidth={1.8} />
                Send WhatsApp
              </button>
            </div>
          </div>

          {/* ── Member Information ── */}
          <div className="rounded-[24px] bg-white/70 backdrop-blur-[20px] border border-white/25 shadow-[0_8px_32px_rgba(11,11,15,0.06)] p-6">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#2563EB] text-[22px] font-bold text-white shadow-[0_4px_16px_rgba(59,130,246,0.25)] mb-3">
                {initial}
              </div>
              <h2 className="text-[20px] font-bold text-[#0B0B0F]">{memberName}</h2>
              <div className="flex items-center gap-2 mt-2">
                <Phone size={13} className="text-[#4A4E57]" strokeWidth={1.5} />
                <span className="text-[13px] text-[#4A4E57]">{memberMobile}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#4A4E57] mb-1.5 uppercase tracking-[0.04em]">
                  <Mail size={12} className="inline mr-1" strokeWidth={1.5} /> Email
                </label>
                <input
                  className="w-full h-10 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3.5 text-[13px] text-[#0B0B0F] outline-none focus:border-[rgba(59,130,246,0.3)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(59,130,246,0.06)] transition-all placeholder:text-[#86868b]/60"
                  placeholder="Enter Customer Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#4A4E57] mb-1.5 uppercase tracking-[0.04em]">
                  <Calendar size={12} className="inline mr-1" strokeWidth={1.5} /> DOB
                </label>
                <div className="relative">
                  <input
                    type="date"
                    className="w-full h-10 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3.5 text-[13px] text-[#0B0B0F] outline-none focus:border-[rgba(59,130,246,0.3)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(59,130,246,0.06)] transition-all"
                    value={dob}
                    onChange={e => setDob(e.target.value)}
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-[#4A4E57] mb-1.5 uppercase tracking-[0.04em]">
                  <MapPin size={12} className="inline mr-1" strokeWidth={1.5} /> Street / Area
                </label>
                <input
                  className="w-full h-10 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3.5 text-[13px] text-[#0B0B0F] outline-none focus:border-[rgba(59,130,246,0.3)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(59,130,246,0.06)] transition-all placeholder:text-[#86868b]/60"
                  placeholder="Enter address"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-[#4A4E57] mb-1.5 uppercase tracking-[0.04em]">
                  <FileText size={12} className="inline mr-1" strokeWidth={1.5} /> Notes
                </label>
                <textarea
                  className="w-full min-h-[72px] rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3.5 py-2.5 text-[13px] text-[#0B0B0F] outline-none focus:border-[rgba(59,130,246,0.3)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(59,130,246,0.06)] transition-all placeholder:text-[#86868b]/60 resize-none"
                  placeholder="Enter notes (maximum 300 characters)"
                  maxLength={300}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ── Tax & Billing Representative ── */}
          <div className="rounded-[24px] bg-white/70 backdrop-blur-[20px] border border-white/25 shadow-[0_8px_32px_rgba(11,11,15,0.06)] p-6">
            <h3 className="text-[14px] font-bold text-[#0B0B0F] mb-4">Tax & Billing Representative</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#4A4E57] mb-2 uppercase tracking-[0.04em]">IGST Bill</label>
                <div className="flex gap-3">
                  {['yes', 'no'].map(opt => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="igst"
                        checked={igst === opt}
                        onChange={() => setIgst(opt)}
                        className="accent-[#3B82F6]"
                      />
                      <span className="text-[12px] font-medium text-[#0B0B0F] capitalize">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="flex justify-between text-[12px]"><span className="text-[#4A4E57]">Client Rep</span><span className="font-semibold text-[#0B0B0F]">619 Fitness Studio</span></p>
                <p className="flex justify-between text-[12px]"><span className="text-[#4A4E57]">Bill Rep</span><span className="font-semibold text-[#0B0B0F]">619 Fitness Studio (2325614)</span></p>
                <p className="flex justify-between text-[12px]"><span className="text-[#4A4E57]">Membership Added By</span><span className="font-semibold text-[#0B0B0F]">—</span></p>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#4A4E57] mb-1.5 uppercase tracking-[0.04em]">Bill Rep *</label>
                <select
                  className="w-full h-10 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3.5 text-[13px] text-[#0B0B0F] outline-none focus:border-[rgba(59,130,246,0.3)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(59,130,246,0.06)] transition-all"
                  value={billRep}
                  onChange={e => setBillRep(e.target.value)}
                >
                  <option value="619 Fitness Studio">619 Fitness Studio</option>
                  <option value="Branch 1">Branch 1</option>
                  <option value="Branch 2">Branch 2</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#4A4E57] mb-1.5 uppercase tracking-[0.04em]">Invoice Date</label>
                <input
                  type="date"
                  className="w-full h-10 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3.5 text-[13px] text-[#0B0B0F] outline-none focus:border-[rgba(59,130,246,0.3)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(59,130,246,0.06)] transition-all"
                  value={invoiceDate}
                  onChange={e => setInvoiceDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ── Membership Billing Summary Table ── */}
          <div className="rounded-[24px] bg-white/70 backdrop-blur-[20px] border border-white/25 shadow-[0_8px_32px_rgba(11,11,15,0.06)] overflow-hidden">
            <div className="p-5 pb-0">
              <h3 className="text-[14px] font-bold text-[#0B0B0F]">Membership Billing Summary</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[rgba(0,0,0,0.04)]">
                    <th className="text-left py-3 px-5 font-semibold text-[#4A4E57]">#</th>
                    <th className="text-left py-3 px-5 font-semibold text-[#4A4E57]">Membership Plan</th>
                    <th className="text-left py-3 px-5 font-semibold text-[#4A4E57]">Start Date</th>
                    <th className="text-left py-3 px-5 font-semibold text-[#4A4E57]">End Date</th>
                    <th className="text-right py-3 px-5 font-semibold text-[#4A4E57]">Plan Price</th>
                    <th className="text-right py-3 px-5 font-semibold text-[#4A4E57]">Discount</th>
                    <th className="text-right py-3 px-5 font-semibold text-[#4A4E57]">Net Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {planRows.map((row: any, i: number) => {
                    const mrp = parseFloat(row.basePrice) || 0;
                    const net = parseFloat(row.sellingPrice) || 0;
                    const disc = Math.max(0, mrp - net);
                    return (
                      <tr key={i} className="border-b border-[rgba(0,0,0,0.03)] last:border-0">
                        <td className="py-3 px-5 text-[#4A4E57]">{i + 1}</td>
                        <td className="py-3 px-5 font-medium text-[#0B0B0F]">{row.plan || '—'}</td>
                        <td className="py-3 px-5 text-[#4A4E57]">{row.startDate || '—'}</td>
                        <td className="py-3 px-5 text-[#4A4E57]">{row.endDate || '—'}</td>
                        <td className="py-3 px-5 text-right text-[#0B0B0F] font-medium">{fmt(mrp)}</td>
                        <td className="py-3 px-5 text-right text-[#EF4444]">{disc > 0 ? `-${fmt(disc)}` : '—'}</td>
                        <td className="py-3 px-5 text-right font-bold text-[#0B0B0F]">{fmt(net)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[rgba(0,0,0,0.06)] bg-[rgba(59,130,246,0.03)]">
                    <td colSpan={4} className="py-3.5 px-5 font-bold text-[#0B0B0F]">Total</td>
                    <td className="py-3.5 px-5 text-right font-bold text-[#0B0B0F]">{fmt(totalMrp)}</td>
                    <td className="py-3.5 px-5 text-right font-bold text-[#EF4444]">{totalDiscount > 0 ? `-${fmt(totalDiscount)}` : '—'}</td>
                    <td className="py-3.5 px-5 text-right font-bold text-[#0B0B0F]">{fmt(totalNet)}</td>
                  </tr>
                  <tr className="bg-[rgba(16,185,129,0.03)]">
                    <td colSpan={5} className="py-3 px-5 font-semibold text-[#0B0B0F]">Sale Amount</td>
                    <td colSpan={2} className="py-3 px-5 text-right font-bold text-[#0B0B0F]">{fmt(totalNet)}</td>
                  </tr>
                  <tr className="bg-[rgba(59,130,246,0.03)]">
                    <td colSpan={5} className="py-3 px-5 font-semibold text-[#0B0B0F]">Paid Amount</td>
                    <td colSpan={2} className="py-3 px-5 text-right font-bold text-[#10B981]">{fmt(parseFloat(receivedAmount) || 0)}</td>
                  </tr>
                  <tr className="bg-[rgba(239,68,68,0.03)]">
                    <td colSpan={5} className="py-3 px-5 font-semibold text-[#0B0B0F]">Balance Amount</td>
                    <td colSpan={2} className="py-3 px-5 text-right font-bold" style={{ color: balColor }}>
                      {fmt(Math.max(0, totalNet - (parseFloat(receivedAmount) || 0)))}
                    </td>
                  </tr>
                  <tr className="bg-[rgba(245,158,11,0.03)]">
                    <td colSpan={5} className="py-3 px-5 font-semibold text-[#0B0B0F]">Payment Status</td>
                    <td colSpan={2} className="py-3 px-5 text-right">
                      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold ${statusClass}`}>
                        {statusIcon}
                        {paymentStatus}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ── Receipts Section ── */}
          <div className="rounded-[24px] bg-white/70 backdrop-blur-[20px] border border-white/25 shadow-[0_8px_32px_rgba(11,11,15,0.06)] p-6">
            <h3 className="text-[14px] font-bold text-[#0B0B0F] mb-4">Receipts</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#4A4E57] mb-1.5 uppercase tracking-[0.04em]">Membership Plan</label>
                <select
                  className="w-full h-10 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3.5 text-[13px] text-[#0B0B0F] outline-none focus:border-[rgba(59,130,246,0.3)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(59,130,246,0.06)] transition-all"
                  value={receiptPlan}
                  onChange={e => setReceiptPlan(e.target.value)}
                >
                  {planRows.map((row: any, i: number) => (
                    <option key={i} value={row.plan}>{row.plan}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#4A4E57] mb-1.5 uppercase tracking-[0.04em]">Receipt Number</label>
                <input
                  className="w-full h-10 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3.5 text-[13px] text-[#0B0B0F] outline-none focus:border-[rgba(59,130,246,0.3)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(59,130,246,0.06)] transition-all placeholder:text-[#86868b]/60"
                  placeholder="RCPT-001"
                  value={receiptNo}
                  onChange={e => setReceiptNo(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#4A4E57] mb-1.5 uppercase tracking-[0.04em]">Received Amount</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full h-10 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3.5 text-[13px] text-[#0B0B0F] outline-none focus:border-[rgba(59,130,246,0.3)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(59,130,246,0.06)] transition-all"
                  value={receivedAmount}
                  onChange={e => setReceivedAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#4A4E57] mb-1.5 uppercase tracking-[0.04em]">Receipt Date</label>
                <input
                  type="date"
                  className="w-full h-10 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3.5 text-[13px] text-[#0B0B0F] outline-none focus:border-[rgba(59,130,246,0.3)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(59,130,246,0.06)] transition-all"
                  value={receiptDate}
                  onChange={e => setReceiptDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#4A4E57] mb-1.5 uppercase tracking-[0.04em]">Payment Method</label>
                <select
                  className="w-full h-10 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3.5 text-[13px] text-[#0B0B0F] outline-none focus:border-[rgba(59,130,246,0.3)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(59,130,246,0.06)] transition-all"
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                >
                  {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#4A4E57] mb-1.5 uppercase tracking-[0.04em]">Payment Status</label>
                <select
                  className="w-full h-10 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3.5 text-[13px] text-[#0B0B0F] outline-none focus:border-[rgba(59,130,246,0.3)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(59,130,246,0.06)] transition-all"
                  value={paymentStatus}
                  onChange={e => setPaymentStatus(e.target.value)}
                >
                  {PAYMENT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-[11px] font-semibold text-[#4A4E57] mb-1.5 uppercase tracking-[0.04em]">Notes</label>
                <input
                  className="w-full h-10 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3.5 text-[13px] text-[#0B0B0F] outline-none focus:border-[rgba(59,130,246,0.3)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(59,130,246,0.06)] transition-all placeholder:text-[#86868b]/60"
                  placeholder="e.g. Cheque number"
                  value={receiptNotes}
                  onChange={e => setReceiptNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 mt-5 pt-5 border-t border-[rgba(0,0,0,0.04)]">
              <div className="text-[11px] text-[#4A4E57]">
                Receipt Added By: <span className="font-semibold text-[#0B0B0F]">619 Fitness Studio</span>
                <span className="mx-2">|</span>
                <button className="inline-flex items-center gap-1 text-[#3B82F6] hover:underline font-medium">
                  <Printer size={11} /> Print Receipt
                </button>
              </div>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] px-6 py-2.5 text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(16,185,129,0.25)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.35)] transition-all disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Submit'}
                <CheckCircle2 size={14} strokeWidth={2} />
              </button>
            </div>

            {/* ── PT Trial Upsell ── */}
            <div className="mt-5 rounded-xl bg-gradient-to-br from-[rgba(139,92,246,0.06)] to-[rgba(59,130,246,0.04)] border border-[rgba(139,92,246,0.12)] px-5 py-4">
              <p className="text-[12px] text-[#4A4E57]">
                Please ask the client if he is interested in PT Trial. If Yes,{' '}
                <button
                  onClick={() => router.push(`/clients/${id}/add-subscription/payment?ptTrial=true`)}
                  className="font-bold text-[#8B5CF6] hover:underline"
                >
                  Click here to Assign PT Trial
                </button>
              </p>
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
