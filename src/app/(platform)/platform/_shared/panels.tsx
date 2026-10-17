'use client';

import dynamic from 'next/dynamic';
import { PanelSkeleton } from './ui';

// Code-split: neither panel is on the default tab, and Audit pulls a filter
// drawer + expandable rows that the Overview visitor should not pay for.
export const AuditCentre = dynamic(() => import('@/components/platform/audit-centre'), {
  loading: () => <PanelSkeleton label="Loading audit trail…" />,
});
// The Health tab now renders the Command Center: the same database/process/
// queue figures the old system-health panel showed, plus redis, http latency,
// ai, security posture and smtp, all from the collector snapshot. Two health
// screens reading two endpoints is exactly the drift the audit flagged, so the
// old panel was removed rather than kept alongside.
export const CommandCenterPanel = dynamic(() => import('@/components/platform/mission-control/MissionControl').then(mod => mod.MissionControl), {
  loading: () => <PanelSkeleton label="Collecting system state…" />,
});
export const InvoicesPanel = dynamic(() => import('@/components/platform/invoices'), {
  loading: () => <PanelSkeleton label="Loading invoices…" />,
});
export const FeatureManager = dynamic(() => import('@/components/platform/feature-manager'), {
  loading: () => <PanelSkeleton label="Loading features…" />,
});
export const NotificationCentre = dynamic(() => import('@/components/platform/notification-centre'), {
  loading: () => <PanelSkeleton label="Loading announcements…" />,
});
export const SecurityCentre = dynamic(() => import('@/components/platform/security-centre'), {
  loading: () => <PanelSkeleton label="Checking security posture…" />,
});
export const SupportCentre = dynamic(() => import('@/components/platform/support-centre'), {
  loading: () => <PanelSkeleton label="Loading tickets…" />,
});
export const InvitationsPanel = dynamic(() => import('@/components/platform/invitations'), {
  loading: () => <PanelSkeleton label="Loading invitations…" />,
});
export const AiControlCentre = dynamic(() => import('@/components/platform/ai-control'), {
  loading: () => <PanelSkeleton label="Reading AI usage…" />,
});
export const StorageCentre = dynamic(() => import('@/components/platform/storage-centre'), {
  loading: () => <PanelSkeleton label="Reading storage usage…" />,
});
export const AnalyticsPanel = dynamic(() => import('@/components/platform/analytics'), {
  loading: () => <PanelSkeleton label="Crunching platform usage…" />,
});export const TenancyCentre = dynamic(() => import('@/components/platform/tenancy-centre'), {
  loading: () => <PanelSkeleton label="Checking tenant isolation…" />,
});
// Hosting: the credential, the estate dashboard, the VPS deep view and the ops
// assistant are three screens behind one tab. Split like the rest — an operator
// who opened the console for a support ticket should not download the VPS
// console to read it.
export const HostingCentre = dynamic(() => import('@/components/platform/hosting-centre'), {
  loading: () => <PanelSkeleton label="Reading the hosting estate…" />,
});
export const HostingVps = dynamic(() => import('@/components/platform/hosting-vps'), {
  loading: () => <PanelSkeleton label="Loading the virtual machine…" />,
});
export const HostingAssistant = dynamic(() => import('@/components/platform/hosting-assistant'), {
  loading: () => <PanelSkeleton label="Opening the operations assistant…" />,
});
