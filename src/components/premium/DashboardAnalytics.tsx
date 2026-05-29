'use client';

import * as React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Area, AreaChart,
  PieChart, Pie, Cell,
} from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Dumbbell, UserPlus, CalendarCheck, Activity, ArrowUpRight } from 'lucide-react';
import { cn } from '@/components/ui/cn';

const COLORS = {
  purple: '#8B5CF6',
  blue: '#3B82F6',
  emerald: '#10B981',
  amber: '#F59E0B',
  pink: '#EC4899',
  cyan: '#06B6D4',
  indigo: '#6366F1',
};

const GRADIENTS: Record<string, string> = {
  purple: 'from-[#8B5CF6] to-[#7C3AED]',
  blue: 'from-[#3B82F6] to-[#2563EB]',
  emerald: 'from-[#10B981] to-[#059669]',
  amber: 'from-[#F59E0B] to-[#D97706]',
  pink: 'from-[#EC4899] to-[#DB2777]',
  cyan: 'from-[#06B6D4] to-[#0891B2]',
};

const PIE_COLORS = ['#8B5CF6', '#3B82F6', '#06B6D4', '#10B981', '#F59E0B', '#EC4899', '#6366F1', '#EF4444'];

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

const sparklineData = [
  { v: 12 }, { v: 18 }, { v: 14 }, { v: 22 }, { v: 19 }, { v: 28 }, { v: 24 }, { v: 32 }, { v: 27 }, { v: 35 },
];

