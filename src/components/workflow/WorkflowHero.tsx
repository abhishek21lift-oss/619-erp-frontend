'use client';
import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface WorkflowHeroProps {
  backHref: string;
  backLabel?: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  avatar?: string;
  initials?: string;
  badges?: ReactNode;
  actions?: ReactNode;
}

export function WorkflowHero({
  backHref,
  backLabel = 'Back',
  eyebrow,
  title,
  subtitle,
  avatar,
  initials,
  badges,
  actions,
}: WorkflowHeroProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-white/60 bg-gradient-to-br from-indigo-50/80 via-white/90 to-white/80 backdrop-blur-xl shadow-[0_4px_24px_rgba(15,23,42,0.06)] p-5 mb-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Avatar */}
        {(avatar || initials) && (
          <div className="shrink-0">
            {avatar ? (
              <img src={avatar} alt={title} className="w-14 h-14 rounded-full object-cover ring-2 ring-white shadow-md" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                {initials}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 transition-colors mb-1.5 group"
          >
            <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
            {backLabel}
          </Link>
          {eyebrow && (
            <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-indigo-500 mb-0.5">{eyebrow}</p>
          )}
          <h1 className="text-xl font-bold text-slate-900 truncate">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5 truncate">{subtitle}</p>}
          {badges && <div className="flex flex-wrap gap-2 mt-2">{badges}</div>}
        </div>

        {/* Actions */}
        {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
      </div>
    </motion.div>
  );
}
