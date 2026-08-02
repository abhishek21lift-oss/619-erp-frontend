'use client';

// Platform Super Admin command centre (multi-tenant SaaS). Hidden, role='super_admin'
// only — tenant admins cannot reach it (enforced server-side by requireSuperAdmin +
// requireSuperAdminMfa, and client-side by Guard role="super_admin"). Three tabs:
//   Overview — cross-studio KPIs (revenue, clients, sessions, last activity)
//   Studios  — manage tenants and their login accounts (edit / add / remove / reset /
//              suspend / impersonate)
//   Activity — platform-wide audit feed
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Building2, Loader2, ShieldAlert, LayoutDashboard, Activity, CreditCard, Search, TrendingUp,
  ScrollText, HeartPulse, ToggleRight, Megaphone, Bot, LifeBuoy, HardDrive, Mail,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { AmbientField, ConsoleHeader, SegmentedTabs, Reveal } from '@/components/platform/console';
import { getImpersonation } from '@/lib/http';
import { CommandBar } from './_shared/CommandBar';
import {
  AiControlCentre, AnalyticsPanel, AuditCentre, FeatureManager, InvitationsPanel,
  NotificationCentre, SecurityCentre, StorageCentre, SupportCentre, SystemHealthPanel,
} from './_shared/panels';
import { FINANCE_DEEP_LINKS, normalizeTab } from './_shared/types';
import type { FinanceSubTab, NavOpts, Tab } from './_shared/types';
import { ActivityTab } from './_tabs/ActivityTab';
import { FinanceTab } from './_tabs/FinanceTab';
import { OverviewTab } from './_tabs/OverviewTab';
import { StudiosTab } from './_tabs/StudiosTab';

export default function PlatformAdminPage() {
  return (
    <Guard role="super_admin">
      <AppShell>
        <Suspense fallback={<div className="flex justify-center py-24"><Loader2 size={26} className="animate-spin" style={{ color: '#0067e0' }} /></div>}>
          <PlatformContent />
        </Suspense>
      </AppShell>
    </Guard>
  );
}

function PlatformContent() {
  const sp = useSearchParams();
  const paramTab = sp.get('tab');

  // The command centre is a super-admin surface. While impersonating a studio,
  // the operator IS that studio's admin (the backend rejects super-admin calls),
  // so bounce to the studio view — exit impersonation to return here.
  useEffect(() => {
    if (getImpersonation()) window.location.replace('/');
  }, []);
  const [tab, setTab] = useState<Tab>(() => normalizeTab(paramTab));
  const [financeSubTab, setFinanceSubTab] = useState<FinanceSubTab>(
    () => (paramTab && FINANCE_DEEP_LINKS[paramTab]) || 'dashboard',
  );
  const [commandOpen, setCommandOpen] = useState(false);

  // Keep the active tab in sync with the ?tab= query so the sidebar / bottom-nav
  // deep-links land on the right section.
  useEffect(() => {
    if (paramTab) {
      setTab(normalizeTab(paramTab));
      const sub = FINANCE_DEEP_LINKS[paramTab];
      if (sub) setFinanceSubTab(sub);
    }
  }, [paramTab]);

  // Cmd+K / Ctrl+K opens the global command bar from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((s) => !s);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={15} /> },
    { id: 'studios', label: 'Studios', icon: <Building2 size={15} /> },
    { id: 'invitations', label: 'Invitations', icon: <Mail size={15} /> },
    { id: 'support', label: 'Support', icon: <LifeBuoy size={15} /> },
    { id: 'analytics', label: 'Analytics', icon: <TrendingUp size={15} /> },
    { id: 'finance', label: 'Finance', icon: <CreditCard size={15} /> },
    { id: 'ai', label: 'AI', icon: <Bot size={15} /> },
    { id: 'features', label: 'Features', icon: <ToggleRight size={15} /> },
    { id: 'announcements', label: 'Announcements', icon: <Megaphone size={15} /> },
    { id: 'activity', label: 'Activity', icon: <Activity size={15} /> },
    { id: 'audit', label: 'Audit', icon: <ScrollText size={15} /> },
    { id: 'security', label: 'Security', icon: <ShieldAlert size={15} /> },
    { id: 'storage', label: 'Storage', icon: <HardDrive size={15} /> },
    { id: 'health', label: 'Health', icon: <HeartPulse size={15} /> },
  ];

  const onNavigate = (t: Tab, opts?: NavOpts) => {
    if (opts?.financeSubTab) setFinanceSubTab(opts.financeSubTab);
    setTab(t);
    setCommandOpen(false);
  };

  return (
    <>
      <AmbientField />
      {/* zIndex keeps content above the ambient field without creating a
          stacking context that would trap the app's dropdowns. */}
      {/* Bottom padding clears the fixed MobileBottomNav (h-16) plus the home
          indicator — without it the last row of every tab sat underneath the
          nav bar and could not be reached. Matches the dashboard's pattern. */}
      <div
        className="relative mx-auto w-full max-w-5xl pt-6 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:pt-8 lg:pb-10"
        style={{ zIndex: 1 }}
      >
        <ConsoleHeader
          icon={<Building2 size={20} />}
          title="Control Centre"
          subtitle="Manage every studio, subscription, and account across the platform"
          actions={
            <button
              onClick={() => setCommandOpen(true)}
              className="flex items-center gap-2 rounded-[11px] px-3 py-2 text-[12px] font-[650] transition-colors"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              <Search size={13} />
              <span className="hidden sm:inline">Search studios, coupons…</span>
              <kbd className="rounded-[5px] px-1.5 py-0.5 text-[10px] font-[700]" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>⌘K</kbd>
            </button>
          }
        />

        <Reveal delay={0.06}>
          <div className="mb-6">
            <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} />
          </div>
        </Reveal>

        {/* Keyed so switching tabs replays the stagger — it reads as the panel
            being assembled rather than content silently swapping underneath. */}
        <div key={tab}>
          {tab === 'overview' && <OverviewTab onNavigate={onNavigate} />}
          {tab === 'studios' && <StudiosTab />}
          {tab === 'analytics' && <AnalyticsPanel />}
          {tab === 'finance' && <FinanceTab subTab={financeSubTab} onSubTabChange={setFinanceSubTab} />}
          {tab === 'support' && <SupportCentre />}
          {tab === 'invitations' && <InvitationsPanel />}
          {tab === 'ai' && <AiControlCentre />}
          {tab === 'features' && <FeatureManager />}
          {tab === 'announcements' && <NotificationCentre />}
          {tab === 'security' && <SecurityCentre />}
          {tab === 'activity' && <ActivityTab />}
          {tab === 'audit' && <AuditCentre />}
          {tab === 'storage' && <StorageCentre />}
          {tab === 'health' && <SystemHealthPanel />}
        </div>
      </div>

      <CommandBar open={commandOpen} onClose={() => setCommandOpen(false)} onNavigate={onNavigate} />
    </>
  );
}

// ── Global command bar (Cmd+K) ──────────────────────────────────────────────
// Scope is deliberately real: jump to any section, or search the two entity
// lists this backend can actually answer for (studios, coupons) with a single
// call each. There is no unified cross-entity search endpoint (users/
// payments/logs each need their own query with their own filters), so those
// stay in their own tabs rather than pretending to be searchable from here.
