'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, X, ChevronRight, Sparkles, AlertCircle, Trophy, TrendingUp, Target, Activity, Zap, Bot, Star, User, Clock, ArrowUpRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/components/ui/cn';
import { useAsync } from '@/lib/use-async';
import { request } from '@/lib/http';

const RED = '#ff204e';
const RED_GLOW = 'rgba(255,32,78,0.35)';
const RED_SOFT = 'rgba(255,32,78,0.12)';
const GLASS_BORDER = 'rgba(255,255,78,0.1)';

const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
  churn_risk: { icon: AlertCircle, color: '#f87171', bg: 'rgba(248,113,113,0.08)' },
  revenue_alert: { icon: Target, color: '#fbbf24', bg: 'rgba(251,191,36,0.08)' },
  upsell: { icon: TrendingUp, color: '#38bdf8', bg: 'rgba(56,189,248,0.08)' },
  milestone: { icon: Trophy, color: '#34d399', bg: 'rgba(52,211,153,0.08)' },
  performance: { icon: Star, color: '#34d399', bg: 'rgba(52,211,153,0.08)' },
  bottleneck: { icon: AlertCircle, color: '#f87171', bg: 'rgba(248,113,113,0.08)' },
  schedule_gap: { icon: Clock, color: '#fbbf24', bg: 'rgba(251,191,36,0.08)' },
  adherence_drop: { icon: Activity, color: '#f87171', bg: 'rgba(248,113,113,0.08)' },
};

interface Insight {
  id: string; insight_type: string; severity: string; title: string;
  description: string; confidence: number; client_name: string; trainer_name: string;
  suggested_action: string; action_link: string;
}

interface AiCoachingLayerProps {
  insights: Insight[];
  onDismiss: (id: string) => void;
}

export default function AiCoachingLayer({ insights, onDismiss }: AiCoachingLayerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const active = insights.filter(i => !dismissed.has(i.id));

  const handleDismiss = (id: string) => {
    setDismissed(prev => new Set(prev).add(id));
    onDismiss(id);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-bold text-white shadow-2xl transition-all hover:scale-105',
          isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        )}
        style={{
          background: `linear-gradient(135deg, ${RED}, #ff6b8a)`,
          boxShadow: `0 8px 32px ${RED_GLOW}`,
        }}
      >
        <Brain className="h-5 w-5" />
        <span className="hidden sm:inline">AI Coach</span>
        {active.length > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-black" style={{ color: RED }}>
            {active.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 320 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 320 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 right-0 z-50 h-[calc(100vh-80px)] w-80 border-l backdrop-blur-2xl shadow-2xl overflow-y-auto"
            style={{ background: 'rgba(5,5,5,0.95)', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between p-4" style={{ background: 'rgba(5,5,5,0.98)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: RED_SOFT }}>
                  <Brain className="h-4 w-4" style={{ color: RED }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white/90">AI Coach</p>
                  <p className="text-[9px] text-white/30">{active.length} active signals</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="rounded-lg p-1.5 hover:bg-white/5 transition-colors">
                <X className="h-4 w-4 text-white/40" />
              </button>
            </div>

            <div className="p-3 space-y-2">
              {active.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <Sparkles className="h-8 w-8 text-white/10 mb-3" />
                  <p className="text-sm font-semibold text-white/40">All Clear</p>
                  <p className="text-[11px] text-white/20 mt-1">No coaching signals at this time</p>
                </div>
              )}
              {active.map((insight, i) => {
                const cfg = typeConfig[insight.insight_type] || { icon: Brain, color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.03)' };
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="group relative rounded-xl p-3 transition-all hover:translate-x-0.5 cursor-pointer"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.color}20` }}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: `${cfg.color}15` }}>
                        <Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-[12px] font-bold text-white/85 leading-tight">{insight.title}</h4>
                          <button onClick={(e) => { e.stopPropagation(); handleDismiss(insight.id); }}
                            className="shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-white/5 transition-opacity">
                            <X className="h-3 w-3 text-white/30" />
                          </button>
                        </div>
                        {insight.client_name && (
                          <p className="text-[10px] font-medium text-white/40 mt-0.5">{insight.client_name}</p>
                        )}
                        <p className="text-[10px] leading-relaxed text-white/40 mt-1 line-clamp-2">{insight.description}</p>
                        {insight.confidence && (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <div className="h-1 w-12 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                              <div className="h-full rounded-full" style={{ width: `${insight.confidence}%`, background: cfg.color }} />
                            </div>
                            <span className="text-[9px] text-white/30">{insight.confidence}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="sticky bottom-0 p-3" style={{ background: 'rgba(5,5,5,0.98)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between text-[10px] text-white/20">
                <span>Signals update in real-time</span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: RED }} /> Live</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}