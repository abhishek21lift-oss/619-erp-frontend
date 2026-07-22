'use client';

// src/components/OrgSwitcher.tsx
//
// Platform org-switcher — rendered in the top bar for super_admins only.
// Lets a platform operator pin the whole app to one tenant organization (the
// http client then sends `x-org-id`, and every scoped endpoint returns just
// that org's data) or return to platform-wide "All organizations" mode.
// Non-super_admins never see this control, and the header is ignored for them
// server-side, so it is purely an operator convenience.

import { useEffect, useRef, useState } from 'react';
import { Building2, Check, ChevronDown, Globe } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api, type Organization } from '@/lib/api';
import { getActiveOrg, setActiveOrg } from '@/lib/active-org';
import { cn } from '@/components/ui/cn';

export default function OrgSwitcher() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const [open, setOpen] = useState(false);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Hydrate the active selection on mount (localStorage is client-only).
  useEffect(() => {
    setActiveId(getActiveOrg()?.id ?? null);
  }, []);

  // Load the org list the first time the menu opens.
  useEffect(() => {
    if (!open || !isSuperAdmin || orgs.length) return;
    let cancelled = false;
    setLoading(true);
    api.superAdmin
      .listOrgs()
      .then((res) => { if (!cancelled) setOrgs(res.data ?? []); })
      .catch(() => { if (!cancelled) setOrgs([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, isSuperAdmin, orgs.length]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!isSuperAdmin) return null;

  const activeOrg = orgs.find((o) => o.id === activeId) ?? null;
  const label = activeId ? activeOrg?.name ?? 'Organization' : 'All organizations';

  function choose(org: Organization | null) {
    setActiveOrg(org ? { id: org.id, name: org.name } : null);
    setOpen(false);
    // A full reload is the simplest guaranteed way to re-scope every already
    // mounted view + drop the in-memory GET cache under the new org context.
    window.location.reload();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-label="Switch organization"
        title="Platform: switch organization"
        className={cn(
          'flex h-8 max-w-[180px] shrink-0 items-center gap-1.5 rounded-xl border px-2.5 text-[12px] font-medium transition-all duration-200',
          'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
        )}
        style={activeId ? { borderColor: '#D4AF37', color: '#D4AF37' } : undefined}
      >
        {activeId ? <Building2 size={13} strokeWidth={1.5} /> : <Globe size={13} strokeWidth={1.5} />}
        <span className="truncate">{label}</span>
        <ChevronDown size={12} strokeWidth={2} className="shrink-0 opacity-60" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[0_16px_48px_rgba(0,0,0,0.18)] z-50">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-disabled)]">
            Platform · view as
          </div>
          <div className="max-h-[320px] overflow-y-auto pb-1.5">
            {/* Platform-wide */}
            <button
              type="button"
              onClick={() => choose(null)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] font-medium text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
            >
              <Globe size={14} strokeWidth={1.5} />
              <span className="flex-1">All organizations</span>
              {!activeId && <Check size={14} strokeWidth={2} style={{ color: '#D4AF37' }} />}
            </button>

            <div className="my-1 border-t border-[var(--border)]" />

            {loading && (
              <div className="px-3 py-3 text-[12px] text-[var(--text-disabled)]">Loading organizations…</div>
            )}
            {!loading && !orgs.length && (
              <div className="px-3 py-3 text-[12px] text-[var(--text-disabled)]">No organizations found.</div>
            )}
            {orgs.map((org) => (
              <button
                key={org.id}
                type="button"
                onClick={() => choose(org)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] font-medium text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
              >
                <Building2 size={14} strokeWidth={1.5} />
                <span className="flex-1 truncate">
                  {org.name}
                  {org.status === 'suspended' && (
                    <span className="ml-1.5 text-[10px] text-rose-400">(suspended)</span>
                  )}
                </span>
                {activeId === org.id && <Check size={14} strokeWidth={2} style={{ color: '#D4AF37' }} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
