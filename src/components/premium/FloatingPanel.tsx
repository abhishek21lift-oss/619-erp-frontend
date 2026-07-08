'use client';

import { useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

type FloatingPanelProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
};

export function FloatingPanel({ open, onClose, title, subtitle, icon, size = 'md', children }: FloatingPanelProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const widths: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <m.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={clsx(
              'relative w-full bg-white shadow-2xl border-l border-slate-100 overflow-y-auto',
              widths[size],
            )}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-slate-100 bg-white/90 backdrop-blur-md">
              <div className="flex items-center gap-3 min-w-0">
                {icon && (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    {icon}
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-[17px] font-[760] tracking-[-0.01em] text-slate-900 truncate">{title}</h2>
                  {subtitle && <p className="text-[12px] text-slate-500 mt-0.5">{subtitle}</p>}
                </div>
              </div>
              <button onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-4">{children}</div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}
