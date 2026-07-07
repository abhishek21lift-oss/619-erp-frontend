'use client';

import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Plus, X, UserPlus, Dumbbell, IndianRupee, ClipboardList, ScanFace } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useNavScroll } from '@/contexts/nav-scroll-context';

const FAB_ITEMS = [
  {
    icon: UserPlus,
    label: 'New Client',
    href: '/pt-os/new-client',
    color: '#7c3aed',
    glow: 'rgba(124,58,237,0.4)',
    gradient: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
  },
  {
    icon: IndianRupee,
    label: 'Quick Payment',
    href: '/pt-os/clients',
    color: '#059669',
    glow: 'rgba(5,150,105,0.4)',
    gradient: 'linear-gradient(135deg, #059669, #047857)',
  },
  {
    icon: Dumbbell,
    label: 'New Session',
    href: '/pt-os/schedule-session',
    color: '#0891b2',
    glow: 'rgba(8,145,178,0.4)',
    gradient: 'linear-gradient(135deg, #0891b2, #0e7490)',
  },
  {
    icon: ClipboardList,
    label: 'Assessment',
    href: '/pt-os/weekly-checkin',
    color: '#d97706',
    glow: 'rgba(217,119,6,0.4)',
    gradient: 'linear-gradient(135deg, #d97706, #b45309)',
  },
  {
    icon: ScanFace,
    label: 'Check-in',
    href: '/checkin',
    color: '#db2777',
    glow: 'rgba(219,39,119,0.4)',
    gradient: 'linear-gradient(135deg, #db2777, #be185d)',
  },
];

export default function FAB() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { bottomBar, reducedMotion } = useNavScroll();

  const navVisible = bottomBar !== 'hidden';
  const dur = reducedMotion ? 0 : 0.28;

  const handleItem = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <m.div
            className="fixed inset-0 z-[49] lg:hidden"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Action items */}
      <AnimatePresence>
        {open && (
          <div className="fixed z-50 lg:hidden" style={{
            bottom: navVisible
              ? 'calc(60px + env(safe-area-inset-bottom, 0px) + 12px)'
              : 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
            right: 16,
            transition: `bottom ${dur}s`,
          }}>
            <div className="flex flex-col-reverse gap-3 items-end">
              {FAB_ITEMS.map((item, i) => {
                const Icon = item.icon;
                return (
                  <m.button
                    key={item.href + item.label}
                    initial={{ opacity: 0, y: 20, scale: 0.7 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.8 }}
                    transition={{
                      type: 'spring',
                      stiffness: 500,
                      damping: 30,
                      delay: i * 0.04,
                    }}
                    onClick={() => handleItem(item.href)}
                    className="flex items-center gap-3"
                    style={{ minHeight: 44 }}
                  >
                    <span
                      className="rounded-full px-3.5 py-1.5 text-[12px] font-bold text-white shadow-lg"
                      style={{
                        background: 'rgba(10,14,26,0.92)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        backdropFilter: 'blur(12px)',
                      }}
                    >
                      {item.label}
                    </span>
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                      style={{
                        background: item.gradient,
                        boxShadow: `0 4px 16px ${item.glow}`,
                      }}
                    >
                      <Icon size={18} className="text-white" />
                    </div>
                  </m.button>
                );
              })}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Main FAB button */}
      <m.button
        className="fixed z-50 flex h-[56px] w-[56px] items-center justify-center rounded-full lg:hidden"
        style={{
          bottom: navVisible
            ? 'calc(60px + env(safe-area-inset-bottom, 0px) + 12px)'
            : 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
          right: 16,
          background: open
            ? 'linear-gradient(135deg, #374151, #1f2937)'
            : 'linear-gradient(135deg, #FF9E00 0%, #F57C00 55%, #E65100 100%)',
          boxShadow: open
            ? '0 4px 20px rgba(0,0,0,0.4)'
            : '0 6px 24px rgba(255,140,0,0.45)',
          transition: `bottom ${dur}s cubic-bezier(0.22,1,0.36,1), background 0.25s ease`,
        }}
        onClick={() => setOpen(s => !s)}
        whileTap={reducedMotion ? {} : { scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 700, damping: 22 }}
        aria-label={open ? 'Close quick actions' : 'Quick actions'}
        aria-expanded={open}
      >
        <m.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 600, damping: 30 }}
        >
          {open
            ? <X size={22} className="text-white" />
            : <Plus size={24} className="text-white" strokeWidth={2.5} />
          }
        </m.div>
      </m.button>
    </>
  );
}
