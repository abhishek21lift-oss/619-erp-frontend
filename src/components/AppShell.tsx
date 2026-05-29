'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { LazyMotion, domAnimation } from 'framer-motion';
import Sidebar from './sidebar/Sidebar';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
}

export default function AppShell({ children, title }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="flex min-h-screen bg-[#F5F5F7]">
        <Sidebar
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
        />

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="flex flex-1 flex-col lg:pl-64 xl:pl-72">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-[rgba(0,0,0,0.04)] bg-white/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <button
              type="button"
              aria-label="Open sidebar"
              onClick={() => setSidebarOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-[#86868b] transition-colors hover:bg-[rgba(0,0,0,0.04)] hover:text-[#1d1d1f] lg:hidden"
            >
              <Menu size={18} />
            </button>
            <div className="flex-1" />
          </header>

          <main
            id="main-content"
            className="mx-auto w-full max-w-[1800px] flex-1 px-4 pb-8 pt-6 sm:px-6 lg:px-8"
          >
            {title && (
              <h1 className="mb-6 text-[22px] font-bold tracking-[-0.02em] text-[#1d1d1f]">
                {title}
              </h1>
            )}
            {children}
          </main>
        </div>
      </div>
    </LazyMotion>
  );
}
