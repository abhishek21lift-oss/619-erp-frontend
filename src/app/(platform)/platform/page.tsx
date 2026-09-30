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
import { Building2, UserPlus, Loader2, ShieldAlert, LayoutDashboard, Activity, CreditCard, TrendingUp, ScrollText, HeartPulse, ToggleRight, Megaphone, Bot, LifeBuoy, HardDrive, Mail, Users2, Fingerprint } from 'lucide-react';
import { getImpersonation } from '@/lib/http';
import { CommandBar, OPEN_COMMAND_BAR } from './_shared/CommandBar';
import { AiControlCentre, AnalyticsPanel, AuditCentre, FeatureManager, InvitationsPanel, NotificationCentre, SecurityCentre, StorageCentre, SupportCentre, CommandCenterPanel, TenancyCentre } from './_shared/panels';
import { FINANCE_DEEP_LINKS, MODULES, TAB_LABELS, moduleForTab, normalizeTab } from './_shared/types';
import type { FinanceSubTab, ModuleId, NavOpts, Tab } from './_shared/types';
import { ActivityTab } from './_tabs/ActivityTab';
import { FinanceTab } from './_tabs/FinanceTab';
import CommandCenterOverview from '@/components/platform/CommandCenterOverview';
import { StudiosTab } from './_tabs/StudiosTab';
import { UsersTab } from './_tabs/UsersTab';
import RegistrationsTab from './_tabs/RegistrationsTab';
import { CcHero } from '@/components/platform/cc-viz';
import { ccModuleTone } from '@/components/platform/ccTheme';
import type { CcToneName } from '@/components/platform/ccTheme';

const TAB_ICON: Record<Tab, React.ReactNode> = {
  overview: <LayoutDashboard size={14} />, studios: <Building2 size={14} />, registrations: <UserPlus size={14} />, invitations: <Mail size={14} />,
  users: <Users2 size={14} />, finance: <CreditCard size={14} />, analytics: <TrendingUp size={14} />, ai: <Bot size={14} />,
  health: <HeartPulse size={14} />, storage: <HardDrive size={14} />, support: <LifeBuoy size={14} />, security: <ShieldAlert size={14} />,
  tenancy: <Fingerprint size={14} />, audit: <ScrollText size={14} />, activity: <Activity size={14} />, features: <ToggleRight size={14} />,
  announcements: <Megaphone size={14} />,
};

const MODULE_ICON: Record<ModuleId, React.ReactNode> = {
  overview: <LayoutDashboard size={22} />, studios: <Building2 size={22} />, users: <Users2 size={22} />, revenue: <CreditCard size={22} />,
  ai: <Bot size={22} />, operations: <HeartPulse size={22} />, security: <ShieldAlert size={22} />, control: <ToggleRight size={22} />,
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
  health: 'Live collector readings, alerts, the Guardian and the recovery ladder.',
  storage: 'Bytes stored per studio, from the upload ledger.',
  support: 'Tickets from studios, worst first.',
  security: 'Sign-in attempts, operator MFA and live sessions.',
  tenancy: 'Whether one studio’s data is still walled off from every other.',
  audit: 'Every operator action, filterable and exportable.',
  activity: 'What happened across the platform, most recent first.',
  features: 'Platform-wide switches for every feature.',
  announcements: 'Messages to studios — in-app, email and WhatsApp.',
};

export default function PlatformAdminPage() {
  return <Suspense fallback={<div className="flex justify-center py-24"><Loader2 size={26} className="animate-spin" style={{ color: 'var(--brand)' }} /></div>}><PlatformContent /></Suspense>;
}

function PlatformContent() {
  const sp = useSearchParams(); const paramTab = sp.get('tab');
  useEffect(() => { if (getImpersonation()) window.location.replace('/'); }, []);
  const router = useRouter(); const tab = normalizeTab(paramTab);
  const [financeSubTab, setFinanceSubTab] = useState<FinanceSubTab>(() => (paramTab && FINANCE_DEEP_LINKS[paramTab]) || 'billing');
  const setTab = (t: Tab) => { router.push(t === 'overview' ? '/platform' : `/platform?tab=${t}`, { scroll: false }); };
  const [commandOpen, setCommandOpen] = useState(false);
  useEffect(() => { const sub = paramTab ? FINANCE_DEEP_LINKS[paramTab] : undefined; if (sub) setFinanceSubTab(sub); }, [paramTab]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCommandOpen((s) => !s); } };
    const onOpen = () => setCommandOpen(true);
    window.addEventListener('keydown', onKey); window.addEventListener(OPEN_COMMAND_BAR, onOpen);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener(OPEN_COMMAND_BAR, onOpen); };
  }, []);
  const activeModule = moduleForTab(tab);
  const mod = MODULES.find((m) => m.id === activeModule);
  const moduleTabs = mod?.tabs ?? [];
  const tone = (ccModuleTone[activeModule] ?? 'blue') as CcToneName;
  const onNavigate = (t: Tab, opts?: NavOpts) => { if (opts?.financeSubTab) setFinanceSubTab(opts.financeSubTab); setTab(t); setCommandOpen(false); };

  return (
    <>
      {tab !== 'overview' && (
        <CcHero tone={tone} eyebrow={mod?.label ?? 'Command Center'} title={TAB_LABELS[tab]} subtitle={TAB_BLURB[tab]} icon={MODULE_ICON[activeModule]}>
          {moduleTabs.length > 1 && (
            <nav aria-label={`${mod?.label} sections`} className="col-span-2 -mb-1 flex gap-1.5 overflow-x-auto pb-1 sm:col-span-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {moduleTabs.map((t) => {
                const on = t === tab;
                return (
                  <button key={t} type="button" onClick={() => setTab(t)} aria-current={on ? 'page' : undefined}
                    className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-[750] transition-colors"
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
      <div key={tab}>
        {tab === 'overview' && <CommandCenterOverview />}
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
        {tab === 'tenancy' && <TenancyCentre />}
        {tab === 'activity' && <ActivityTab />}
        {tab === 'audit' && <AuditCentre />}
        {tab === 'storage' && <StorageCentre />}
        {tab === 'health' && <CommandCenterPanel />}
      </div>
      <CommandBar open={commandOpen} onClose={() => setCommandOpen(false)} onNavigate={onNavigate} />
    </>
  );
}
