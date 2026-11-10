'use client';

// The Command Center — the platform control plane.
//
// Every module opens on its own colour hero (Studios is sky, Revenue green,
// Security pink…) carrying the module's sub-navigation, so where you are is
// readable from across the room. Overview draws its own, richer hero.
//
// The old ConsoleHeader here carried the only on-screen ⌘K search button, and
// PlatformShell hid that header with a CSS rule — so on a phone, with no
// keyboard, the command bar could not be opened at all. Search now lives in
// the shell's top bar and reaches this page through a window event.
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, UserPlus, Loader2, ShieldAlert, LayoutDashboard, Activity, IndianRupee, TrendingUp, ScrollText, HeartPulse, ToggleRight, Megaphone, Bot, LifeBuoy, HardDrive, Mail, Users2, Fingerprint, Server, BookOpen } from 'lucide-react';
import { getImpersonation } from '@/lib/http';
import { CommandBar, OPEN_COMMAND_BAR } from './_shared/CommandBar';
import { AiControlCentre, AnalyticsPanel, AuditCentre, FeatureManager, HostingAssistant, HostingCentre, HostingVps, InvitationsPanel, MyMfaCard, NotificationCentre, SecurityCentre, StorageCentre, SupportCentre, CommandCenterPanel, TenancyCentre } from './_shared/panels';
import { MODULES, TAB_LABELS, moduleForTab, normalizeTab, resolveFinanceSubTab } from './_shared/types';
import type { FinanceSubTab, ModuleId, NavOpts, Tab } from './_shared/types';
import { RevenueNav } from './_shared/RevenueNav';
import type { RevenueView } from './_shared/RevenueNav';
import { ActivityTab } from './_tabs/ActivityTab';
import { FinanceTab } from './_tabs/FinanceTab';
import CommandCenterOverview from '@/components/platform/CommandCenterOverview';
import { StudiosTab } from './_tabs/StudiosTab';
import { UsersTab } from './_tabs/UsersTab';
import RegistrationsTab from './_tabs/RegistrationsTab';
import KnowledgeTab from './_tabs/KnowledgeTab';
import { CcHero } from '@/components/platform/cc-viz';
import { SegmentedTabs } from '@/components/platform/console';
import { ccModuleTone } from '@/components/platform/ccTheme';
import type { CcToneName } from '@/components/platform/ccTheme';

const TAB_ICON: Record<Tab, React.ReactNode> = {
  overview: <LayoutDashboard size={14} />, studios: <Building2 size={14} />, registrations: <UserPlus size={14} />, invitations: <Mail size={14} />,
  users: <Users2 size={14} />, finance: <IndianRupee size={14} />, analytics: <TrendingUp size={14} />, ai: <Bot size={14} />,
  knowledge: <BookOpen size={14} />,
  health: <HeartPulse size={14} />, storage: <HardDrive size={14} />, support: <LifeBuoy size={14} />, security: <ShieldAlert size={14} />,
  tenancy: <Fingerprint size={14} />, audit: <ScrollText size={14} />, activity: <Activity size={14} />, features: <ToggleRight size={14} />,
  announcements: <Megaphone size={14} />, hosting: <Server size={14} />,
};

const MODULE_ICON: Record<ModuleId, React.ReactNode> = {
  overview: <LayoutDashboard size={22} />, studios: <Building2 size={22} />, users: <Users2 size={22} />, revenue: <IndianRupee size={22} />,
  ai: <Bot size={22} />, operations: <HeartPulse size={22} />, security: <ShieldAlert size={22} />, control: <ToggleRight size={22} />,
};

/** The Revenue module's active screen name: Revenue > Billing, not Revenue > Finance > Billing. */
const REVENUE_SUB_LABEL: Record<FinanceSubTab, string> = {
  billing: 'Billing', payments: 'Payments', invoices: 'Invoices', coupons: 'Coupons',
};

