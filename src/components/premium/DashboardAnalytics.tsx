'use client';

import * as React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Area, AreaChart,
  PieChart, Pie, Cell,
} from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Dumbbell, UserPlus, CalendarCheck, RefreshCw, Fingerprint, ArrowUpRight } from 'lucide-react';
import { cn } from '@/components/ui/cn';

const COLORS = {
  blue: '#3B82F6',
  cyan: '#06B6D4',
  emerald: '#10B981',
  amber: '#F59E0B',
  coral: '#EF4444',
  purple: '#8B5CF6',
  pink: '#EC4899',
  indigo: '#6366F1',
};

const GRADIENTS = {
  blue: 'from-[#3B82F6] to-[#2563EB]',
  cyan: 'from-[#06B6D4] to-[#0891B2]',
  emerald: 'from-[#10B981] to-[#059669]',
  amber: 'from-[#F59E0B] to-[#D97706]',
  coral: 'from-[#EF4444] to-[#DC2626]',
  purple: 'from-[#8B5CF6] to-[#7C3AED]',
};

const PIE_COLORS = ['#3B82F6', '#06B6D4', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#EF4444'];

function GlassCard({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[24px] bg-white/70 backdrop-blur-[20px] saturate-[160%]',
        'border border-white/25 shadow-[0_8px_32px_rgba(11,11,15,0.06)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function PremiumKpiCard({
  label, value, hint, icon, gradient, color, index = 0,
}: {
  label: string; value: string; hint?: string; icon: React.ReactNode;
  gradient: string; color: string; index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="group relative overflow-hidden rounded-[24px] bg-white/70 backdrop-blur-[20px] saturate-[160%] border border-white/25 shadow-[0_8px_32px_rgba(11,11,15,0.06)] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(11,11,15,0.10)] hover:-translate-y-0.5"
    >
      <div className={cn(
        'absolute inset-0 opacity-[0.03] bg-gradient-to-br',
        gradient,
      )} />
      <div className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#4A4E57]">
            {label}
          </p>
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-[0_4px_12px_rgba(59,130,246,0.15)]"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}
          >
            {React.cloneElement(icon as React.ReactElement<{size?: number; strokeWidth?: number; color?: string}>, { size: 18, strokeWidth: 1.5, color: 'white' })}
          </span>
        </div>
        <div className="mt-3 flex items-end justify-between gap-2">
          <span className="text-[28px] font-bold tracking-[-0.03em] text-[#0B0B0F] tabular-nums leading-none">
            {value}
          </span>
          <span className="inline-flex items-center gap-0.5 rounded-full bg-[rgba(59,130,246,0.08)] px-2 py-0.5 text-[11px] font-bold text-[#3B82F6]">
            <ArrowUpRight size={10} strokeWidth={2.5} />
            12.5%
          </span>
        </div>
        {hint && (
          <p className="mt-2 text-[12px] text-[#4A4E57]">{hint}</p>
        )}
      </div>
    </motion.div>
  );
}

const revenueData = [
  { month: 'Jan', revenue: 1240000, members: 42, sessions: 180 },
  { month: 'Feb', revenue: 1380000, members: 48, sessions: 195 },
  { month: 'Mar', revenue: 1520000, members: 55, sessions: 210 },
  { month: 'Apr', revenue: 1480000, members: 52, sessions: 205 },
  { month: 'May', revenue: 1650000, members: 58, sessions: 225 },
  { month: 'Jun', revenue: 1720000, members: 62, sessions: 240 },
];

const trendData = [
  { month: 'Jan', revenue: 1240000, target: 1200000 },
  { month: 'Feb', revenue: 1380000, target: 1250000 },
  { month: 'Mar', revenue: 1520000, target: 1300000 },
  { month: 'Apr', revenue: 1480000, target: 1350000 },
  { month: 'May', revenue: 1650000, target: 1400000 },
  { month: 'Jun', revenue: 1720000, target: 1450000 },
];

const membershipDist = [
  { name: 'Monthly', value: 185 },
  { name: 'Quarterly', value: 95 },
  { name: 'Yearly', value: 62 },
  { name: 'PT Only', value: 48 },
  { name: 'Trial', value: 28 },
];

const ptDist = [
  { name: 'PT 12', value: 52 },
  { name: 'PT 24', value: 38 },
  { name: 'PT 36', value: 25 },
  { name: 'PT 48', value: 18 },
  { name: 'PT 96', value: 8 },
];

const trainerData = [
  { name: 'Rajesh', revenue: 420000, clients: 28 },
  { name: 'Priya', revenue: 385000, clients: 24 },
  { name: 'Amit', revenue: 350000, clients: 22 },
  { name: 'Neha', revenue: 310000, clients: 20 },
  { name: 'Vikram', revenue: 280000, clients: 18 },
];

const recentActivity = [
  { time: '2m ago', event: 'New member enrolled', detail: 'Rahul Sharma - Monthly', type: 'success' },
  { time: '15m ago', event: 'PT session completed', detail: 'Amit with Trainer Priya', type: 'info' },
  { time: '1h ago', event: 'Payment received', detail: '₹12,000 - Sneha Patel', type: 'success' },
  { time: '2h ago', event: 'Lead converted', detail: 'Vikram Joshi → Trial', type: 'info' },
  { time: '3h ago', event: 'Renewal processed', detail: 'Deepak Kumar - Yearly', type: 'success' },
  { time: '4h ago', event: 'Attendance alert', detail: '85% capacity at peak hour', type: 'warning' },
];

const typeStyles: Record<string, string> = {
  success: 'bg-[rgba(16,185,129,0.10)] text-[#10B981]',
  info: 'bg-[rgba(59,130,246,0.10)] text-[#3B82F6]',
  warning: 'bg-[rgba(245,158,11,0.10)] text-[#F59E0B]',
};

function fmtINR(n: number) {
  return '₹' + (n / 100000).toFixed(1) + 'L';
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-[14px] bg-white/90 backdrop-blur-[20px] border border-white/30 px-4 py-3 shadow-[0_8px_24px_rgba(11,11,15,0.10)]">
        <p className="text-[12px] font-semibold text-[#0B0B0F] mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-[12px]" style={{ color: entry.color }}>
            {entry.name}: <span className="font-bold">{entry.name === 'revenue' ? fmtINR(entry.value) : entry.value.toLocaleString()}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function DashboardAnalytics() {
  return (
    <section className="space-y-6">
      {/* Hero KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <PremiumKpiCard
          label="Total Revenue"
          value="₹1.72Cr"
          hint="vs ₹1.48Cr last month"
          icon={<TrendingUp />}
          gradient="from-[#3B82F6] to-[#2563EB]"
          color="#3B82F6"
          index={0}
        />
        <PremiumKpiCard
          label="Active Members"
          value="342"
          hint="87% retention rate"
          icon={<Users />}
          gradient="from-[#06B6D4] to-[#0891B2]"
          color="#06B6D4"
          index={1}
        />
        <PremiumKpiCard
          label="PT Revenue"
          value="₹48.2L"
          hint="28% of total revenue"
          icon={<Dumbbell />}
          gradient="from-[#10B981] to-[#059669]"
          color="#10B981"
          index={2}
        />
        <PremiumKpiCard
          label="New Leads"
          value="128"
          hint="34% conversion rate"
          icon={<UserPlus />}
          gradient="from-[#F59E0B] to-[#D97706]"
          color="#F59E0B"
          index={3}
        />
        <PremiumKpiCard
          label="Today's Attendance"
          value="187"
          hint="72% of active members"
          icon={<CalendarCheck />}
          gradient="from-[#8B5CF6] to-[#7C3AED]"
          color="#8B5CF6"
          index={4}
        />
        <PremiumKpiCard
          label="Renewal Rate"
          value="91%"
          hint="↑ 5% from last quarter"
          icon={<RefreshCw />}
          gradient="from-[#6366F1] to-[#4F46E5]"
          color="#6366F1"
          index={5}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Bar Chart */}
        <GlassCard className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-[15px] font-semibold text-[#0B0B0F]">Monthly Revenue</h3>
              <p className="text-[12px] text-[#4A4E57] mt-0.5">Revenue trend over the last 6 months</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(16,185,129,0.08)] px-2.5 py-1 text-[11px] font-bold text-[#10B981]">
              <TrendingUp size={11} />
              +16.2%
            </span>
          </div>
          <div className="h-[220px] sm:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} barCategoryGap="20%">
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0.45} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,11,15,0.05)" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#4A4E57' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#4A4E57' }} tickFormatter={(v) => `${(v/100000).toFixed(0)}L`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.04)' }} />
                <Bar dataKey="revenue" fill="url(#barGrad)" radius={[8, 8, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Revenue Trend Line Chart */}
        <GlassCard className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-[15px] font-semibold text-[#0B0B0F]">Revenue vs Target</h3>
              <p className="text-[12px] text-[#4A4E57] mt-0.5">Actual revenue compared to monthly targets</p>
            </div>
          </div>
          <div className="h-[220px] sm:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,11,15,0.05)" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#4A4E57' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#4A4E57' }} tickFormatter={(v) => `${(v/100000).toFixed(0)}L`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2.5} fill="url(#lineGrad)" dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="target" stroke="#F59E0B" strokeWidth={2} strokeDasharray="6 4" fill="none" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Donut Charts + Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Membership Distribution */}
        <GlassCard className="p-5 sm:p-6">
          <h3 className="text-[15px] font-semibold text-[#0B0B0F] mb-1">Membership Distribution</h3>
          <p className="text-[12px] text-[#4A4E57] mb-4">Breakdown by plan type</p>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={membershipDist}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  strokeWidth={2}
                  stroke="rgba(255,255,255,0.5)"
                  dataKey="value"
                >
                  {membershipDist.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {membershipDist.map((item, i) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i] }} />
                <span className="text-[11px] text-[#4A4E57] truncate">{item.name}</span>
                <span className="ml-auto text-[11px] font-bold text-[#0B0B0F]">{item.value}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* PT Package Distribution */}
        <GlassCard className="p-5 sm:p-6">
          <h3 className="text-[15px] font-semibold text-[#0B0B0F] mb-1">PT Package Distribution</h3>
          <p className="text-[12px] text-[#4A4E57] mb-4">Personal training plan breakdown</p>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ptDist}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  strokeWidth={2}
                  stroke="rgba(255,255,255,0.5)"
                  dataKey="value"
                >
                  {ptDist.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[(i + 2) % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {ptDist.map((item, i) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[(i + 2) % PIE_COLORS.length] }} />
                <span className="text-[11px] text-[#4A4E57] truncate">{item.name}</span>
                <span className="ml-auto text-[11px] font-bold text-[#0B0B0F]">{item.value}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Recent Activity */}
        <GlassCard className="p-5 sm:p-6">
          <h3 className="text-[15px] font-semibold text-[#0B0B0F] mb-1">Recent Activity</h3>
          <p className="text-[12px] text-[#4A4E57] mb-4">Latest studio events</p>
          <div className="space-y-3">
            {recentActivity.map((activity, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 group"
              >
                <span className="mt-0.5 h-2 w-2 rounded-full shrink-0" style={{
                  background: activity.type === 'success' ? '#10B981' : activity.type === 'info' ? '#3B82F6' : '#F59E0B',
                  boxShadow: `0 0 6px ${activity.type === 'success' ? 'rgba(16,185,129,0.4)' : activity.type === 'info' ? 'rgba(59,130,246,0.4)' : 'rgba(245,158,11,0.4)'}`,
                }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-[#0B0B0F]">{activity.event}</p>
                  <p className="text-[11px] text-[#4A4E57]">{activity.detail}</p>
                </div>
                <span className="text-[10px] text-[#9CA3AF] shrink-0">{activity.time}</span>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Trainer Performance Bar Chart */}
      <GlassCard className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-[15px] font-semibold text-[#0B0B0F]">Trainer Performance</h3>
            <p className="text-[12px] text-[#4A4E57] mt-0.5">Revenue generated by each trainer this month</p>
          </div>
        </div>
        <div className="h-[200px] sm:h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trainerData} layout="vertical" barCategoryGap="25%">
              <defs>
                <linearGradient id="trainerBar" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.85} />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.55} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,11,15,0.05)" horizontal={false} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#4A4E57' }} tickFormatter={(v) => `${(v/100000).toFixed(0)}L`} />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#0B0B0F' }} width={60} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(6,182,212,0.04)' }} />
              <Bar dataKey="revenue" fill="url(#trainerBar)" radius={[0, 8, 8, 0]} maxBarSize={36} label={{
                position: 'right',
                fontSize: 11,
                fill: '#4A4E57',
                formatter: (v: number) => fmtINR(v),
              }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
    </section>
  );
}
