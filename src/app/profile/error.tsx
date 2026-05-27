'use client';
import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ProfileError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error('[Profile Error]', error); }, [error]);
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
        <AlertTriangle size={24} className="text-red-400" />
      </div>
      <h2 className="text-[16px] font-semibold text-white">Something went wrong</h2>
      <p className="text-[13px] text-white/45 max-w-xs">{error.message || 'Failed to load profile. Please try again.'}</p>
      <button
        onClick={reset}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/10 text-[13px] text-white/70 transition-all"
      >
        <RefreshCw size={13} /> Try again
      </button>
    </div>
  );
}