/** One line per tab: what the screen answers. */
const TAB_BLURB: Record<Tab, string> = {
  overview: '',
  studios: 'Every studio on the platform — open one, view as its owner, suspend or restore it.',
  registrations: 'Studios that asked to join and are waiting for a decision.',
  invitations: 'Sign-up invitations sent to prospective studio owners.',
  users: 'Every account across every studio, with its sign-in and MFA state.',
  finance: 'Billing, payment verification, invoices and coupons.',
  analytics: 'What studios actually do with the product, month by month.',
  ai: 'AI Suite usage, cost, allowances and model routing.',
  knowledge: 'The approved methodology corpus every studio’s AI generation is grounded in.',
  health: 'Live collector readings, alerts, the Guardian and the recovery ladder.',
  storage: 'Bytes stored per studio, from the upload ledger.',
  support: 'Tickets from studios, worst first.',
  security: 'Sign-in attempts, operator MFA and live sessions.',
  tenancy: 'Whether one studio’s data is still walled off from every other.',
  audit: 'Every operator action, filterable and exportable.',
  activity: 'What happened across the platform, most recent first.',
  features: 'Platform-wide switches for every feature.',
  announcements: 'Messages to studios — in-app, email and WhatsApp.',
  hosting: 'The Hostinger estate — websites, domains, machines, backups and the credential behind them.',
};

export default function PlatformAdminPage() {
  return <Suspense fallback={<div className="flex justify-center py-24"><Loader2 size={26} className="animate-spin" style={{ color: 'var(--brand)' }} /></div>}><PlatformContent /></Suspense>;
}

