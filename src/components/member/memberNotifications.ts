import { api } from '@/lib/api';
import type { MeNotification } from '@/lib/api';

/**
 * The signed-in member's notifications. The feed answers `{ data: [...] }`;
 * a bare array is tolerated the way AppShell's bell tolerates it.
 */
export async function loadMemberNotifications(unreadOnly = false): Promise<MeNotification[]> {
  const res = await api.notifications.list(unreadOnly ? { unread: '1' } : undefined) as
    { data?: MeNotification[] } | MeNotification[];
  return Array.isArray(res) ? res : (res.data ?? []);
}
