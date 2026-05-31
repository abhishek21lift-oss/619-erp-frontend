'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/components/ui/cn';

interface PremiumModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
}

const SIZE_MAP = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function PremiumModal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  className,
  size = 'md',
  footer,
}: PremiumModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/15 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 px-4"
          >
            <div className={cn(
              'mx-auto overflow-hidden rounded-[24px] border border-white/60 bg-white/95 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur-2xl',
              SIZE_MAP[size],
              className,
            )}>
              {title && (
                <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-6 py-4">
                  <div className="flex items-start gap-3">
                    {icon && (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-red-50 text-red-600">
                        {icon}
                      </div>
                    )}
                    <div>
                      <h3 className="text-base font-semibold tracking-tight text-zinc-900">{title}</h3>
                      {subtitle && <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>}
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div className="max-h-[60vh] overflow-y-auto p-6">{children}</div>
              {footer && (
                <div className="flex items-center justify-end gap-3 border-t border-zinc-100 bg-zinc-50/50 px-6 py-4">
                  {footer}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
