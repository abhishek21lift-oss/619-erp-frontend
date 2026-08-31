'use client';

// The Command Center — the platform control plane.
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, UserPlus, Loader2, ShieldAlert, LayoutDashboard, Activity, CreditCard, Search, TrendingUp, ScrollText, HeartPulse, ToggleRight, Megaphone, Bot, LifeBuoy, HardDrive, Mail, Users2 } from 'lucide-react';
import { AmbientField, ConsoleHeader, SegmentedTabs, Reveal } from '@/components/platform/console';
import { getImpersonation } from '@/lib/http';
import { CommandBar } from './_shared/CommandBar';
import { AiControlCentre, AnalyticsPanel, AuditCentre, FeatureManager, InvitationsPanel, NotificationCentre, SecurityCentre, StorageCentre, SupportCentre, CommandCenterPanel } from './_shared/panels';
import { FINANCE_DEEP_LINKS, MODULES, TAB_LABELS, moduleForTab, normalizeTab } from './_shared/types';
import type { FinanceSubTab, NavOpts, Tab } from './_shared/types';
import { ActivityTab } from './_tabs/ActivityTab';
import { FinanceTab } from './_tabs/FinanceTab';
import Phase2CommandCenterOverview from '@/components/platform/Phase2CommandCenterOverview';
import { StudiosTab } from './_tabs/StudiosTab';
import { UsersTab } from './_tabs/UsersTab';
import RegistrationsTab from './_tabs/RegistrationsTab';

export default function PlatformAdminPage() {
  return <Suspense fallback={<div className="flex justify-center py-24"><Loader2 size={26} className="animate-spin" style={{ color: '#0067e0' }} /></div>}><PlatformContent /></Suspense>;
}

function PlatformContent() {
  const sp = useSearchParams(); const paramTab = sp.get('tab');
  useEffect(() => { if (getImpersonation()) window.location.replace('/'); }, []);
  const router = useRouter(); const tab = normalizeTab(paramTab);
  const [financeSubTab, setFinanceSubTab] = useState<FinanceSubTab>(() => (paramTab && FINANCE_DEEP_LINKS[paramTab]) || 'billing');
  const setTab = (t: Tab) => { router.push(t === 'overview' ? '/platform' : `/platform?tab=${t}`, { scroll: false }); };
  const [commandOpen, setCommandOpen] = useState(false);
  useEffect(() => { const sub = paramTab ? FINANCE_DEEP_LINKS[paramTab] : undefined; if (sub) setFinanceSubTab(sub); }, [paramTab]);
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCommandOpen((s) => !s); } }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, []);
  const TAB_ICON: Record<Tab, React.ReactNode> = { overview: <LayoutDashboard size={15} />, studios: <Building2 size={15} />, registrations: <UserPlus size={15} />, invitations: <Mail size={15} />, users: <Users2 size={15} />, finance: <CreditCard size={15} />, analytics: <TrendingUp size={15} />, ai: <Bot size={15} />, health: <HeartPulse size={15} />, storage: <HardDrive size={15} />, support: <LifeBuoy size={15} />, security: <ShieldAlert size={15} />, audit: <ScrollText size={15} />, activity: <Activity size={15} />, features: <ToggleRight size={15} />, announcements: <Megaphone size={15} /> };
  const activeModule = moduleForTab(tab); const moduleTabs = MODULES.find((m) => m.id === activeModule)?.tabs ?? []; const SUB_ITEMS = moduleTabs.map((t) => ({ id: t, label: TAB_LABELS[t], icon: TAB_ICON[t] }));
  const onNavigate = (t: Tab, opts?: NavOpts) => { if (opts?.financeSubTab) setFinanceSubTab(opts.financeSubTab); setTab(t); setCommandOpen(false); };
  return <><AmbientField /><div className="relative" style={{ zIndex: 1 }}><ConsoleHeader icon={<Building2 size={20} />} title="Control Centre" subtitle="Manage every studio, subscription, and account across the platform" actions={<button onClick={() => setCommandOpen(true)} className="flex items-center gap-2 rounded-[11px] px-3 py-2 text-[12px] font-[650] transition-colors" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}><Search size={13} /><span className="hidden sm:inline">Search studios, coupons…</span><kbd className="rounded-[5px] px-1.5 py-0.5 text-[10px] font-[700]" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>⌘K</kbd></button>} />{SUB_ITEMS.length > 1 && <Reveal delay={0.06}><div className="mb-6"><SegmentedTabs tabs={SUB_ITEMS} value={tab} onChange={setTab} /></div></Reveal>}<div key={tab}>{tab === 'overview' && <Phase2CommandCenterOverview />}{tab === 'registrations' && <RegistrationsTab />}{tab === 'studios' && <StudiosTab />}{tab === 'users' && <UsersTab />}{tab === 'analytics' && <AnalyticsPanel />}{tab === 'finance' && <FinanceTab subTab={financeSubTab} onSubTabChange={setFinanceSubTab} />}{tab === 'support' && <SupportCentre />}{tab === 'invitations' && <InvitationsPanel />}{tab === 'ai' && <AiControlCentre />}{tab === 'features' && <FeatureManager />}{tab === 'announcements' && <NotificationCentre />}{tab === 'security' && <SecurityCentre />}{tab === 'activity' && <ActivityTab />}{tab === 'audit' && <AuditCentre />}{tab === 'storage' && <StorageCentre />}{tab === 'health' && <CommandCenterPanel />}</div></div><CommandBar open={commandOpen} onClose={() => setCommandOpen(false)} onNavigate={onNavigate} /></>;
}
