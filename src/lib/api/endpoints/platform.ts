// API endpoints: admin, superAdmin, settings, features, invitations, integrations.
//
// Lifted verbatim from the single `api` object in the 4,185-line api.ts.
// Method names, URLs and request shapes are unchanged; index.ts composes these
// back into the same `api` object every consumer already imports.

import { http, apiBase } from '../../http';
import { qsOf } from '../qs';
import type {
  ActiveSession, ActivityEntry, AiModelRate, AiModelUsage, AiOverview, AiRouting,
  AiSettings, AiStudioUsage, AiTrendPoint, Announcement, AnnouncementInput,
  AnnouncementPreview, AuditEntry, AuditFilters, AuditQuery, Coupon, FeatureCatalogue,
  FeatureOverrideRow, ImpersonationSession, Invitation, InvitationDetail,
  InvitationPreview, InvoiceQuery, InvoiceTotals, LoginEvent, LoginEventQuery,
  OrgBillingProfile, OrgInternalNotes, OrgUser, Organization, OrganizationDetail,
  PlanChangeQuote, PlatformAnalytics, PlatformBillingSettings, PlatformFeature,
  PlatformOverview, PlatformPaymentSettings, PlatformPaymentSettingsInput, ResolvedFeature,
  SecurityOverview, SecurityThreats, StorageObject, StorageOverview, StorageStudio,
  StorageTrendPoint, SubCheckoutQueueRow, SubCheckoutStats, SubDetail, SubKpis, SubStudio,
  SubscriptionInvoice, SubscriptionMetrics, SupportOverview, SupportTicket, SystemHealth,
  TicketMessage, TicketPriority, TicketStatus, UpiRejectReason,
  CommandCenterSnapshot, CommandCenterCommand, CommandCenterRunResult, CommandCenterDryRun,
  SystemAlert, SystemAlertList, GuardianReport, GuardianNarration,
  LogTail, LogHistory,
} from '../types';

// The `admin` namespace held exportDatabase() and backupDatabase(). Both are
// gone: neither had a backend route — /api/admin serves only the four reset
// operations — and nothing in the app called either, so they were two ways to
// wire a button straight to a 404. If database export/backup is wanted, add it
// as a feature with a route behind it, not as a client stub.

// ── Platform Super Admin (multi-tenant SaaS) ──────────────────────────────
// Backed by /api/super-admin/* — reachable only by role='super_admin'.
/** A studio application awaiting review in the Command Centre. */
export interface StudioRegistration {
  id: string;
  full_name: string;
  business_name: string;
  mobile: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  organization_id: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
}

