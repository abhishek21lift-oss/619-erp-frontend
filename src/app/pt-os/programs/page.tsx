'use client';

import { motion } from 'framer-motion';
import { Layers, Dumbbell, Calendar, Users, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/components/ui/cn';

const RED = '#ff204e';
const GLASS = 'rgba(255,255,255,0.04)';
const GLASS_BORDER = 'rgba(255,255,255,0.07)';
const DARK = '#050505';
const glassCard = 'rounded-2xl border backdrop-blur-2xl transition-all duration-300';
const glassCardStyle = { background: GLASS, borderColor: GLASS_BORDER, boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)' as string | undefined };

const programs = [
  { name: 'Elite Transformation', type: 'transformation', clients: 12, sessions: 48, revenue: '₹1.2L', color: RED },
  { name: 'Monthly Premium PT', type: 'monthly', clients: 18, sessions: 72, revenue: '₹1.8L', color: '#ff6b8a' },
  { name: '12 Session Shred', type: 'session_based', clients: 22, sessions: 44, revenue: '₹1.1L', color: '#ff9eb3' },
  { name: 'Online Coaching', type: 'online', clients: 8, sessions: 16, revenue: '₹0.6L', color: '#38bdf8' },
  { name: 'Diet Plan', type: 'diet', clients: 14, sessions: 28, revenue: '₹0.7L', color: '#34d399' },
];

export default function PtProgramsPage() {
  return (
    <div className="relative min-h-screen pb-12" style={{ background: DARK }}>
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: '#f5f5f5' }}>Programs</h1>
          <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>PT packages & program management</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map((p, i) => (
            <motion.div key={p.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={cn(glassCard, 'group relative overflow-hidden p-5 hover:-translate-y-0.5 cursor-pointer')} style={glassCardStyle}>
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-[0.06]" style={{ background: `radial-gradient(circle, ${p.color}, transparent 70%)` }} />
              <div className="flex items-center gap-2 mb-3">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">{p.type.replace(/_/g, ' ')}</span>
              </div>
              <h3 className="text-lg font-bold text-white/90">{p.name}</h3>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div><p className="text-lg font-black text-white">{p.clients}</p><p className="text-[9px] text-white/30">Clients</p></div>
                <div><p className="text-lg font-black text-white">{p.sessions}</p><p className="text-[9px] text-white/30">Sessions</p></div>
                <div><p className="text-lg font-black text-white">{p.revenue}</p><p className="text-[9px] text-white/30">Revenue</p></div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}