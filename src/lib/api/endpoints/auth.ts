// API endpoints: auth, webauthn, accounts, profile.
//
// Lifted verbatim from the single `api` object in the 4,185-line api.ts.
// Method names, URLs and request shapes are unchanged; index.ts composes these
// back into the same `api` object every consumer already imports.

import { http } from '../../http';
import type { Role } from '../../roles';
import type {
  NotificationPreferences, PortfolioItem, PortfolioKind, ProfileMe, ProfileUpdate, User,
  UserPreferences,
} from '../types';

export const auth = {
  login: (email: string, password: string, mfaCode?: string) =>
    http<{ user: User }>('/api/auth/login', {
      method: 'POST',
      body: mfaCode ? { email, password, mfa_code: mfaCode } : { email, password },
    }),
  googleLogin: (credential: string) =>
    http<{ user: User }>('/api/auth/google-login', {
      method: 'POST',
      body: { credential },
    }),
  me: () => http<{ user: User }>('/api/auth/me'),
  logout: () => http('/api/auth/logout', { method: 'POST' }).catch((_err) => console.warn('[api] logout failed', _err)),
  changePassword: (currentPassword: string, newPassword: string) =>
    http<{ message?: string }>('/api/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    }),
  // Forgot/reset. The backend answers forgotPassword identically whether or
  // not the address exists — do not "improve" the UI by reporting which,
  // that is deliberate anti-enumeration behaviour and the copy must match it.
  forgotPassword: (email: string) =>
    http<{ message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: { email },
    }),
  resetPassword: (token: string, password: string) =>
    http<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: { token, password },
    }),
  listUsers: () => http<User[]>('/api/auth/users'),
  createUser: (data: {
    name: string;
    email: string;
    password: string;
    role: Role;
    trainer_id?: string;
  }) => http<{ message?: string; user: User }>('/api/auth/create-user', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  toggleUser: (id: string) =>
    http<{ message?: string; is_active: boolean }>(`/api/auth/users/${id}/toggle`, {
      method: 'PUT',
    }),
  deleteUser: (id: string) =>
    http<{ message?: string }>(`/api/auth/users/${id}`, { method: 'DELETE' }),
};

// ── WebAuthn / Passkey — user-level biometric auth ─────────────────────────
export const webauthn = {
  // Registration (user must be logged in)
  registerOptions: () =>
    http<Record<string, unknown>>('/api/auth/webauthn/register/options', { method: 'POST' }),
  registerVerify: (body: { registration: Record<string, unknown>; deviceName?: string }) =>
    http<{ success: boolean; credential: { id: string; device_name: string; created_at: string } }>(
      '/api/auth/webauthn/register/verify', { method: 'POST', body: JSON.stringify(body) }
    ),

  // Login (no session required)
  loginOptions: (body?: { email?: string }) =>
    http<Record<string, unknown>>('/api/auth/webauthn/login/options', {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    }),
  loginVerify: (body: { authentication: Record<string, unknown> }) =>
    http<{ user: { id: string; name?: string; email: string; role?: string; trainer_id?: string; member_id?: string } }>(
      '/api/auth/webauthn/login/verify', { method: 'POST', body: JSON.stringify(body) }
    ),

  // Action verification (user must be logged in)
  actionOptions: () =>
    http<Record<string, unknown>>('/api/auth/webauthn/action/options', { method: 'POST' }),
  actionVerify: (body: { authentication: Record<string, unknown> }) =>
    http<{ verified: boolean; actionToken: string }>(
      '/api/auth/webauthn/action/verify', { method: 'POST', body: JSON.stringify(body) }
    ),

  // Credential management (user's own passkeys)
  listCredentials: () =>
    http<{ credentials: { id: string; device_name: string; device_type: string; backed_up: boolean; is_active: boolean; created_at: string; last_used_at: string | null }[] }>(
      '/api/auth/webauthn/credentials'
    ),
  deleteCredential: (id: string) =>
    http<{ success: boolean }>(`/api/auth/webauthn/credentials/${id}`, { method: 'DELETE' }),
  renameCredential: (id: string, deviceName: string) =>
    http<{ success: boolean; credential: { id: string; device_name: string } }>(
      `/api/auth/webauthn/credentials/${id}`,
      { method: 'PATCH', body: JSON.stringify({ deviceName }) }
    ),
  toggleCredential: (id: string) =>
    http<{ success: boolean; is_active: boolean }>(
      `/api/auth/webauthn/credentials/${id}/toggle`,
      { method: 'PUT' }
    ),

  // Admin
  adminStats: () =>
    http<{ totalCredentials: number; enrolledUsers: number; loginsLast24h: number; failedAttemptsLast24h: number }>(
      '/api/auth/webauthn/admin/stats'
    ),
  adminCredentials: () =>
    http<{ credentials: Array<{ id: string; device_name: string; device_type: string; backed_up: boolean; created_at: string; last_used_at: string | null; user_id: string; user_name: string; user_email: string; role: string }> }>(
      '/api/auth/webauthn/admin/credentials'
    ),
  adminRevokeCredential: (id: string) =>
    http<{ success: boolean }>(`/api/auth/webauthn/admin/credentials/${id}`, { method: 'DELETE' }),
  adminAuditLogs: (limit = 100) =>
    http<{ logs: Array<{ id: string; event: string; detail: Record<string, unknown>; ip: string | null; created_at: string; user_name: string | null; user_email: string | null; role: string | null }> }>(
      `/api/auth/webauthn/admin/audit-logs?limit=${limit}`
    ),
};

