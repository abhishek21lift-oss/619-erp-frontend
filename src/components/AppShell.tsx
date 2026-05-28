'use client';

import { LazyMotion, domAnimation } from 'framer-motion';
import PremiumHeader from './PremiumHeader';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
}

export default function AppShell({ children, title }: AppShellProps) {
  return (
    <LazyMotion features={domAnimation} strict>
      <div className="flex min-h-screen flex-col overflow-x-hidden bg-[#F5F5F7]">
        <PremiumHeader />
        <main
          id="main-content"
          className="mx-auto w-full max-w-[1800px] flex-1 px-4 pb-8 pt-[88px] sm:px-6 lg:px-8"
        >
          {title && (
            <h1 className="mb-6 text-[22px] font-bold tracking-[-0.02em] text-[#1d1d1f]">{title}</h1>
          )}
          {children}
        </main>
      </div>
    </LazyMotion>
  );
}