function PlatformContent() {
  const sp = useSearchParams(); const paramTab = sp.get('tab');
  useEffect(() => { if (getImpersonation()) window.location.replace('/'); }, []);
  const router = useRouter(); const tab = normalizeTab(paramTab);
  // Both the tab and the Finance sub-tab live in the URL, so refresh, back and
  // a shared link agree with the screen. Legacy ?tab=billing|payments|… links
  // still resolve through FINANCE_DEEP_LINKS inside the resolver.
  const financeSubTab = resolveFinanceSubTab(paramTab, sp.get('sub'));
  const pushQuery = (q: URLSearchParams) => {
    const qs = q.toString();
    router.push(qs ? `/platform?${qs}` : '/platform', { scroll: false });
  };
  const setTab = (t: Tab, sub?: FinanceSubTab) => {
    const q = new URLSearchParams(sp.toString());
    q.delete('tab'); q.delete('sub');
    if (t !== 'overview') q.set('tab', t);
    if (t === 'finance') q.set('sub', sub ?? financeSubTab);
    pushQuery(q);
  };
  const setFinanceSubTab = (t: FinanceSubTab) => {
    if (t === financeSubTab) return;
    const q = new URLSearchParams(sp.toString());
    q.set('tab', 'finance'); q.set('sub', t);
    pushQuery(q);
  };
  const [commandOpen, setCommandOpen] = useState(false);
  // The Hosting tab is three screens — the estate, one machine, the assistant —
  // behind one deep link. The sub-screen is component state rather than a URL
  // parameter on purpose: nothing links to "machine 7" from outside this
  // console, and a second piece of navigation state is a second thing to keep
  // honest. Opening a machine from the estate card is the only way in.
  const [hostingScreen, setHostingScreen] = useState<'estate' | 'machine' | 'assistant'>('estate');
  const [hostingVpsId, setHostingVpsId] = useState<number | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCommandOpen((s) => !s); } };
    const onOpen = () => setCommandOpen(true);
    window.addEventListener('keydown', onKey); window.addEventListener(OPEN_COMMAND_BAR, onOpen);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener(OPEN_COMMAND_BAR, onOpen); };
  }, []);
  const activeModule = moduleForTab(tab);
  const mod = MODULES.find((m) => m.id === activeModule);
  const moduleTabs = mod?.tabs ?? [];
  // Revenue owns one five-item row (RevenueNav) across Finance and Analytics,
  // so its hero carries no pill row of its own.
  const heroTabs = activeModule === 'revenue' ? [] : moduleTabs;
  const tone = (ccModuleTone[activeModule] ?? 'blue') as CcToneName;
  const setRevenueView = (v: RevenueView) => {
    if (v === 'analytics') setTab('analytics');
    else setFinanceSubTab(v);
  };
  const heroTitle = activeModule === 'revenue'
    ? (tab === 'analytics' ? 'Analytics' : REVENUE_SUB_LABEL[financeSubTab])
    : TAB_LABELS[tab];
  const onNavigate = (t: Tab, opts?: NavOpts) => { setTab(t, opts?.financeSubTab); setCommandOpen(false); };

  return (
    <>
      {tab !== 'overview' && (
        <CcHero tone={tone} eyebrow={mod?.label ?? 'Command Center'} title={heroTitle} subtitle={TAB_BLURB[tab]} icon={MODULE_ICON[activeModule]} compactOnMobile={tab === 'finance'}>
          {/* Wraps rather than scrolls: the hidden-scroll row clipped the third
              pill mid-word on a phone and hid the last tabs of Operations and
              Security entirely. */}
          {moduleTabs.length > 1 && heroTabs.length > 0 && (
            <nav aria-label={`${mod?.label} sections`} className="col-span-2 -mb-1 flex flex-wrap gap-1.5 sm:col-span-4">
              {heroTabs.map((t) => {
                const on = t === tab;
                return (
                  <button key={t} type="button" onClick={() => setTab(t)} aria-current={on ? 'page' : undefined}
                    className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-[750] transition-colors"
                    style={on
                      ? { background: '#FFFFFF', color: '#0F172A', boxShadow: '0 6px 16px -6px rgba(0,0,0,0.35)' }
                      : { background: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.92)', border: '1px solid rgba(255,255,255,0.22)' }}>
                    {TAB_ICON[t]}{TAB_LABELS[t]}
                  </button>
                );
              })}
            </nav>
          )}
        </CcHero>
      )}
      {activeModule === 'revenue' && (
        <RevenueNav
          view={tab === 'analytics' ? 'analytics' : financeSubTab}
          onChange={setRevenueView}
        />
      )}
      <div key={tab}>
        {tab === 'overview' && <CommandCenterOverview />}
        {tab === 'registrations' && <RegistrationsTab />}
        {tab === 'studios' && <StudiosTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'analytics' && <AnalyticsPanel />}
        {tab === 'finance' && <FinanceTab subTab={financeSubTab} />}
        {tab === 'support' && <SupportCentre />}
        {tab === 'invitations' && <InvitationsPanel />}
        {tab === 'ai' && <AiControlCentre />}
        {tab === 'knowledge' && <KnowledgeTab />}
        {tab === 'features' && <FeatureManager />}
        {tab === 'announcements' && <NotificationCentre />}
        {tab === 'security' && (
          <div className="space-y-4">
            <MyMfaCard />
            <SecurityCentre />
          </div>
        )}
        {tab === 'tenancy' && <TenancyCentre />}
        {tab === 'activity' && <ActivityTab />}
        {tab === 'audit' && <AuditCentre />}
        {tab === 'storage' && <StorageCentre />}
        {tab === 'health' && <CommandCenterPanel />}
        {tab === 'hosting' && (
          <div className="flex flex-col gap-4">
            <SegmentedTabs
              tabs={[
                { id: 'estate', label: 'Estate' },
                { id: 'machine', label: 'Machine' },
                { id: 'assistant', label: 'Assistant' },
              ]}
              value={hostingScreen}
              onChange={setHostingScreen}
              label="Hosting screens"
            />
            {hostingScreen === 'machine' && hostingVpsId !== null ? (
              <HostingVps virtualMachineId={hostingVpsId} onBack={() => setHostingScreen('estate')} />
            ) : hostingScreen === 'assistant' ? (
              <HostingAssistant />
            ) : (
              <HostingCentre
                onOpenMachine={(id) => { setHostingVpsId(id); setHostingScreen('machine'); }}
              />
            )}
          </div>
        )}
      </div>
      <CommandBar open={commandOpen} onClose={() => setCommandOpen(false)} onNavigate={onNavigate} />
    </>
  );
}
