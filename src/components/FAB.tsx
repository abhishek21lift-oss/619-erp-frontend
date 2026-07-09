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
    glow: 'rgba(124,58,237,0.50)',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
  },
  {
    icon: IndianRupee,
    label: 'Quick Payment',
    href: '/pt-os/clients',
    glow: 'rgba(5,150,105,0.50)',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  },
  {
    icon: Dumbbell,
    label: 'New Session',
    href: '/pt-os/schedule-session',
    glow: 'rgba(8,145,178,0.50)',
    gradient: 'linear-gradient(135deg, #22d3ee 0%, #0891b2 100%)',
  },
  {
    icon: ClipboardList,
    label: 'Assessment',
    href: '/pt-os/weekly-checkin',
    glow: 'rgba(217,119,6,0.50)',
    gradient: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
  },
  {
    icon: ScanFace,
    label: 'Check-in',
    href: '/checkin',
    glow: 'rgba(219,39,119,0.50)',
    gradient: 'linear-gradient(135deg, #f472b6 0%, #db2777 100%)',
  },
];

const ITEM_SPRING = { type: 'spring', stiffness: 520, damping: 32 } as const;

export default function FAB() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { bottomBar, reducedMotion } = useNavScroll();

  const navVisible  = bottomBar !== 'hidden';
  const dur         = reducedMotion ? 0 : 0.28;
  const bottomBase  = navVisible
    ? 'calc(60px + env(safe-area-inset-bottom, 0px) + 16px)'
    : 'calc(env(safe-area-inset-bottom, 0px) + 20px)';

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
            style={{
              background: 'rgba(7,5,15,0.72)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Action items */}
      <AnimatePresence>
        {open && (
          <div
            className="fixed z-50 lg:hidden"
            style={{
              bottom: bottomBase,
              right: 20,
              transition: `bottom ${dur}s cubic-bezier(0.22,1,0.36,1)`,
            }}
          >
            <div className="flex flex-col-reverse items-end" style={{ gap: 10 }}>
              {FAB_ITEMS.map((item, i) => {
                const Icon = item.icon;
                return (
                  <m.button
                    key={item.href + item.label}
                    initial={{ opacity: 0, y: 22, scale: 0.62, x: 6 }}
                    animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
                    exit={{ opacity: 0, y: 10, scale: 0.78, x: 4 }}
                    transition={{
                      ...ITEM_SPRING,
                      delay: reducedMotion ? 0 : i * 0.044,
                    }}
                    onClick={() => handleItem(item.href)}
                    className="flex items-center"
                    style={{ gap: 10, minHeight: 44 }}
                    aria-label={item.label}
                  >
                    {/* Glass label pill */}
                    <span
                      className="text-[11.5px] font-semibold select-none"
                      style={{
                        padding: '6px 14px',
                        borderRadius: 9999,
                        background: 'rgba(7,5,15,0.88)',
                        border: '1px solid rgba(255,255,255,0.10)',
                        backdropFilter: 'blur(18px)',
                        WebkitBackdropFilter: 'blur(18px)',
                        boxShadow: '0 4px 18px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.06)',
                        color: 'rgba(255,255,255,0.88)',
                        letterSpacing: '0.01em',
                      }}
                    >
                      {item.label}
                    </span>

                    {/* Gradient icon circle */}
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                      style={{
                        background: item.gradient,
                        boxShadow: `0 4px 20px ${item.glow}, 0 1px 6px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.22)`,
                      }}
                    >
                      <Icon size={18} className="text-white" strokeWidth={2} aria-hidden="true" />
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
          bottom: bottomBase,
          right: 20,
          background: open
            ? 'rgba(7,5,15,0.90)'
            : 'linear-gradient(135deg, #FF9E00 0%, #F57C00 55%, #E65100 100%)',
          border: open ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',
          boxShadow: open
            ? '0 4px 28px rgba(0,0,0,0.52), inset 0 1px 0 rgba(255,255,255,0.08)'
            : '0 6px 28px rgba(255,140,0,0.52), 0 2px 8px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.28)',
          backdropFilter: open ? 'blur(18px)' : 'none',
          WebkitBackdropFilter: open ? 'blur(18px)' : 'none',
          transition: `bottom ${dur}s cubic-bezier(0.22,1,0.36,1), background 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease`,
        }}
        onClick={() => setOpen(s => !s)}
        whileTap={reducedMotion ? {} : { scale: 0.88 }}
        transition={{ type: 'spring', stiffness: 700, damping: 22 }}
        aria-label={open ? 'Close quick actions' : 'Quick actions'}
        aria-expanded={open}
      >
        <m.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 580, damping: 28 }}
        >
          {open
            ? <X size={22} style={{ color: 'rgba(255,255,255,0.78)' }} />
            : <Plus size={24} className="text-white" strokeWidth={2.5} />
          }
        </m.div>
      </m.button>
    </>
  );
}
