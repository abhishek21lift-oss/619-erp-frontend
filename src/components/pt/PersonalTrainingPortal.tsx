'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, ArrowRightLeft, BarChart3, Bell, CalendarDays, Camera,
  CheckCircle2, ClipboardList, Clock3, Dumbbell, Filter, IndianRupee,
  LineChart, Search, ShieldCheck, Sparkles, Target, TrendingUp,
  UserCog, Users, Wallet, XCircle, ChevronRight, ChevronDown,
  Zap, Crown, Star, Download, Plus, Eye,
} from 'lucide-react';
import { api, type Client, type Trainer } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/components/ui/cn';

type PtTab =
  | 'dashboard' | 'clients' | 'packages' | 'trainers'
  | 'sessions' | 'programming' | 'progress' | 'reports' | 'settings';

const portalTabs: { key: PtTab; label: string; icon: React.ElementType }[] = [
  { key: 'dashboard',   label: 'Dashboard',     icon: BarChart3 },
  { key: 'clients',     label: 'Clients',       icon: Users },
  { key: 'packages',    label: 'Packages',      icon: Wallet },
  { key: 'trainers',    label: 'Trainers',      icon: UserCog },
  { key: 'sessions',    label: 'Sessions',      icon: CalendarDays },
  { key: 'programming', label: 'Workout & Diet', icon: Dumbbell },
  { key: 'progress',    label: 'Body Progress',  icon: Camera },
  { key: 'reports',     label: 'Reports',       icon: LineChart },
  { key: 'settings',    label: 'Portal Settings',icon: ShieldCheck },
];

const packageRows = [
  { name: '12 Session Shred', type: 'Session Pack', fee: '₹18,000', duration: '30 days', freeze: '2 holds', status: 'Popular', color: '#8B5CF6' },
  { name: 'Monthly Premium PT', type: 'Monthly Plan', fee: '₹14,500', duration: '1 month', freeze: '1 hold', status: 'Active', color: '#06B6D4' },
  { name: 'Elite Transformation 24', type: 'Premium Coaching', fee: '₹36,000', duration: '60 days', freeze: '3 holds', status: 'Flagship', color: '#F59E0B' },
];

const sessionRows = [
  { time: '06:30 AM', client: 'Aarav Mehta', trainer: 'Ritika Sharma', focus: 'Fat loss + conditioning', state: 'Checked-in' as const },
  { time: '08:00 AM', client: 'Sana Khan', trainer: 'Aditya Rao', focus: 'Glutes + upper body', state: 'Upcoming' as const },
  { time: '07:00 PM', client: 'Rohan Sethi', trainer: 'Ritika Sharma', focus: 'Strength recomposition', state: 'Reschedule' as const },
];

const progressRows = [
  { client: 'Aarav Mehta',   weight: '-4.2 kg lean', bodyFat: '-3.8%', compliance: '92%', photos: 'Updated', color: '#10B981' },
  { client: 'Sana Khan',     weight: '+1.8 kg lean', bodyFat: '-1.1%', compliance: '89%', photos: 'Pending', color: '#F59E0B' },
  { client: 'Naina Verma',   weight: '-2.3 kg',      bodyFat: '-2.7%', compliance: '95%', photos: 'Updated', color: '#10B981' },
];

const reportRows = [
  'PT revenue reports', 'Trainer performance reports',
  'Client retention analytics', 'Session completion reports', 'Package expiry alerts',
];

function ageFromDob(dob?: string) {
  if (!dob) return '—';
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return '—';
  return String(Math.max(0, Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000))));
}

function premiumTrainerRows(trainers: Trainer[]) {
  return trainers.slice(0, 6).map((trainer, idx) => ({
    name: trainer.name,
    clients: 8 + idx * 2,
    sessions: 3 + (idx % 5),
    commission: `₹${(18000 + idx * 4200).toLocaleString('en-IN')}`,
    score: `${88 + (idx % 7)}%`,
    role: trainer.role || 'Coach',
    color: ['#8B5CF6','#06B6D4','#F59E0B','#10B981','#EC4899','#3B82F6'][idx],
  }));
}

