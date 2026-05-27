'use client';

import { X } from 'lucide-react';
import { cn } from '@/components/ui/cn';

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  variant?: 'desktop' | 'mobile';
}

export default function Sidebar({
  mobileOpen = false,
  onMobileClose,
  variant = 'desktop',
}: SidebarProps) {
  const isMobile = variant === 'mobile';

  return (
    <aside
      data-sidebar={variant}
      className={cn(
        // ── Desktop: fixed left, always visible on lg+ ──
        !isMobile && [
          'fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r backdrop-blur-xl',
          'lg:flex xl:w-72',
          'bg-white/95 border-[rgba(0,0,0,0.04)]',
        ],
        // ── Mobile: portaled drawer with slide ──
        isMobile && [
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r shadow-2xl',
          'transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          'bg-white border-[rgba(0,0,0,0.04)]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ],
      )}
    >
      {/* ── Sidebar header ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-[rgba(0,0,0,0.04)] px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#1d1d1f] text-[11px] font-bold tracking-tight text-white shadow-sm">
            619
          </div>
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-[#1d1d1f]">619 Fitness</h2>
            <p className="text-[12px] text-[#86868b]">Studio Dashboard</p>
          </div>
        </div>
        {isMobile && (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={onMobileClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[#86868b] transition-colors hover:bg-[rgba(0,0,0,0.04)] hover:text-[#1d1d1f]"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* ── Sidebar body ── */}
      <div className="flex-1 overflow-y-auto px-3 py-5">
        <div className="space-y-1">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">
            Navigation
          </p>
          {/* nav items rendered here */}
        </div>
      </div>

      {/* ── Sidebar footer ── */}
      <div className="shrink-0 border-t border-[rgba(0,0,0,0.04)] px-5 py-4">
        <p className="text-[12px] text-[#86868b]">v3.0.1</p>
      </div>
    </aside>
  );
}
