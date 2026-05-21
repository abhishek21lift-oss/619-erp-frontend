'use client';

import { motion } from 'framer-motion';
import { Bot, Zap, Clock, Bell, Mail, MessageSquare, Flag, Award, Plus } from 'lucide-react';
import { cn } from '@/components/ui/cn';

const RED = '#ff204e';
const RED_SOFT = 'rgba(255,32,78,0.12)';
const GLASS = 'rgba(255,255,255,0.04)';
const GLASS_BORDER = 'rgba(255,255,255,0.07)';
const DARK = '#050505';
const glassCard = 'rounded-2xl border backdrop-blur-2xl transition-all duration-300';
const glassCardStyle = { background: GLASS, borderColor: GLASS_BORDER, boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)' as string | undefined };

const triggers = [
  { type: 'inactivity', label: 'Client Inactivity', desc: 'Alert if no session for 7 days' },
  { type: 'expiry', label: 'Package Expiry', desc: 'Notify before plan ends' },
  { type: 'overdue', label: 'Overdue Payment', desc: 'Escalate unpaid invoices' },
  { type: 'milestone', label: 'Milestone Reached', desc: 'Auto-celebrate achievements' },
  { type: 'adherence_drop', label: 'Adherence Drop', desc: 'Flag clients below threshold' },
];

export default function PtAutomationPage() {
  return (
    <div className="relative min-h-screen pb-12" style={{ background: DARK }}>
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: '#f5f5f5' }}>Automation</h1>
            <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>Rule engine for automated coaching workflows</p>
          </div>
          <button className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[11px] font-semibold text-white transition-all hover:opacity-80" style={{ background: RED }}>
            <Plus className="h-3.5 w-3.5" /> New Rule
          </button>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {triggers.map((t, i) => (
            <motion.div key={t.type} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={cn(glassCard, 'group relative overflow-hidden p-5 hover:-translate-y-0.5 cursor-pointer')} style={glassCardStyle}>
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-[0.06]" style={{ background: `radial-gradient(circle, ${RED}, transparent 70%)` }} />
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: RED_SOFT }}>
                  <Zap className="h-4 w-4" style={{ color: RED }} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white/90">{t.label}</h3>
                  <p className="text-[11px] text-white/40 mt-0.5">{t.desc}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3 text-[10px] text-white/30">
                <span className="flex items-center gap-1"><Bell className="h-3 w-3" /> Notification</span>
                <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> Email</span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className={cn(glassCard, 'p-5 text-center')} style={glassCardStyle}>
          <Bot className="h-8 w-8 mx-auto text-white/20" />
          <p className="mt-2 text-sm text-white/50">Automation rules are configured from the backend. Create rules to trigger WhatsApp alerts, trainer notifications, and incentive approvals.</p>
        </div>
      </div>
    </div>
  );
}
