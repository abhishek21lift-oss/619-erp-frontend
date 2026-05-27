'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { http } from '@/lib/http';
import {
  LogIn, LogOut, Key, Settings, Shield, Bell,
  CreditCard, User, Search, Filter
} from 'lucide-react';

interface ActivityEvent {
  id: string;
  type: string;
  description: string;
  ip: string;
  location: string;
  createdAt: string;
  category: 'auth' | 'profile' | 'security' | 'billing' | 'system';
}

const CATEGORY_ICONS: Record<string, any> = {
  auth: LogIn, profile: User, security: Shield, billing: CreditCard, system: Settings
};

const CATEGORY_COLORS: Record<string, string> = {
  auth: 'text-blue-400 bg-blue-400/10',
  profile: 'text-purple-400 bg-purple-400/10',
  security: 'text-red-400 bg-red-400/10',
  billing: 'text-green-400 bg-green-400/10',
  system: 'text-white/40 bg-white/[0.06]',
};

const CATEGORIES = ['all', 'auth', 'profile', 'security', 'billing', 'system'] as const;

export default function ActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchEvents = useCallback(async (pg: number, cat: string, reset = false) => {
    if (pg === 1) setLoading(true); else setLoadingMore(true);
    try {
      const params = new URLSearchParams({ page: String(pg), limit: '20' });
      if (cat !== 'all') params.set('category', cat);
      // http() is a plain async function — no .get() method
      const res = await http<{ events: ActivityEvent[]; hasMore: boolean }>(
        `/api/profile/activity?${params}`
      );
      setEvents(prev => reset ? res.events : [...prev, ...res.events]);
      setHasMore(res.hasMore);
    } catch {} finally {
      setLoading(false); setLoadingMore(false);
    }
  }, []);

  useEffect(() => { setPage(1); fetchEvents(1, category, true); }, [category, fetchEvents]);

  useEffect(() => {
    if (!bottomRef.current || !hasMore || loadingMore) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        const next = page + 1;
        setPage(next);
        fetchEvents(next, category);
      }
    }, { threshold: 0.5 });
    obs.observe(bottomRef.current);
    return () => obs.disconnect();
  }, [bottomRef, hasMore, loadingMore, page, category, fetchEvents]);

  const filtered = search
    ? events.filter(e =>
        e.description.toLowerCase().includes(search.toLowerCase()) ||
        e.type.toLowerCase().includes(search.toLowerCase())
      )
    : events;

  return (
    <div className="space-y-4 pb-10">
      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search activity…"
            className="w-full pl-9 pr-4 py-2.5 bg-[#141414] border border-white/[0.07] rounded-xl text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-[#FF2E63]/50 transition-all"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
        {CATEGORIES.map(c => (
          <button
            key={c} onClick={() => setCategory(c)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium capitalize transition-all ${
              category === c ? 'bg-[#FF2E63] text-white' : 'bg-white/[0.05] text-white/40 hover:bg-white/10 hover:text-white/70'
            }`}
          >{c}</button>
        ))}
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        {loading && [1,2,3,4,5].map(i => (
          <div key={i} className="bg-[#141414] border border-white/[0.07] rounded-2xl p-4 flex gap-3 animate-pulse">
            <div className="w-9 h-9 rounded-xl bg-white/[0.06]" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 w-48 bg-white/[0.06] rounded" />
              <div className="h-2.5 w-32 bg-white/[0.04] rounded" />
            </div>
          </div>
        ))}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-3 text-center">
            <ActivityIcon size={32} className="text-white/15" />
            <p className="text-[14px] text-white/40">No activity found</p>
          </div>
        )}

        {!loading && filtered.map(ev => {
          const Icon = CATEGORY_ICONS[ev.category] ?? Settings;
          const colorClass = CATEGORY_COLORS[ev.category] ?? CATEGORY_COLORS.system;
          return (
            <div key={ev.id} className="bg-[#141414] border border-white/[0.07] rounded-2xl p-4 flex gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                <Icon size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-white/80 font-medium">{ev.description}</p>
                <p className="text-[12px] text-white/30 mt-0.5">{ev.ip} · {ev.location}</p>
              </div>
              <p className="text-[11px] text-white/25 flex-shrink-0 pt-0.5">{ev.createdAt}</p>
            </div>
          );
        })}

        {loadingMore && (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-[#FF2E63] animate-spin" />
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function ActivityIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
