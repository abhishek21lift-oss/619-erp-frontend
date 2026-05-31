/**
 * profile-api.ts
 * Typed API service for all profile endpoints.
 * Wraps the existing http client used across the app.
 */
import { http } from '@/lib/http';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  location: string;
  bio: string;
  avatarUrl: string | null;
  createdAt: string;
  lastLoginAt: string;
}

export interface PasswordUpdatePayload {
  currentPassword: string;
  newPassword: string;
}

export interface MfaSetupResponse {
  qrUrl: string;
  secret: string;
}

export interface MfaVerifyPayload {
  code: string;
  secret: string;
}

export interface MfaVerifyResponse {
  recoveryCodes: string[];
}

export interface NotificationPreferences {
  email_logins: boolean;
  email_payments: boolean;
  email_reports: boolean;
  email_marketing: boolean;
  push_logins: boolean;
  push_tasks: boolean;
  push_mentions: boolean;
  whatsapp_alerts: boolean;
  frequency: 'instant' | 'daily' | 'weekly';
}

export interface Device {
  id: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ip: string;
  location: string;
  lastSeen: string;
  isCurrent: boolean;
}

export interface Session {
  id: string;
  ip: string;
  location: string;
  device: string;
  browser: string;
  createdAt: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface ActivityEvent {
  id: string;
  type: string;
  description: string;
  ip: string;
  location: string;
  createdAt: string;
  category: 'auth' | 'profile' | 'security' | 'billing' | 'system';
}

export interface ActivityResponse {
  events: ActivityEvent[];
  hasMore: boolean;
  total: number;
}

export interface UserPreferences {
  theme: 'dark' | 'light' | 'system';
  language: string;
  timezone: string;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
  compactMode: boolean;
}

export const profileApi = {
  // Profile
  getProfile: () =>
    http<UserProfile>('/api/profile/me'),
  updateProfile: (data: Partial<UserProfile>) =>
    http<UserProfile>('/api/profile/me', { method: 'PUT', body: JSON.stringify(data) }),
  uploadAvatar: (file: File) => {
    const fd = new FormData();
    fd.append('avatar', file);
    return http<{ avatarUrl: string }>('/api/profile/avatar', { method: 'POST', body: fd });
  },

  // Password
  updatePassword: (payload: PasswordUpdatePayload) =>
    http('/api/profile/password', { method: 'PUT', body: JSON.stringify(payload) }),

  // MFA
  setupMfa: () =>
    http<MfaSetupResponse>('/api/profile/mfa/setup', { method: 'POST', body: JSON.stringify({}) }),
  verifyMfa: (payload: MfaVerifyPayload) =>
    http<MfaVerifyResponse>('/api/profile/mfa/verify', { method: 'POST', body: JSON.stringify(payload) }),
  disableMfa: () =>
    http('/api/profile/mfa', { method: 'DELETE' }),

  // Notifications
  getNotifications: () =>
    http<NotificationPreferences>('/api/profile/notifications'),
  updateNotifications: (data: NotificationPreferences) =>
    http('/api/profile/notifications', { method: 'PUT', body: JSON.stringify(data) }),

  // Devices
  getDevices: () =>
    http<Device[]>('/api/profile/devices'),
  revokeDevice: (id: string) =>
    http(`/api/profile/devices/${id}`, { method: 'DELETE' }),

  // Sessions
  getSessions: () =>
    http<Session[]>('/api/profile/sessions'),
  revokeSession: (id: string) =>
    http(`/api/profile/sessions/${id}`, { method: 'DELETE' }),
  revokeAllSessions: () =>
    http('/api/profile/sessions/revoke-all', { method: 'POST', body: JSON.stringify({}) }),

  // Activity
  getActivity: (page: number, category?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (category && category !== 'all') params.set('category', category);
    return http<ActivityResponse>(`/api/profile/activity?${params}`);
  },

  // Preferences
  getPreferences: () =>
    http<UserPreferences>('/api/profile/preferences'),
  updatePreferences: (data: UserPreferences) =>
    http('/api/profile/preferences', { method: 'PUT', body: JSON.stringify(data) }),
};
