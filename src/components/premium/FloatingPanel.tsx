'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/components/ui/cn';

interface FloatingPanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const SIZE_MAP = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[90vw]',
};

export function FloatingPanel({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  className,
  size = 'md',
}: FloatingPanelProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
              'w-full',
              SIZE_MAP[size],
              className,
            )}
          >
            <div className="relative overflow-hidden rounded-[28px] border border-white/60 bg-white/95 shadow-[0_30px_80px_rgba(15,23,42,0.15)] backdrop-blur-2xl">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(220,38,38,0.06),transparent_50%)]" />
              {title && (
                <div className="relative flex items-start justify-between gap-4 border-b border-zinc-100 px-6 py-5">
                  <div className="flex items-start gap-3">
                    {icon && (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-red-500/10 to-red-600/10">
                        {icon}
                      </div>
                    )}
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight text-zinc-900">{title}</h2>
                      {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div className="relative max-h-[75vh] overflow-y-auto p-6">{children}</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
