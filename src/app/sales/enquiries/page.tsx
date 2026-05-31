'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { Plus, Search, Phone, Mail, Calendar, ChevronRight, Sparkles, Users, RefreshCw } from 'lucide-react';

interface Enquiry {
  id: string;
  name: string;
  mobile?: string;
  email?: string;
  interested_in?: string;
  reference_no?: string;
  status?: string;
  joining_date?: string;
  created_at?: string;
}

function getInitials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const AVATAR_GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-orange-400 to-rose-500',
  'from-pink-500 to-fuchsia-600',
  'from-amber-400 to-orange-500',
];

export default function EnquiryListPage() {
  return <Guard><Inner /></Guard>;
}

function Inner() {
  const router = useRouter();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = () => {
    setRefreshing(true);
    api.clients.list({}).then(r => {
      const leads = r.filter(c => c.status === 'lead');
      setEnquiries(leads);
    }).finally(() => { setLoading(false); setRefreshing(false); });
  };
  useEffect(load, []);

  const filtered = search.trim()
    ? enquiries.filter(e =>
        e.name?.toLowerCase().includes(search.toLowerCase()) ||
        (e.mobile || '').includes(search) ||
        (e.interested_in || '').toLowerCase().includes(search.toLowerCase())
      )
    : enquiries;

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Enquiries</h1>
              <p className="text-sm text-slate-500">{filtered.length} total enquiries</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setRefreshing(true); load(); }}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <Link
              href="/sales/enquiry"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:shadow-xl hover:shadow-violet-500/30"
            >
              <Plus size={14} />
              Add Enquiry
            </Link>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search enquiries..."
              className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 placeholder-slate-400 transition focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-white/60 py-16">
            <Users size={40} className="text-slate-300" aria-hidden />
            <p className="mt-4 text-sm font-medium text-slate-500">No enquiries found</p>
            <Link
              href="/sales/enquiry"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700"
            >
              <Plus size={14} />
              Add your first enquiry
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[24px] border border-slate-200/70 bg-white shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Name</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Contact</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Interest</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Source</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Date</th>
                  <th className="px-5 py-3.5 text-right text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((enq, i) => {
                  const gradient = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length];
                  return (
                    <motion.tr
                      key={enq.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.3 }}
                      className="group border-b border-slate-100/60 transition hover:bg-slate-50/80"
                      onClick={() => router.push(`/clients/${enq.id}`)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/clients/${enq.id}`); } }}
                      role="button"
                      tabIndex={0}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-[10px] font-black text-white`}>
                            {getInitials(enq.name)}
                          </div>
                          <span className="text-sm font-semibold text-slate-900">{enq.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1">
                          {enq.mobile && (
                            <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                              <Phone size={11} className="text-slate-400" />
                              {enq.mobile}
                            </span>
                          )}
                          {enq.email && (
                            <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                              <Mail size={11} className="text-slate-400" />
                              {enq.email}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {enq.interested_in ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                            {enq.interested_in}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-slate-600">{enq.reference_no || '—'}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                          <Calendar size={11} className="text-slate-400" />
                          {enq.joining_date ? new Date(enq.joining_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <ChevronRight size={14} className="ml-auto text-slate-300 transition group-hover:text-slate-500" />
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