export const superAdmin = {
  registrations: (status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending') =>
    http<{ data: StudioRegistration[]; counts: Record<string, number> }>(
      `/api/super-admin/registrations?status=${status}`,
    ),
  approveRegistration: (id: string, note?: string) =>
    http<{ data: { id: string; status: string; organization_id: string } }>(
      `/api/super-admin/registrations/${id}/approve`,
      { method: 'POST', body: JSON.stringify({ note: note ?? '' }) },
    ),
  rejectRegistration: (id: string, note?: string) =>
    http<{ data: StudioRegistration }>(
      `/api/super-admin/registrations/${id}/reject`,
      { method: 'POST', body: JSON.stringify({ note: note ?? '' }) },
    ),
  listOrgs: () =>
    http<{ data: Organization[] }>('/api/super-admin/organizations'),
  getOrg: (id: string) =>
    http<{ data: OrganizationDetail }>(`/api/super-admin/organizations/${id}`),
  /**
   * Omitting `password` selects the INVITATION path: the account is created
   * with no usable password and the owner is emailed a single-use link.
   * Passing one keeps the original behaviour, for when SMTP is unavailable.
   */
  createOrg: (data: { name: string; trainer_name?: string; email: string; mobile?: string; password?: string }) =>
    http<{ data: {
      organization: Organization;
      owner: OrgUser;
      onboarding: 'invitation' | 'password';
      invitation: Invitation | null;
      /** Whether the invitation email actually left. False is actionable. */
      email_sent: boolean;
      email_error: string | null;
    } }>('/api/super-admin/organizations', {
      method: 'POST', body: JSON.stringify(data),
    }),
  updateOrg: (id: string, data: { name?: string; status?: 'active' | 'suspended' }) =>
    http<{ data: Organization }>(`/api/super-admin/organizations/${id}`, {
      method: 'PATCH', body: JSON.stringify(data),
    }),
  setUserActive: (id: string, is_active: boolean) =>
    http<{ data: OrgUser }>(`/api/super-admin/users/${id}`, {
      method: 'PATCH', body: JSON.stringify({ is_active }),
    }),
  resetPassword: (id: string, password: string) =>
    http<{ data: { id: string; message: string } }>(`/api/super-admin/users/${id}/reset-password`, {
      method: 'POST', body: JSON.stringify({ password }),
    }),
  /**
   * Emails the account a link to set their own password. Unlike the public
   * forgot-password endpoint, this one reports what actually happened —
   * 503 if SMTP is unconfigured, 502 if the send failed — so "no email
   * arrived" is never indistinguishable from "email is not set up".
   */
  sendPasswordSetup: (id: string) =>
    http<{ data: { id: string; email: string; expires_in_minutes: number; message: string } }>(
      `/api/super-admin/users/${id}/send-password-setup`, { method: 'POST' },
    ),
  uploadOrgLogo: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return http<{ data: Organization }>(`/api/super-admin/organizations/${id}/logo`, {
      method: 'POST', body: formData,
    });
  },
  overview: () =>
    http<{ data: PlatformOverview }>('/api/super-admin/overview'),
  updateUser: (id: string, data: { name?: string; email?: string; role?: string; is_active?: boolean }) =>
    http<{ data: OrgUser }>(`/api/super-admin/users/${id}`, {
      method: 'PATCH', body: JSON.stringify(data),
    }),
  addUser: (orgId: string, data: { name: string; email: string; password: string; role?: string }) =>
    http<{ data: OrgUser }>(`/api/super-admin/organizations/${orgId}/users`, {
      method: 'POST', body: JSON.stringify(data),
    }),
  deleteUser: (id: string) =>
    http<{ data: { id: string; message: string } }>(`/api/super-admin/users/${id}`, {
      method: 'DELETE',
    }),
  listActivity: (params: { org_id?: string; user_id?: string; action?: string; limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.org_id) qs.set('org_id', params.org_id);
    if (params.user_id) qs.set('user_id', params.user_id);
    if (params.action) qs.set('action', params.action);
    if (params.limit != null) qs.set('limit', String(params.limit));
    if (params.offset != null) qs.set('offset', String(params.offset));
    const q = qs.toString();
    return http<{ data: ActivityEntry[]; paging: { limit: number; offset: number; count: number } }>(
      `/api/super-admin/activity${q ? `?${q}` : ''}`,
    );
  },
  // ── Admin Management operator actions ──────────────────────────────
  /** Revokes every live session for one account (bumps token_version).
   *  Deliberately does not touch the password. */
  forceLogout: (userId: string) =>
    http<{ data: { id: string; message: string } }>(`/api/super-admin/users/${userId}/force-logout`, { method: 'POST' }),
  /** Clears the enrolled authenticator and revokes sessions with it. */
  resetMfa: (userId: string) =>
    http<{ data: { id: string; was_enabled: boolean; message: string } }>(`/api/super-admin/users/${userId}/reset-mfa`, { method: 'POST' }),
  /** Extends the studio's current period (or trial) by a delta. */
  bonusDays: (orgId: string, days: number, reason?: string) =>
    http<{ data: { id: string; field: string; previous: string | null; days: number } }>(
      `/api/super-admin/organizations/${orgId}/subscription/bonus-days`,
      { method: 'POST', body: JSON.stringify({ days, ...(reason ? { reason } : {}) }) },
    ),
  orgNotes: (orgId: string) =>
    http<{ data: OrgInternalNotes }>(`/api/super-admin/organizations/${orgId}/notes`),
  saveOrgNotes: (orgId: string, notes: string) =>
    http<{ data: OrgInternalNotes }>(`/api/super-admin/organizations/${orgId}/notes`, {
      method: 'PUT', body: JSON.stringify({ notes }),
    }),

  /** Audit Centre. Distinct from `activity` above: that is the dashboard's
   *  recent-events feed, this is the filterable investigative view with a
   *  real total and the previous value of each change. */
  audit: (params: AuditQuery = {}) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    }
    const q = qs.toString();
    return http<{ data: AuditEntry[]; paging: { limit: number; offset: number; total: number; count: number } }>(
      `/api/super-admin/audit${q ? `?${q}` : ''}`,
    );
  },
  auditFilters: () => http<AuditFilters>('/api/super-admin/audit/filters'),
  /** Built rather than fetched: the browser must navigate to it so the file
   *  downloads with the server's Content-Disposition. */
  auditExportUrl: (params: AuditQuery = {}) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '' && k !== 'limit' && k !== 'offset') qs.set(k, String(v));
    }
    const q = qs.toString();
    return `${apiBase()}/api/super-admin/audit/export${q ? `?${q}` : ''}`;
  },
  systemHealth: () => http<SystemHealth>('/api/super-admin/system-health'),

  /** Command Center. One call returns every card; a card that failed reports
   *  its own status inside the payload rather than failing the request, so this
   *  never rejects just because one dependency is down. */
  commandCenter: (opts: { cards?: string[]; fresh?: boolean } = {}) => {
    const qs = new URLSearchParams();
    if (opts.cards?.length) qs.set('cards', opts.cards.join(','));
    if (opts.fresh) qs.set('fresh', '1');
    const q = qs.toString();
    return http<{ data: CommandCenterSnapshot }>(
      `/api/super-admin/command-center/snapshot${q ? `?${q}` : ''}`,
    );
  },

  /** The server's allow-list of operational commands, including the ones that
   *  cannot run here — each carries its own `unavailable_reason`. The client
   *  keeps no list of its own, so what it gates and what the server enforces
   *  cannot drift apart. */
  commandCenterCommands: () =>
    http<{ data: { commands: CommandCenterCommand[] } }>(
      '/api/super-admin/command-center/commands',
    ),

  /**
   * Run one allow-listed command.
   *
   * The failure statuses are meaningful and callers are expected to branch on
   * them, since each needs a different response from the UI: 428 means a typed
   * confirmation is required (re-send `confirm` equal to the command name), 429
   * means the command is on cooldown, 503 means the capability is absent on
   * this deployment. They arrive as `ApiError.status`.
   */
  runCommandCenterCommand: (
    name: string,
    body: { queue?: string; confirm?: string; dryRun?: boolean } = {},
  ) =>
    http<{ data: CommandCenterRunResult | CommandCenterDryRun }>(
      `/api/super-admin/command-center/commands/${encodeURIComponent(name)}`,
      { method: 'POST', body },
    ),

  /** Alert Center. Returns the alerts and the badge counts in one call — the
   *  console polls this and would otherwise ask for both every tick. */
  commandCenterAlerts: (opts: { scope?: 'live' | 'resolved' | 'all'; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (opts.scope) qs.set('scope', opts.scope);
    if (opts.limit) qs.set('limit', String(opts.limit));
    const q = qs.toString();
    return http<{ data: SystemAlertList }>(
      `/api/super-admin/command-center/alerts${q ? `?${q}` : ''}`,
    );
  },

  /** "Seen, I am on it." Does not stop the alert tracking the condition, so an
   *  acknowledged alert that fixes itself still auto-resolves. */
  acknowledgeAlert: (id: string) =>
    http<{ data: SystemAlert }>(
      `/api/super-admin/command-center/alerts/${encodeURIComponent(id)}/ack`,
      { method: 'POST' },
    ),

  /** Close by hand. Recorded as `manual`, which is what keeps bad detection
   *  visible: a wall of manual closures means the thresholds are wrong. */
  resolveAlert: (id: string) =>
    http<{ data: SystemAlert }>(
      `/api/super-admin/command-center/alerts/${encodeURIComponent(id)}/resolve`,
      { method: 'POST' },
    ),

  /** AI Guardian. Deterministic correlations across cards — no AI is called on
   *  this path, so it is safe to poll. */
  commandCenterGuardian: (opts: { fresh?: boolean } = {}) =>
    http<{ data: GuardianReport }>(
      `/api/super-admin/command-center/guardian${opts.fresh ? '?fresh=1' : ''}`,
    ),

  /** Narrate ONE finding. A POST, and separate from the read above, because it
   *  costs money: narrating on every poll would spend tokens restating text
   *  already on screen. The model is given the finding and its evidence, never
   *  the raw metrics, and cannot change the diagnosis or the confidence. */
  explainGuardianFinding: (id: string) =>
    http<{ data: GuardianNarration }>(
      `/api/super-admin/command-center/guardian/${encodeURIComponent(id)}/explain`,
      { method: 'POST' },
    ),

  /** The live tail: the API process's in-memory ring. Pass `since` to poll
   *  without re-shipping the whole window. */
  commandCenterLogs: (opts: { level?: string; q?: string; since?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (opts.level) qs.set('level', opts.level);
    if (opts.q) qs.set('q', opts.q);
    if (opts.since) qs.set('since', String(opts.since));
    if (opts.limit) qs.set('limit', String(opts.limit));
    const q = qs.toString();
    return http<{ data: LogTail }>(`/api/super-admin/command-center/logs${q ? `?${q}` : ''}`);
  },

  /** Persisted history: errors and above, durable across restarts, and the only
   *  place the WORKER container's errors are visible. */
  commandCenterLogHistory: (opts: { level?: string; source?: 'api' | 'worker'; q?: string; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (opts.level) qs.set('level', opts.level);
    if (opts.source) qs.set('source', opts.source);
    if (opts.q) qs.set('q', opts.q);
    if (opts.limit) qs.set('limit', String(opts.limit));
    const q = qs.toString();
    return http<{ data: LogHistory }>(`/api/super-admin/command-center/logs/history${q ? `?${q}` : ''}`);
  },

  // ── Billing Centre ──────────────────────────────────────────────────────
  billingSettings: () => http<{ data: PlatformBillingSettings }>('/api/super-admin/billing/settings'),
  saveBillingSettings: (patch: Partial<PlatformBillingSettings>) =>
    http<{ data: PlatformBillingSettings }>('/api/super-admin/billing/settings', {
      method: 'PUT', body: JSON.stringify(patch),
    }),
  invoices: (params: InvoiceQuery = {}) =>
    http<{ data: SubscriptionInvoice[]; totals: InvoiceTotals; page: { limit: number; offset: number; has_more: boolean } }>(
      `/api/super-admin/billing/invoices${qsOf(params)}`,
    ),
  /** Built rather than fetched, same as auditExportUrl: the browser must
   *  navigate to it so the file lands with the server's Content-Disposition. */
  invoicesExportUrl: (params: InvoiceQuery = {}) =>
    `${apiBase()}/api/super-admin/billing/invoices/export${qsOf(params, ['limit', 'offset'])}`,
  invoicePdfUrl: (id: string) => `${apiBase()}/api/super-admin/billing/invoices/${id}/pdf`,
  orgBillingProfile: (orgId: string) =>
    http<{ data: OrgBillingProfile }>(`/api/super-admin/organizations/${orgId}/billing-profile`),
  saveOrgBillingProfile: (orgId: string, patch: Partial<OrgBillingProfile>) =>
    http<{ data: OrgBillingProfile }>(`/api/super-admin/organizations/${orgId}/billing-profile`, {
      method: 'PUT', body: JSON.stringify(patch),
    }),

  // ── Feature Manager ─────────────────────────────────────────────────────
  features: () => http<{ data: FeatureCatalogue }>('/api/super-admin/features'),
  updateFeature: (key: string, patch: { global_enabled?: boolean; default_enabled?: boolean; is_plan_gated?: boolean }) =>
    http<{ data: PlatformFeature }>(`/api/super-admin/features/${key}`, {
      method: 'PATCH', body: JSON.stringify(patch),
    }),
  setFeaturePlans: (key: string, plans: Record<string, boolean>) =>
    http<{ data: unknown }>(`/api/super-admin/features/${key}/plans`, {
      method: 'PUT', body: JSON.stringify({ plans }),
    }),
  featureOverrides: (key: string) =>
    http<{ data: FeatureOverrideRow[] }>(`/api/super-admin/features/${key}/overrides`),
  orgFeatures: (orgId: string) =>
    http<{ data: ResolvedFeature[] }>(`/api/super-admin/organizations/${orgId}/features`),
  setOrgFeature: (orgId: string, key: string, body: { enabled: boolean; reason: string; expires_at?: string }) =>
    http<{ data: unknown }>(`/api/super-admin/organizations/${orgId}/features/${key}`, {
      method: 'PUT', body: JSON.stringify(body),
    }),
  clearOrgFeature: (orgId: string, key: string) =>
    http<{ data: { cleared: boolean } }>(`/api/super-admin/organizations/${orgId}/features/${key}`, {
      method: 'DELETE',
    }),

  // ── Notification Centre ─────────────────────────────────────────────────
  announcements: (status?: string) =>
    http<{ data: Announcement[] }>(`/api/super-admin/announcements${status ? `?status=${status}` : ''}`),
  createAnnouncement: (body: AnnouncementInput) =>
    http<{ data: Announcement }>('/api/super-admin/announcements', {
      method: 'POST', body: JSON.stringify(body),
    }),
  updateAnnouncement: (id: string, patch: Partial<AnnouncementInput>) =>
    http<{ data: Announcement }>(`/api/super-admin/announcements/${id}`, {
      method: 'PATCH', body: JSON.stringify(patch),
    }),
  /** Read-only: computes reach without delivering anything. */
  previewAnnouncement: (id: string) =>
    http<{ data: AnnouncementPreview }>(`/api/super-admin/announcements/${id}/preview`, { method: 'POST' }),
  sendAnnouncement: (id: string) =>
    http<{ data: Announcement }>(`/api/super-admin/announcements/${id}/send`, { method: 'POST' }),
  scheduleAnnouncement: (id: string, scheduledFor: string) =>
    http<{ data: Announcement }>(`/api/super-admin/announcements/${id}/schedule`, {
      method: 'POST', body: JSON.stringify({ scheduled_for: scheduledFor }),
    }),
  cancelAnnouncement: (id: string) =>
    http<{ data: Announcement }>(`/api/super-admin/announcements/${id}/cancel`, { method: 'POST' }),
  deleteAnnouncement: (id: string) =>
    http<{ data: { deleted: boolean } }>(`/api/super-admin/announcements/${id}`, { method: 'DELETE' }),

  // ── Security Centre ─────────────────────────────────────────────────────
  /** Cross-studio product analytics. Read-only; `months` is clamped 3–24 server-side. */
  analytics: (months?: number) =>
    http<{ data: PlatformAnalytics }>(
      `/api/super-admin/analytics${months ? `?months=${months}` : ''}`),

  securityOverview: () => http<{ data: SecurityOverview }>('/api/super-admin/security/overview'),
  loginEvents: (params: LoginEventQuery = {}) =>
    http<{ data: LoginEvent[]; paging: { limit: number; offset: number; total: number } }>(
      `/api/super-admin/security/login-events${qsOf(params)}`,
    ),
  securityThreats: (params: { hours?: number; min?: number } = {}) =>
    http<{ data: SecurityThreats }>(`/api/super-admin/security/threats${qsOf(params)}`),
  activeSessions: (orgId?: string) =>
    http<{ data: ActiveSession[] }>(`/api/super-admin/security/sessions${orgId ? `?org_id=${orgId}` : ''}`),

  // ── AI Control Centre ───────────────────────────────────────────────────
  /** Invitation management. `status` filters on the DERIVED status. */
  listInvitations: (params: { org_id?: string; status?: string; q?: string } = {}) =>
    http<{ data: Invitation[]; counts: Record<string, number>; smtp_configured: boolean }>(
      `/api/super-admin/invitations${qsOf(params)}`),
  resendInvitation: (id: string) =>
    http<{ data: Invitation }>(`/api/super-admin/invitations/${id}/resend`, { method: 'POST' }),
  /**
   * A POST because it MUTATES: the raw token is never stored, so there is no
   * existing link to read. This mints a new one and invalidates the old.
   */
  invitationLink: (id: string) =>
    http<{ data: { url: string; expires_at: string; invitation: Invitation } }>(
      `/api/super-admin/invitations/${id}/link`, { method: 'POST' }),
  cancelInvitation: (id: string) =>
    http<{ data: Invitation }>(`/api/super-admin/invitations/${id}/cancel`, { method: 'POST' }),
  invitationEvents: (id: string) =>
    http<{ data: InvitationDetail }>(`/api/super-admin/invitations/${id}/events`),

  aiOverview: (days = 30) => http<{ data: AiOverview }>(`/api/super-admin/ai/overview?days=${days}`),
  aiByStudio: (days = 30) => http<{ data: AiStudioUsage[] }>(`/api/super-admin/ai/by-studio?days=${days}`),
  aiByModel: (days = 30) => http<{ data: AiModelUsage[] }>(`/api/super-admin/ai/by-model?days=${days}`),
  aiTrend: (days = 30) => http<{ data: AiTrendPoint[] }>(`/api/super-admin/ai/trend?days=${days}`),
  aiSettings: () => http<{ data: AiSettings }>('/api/super-admin/ai/settings'),

  /**
   * Which MODEL each tier routes to — separate from aiSettings, which governs
   * how much a studio may spend rather than what it spends it on.
   */
  aiRouting: () => http<{ data: AiRouting }>('/api/super-admin/ai/routing'),
  /**
   * Omit a tier to leave it alone; send null to clear its override and fall
   * back to the deploy's environment variable. Those are different intents.
   */
  saveAiRouting: (patch: {
    primary_model?: string | null;
    secondary_model?: string | null;
    fallback_model?: string | null;
  }) => http<{ data: unknown }>('/api/super-admin/ai/routing', {
    method: 'PUT', body: JSON.stringify(patch),
  }),
  saveAiSettings: (patch: { enforcement_enabled?: boolean; default_monthly_tokens?: number | null; warn_at_pct?: number }) =>
    http<{ data: AiSettings; studios_already_over: number | null }>('/api/super-admin/ai/settings', {
      method: 'PUT', body: JSON.stringify(patch),
    }),
  saveAiRate: (model: string, body: { provider?: string | null; prompt_per_1k_inr: number; completion_per_1k_inr: number }) =>
    http<{ data: AiModelRate }>(`/api/super-admin/ai/rates/${encodeURIComponent(model)}`, {
      method: 'PUT', body: JSON.stringify(body),
    }),
  setOrgAiLimit: (orgId: string, body: { monthly_tokens: number | null; reason?: string }) =>
    http<{ data: unknown }>(`/api/super-admin/organizations/${orgId}/ai-limit`, {
      method: 'PUT', body: JSON.stringify(body),
    }),
  clearOrgAiLimit: (orgId: string) =>
    http<{ data: { cleared: boolean } }>(`/api/super-admin/organizations/${orgId}/ai-limit`, { method: 'DELETE' }),

  // ── Support Centre (platform side) ──────────────────────────────────────
  supportOverview: () => http<{ data: SupportOverview }>('/api/super-admin/support/overview'),
  supportTickets: (params: { status?: string; priority?: string; category?: string; org_id?: string; unassigned?: string; q?: string; limit?: number } = {}) =>
    http<{ data: SupportTicket[] }>(`/api/super-admin/support/tickets${qsOf(params)}`),
  supportTicket: (id: string) => http<{ data: SupportTicket }>(`/api/super-admin/support/tickets/${id}`),
  replyToTicket: (id: string, body: string, isInternal = false) =>
    http<{ data: TicketMessage }>(`/api/super-admin/support/tickets/${id}/messages`, {
      method: 'POST', body: JSON.stringify({ body, is_internal: isInternal }),
    }),
  updateTicket: (id: string, patch: { status?: TicketStatus; priority?: TicketPriority; assigned_to?: string | null }) =>
    http<{ data: SupportTicket }>(`/api/super-admin/support/tickets/${id}`, {
      method: 'PATCH', body: JSON.stringify(patch),
    }),

  // ── Storage accounting ──────────────────────────────────────────────────
  // Every response carries `measuring_since`: objects written before the
  // ledger existed have no row, so these are bytes ACCOUNTED, not bytes in
  // the bucket. The UI is expected to say so.
  storageOverview: (days = 30) => http<{ data: StorageOverview }>(`/api/super-admin/storage/overview?days=${days}`),
  storageByStudio: () =>
    http<{ data: StorageStudio[]; meta: { measuring_since: string | null } }>('/api/super-admin/storage/by-studio'),
  storageTrend: (days = 30) => http<{ data: StorageTrendPoint[] }>(`/api/super-admin/storage/trend?days=${days}`),
  storageLargest: (limit = 25) => http<{ data: StorageObject[] }>(`/api/super-admin/storage/largest?limit=${limit}`),

  impersonate: (orgId: string, opts: { userId?: string; mode?: 'read_only' | 'full' } = {}) =>
    http<{ data: ImpersonationSession }>(`/api/super-admin/organizations/${orgId}/impersonate`, {
      method: 'POST',
      body: JSON.stringify({
        ...(opts.userId ? { user_id: opts.userId } : {}),
        ...(opts.mode ? { mode: opts.mode } : {}),
      }),
    }),
  // ── Subscription / billing management ──
  subscriptions: () =>
    http<{ data: { studios: SubStudio[]; kpis: SubKpis } }>('/api/super-admin/subscriptions'),
  /** SaaS run-rate metrics: MRR/ARR, plan mix, conversion, founders, trends. */
  subscriptionMetrics: () =>
    http<{ data: SubscriptionMetrics }>('/api/super-admin/subscription-metrics'),

  // ── Coupons ──────────────────────────────────────────────────────────────
  listCoupons: () => http<{ data: Coupon[] }>('/api/super-admin/coupons'),
  couponRedemptions: (id: string) =>
    http<{ data: { id: string; organization_name: string | null; gross_amount_inr: number; discount_inr: number; net_amount_inr: number; redeemed_at: string }[] }>(
      `/api/super-admin/coupons/${id}/redemptions`),
  createCoupon: (data: {
    code: string; description?: string;
    discount_type: 'percent' | 'fixed'; discount_value: number;
    max_discount_inr?: number | null; min_amount_inr?: number | null;
    applies_to_plans?: string[] | null;
    max_redemptions?: number | null; max_per_org?: number | null;
    valid_from?: string | null; valid_until?: string | null;
  }) => http<{ data: Coupon }>('/api/super-admin/coupons', { method: 'POST', body: JSON.stringify(data) }),
  updateCoupon: (id: string, data: Partial<Pick<Coupon, 'description' | 'is_active' | 'max_redemptions' | 'max_per_org' | 'valid_from' | 'valid_until' | 'min_amount_inr' | 'max_discount_inr'>>) =>
    http<{ data: Coupon }>(`/api/super-admin/coupons/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  /** Only possible while unused — a redeemed coupon is deactivated, not deleted. */
  deleteCoupon: (id: string) =>
    http<{ data: { deleted: boolean } }>(`/api/super-admin/coupons/${id}`, { method: 'DELETE' }),
  getSubscription: (orgId: string) =>
    http<{ data: SubDetail }>(`/api/super-admin/organizations/${orgId}/subscription`),
  activateSubscription: (orgId: string, body: { plan_code: string; amount_inr?: number; method?: string; reference?: string; notes?: string; period_months?: number }) =>
    http<{ data: unknown }>(`/api/super-admin/organizations/${orgId}/subscription/activate`, { method: 'POST', body: JSON.stringify(body) }),
  freezeSubscription: (orgId: string, reason?: string) =>
    http<{ data: unknown }>(`/api/super-admin/organizations/${orgId}/subscription/freeze`, { method: 'POST', body: JSON.stringify({ reason }) }),
  reactivateSubscription: (orgId: string) =>
    http<{ data: unknown }>(`/api/super-admin/organizations/${orgId}/subscription/reactivate`, { method: 'POST', body: JSON.stringify({}) }),
  cancelSubscription: (orgId: string) =>
    http<{ data: unknown }>(`/api/super-admin/organizations/${orgId}/subscription/cancel`, { method: 'POST', body: JSON.stringify({}) }),
  changeExpiry: (orgId: string, body: { trial_ends_at?: string | null; current_period_end?: string | null }) =>
    http<{ data: unknown }>(`/api/super-admin/organizations/${orgId}/subscription/expiry`, { method: 'PATCH', body: JSON.stringify(body) }),
  grantFounder: (orgId: string) =>
    http<{ data: unknown }>(`/api/super-admin/organizations/${orgId}/subscription/founder`, { method: 'POST', body: JSON.stringify({}) }),
  // ── Subscription self-checkout queue (the command centre) ───────────────
  platformPaymentSettings: () =>
    http<{ data: PlatformPaymentSettings | null; configured: boolean; enabled: boolean }>(
      '/api/super-admin/platform-payment-settings'),
  savePlatformPaymentSettings: (body: PlatformPaymentSettingsInput) =>
    http<{ data: PlatformPaymentSettings }>('/api/super-admin/platform-payment-settings', {
      method: 'PUT', body: JSON.stringify(body),
    }),
  subscriptionRequests: (params: { status?: string; q?: string; limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') qs.set(k, String(v));
    const q = qs.toString();
    return http<{
      data: SubCheckoutQueueRow[]; total: number; stats: SubCheckoutStats;
      reject_reasons: Record<UpiRejectReason, string>;
    }>(`/api/super-admin/subscription-requests${q ? `?${q}` : ''}`);
  },
  approveSubscriptionRequest: (id: string) =>
    http<{ data: { request: SubCheckoutQueueRow; activation: unknown } }>(
      `/api/super-admin/subscription-requests/${id}/approve`, { method: 'POST' }),
  rejectSubscriptionRequest: (id: string, reason: UpiRejectReason, note?: string) =>
    http<{ data: { reason: UpiRejectReason; note: string | null } }>(
      `/api/super-admin/subscription-requests/${id}/reject`, {
        method: 'POST', body: JSON.stringify({ reason, note }),
      }),

  refundPayment: (paymentId: string) =>
    http<{ data: unknown }>(`/api/super-admin/subscription-payments/${paymentId}/refund`, { method: 'POST', body: JSON.stringify({}) }),
  /** Price a studio's requested plan change before executing it (proration credit, amount due). */
  changeQuote: (orgId: string, planCode: string) =>
    http<{ data: PlanChangeQuote }>(`/api/super-admin/organizations/${orgId}/subscription/change-quote?plan_code=${encodeURIComponent(planCode)}`),
  /** Execute a studio's requested upgrade/renewal once payment is confirmed — credits unused
   *  time on the current plan and restarts the period from now (never use activateSubscription
   *  for this: it stacks time on top instead of crediting it, double-granting days). */
  changePlan: (orgId: string, body: { plan_code: string; amount_inr?: number; method?: string; reference?: string; notes?: string }) =>
    http<{ data: unknown }>(`/api/super-admin/organizations/${orgId}/subscription/change`, { method: 'POST', body: JSON.stringify(body) }),
};

// ── Settings ──────────────────────────────────────────────
export const settings = {
  /** All key-value settings (system_settings table) */
  getAll: () =>
    http<{ settings: Record<string, unknown> }>('/api/settings'),

  /** List branches */
  getBranches: () =>
    http<{ id: string; name: string; location: string; status: string; member_count: number }[]>('/api/settings/branches'),

  /** Create a branch */
  createBranch: (data: { name: string; location?: string }) =>
    http<{ id: string; name: string; location: string; status: string; member_count: number }>('/api/settings/branches', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Update a branch */
  updateBranch: (id: string, data: { name?: string; location?: string; status?: string }) =>
    http<{ id: string; name: string; location: string; status: string }>(`/api/settings/branches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Get feature flags */
  getFeatureFlags: () =>
    http<{ flags: Record<string, unknown>; raw: unknown[] }>('/api/settings/feature-flags'),

  /** Update feature flags */
  updateFeatureFlags: (data: Record<string, unknown>) =>
    http<{ message: string }>('/api/settings/feature-flags', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Update generic settings (key-value) */
  update: (data: Record<string, string>) =>
    http<{ message: string; count: number }>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Get role permissions matrix */
  getPermissions: () =>
    http<{ permissions: Record<string, boolean>; role: string }>('/api/settings/permissions'),

  /** Update role permissions (admin only) */
  updatePermissions: (data: Record<string, boolean>) =>
    http<{ message: string }>('/api/settings/permissions', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ── Feature flags ─────────────────────────────────────────
// The studio's read-only view of what the platform has enabled for it. The
// organization comes off the session server-side; there is no parameter for
// which studio to ask about. A platform operator gets `{}` (no tenant, so no
// per-studio answer) — see features-context for why that reads as "all on".
export const features = {
  map: () => http<{ data: Record<string, boolean> }>('/api/features'),
};

// ── Invitations (public) ──────────────────────────────────
// Used by an admin who has no session yet. The token in the URL is the only
// credential, so nothing here sends an Authorization header.
export const invitations = {
  preview: (token: string) =>
    http<{ data: InvitationPreview }>(`/api/invitations/${encodeURIComponent(token)}`),
  accept: (token: string, password: string) =>
    http<{ data: { activated: boolean; email: string } }>(
      `/api/invitations/${encodeURIComponent(token)}/accept`,
      { method: 'POST', body: JSON.stringify({ password }) }
    ),
};

// ── Integrations ───────────────────────────────────────────────
export const integrations = {
  list: () => http<unknown[]>('/api/integrations'),
  test: (id: string, data: { api_key: string }) =>
    http<{ success: boolean; message: string }>(`/api/integrations/${id}/test`, { method: 'POST', body: JSON.stringify(data) }),
  connect: (id: string, data: { api_key: string }) =>
    http<{ success: boolean; message: string }>(`/api/integrations/${id}/connect`, { method: 'POST', body: JSON.stringify(data) }),
  disconnect: (id: string) =>
    http<{ success: boolean; message: string }>(`/api/integrations/${id}/disconnect`, { method: 'POST' }),
};