// ── User/Account Management (Settings) ──────────────────────────
export const accounts = {
  list: () => http<unknown[]>('/api/auth/users'),
  create: (data: { name: string; email: string; password: string; role: string }) =>
    http<{ message: string; user: unknown }>('/api/auth/create-user', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; email?: string; role?: string; status?: string }) =>
    http<{ message: string }>(`/api/auth/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => http<{ message: string }>(`/api/auth/users/${id}`, { method: 'DELETE' }),
  toggleStatus: (id: string) =>
    http<{ message: string; is_active: boolean }>(`/api/auth/users/${id}/toggle`, { method: 'PUT' }),
};

// ── Profile (My Profile page) ────────────────────────────────────
export const profile = {
  me: () => http<ProfileMe>('/api/profile/me'),
  /**
   * Partial by design: the server only writes the credential fields this
   * request actually carries, so a form that does not show certifications
   * cannot wipe them by saving a phone number.
   */
  updateMe: (data: ProfileUpdate) =>
    http<ProfileMe>('/api/profile/me', { method: 'PUT', body: JSON.stringify(data) }),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return http<{ avatarUrl: string }>('/api/profile/avatar', { method: 'POST', body: formData });
  },
  uploadCover: (file: File) => {
    const formData = new FormData();
    formData.append('cover', file);
    return http<{ coverUrl: string }>('/api/profile/cover', { method: 'POST', body: formData });
  },
  /** Clears the banner and removes the object. Returns `{ coverUrl: null }`. */
  removeCover: () =>
    http<{ coverUrl: null }>('/api/profile/cover', { method: 'DELETE' }),

  /**
   * Portfolio actions are immediate and per-item, so they never touch the
   * page's dirty baseline — unlike every field on the main form, there is
   * nothing here a Save button could batch.
   */
  portfolio: {
    list: () => http<PortfolioItem[]>('/api/profile/portfolio'),
    /**
     * One item per request. `after` is required for a before/after and
     * `externalUrl` for a video link; the server enforces both, and a
     * half-formed item is refused rather than stored broken.
     */
    create: (data: {
      kind: PortfolioKind;
      file: File;
      after?: File;
      externalUrl?: string;
      title?: string;
      caption?: string;
    }) => {
      const fd = new FormData();
      fd.append('kind', data.kind);
      fd.append('file', data.file);
      if (data.after) fd.append('after', data.after);
      if (data.externalUrl) fd.append('external_url', data.externalUrl);
      if (data.title) fd.append('title', data.title);
      if (data.caption) fd.append('caption', data.caption);
      return http<PortfolioItem>('/api/profile/portfolio', { method: 'POST', body: fd });
    },
    /** Partial, like `PUT /me`: an omitted field is left alone. */
    update: (id: string, data: { title?: string; caption?: string; pinned?: boolean }) =>
      http<PortfolioItem>(`/api/profile/portfolio/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) =>
      http<{ id: string; removed: boolean }>(`/api/profile/portfolio/${id}`, { method: 'DELETE' }),
    /**
     * The submitted ids must be exactly what the server holds. If another tab
     * changed the gallery this throws a 409 whose `payload.items` is the
     * current list — re-render from that rather than guessing what was missed.
     */
    reorder: (ids: string[]) =>
      http<PortfolioItem[]>('/api/profile/portfolio/order', { method: 'PUT', body: JSON.stringify({ ids }) }),
  },
  mfa: {
    setup: () => http<{ secret: string; qrUrl: string }>('/api/profile/mfa/setup', { method: 'POST' }),
    verify: (code: string) =>
      http<{ recoveryCodes: string[] }>('/api/profile/mfa/verify', { method: 'POST', body: JSON.stringify({ code }) }),
    disable: () => http<{ message: string }>('/api/profile/mfa', { method: 'DELETE' }),
  },
  notifications: {
    get: () => http<NotificationPreferences>('/api/profile/notifications'),
    update: (data: NotificationPreferences) =>
      http<NotificationPreferences>('/api/profile/notifications', { method: 'PUT', body: JSON.stringify(data) }),
  },
  preferences: {
    get: () => http<UserPreferences>('/api/profile/preferences'),
    update: (data: UserPreferences) =>
      http<UserPreferences>('/api/profile/preferences', { method: 'PUT', body: JSON.stringify(data) }),
  },
  revokeAllSessions: () => http<{ message: string }>('/api/profile/sessions/revoke-all', { method: 'POST' }),
};
