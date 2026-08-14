'use client';

// The Command Center — the platform control plane.
//
// Its own portal, not a page of the studio app: served on its own host, signed
// in at its own door (/platform-login), wrapped in its own shell
// ((platform)/layout.tsx, which carries the role gate), and talking to
// /api/platform — which the backend gates on an explicit platform_owners grant
// and a platform session audience, not merely on role='super_admin'.
//
// Tabs:
//   Overview — cross-studio KPIs (revenue, clients, sessions, last activity)
//   Studios  — manage tenants and their login accounts (edit / add / remove / reset /
//              suspend / impersonate)
//   Activity — platform-wide audit feed
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Building2, UserPlus, Loader2, ShieldAlert, LayoutDashboard, Activity, CreditCard, Search, TrendingUp,
  ScrollText, HeartPulse, ToggleRight, Megaphone, Bot, LifeBuoy, HardDrive, Mail, Users2,
} from 'lucide-react';
import { AmbientField, ConsoleHeader, SegmentedTabs, Reveal } from '@/components/platform/console';
import { getImpersonation } from '@/lib/http';
import { CommandBar } from './_shared/CommandBar';
import {
  AiControlCentre, AnalyticsPanel, AuditCentre, FeatureManager, InvitationsPanel,
  NotificationCentre, SecurityCentre, StorageCentre, SupportCentre, CommandCenterPanel,
} from './_shared/panels';
import { FINANCE_DEEP_LINKS, MODULES, TAB_LABELS, moduleForTab, normalizeTab } from './_shared/types';
import type { FinanceSubTab, ModuleId, NavOpts, Tab } from './_shared/types';
import { ActivityTab } from './_tabs/ActivityTab';
import { FinanceTab } from './_tabs/FinanceTab';
import { OverviewTab } from './_tabs/OverviewTab';
import { StudiosTab } from './_tabs/StudiosTab';
import { UsersTab } from './_tabs/UsersTab';
import RegistrationsTab from './_tabs/RegistrationsTab';

// The role gate moved up to (platform)/layout.tsx, which wraps this whole
// route group — the console is not one super-admin page inside the studio app
// any more, it is its own portal, and the gate belongs at its edge rather than
// repeated on each page added to it.
export default function PlatformAdminPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-24"><Loader2 size={26} className="animate-spin" style={{ color: '#0067e0' }} /></div>}>
      <PlatformContent />
    </Suspense>
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

  // Icons live here rather than in _shared/types.ts so that file stays free of
  // JSX and can be imported by tests without pulling React in.
  const TAB_ICON: Record<Tab, React.ReactNode> = {
    overview: <LayoutDashboard size={15} />,
    studios: <Building2 size={15} />,
    registrations: <UserPlus size={15} />,
    invitations: <Mail size={15} />,
    users: <Users2 size={15} />,
    finance: <CreditCard size={15} />,
    analytics: <TrendingUp size={15} />,
    ai: <Bot size={15} />,
    health: <HeartPulse size={15} />,
    storage: <HardDrive size={15} />,
    support: <LifeBuoy size={15} />,
    security: <ShieldAlert size={15} />,
    audit: <ScrollText size={15} />,
    activity: <Activity size={15} />,
    features: <ToggleRight size={15} />,
    announcements: <Megaphone size={15} />,
  };
  const MODULE_ICON: Record<ModuleId, React.ReactNode> = {
    overview: <LayoutDashboard size={15} />,
    studios: <Building2 size={15} />,
    users: <Users2 size={15} />,
    revenue: <CreditCard size={15} />,
    ai: <Bot size={15} />,
    operations: <HeartPulse size={15} />,
    security: <ShieldAlert size={15} />,
    control: <ToggleRight size={15} />,
  };

  // The active module is DERIVED from the active tab, never stored. That is
  // what keeps every existing ?tab= deep link working untouched: a link to
  // ?tab=audit still selects the Audit tab, and the Security module lights up
  // around it because it contains that tab. There is no second piece of state
  // for the two to disagree about.
  const activeModule = moduleForTab(tab);
  const moduleTabs = MODULES.find((m) => m.id === activeModule)?.tabs ?? [];

  const MODULE_ITEMS = MODULES.map((m) => ({
    id: m.id, label: m.label, icon: MODULE_ICON[m.id],
  }));
  const SUB_ITEMS = moduleTabs.map((t) => ({
    id: t, label: TAB_LABELS[t], icon: TAB_ICON[t],
  }));

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
          <div className="mb-4">
            <SegmentedTabs
              tabs={MODULE_ITEMS}
              value={activeModule}
              // Selecting a module lands on its FIRST tab. Modules are ordered
              // so that first tab is the one an operator opening the module
              // wants — All Studios, not Registrations.
              onChange={(id) => {
                const next = MODULES.find((m) => m.id === id)?.tabs[0];
                if (next) setTab(next);
              }}
            />
          </div>
        </Reveal>

        {/* The sub-row appears only where there is a choice to make. A single
            tab rendering a one-item row would be furniture that looks
            interactive and is not. */}
        {SUB_ITEMS.length > 1 && (
          <Reveal delay={0.09}>
            <div className="mb-6">
              <SegmentedTabs tabs={SUB_ITEMS} value={tab} onChange={setTab} />
            </div>
          </Reveal>
        )}

        {/* Keyed so switching tabs replays the stagger — it reads as the panel
            being assembled rather than content silently swapping underneath. */}
        <div key={tab}>
          {tab === 'overview' && <OverviewTab onNavigate={onNavigate} />}
          {tab === 'registrations' && <RegistrationsTab />}
          {tab === 'studios' && <StudiosTab />}
          {tab === 'users' && <UsersTab />}
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
          {tab === 'health' && <CommandCenterPanel />}
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
