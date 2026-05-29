'use client';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { RotateCcw, AlertTriangle } from 'lucide-react';

export default function RootError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <Guard>
      <AppShell>
        <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-[#FEF2F2] text-[#EF4444]">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-[#0B0B0F]">Something went wrong</h2>
          <p className="max-w-sm text-sm text-[#6B7280]">
            {error.message || 'An unexpected error occurred. Please try again.'}
          </p>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#DC2626] to-[#B91C1C] px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_16px_rgba(220,38,38,0.25)] transition-all duration-200 hover:shadow-[0_8px_24px_rgba(220,38,38,0.35)]"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={2} />
            Try again
          </button>
        </div>
      </AppShell>
    </Guard>
  );
}