function Sparkline({ color }: { color: string }) {
  return (
    <div className="h-[36px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={sparklineData}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.8} dot={false} activeDot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function PremiumKpiCard({
  label, value, hint, growth, icon, gradient, color, accentLight, index = 0,
}: {
  label: string; value: string; hint?: string; growth?: string; icon: React.ReactNode;
  gradient: string; color: string; accentLight: string; index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="group relative overflow-hidden rounded-[24px] bg-white/70 backdrop-blur-[20px] saturate-[160%] border border-white/25 shadow-[0_8px_32px_rgba(11,11,15,0.06)] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(11,11,15,0.10)] hover:-translate-y-0.5"
    >
      <div className={cn('absolute inset-0 opacity-[0.03] bg-gradient-to-br', gradient)} />
      <div className="relative p-4">
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
            >
              {React.cloneElement(icon as React.ReactElement<{size?: number; strokeWidth?: number; color?: string}>, { size: 15, strokeWidth: 1.8, color: 'white' })}
            </span>
            <p className="text-[10px] font-bold uppercase tracking-[0.10em] text-[#4A4E57]">
              {label}
            </p>
          </div>
          {growth && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-[rgba(16,185,129,0.08)] px-1.5 py-0.5 text-[9px] font-bold text-[#10B981]">
              <ArrowUpRight size={8} strokeWidth={2.5} />
              {growth}
            </span>
          )}
        </div>
        <span className="text-[22px] font-bold tracking-[-0.03em] text-[#0B0B0F] tabular-nums leading-none">
          {value}
        </span>
        {hint && (
          <p className="mt-1 text-[11px] text-[#4A4E57]">{hint}</p>
        )}
        <div className="mt-2" style={{ opacity: 0.6 }}>
          <Sparkline color={color} />
        </div>
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
  { name: 'Active Members', value: 185 },
  { name: 'Trial Members', value: 38 },
  { name: 'Lapsed Members', value: 28 },
  { name: 'Monthly', value: 62 },
  { name: 'Quarterly', value: 48 },
];

const ptDist = [
  { name: '12 Sessions', value: 52 },
  { name: '24 Sessions', value: 38 },
  { name: '36 Sessions', value: 25 },
  { name: 'Others', value: 26 },
];

const recentActivity = [
  { time: '2m ago', event: 'New member joined', detail: 'Rahul Sharma - Monthly Premium', type: 'success' },
  { time: '15m ago', event: 'PT package renewed', detail: 'Amit with Trainer Priya - 24 Sessions', type: 'info' },
  { time: '1h ago', event: 'Check-in completed', detail: 'Sneha Patel - QR check-in', type: 'success' },
  { time: '2h ago', event: 'New lead added', detail: 'Vikram Joshi — Walk-in Enquiry', type: 'info' },
  { time: '3h ago', event: 'Renewal processed', detail: 'Deepak Kumar - Yearly Premium', type: 'success' },
  { time: '4h ago', event: 'Attendance alert', detail: '85% capacity at peak hour', type: 'warning' },
];

const typeStyles: Record<string, string> = {
  success: 'bg-[rgba(16,185,129,0.10)] text-[#10B981]',
  info: 'bg-[rgba(59,130,246,0.10)] text-[#3B82F6]',
  warning: 'bg-[rgba(245,158,11,0.10)] text-[#F59E0B]',
};

const typeDotColors: Record<string, string> = {
  success: '#10B981',
  info: '#3B82F6',
  warning: '#F59E0B',
};

function fmtINR(n: number) {
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(1) + 'Cr';
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
  return '₹' + (n / 1000).toFixed(0) + 'K';
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-[14px] bg-white/90 backdrop-blur-[20px] border border-white/30 px-4 py-3 shadow-[0_8px_24px_rgba(11,11,15,0.10)]">
        <p className="text-[12px] font-semibold text-[#0B0B0F] mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-[12px]" style={{ color: entry.color }}>
            {entry.name}: <span className="font-bold">{typeof entry.value === 'number' && entry.value > 1000 ? fmtINR(entry.value) : entry.value}</span>
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
          hint="Monthly revenue growth"
          growth="12.5%"
          icon={<TrendingUp />}
          gradient="from-[#8B5CF6] to-[#7C3AED]"
          color="#8B5CF6"
          accentLight="rgba(139,92,246,0.10)"
          index={0}
        />
        <PremiumKpiCard
          label="Active Members"
          value="342"
          hint="87% retention rate"
          growth="8.2%"
          icon={<Users />}
          gradient="from-[#3B82F6] to-[#2563EB]"
          color="#3B82F6"
          accentLight="rgba(59,130,246,0.10)"
          index={1}
        />
        <PremiumKpiCard
          label="PT Revenue"
          value="₹48.2L"
          hint="28% of total revenue"
          growth="6.8%"
          icon={<Dumbbell />}
          gradient="from-[#10B981] to-[#059669]"
          color="#10B981"
          accentLight="rgba(16,185,129,0.10)"
          index={2}
        />
        <PremiumKpiCard
          label="New Leads"
          value="128"
          hint="34% conversion rate"
          growth="11.3%"
          icon={<UserPlus />}
          gradient="from-[#F59E0B] to-[#D97706]"
          color="#F59E0B"
          accentLight="rgba(245,158,11,0.10)"
          index={3}
        />
        <PremiumKpiCard
          label="Today's Attendance"
          value="187"
          hint="72% of active members"
          growth="5.4%"
          icon={<CalendarCheck />}
          gradient="from-[#EC4899] to-[#DB2777]"
          color="#EC4899"
          accentLight="rgba(236,72,153,0.10)"
          index={4}
        />
        <PremiumKpiCard
          label="Attendance %"
          value="91%"
          hint="↑ 5% from last quarter"
          growth="3.1%"
          icon={<Activity />}
          gradient="from-[#06B6D4] to-[#0891B2]"
          color="#06B6D4"
          accentLight="rgba(6,182,212,0.10)"
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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(139,92,246,0.08)] px-2.5 py-1 text-[11px] font-bold text-[#8B5CF6]">
              <TrendingUp size={11} />
              +16.2%
            </span>
          </div>
          <div className="h-[220px] sm:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} barCategoryGap="20%">
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.45} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,11,15,0.05)" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#4A4E57' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#4A4E57' }} tickFormatter={(v) => `${(v/100000).toFixed(0)}L`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139,92,246,0.04)' }} />
                <Bar dataKey="revenue" fill="url(#barGrad)" radius={[8, 8, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Revenue vs Target Line Chart */}
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

      {/* Distribution + Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Membership Distribution */}
        <GlassCard className="p-5 sm:p-6">
          <h3 className="text-[15px] font-semibold text-[#0B0B0F] mb-1">Membership Distribution</h3>
          <p className="text-[12px] text-[#4A4E57] mb-4">Member segmentation overview</p>
          <div className="relative h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={membershipDist}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={82}
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
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#8B5CF6]/10 to-[#3B82F6]/10">
                <Users size={18} className="text-[#8B5CF6]" strokeWidth={1.5} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 mt-3">
            {membershipDist.map((item, i) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i] }} />
                <span className="text-[10px] text-[#4A4E57] truncate">{item.name}</span>
                <span className="ml-auto text-[10px] font-bold text-[#0B0B0F]">{item.value}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* PT Package Distribution */}
        <GlassCard className="p-5 sm:p-6">
          <h3 className="text-[15px] font-semibold text-[#0B0B0F] mb-1">PT Package Distribution</h3>
          <p className="text-[12px] text-[#4A4E57] mb-4">Package sales analysis</p>
          <div className="relative h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ptDist}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={82}
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
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#10B981]/10 to-[#3B82F6]/10">
                <Dumbbell size={18} className="text-[#10B981]" strokeWidth={1.5} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 mt-3">
            {ptDist.map((item, i) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[(i + 2) % PIE_COLORS.length] }} />
                <span className="text-[10px] text-[#4A4E57] truncate">{item.name}</span>
                <span className="ml-auto text-[10px] font-bold text-[#0B0B0F]">{item.value}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Recent Activity */}
        <GlassCard className="p-5 sm:p-6">
          <h3 className="text-[15px] font-semibold text-[#0B0B0F] mb-1">Recent Activity</h3>
          <p className="text-[12px] text-[#4A4E57] mb-4">Real-time studio operations</p>
          <div className="space-y-3">
            {recentActivity.map((activity, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 group"
              >
                <span
                  className="mt-0.5 h-2 w-2 rounded-full shrink-0"
                  style={{
                    background: typeDotColors[activity.type],
                    boxShadow: `0 0 6px ${typeDotColors[activity.type]}66`,
                  }}
                />
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
    </section>
  );
}