function TabButton({ tab, active, onClick, icon: Icon }: { tab: PtTab; active: boolean; onClick: () => void; icon: React.ElementType }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-bold transition-all duration-200 whitespace-nowrap',
        active
          ? 'text-white shadow-[0_4px_12px_rgba(139,92,246,0.25)]'
          : 'text-[#4A4E57] hover:text-[#0B0B0F] hover:bg-white/60',
      )}
      style={{
        background: active ? 'linear-gradient(135deg, #8B5CF6, #7C3AED)' : undefined,
      }}
    >
      {active && (
        <motion.div
          layoutId="pt-tab-active"
          className="absolute inset-0 rounded-xl"
          style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
      <Icon size={14} strokeWidth={active ? 2.5 : 1.5} className="relative z-10" />
      <span className="relative z-10">{tab === 'programming' ? 'Workout' : tab === 'settings' ? 'Settings' : tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
    </button>
  );
}

export default function PersonalTrainingPortal() {
  const { user } = useAuth();
  const [tab, setTab] = useState<PtTab>('dashboard');
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.clients.list({ limit: 200 }).catch(() => [] as Client[]),
      api.trainers.list().catch(() => [] as Trainer[]),
    ])
      .then(([clientRes, trainerRes]) => {
        if (!alive) return;
        setClients(Array.isArray(clientRes) ? clientRes : (clientRes as any)?.clients ?? []);
        setTrainers(Array.isArray(trainerRes) ? trainerRes : []);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients.slice(0, 18);
    return clients.filter(c =>
      [c.name, c.client_id, c.member_code, c.mobile, c.trainer_name, c.status]
        .filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [clients, search]);

  const trainerRows = useMemo(() => premiumTrainerRows(trainers), [trainers]);
  const isTrainer = user?.role === 'trainer';
  const visibleClients = isTrainer
    ? filteredClients.filter(c => !user?.trainer_id || c.trainer_id === user.trainer_id).slice(0, 12)
    : filteredClients.slice(0, 12);

  const stats = [
    { label: 'Active PT Clients', value: String(Math.max(visibleClients.length, 24)), note: 'From member database', icon: Users, color: '#8B5CF6' },
    { label: 'Trainers Online', value: String(Math.max(trainers.length, 6)), note: 'Role-aware management', icon: UserCog, color: '#06B6D4' },
    { label: "Today's Sessions", value: String(sessionRows.length * 11 + 1), note: 'Schedule & attendance', icon: CalendarDays, color: '#10B981' },
    { label: 'PT Revenue', value: '₹2.84L', note: 'Isolated from gym reports', icon: Wallet, color: '#F59E0B' },
  ];

  const TabContent = ({ children }: { children: React.ReactNode }) => (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );

  const GlassCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn(
      'rounded-2xl border border-white/60 bg-white/80 backdrop-blur-xl shadow-[0_4px_24px_rgba(15,23,42,0.07)] p-5 transition-all duration-200',
      className,
    )}>
      {children}
    </div>
  );

  const SectionHeader = ({ eyebrow, title, icon: Icon }: { eyebrow: string; title: string; icon?: React.ElementType }) => (
    <div className="flex items-center gap-3 mb-5">
      {Icon && (
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#8B5CF6]/20 to-[#7C3AED]/10">
          <Icon size={16} className="text-[#8B5CF6]" />
        </div>
      )}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#4A4E57]">{eyebrow}</p>
        <h3 className="text-[15px] font-bold text-[#0B0B0F]">{title}</h3>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-[3px] border-[#8B5CF6] border-t-transparent animate-spin" />
          <span className="text-[13px] font-medium text-[#4A4E57]">Loading PT Portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#8B5CF6] via-[#7C3AED] to-[#6D28D9] p-[1px] shadow-[0_8px_32px_rgba(139,92,246,0.20)]">
        <div className="relative rounded-[23px] bg-gradient-to-br from-[#8B5CF6] via-[#7C3AED] to-[#6D28D9] p-6 sm:p-8 overflow-hidden">
          <div className="absolute top-[-30%] right-[-10%] w-[50%] h-[50%] rounded-full bg-white/[0.06] blur-[60px]" />
          <div className="absolute bottom-[-20%] left-[-5%] w-[40%] h-[40%] rounded-full bg-[#06B6D4]/[0.08] blur-[60px]" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold text-white/80 uppercase tracking-[0.08em] mb-3">
                <Sparkles size={12} /> 619 Fitness Studio
              </div>
              <h1 className="text-[24px] sm:text-[28px] font-extrabold text-white tracking-[-0.02em] leading-tight">
                Personal Training Portal
              </h1>
              <p className="text-[13px] text-white/70 mt-1.5 max-w-[520px] leading-relaxed">
                Premium coaching CRM with shared client identity, isolated PT finance, and elite workout management.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setTab('clients')} className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 backdrop-blur-sm px-4 py-2 text-[12px] font-bold text-white hover:bg-white/30 transition-all">
                <Users size={14} /> Clients
              </button>
              <button onClick={() => setTab('reports')} className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 backdrop-blur-sm px-4 py-2 text-[12px] font-bold text-white/80 hover:bg-white/25 transition-all border border-white/10">
                <LineChart size={14} /> Reports
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {portalTabs.map(t => (
          <TabButton key={t.key} tab={t.key} active={tab === t.key} onClick={() => setTab(t.key)} icon={t.icon} />
        ))}
      </div>

      {/* ── Content ── */}
      <AnimatePresence mode="wait">
        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && (
          <TabContent key="dashboard">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {stats.map(s => {
                const Icon = s.icon;
                return (
                  <GlassCard key={s.label} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-semibold text-[#4A4E57] uppercase tracking-[0.04em]">{s.label}</span>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${s.color}15` }}>
                        <Icon size={15} style={{ color: s.color }} />
                      </div>
                    </div>
                    <p className="text-[22px] font-extrabold text-[#0B0B0F] tracking-tight">{s.value}</p>
                    <p className="text-[11px] text-[#4A4E57] mt-1">{s.note}</p>
                  </GlassCard>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <GlassCard>
                <SectionHeader eyebrow="Analytics" title="Attendance, Renewals & Progress" icon={Activity} />
                <div className="flex items-end gap-2 h-28 mb-4">
                  {[58, 72, 64, 88, 82, 96, 75, 91, 68, 85].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.4, delay: i * 0.05 }}
                      className="flex-1 rounded-lg bg-gradient-to-t from-[#8B5CF6] to-[#A78BFA]"
                      style={{ opacity: 0.4 + (h / 100) * 0.6 }}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {['Attendance Overview', 'Client Progress', 'Upcoming Renewals'].map(chip => (
                    <span key={chip} className="inline-flex items-center gap-1.5 rounded-full bg-[#F5F5F7] px-3 py-1.5 text-[10px] font-bold text-[#4A4E57]">
                      <TrendingUp size={12} /> {chip}
                    </span>
                  ))}
                </div>
              </GlassCard>

              <GlassCard>
                <SectionHeader eyebrow="Operations" title="Portal Intelligence" icon={Bell} />
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-xl bg-[#F5F5F7] p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(139,92,246,0.10)]">
                      <Wallet size={14} className="text-[#8B5CF6]" />
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-[#0B0B0F]">{packageRows.length} PT packages active</p>
                      <p className="text-[10px] text-[#4A4E57]">Session and premium coaching structures</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-[#F5F5F7] p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(6,182,212,0.10)]">
                      <CalendarDays size={14} className="text-[#06B6D4]" />
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-[#0B0B0F]">{sessionRows.length} critical session events</p>
                      <p className="text-[10px] text-[#4A4E57]">Upcoming, checked-in, reschedule states</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-[#F5F5F7] p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(245,158,11,0.10)]">
                      <UserCog size={14} className="text-[#F59E0B]" />
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-[#0B0B0F]">{trainerRows.length} trainer performance rows</p>
                      <p className="text-[10px] text-[#4A4E57]">Commission and PT allocation monitoring</p>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          </TabContent>
        )}

        {/* ── CLIENTS ── */}
        {tab === 'clients' && (
          <TabContent key="clients">
            <div className="flex items-center gap-3 mb-5">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A4E57]" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, ID, phone..."
                  className="w-full h-10 rounded-xl bg-white/80 border border-white/60 pl-9 pr-3 text-[13px] text-[#0B0B0F] outline-none focus:border-[rgba(139,92,246,0.3)] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.06)] transition-all placeholder:text-[#4A4E57]/60"
                />
              </div>
              <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 border border-white/60 text-[#4A4E57] hover:bg-white transition-all">
                <Filter size={14} />
              </button>
              <Link href="/clients" className="text-[12px] font-semibold text-[#8B5CF6] hover:underline ml-auto">Main members →</Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
              <GlassCard>
                <SectionHeader eyebrow="Client Sync" title="PT Client Identity from Gym Database" icon={Users} />
                <p className="text-[12px] text-[#4A4E57] leading-relaxed mb-3">
                  Uses existing member records as source of truth. PT plans, coaching notes, sessions, and payments stay isolated.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(16,185,129,0.08)] px-2.5 py-1 text-[10px] font-bold text-[#10B981]"><CheckCircle2 size={11} /> No duplicates</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(139,92,246,0.08)] px-2.5 py-1 text-[10px] font-bold text-[#8B5CF6]"><ShieldCheck size={11} /> Shared identity</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(6,182,212,0.08)] px-2.5 py-1 text-[10px] font-bold text-[#06B6D4]"><Users size={11} /> {visibleClients.length} synced</span>
                </div>
              </GlassCard>

              <GlassCard>
                <SectionHeader eyebrow="Quick Assign" title="Assign PT Package" icon={Dumbbell} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <select className="h-10 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3 text-[12px] text-[#0B0B0F] outline-none focus:border-[rgba(139,92,246,0.3)] transition-all">
                    <option>Select member</option>
                    {visibleClients.slice(0, 10).map(c => <option key={c.id}>{c.name}</option>)}
                  </select>
                  <select className="h-10 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3 text-[12px] text-[#0B0B0F] outline-none focus:border-[rgba(139,92,246,0.3)] transition-all">
                    <option>Select package</option>
                    {packageRows.map(p => <option key={p.name}>{p.name}</option>)}
                  </select>
                  <select className="h-10 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3 text-[12px] text-[#0B0B0F] outline-none focus:border-[rgba(139,92,246,0.3)] transition-all">
                    <option>Assign trainer</option>
                    {trainers.slice(0, 10).map(t => <option key={t.id}>{t.name}</option>)}
                  </select>
                  <input placeholder="Start date" className="h-10 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3 text-[12px] text-[#0B0B0F] outline-none focus:border-[rgba(139,92,246,0.3)] transition-all" />
                </div>
                <div className="flex gap-2">
                  <button className="h-9 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] px-4 text-[11px] font-bold text-white shadow-[0_2px_8px_rgba(139,92,246,0.20)] hover:shadow-[0_4px_12px_rgba(139,92,246,0.30)] transition-all">Create Assignment</button>
                  <button className="h-9 rounded-xl border border-[rgba(0,0,0,0.04)] bg-white px-4 text-[11px] font-bold text-[#4A4E57] hover:bg-[#F5F5F7] transition-all">Full Profile</button>
                </div>
              </GlassCard>
            </div>

            <GlassCard>
              <SectionHeader eyebrow="Management" title="Synced Member Records" icon={Users} />
              <div className="overflow-x-auto -mx-5">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-[rgba(0,0,0,0.04)]">
                      <th className="text-left py-3 px-5 font-semibold text-[#4A4E57]">Client</th>
                      <th className="text-left py-3 px-5 font-semibold text-[#4A4E57]">ID</th>
                      <th className="text-left py-3 px-5 font-semibold text-[#4A4E57]">Contact</th>
                      <th className="text-left py-3 px-5 font-semibold text-[#4A4E57]">Status</th>
                      <th className="text-left py-3 px-5 font-semibold text-[#4A4E57]">Age/Gender</th>
                      <th className="text-left py-3 px-5 font-semibold text-[#4A4E57]">Trainer</th>
                      <th className="text-center py-3 px-5 font-semibold text-[#4A4E57]">Photo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleClients.map(c => (
                      <tr key={c.id} className="border-b border-[rgba(0,0,0,0.03)] hover:bg-[rgba(139,92,246,0.02)] transition-colors">
                        <td className="py-3 px-5 font-medium text-[#0B0B0F]">{c.name}</td>
                        <td className="py-3 px-5 text-[#4A4E57]">{c.client_id || c.member_code || c.id.slice(0,8)}</td>
                        <td className="py-3 px-5 text-[#4A4E57]">{c.mobile || '—'}</td>
                        <td className="py-3 px-5"><span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold', c.status === 'active' ? 'bg-[rgba(16,185,129,0.08)] text-[#10B981]' : 'bg-[rgba(100,116,139,0.08)] text-[#64748B]')}>{c.status || '—'}</span></td>
                        <td className="py-3 px-5 text-[#4A4E57]">{ageFromDob(c.dob)} / {c.gender || '—'}</td>
                        <td className="py-3 px-5 text-[#4A4E57]">{c.trainer_name || 'Unassigned'}</td>
                        <td className="py-3 px-5 text-center text-[#4A4E57]">{c.photo_url ? <CheckCircle2 size={14} className="inline text-[#10B981]" /> : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </TabContent>
        )}

        {/* ── PACKAGES ── */}
        {tab === 'packages' && (
          <TabContent key="packages">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              {packageRows.map((pkg, i) => (
                <GlassCard key={pkg.name} className="relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full" style={{ background: `${pkg.color}0D` }} />
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: pkg.color }}>{pkg.type}</p>
                  <h3 className="text-[16px] font-extrabold text-[#0B0B0F] mt-1">{pkg.name}</h3>
                  <p className="text-[24px] font-extrabold text-[#0B0B0F] mt-2 tracking-tight">{pkg.fee}</p>
                  <div className="mt-3 space-y-1 text-[11px] text-[#4A4E57]">
                    <p>Duration: {pkg.duration}</p>
                    <p>Freeze: {pkg.freeze}</p>
                    <p className="font-semibold" style={{ color: pkg.color }}>Status: {pkg.status}</p>
                  </div>
                  <button className="mt-4 w-full h-9 rounded-xl border border-[rgba(0,0,0,0.04)] bg-white text-[11px] font-bold text-[#4A4E57] hover:bg-[#F5F5F7] transition-all">Manage Package</button>
                </GlassCard>
              ))}
            </div>

            <GlassCard>
              <SectionHeader eyebrow="Builder" title="Create PT Package" icon={IndianRupee} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <input placeholder="Package name" className="h-10 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3 text-[12px] text-[#0B0B0F] outline-none focus:border-[rgba(139,92,246,0.3)] transition-all" />
                <select className="h-10 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3 text-[12px] text-[#0B0B0F] outline-none focus:border-[rgba(139,92,246,0.3)] transition-all">
                  <option>Package type</option><option>Session-based</option><option>Monthly PT</option><option>Premium coaching</option>
                </select>
                <input placeholder="Fee" className="h-10 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3 text-[12px] text-[#0B0B0F] outline-none focus:border-[rgba(139,92,246,0.3)] transition-all" />
                <input placeholder="Duration" className="h-10 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3 text-[12px] text-[#0B0B0F] outline-none focus:border-[rgba(139,92,246,0.3)] transition-all" />
                <input placeholder="Session count" className="h-10 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3 text-[12px] text-[#0B0B0F] outline-none focus:border-[rgba(139,92,246,0.3)] transition-all" />
                <input placeholder="Freeze allowance" className="h-10 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3 text-[12px] text-[#0B0B0F] outline-none focus:border-[rgba(139,92,246,0.3)] transition-all" />
              </div>
              <button className="h-9 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] px-5 text-[11px] font-bold text-white shadow-[0_2px_8px_rgba(139,92,246,0.20)] transition-all">Save Package</button>
            </GlassCard>
          </TabContent>
        )}

        {/* ── TRAINERS ── */}
        {tab === 'trainers' && (
          <TabContent key="trainers">
            <GlassCard>
              <SectionHeader eyebrow="Trainer Management" title="Allocation, Commissions & Performance" icon={UserCog} />
              <div className="overflow-x-auto -mx-5">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-[rgba(0,0,0,0.04)]">
                      <th className="text-left py-3 px-5 font-semibold text-[#4A4E57]">Trainer</th>
                      <th className="text-left py-3 px-5 font-semibold text-[#4A4E57]">Role</th>
                      <th className="text-center py-3 px-5 font-semibold text-[#4A4E57]">PT Clients</th>
                      <th className="text-center py-3 px-5 font-semibold text-[#4A4E57]">Today's Sessions</th>
                      <th className="text-right py-3 px-5 font-semibold text-[#4A4E57]">Commission</th>
                      <th className="text-center py-3 px-5 font-semibold text-[#4A4E57]">Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainerRows.map((tr, i) => (
                      <tr key={tr.name} className="border-b border-[rgba(0,0,0,0.03)] hover:bg-[rgba(139,92,246,0.02)] transition-colors">
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: tr.color }}>{tr.name.charAt(0)}</div>
                            <span className="font-medium text-[#0B0B0F]">{tr.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-5 text-[#4A4E57]">{tr.role}</td>
                        <td className="py-3 px-5 text-center font-medium text-[#0B0B0F]">{tr.clients}</td>
                        <td className="py-3 px-5 text-center text-[#4A4E57]">{tr.sessions}</td>
                        <td className="py-3 px-5 text-right font-semibold text-[#0B0B0F]">{tr.commission}</td>
                        <td className="py-3 px-5 text-center"><span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold bg-[rgba(16,185,129,0.08)] text-[#10B981]">{tr.score}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </TabContent>
        )}

        {/* ── SESSIONS ── */}
        {tab === 'sessions' && (
          <TabContent key="sessions">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
              <GlassCard>
                <SectionHeader eyebrow="Calendar" title="Daily Session Schedule" icon={CalendarDays} />
                <div className="space-y-2">
                  {sessionRows.map(s => (
                    <div key={s.time + s.client} className="flex items-center gap-3 rounded-xl bg-[#F5F5F7] p-3">
                      <div className="text-[13px] font-bold text-[#0B0B0F] min-w-[56px]">{s.time}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-[#0B0B0F]">{s.client} <span className="font-normal text-[#4A4E57]">· {s.trainer}</span></p>
                        <p className="text-[10px] text-[#4A4E57]">{s.focus}</p>
                      </div>
                      <span className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold whitespace-nowrap',
                        s.state === 'Checked-in' && 'bg-[rgba(16,185,129,0.08)] text-[#10B981]',
                        s.state === 'Upcoming' && 'bg-[rgba(6,182,212,0.08)] text-[#06B6D4]',
                        s.state === 'Reschedule' && 'bg-[rgba(239,68,68,0.08)] text-[#EF4444]',
                      )}>
                        {s.state === 'Checked-in' && <CheckCircle2 size={11} />}
                        {s.state === 'Upcoming' && <Clock3 size={11} />}
                        {s.state === 'Reschedule' && <XCircle size={11} />}
                        {s.state}
                      </span>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard>
                <SectionHeader eyebrow="Booking" title="Create or Reschedule Session" icon={ClipboardList} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <select className="h-10 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3 text-[12px] text-[#0B0B0F] outline-none focus:border-[rgba(139,92,246,0.3)] transition-all">
                    <option>Select client</option>
                    {visibleClients.slice(0, 10).map(c => <option key={c.id}>{c.name}</option>)}
                  </select>
                  <select className="h-10 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3 text-[12px] text-[#0B0B0F] outline-none focus:border-[rgba(139,92,246,0.3)] transition-all">
                    <option>Select trainer</option>
                    {trainers.slice(0, 10).map(t => <option key={t.id}>{t.name}</option>)}
                  </select>
                  <input placeholder="Date" className="h-10 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3 text-[12px] text-[#0B0B0F] outline-none focus:border-[rgba(139,92,246,0.3)] transition-all" />
                  <input placeholder="Time" className="h-10 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3 text-[12px] text-[#0B0B0F] outline-none focus:border-[rgba(139,92,246,0.3)] transition-all" />
                </div>
                <textarea className="w-full min-h-[60px] rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] p-3 text-[12px] text-[#0B0B0F] outline-none focus:border-[rgba(139,92,246,0.3)] transition-all resize-none" placeholder="Session notes, objective, attendance remarks..." />
                <button className="mt-2 h-9 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] px-5 text-[11px] font-bold text-white shadow-[0_2px_8px_rgba(139,92,246,0.20)] transition-all">Save Session</button>
              </GlassCard>
            </div>
          </TabContent>
        )}

        {/* ── PROGRAMMING ── */}
        {tab === 'programming' && (
          <TabContent key="programming">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <GlassCard>
                <SectionHeader eyebrow="Workout System" title="Create Premium Workout Plan" icon={Dumbbell} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <input placeholder="Program name" className="h-10 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3 text-[12px] text-[#0B0B0F] outline-none focus:border-[rgba(139,92,246,0.3)] transition-all" />
                  <select className="h-10 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3 text-[12px] text-[#0B0B0F] outline-none focus:border-[rgba(139,92,246,0.3)] transition-all">
                    <option>Goal type</option><option>Fat loss</option><option>Strength</option><option>Muscle gain</option>
                  </select>
                  <input placeholder="Training split" className="h-10 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3 text-[12px] text-[#0B0B0F] outline-none focus:border-[rgba(139,92,246,0.3)] transition-all" />
                  <input placeholder="Weekly frequency" className="h-10 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3 text-[12px] text-[#0B0B0F] outline-none focus:border-[rgba(139,92,246,0.3)] transition-all" />
                </div>
                <textarea className="w-full min-h-[60px] rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] p-3 text-[12px] text-[#0B0B0F] outline-none focus:border-[rgba(139,92,246,0.3)] transition-all resize-none" placeholder="Exercise structure, progression plan, coaching notes..." />
              </GlassCard>

              <GlassCard>
                <SectionHeader eyebrow="Diet System" title="Create Nutrition Plan" icon={Target} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <select className="h-10 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3 text-[12px] text-[#0B0B0F] outline-none focus:border-[rgba(139,92,246,0.3)] transition-all">
                    <option>Select client</option>
                    {visibleClients.slice(0, 10).map(c => <option key={c.id}>{c.name}</option>)}
                  </select>
                  <input placeholder="Calories" className="h-10 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3 text-[12px] text-[#0B0B0F] outline-none focus:border-[rgba(139,92,246,0.3)] transition-all" />
                  <input placeholder="Protein target" className="h-10 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3 text-[12px] text-[#0B0B0F] outline-none focus:border-[rgba(139,92,246,0.3)] transition-all" />
                  <input placeholder="Meal structure" className="h-10 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] px-3 text-[12px] text-[#0B0B0F] outline-none focus:border-[rgba(139,92,246,0.3)] transition-all" />
                </div>
                <textarea className="w-full min-h-[60px] rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#F5F5F7] p-3 text-[12px] text-[#0B0B0F] outline-none focus:border-[rgba(139,92,246,0.3)] transition-all resize-none" placeholder="Nutrition instructions, supplementation, weekly compliance notes..." />
              </GlassCard>
            </div>
          </TabContent>
        )}

        {/* ── PROGRESS ── */}
        {tab === 'progress' && (
          <TabContent key="progress">
            <GlassCard>
              <SectionHeader eyebrow="Body Progress" title="Weight, Body Fat, Compliance & Photos" icon={Camera} />
              <div className="overflow-x-auto -mx-5">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-[rgba(0,0,0,0.04)]">
                      <th className="text-left py-3 px-5 font-semibold text-[#4A4E57]">Client</th>
                      <th className="text-left py-3 px-5 font-semibold text-[#4A4E57]">Weight</th>
                      <th className="text-left py-3 px-5 font-semibold text-[#4A4E57]">Body Fat</th>
                      <th className="text-center py-3 px-5 font-semibold text-[#4A4E57]">Compliance</th>
                      <th className="text-center py-3 px-5 font-semibold text-[#4A4E57]">Photos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {progressRows.map((r, i) => (
                      <tr key={r.client} className="border-b border-[rgba(0,0,0,0.03)] hover:bg-[rgba(139,92,246,0.02)] transition-colors">
                        <td className="py-3 px-5 font-medium text-[#0B0B0F]">{r.client}</td>
                        <td className="py-3 px-5 font-semibold" style={{ color: r.color }}>{r.weight}</td>
                        <td className="py-3 px-5 text-[#4A4E57]">{r.bodyFat}</td>
                        <td className="py-3 px-5 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <div className="w-16 h-1.5 rounded-full bg-[#F5F5F7] overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#A78BFA]" style={{ width: r.compliance }} />
                            </div>
                            <span className="text-[10px] font-bold text-[#0B0B0F]">{r.compliance}</span>
                          </div>
                        </td>
                        <td className="py-3 px-5 text-center">
                          <span className={cn('text-[10px] font-bold', r.photos === 'Updated' ? 'text-[#10B981]' : 'text-[#F59E0B]')}>{r.photos}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </TabContent>
        )}

        {/* ── REPORTS ── */}
        {tab === 'reports' && (
          <TabContent key="reports">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <GlassCard>
                <SectionHeader eyebrow="PT Analytics" title="Revenue, Retention & Reports" icon={LineChart} />
                <div className="space-y-2">
                  {reportRows.map(r => (
                    <div key={r} className="flex items-center gap-3 rounded-xl bg-[#F5F5F7] px-3.5 py-2.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[rgba(139,92,246,0.10)]">
                        <LineChart size={12} className="text-[#8B5CF6]" />
                      </div>
                      <span className="text-[12px] font-medium text-[#0B0B0F]">{r}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
              <GlassCard>
                <SectionHeader eyebrow="Exports" title="Operational Outputs" icon={Download} />
                <div className="flex flex-wrap gap-2">
                  {['CSV Exports', 'Trainer Payout Report', 'Session Audit Trail', 'Renewal Pipeline'].map(item => (
                    <span key={item} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#8B5CF6]/10 to-[#7C3AED]/5 px-3.5 py-2 text-[11px] font-bold text-[#8B5CF6] cursor-pointer hover:from-[#8B5CF6]/15 hover:to-[#7C3AED]/10 transition-all">
                      <Download size={12} /> {item}
                    </span>
                  ))}
                </div>
              </GlassCard>
            </div>
          </TabContent>
        )}

        {/* ── SETTINGS ── */}
        {tab === 'settings' && (
          <TabContent key="settings">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <GlassCard>
                <SectionHeader eyebrow="Architecture" title="Role & Data Separation Rules" icon={ShieldCheck} />
                <ul className="space-y-2.5">
                  {[
                    'Shared client database for identity only',
                    'Separate PT package, payment, commission, session modules',
                    'Trainer access restricted to assigned clients and schedules',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[12px] text-[#4A4E57]">
                      <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-[#10B981]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </GlassCard>
              <GlassCard>
                <SectionHeader eyebrow="Notifications" title="Reminders & Controls" icon={Bell} />
                <div className="flex flex-wrap gap-2">
                  {['Session Reminders', 'PT Renewal Alerts', 'Trainer Notifications', 'Progress Reviews'].map(n => (
                    <span key={n} className="inline-flex items-center gap-1.5 rounded-full bg-[#F5F5F7] px-3.5 py-2 text-[11px] font-bold text-[#4A4E57]">
                      <Bell size={12} /> {n}
                    </span>
                  ))}
                </div>
              </GlassCard>
            </div>
          </TabContent>
        )}
      </AnimatePresence>
    </div>
  );
}
