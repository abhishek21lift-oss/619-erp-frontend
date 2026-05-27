'use client';

import { LazyMotion, domAnimation } from 'framer-motion';
import PremiumHeader from './PremiumHeader';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <LazyMotion features={domAnimation} strict>
      <div className="flex min-h-screen flex-col overflow-x-hidden bg-[#F5F5F7]">
        <PremiumHeader />
        <main
          id="main-content"
          className="mx-auto w-full max-w-[1800px] flex-1 px-4 pb-8 pt-[88px] sm:px-6 lg:px-8"
        >
          {children}
        </main>
      </div>
    </LazyMotion>
  );
}
