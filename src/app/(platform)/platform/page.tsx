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
//   Overview — NewOverviewTab: KPIs from one payload, Tenancy Health card,
//              per-studio strip. Phase 8 removed the legacy chart-and-table
//              view; the home is the platform's "RIGHT NOW" answer.
//   Studios  — manage tenants and their login accounts (edit / add / remove / reset /
//              suspend / impersonate)
//   Activity — platform-wide audit feed
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import type { FinanceSubTab, NavOpts, Tab } from './_shared/types';
import { ActivityTab } from './_tabs/ActivityTab';
import { FinanceTab } from './_tabs/FinanceTab';
import { NewOverviewTab } from './_tabs/NewOverviewTab';
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
  // The query string IS the tab. It used to be useState synced FROM ?tab= but
  // never TO it, so clicking a tab changed the screen and not the address — no
  // console view was linkable and the back button did nothing. It also could
  // not be shared with the shell's sidebar, which lives in the layout and has
  // no access to this component's state.
  const router = useRouter();
  const tab = normalizeTab(paramTab);
  const [financeSubTab, setFinanceSubTab] = useState<FinanceSubTab>(
    // Phase 8: the dashboard subtab is gone (the new home is the
    // dashboard). Deep links to ?tab=billing/coupons/payments/invoices
    // still land on the matching sub-tab; opening Finance without a
    // deep link lands on Billing, the operator's most-common next step.
    () => (paramTab && FINANCE_DEEP_LINKS[paramTab]) || 'billing',
  );
  const setTab = (t: Tab) => {
    router.push(t === 'overview' ? '/platform' : `/platform?tab=${t}`, { scroll: false });
  };
  const [commandOpen, setCommandOpen] = useState(false);

  // Only the finance sub-tab needs syncing now — the tab itself is read from
  // the query on every render, so it cannot fall out of step.
  useEffect(() => {
    const sub = paramTab ? FINANCE_DEEP_LINKS[paramTab] : undefined;
    if (sub) setFinanceSubTab(sub);
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
  // The active module is DERIVED from the active tab, never stored. That is
  // what keeps every existing ?tab= deep link working untouched: a link to
  // ?tab=audit still selects the Audit tab, and the Security module lights up
  // around it because it contains that tab. There is no second piece of state
  // for the two to disagree about.
  const activeModule = moduleForTab(tab);
  const moduleTabs = MODULES.find((m) => m.id === activeModule)?.tabs ?? [];

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
      {/* No container here any more — no mx-auto, no max-w, no padding. The
          shell's <main> provides all three, so this page shares its gutters
          with the top bar and with every other console page. Adding them again
          would double the padding and make this page narrower than the rest. */}
      <div className="relative" style={{ zIndex: 1 }}>
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

        {/* The MODULE row is gone: the shell's sidebar (desktop) and bottom
            bar (mobile) own it now, so it is not rendered twice. What stays is
            the SUB-navigation, which is about this page's sections rather than
            the console's structure. */}
        {SUB_ITEMS.length > 1 && (
          <Reveal delay={0.06}>
            <div className="mb-6">
              <SegmentedTabs tabs={SUB_ITEMS} value={tab} onChange={setTab} />
            </div>
          </Reveal>
        )}

        {/* Keyed so switching tabs replays the stagger — it reads as the panel
            being assembled rather than content silently swapping underneath. */}
        <div key={tab}>
          {tab === 'overview' && <NewOverviewTab />}
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
