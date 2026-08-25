'use client';

// Lazily-loaded panels for the platform console.
import dynamic from 'next/dynamic';
import { PanelSkeleton } from './ui';

export const AuditCentre = dynamic(() => import('@/components/platform/audit-centre'), {
  loading: () => <PanelSkeleton label="Loading audit trail…" />,
});
export const CommandCenterPanel = dynamic(() => import('@/components/platform/command-center'), {
  loading: () => <PanelSkeleton label="Collecting system state…" />,
});
export const PlatformRiskCentre = dynamic(() => import('@/components/platform/platform-risk'), {
  loading: () => <PanelSkeleton label="Calculating platform risk…" />,
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
});
