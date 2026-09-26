/**
 * The member's own account: contact details and password.
 *
 * ── Contact ────────────────────────────────────────────────────────────────
 *
 * Mobile and address are the only parts of the client record a member may
 * change (PATCH /api/me/profile). Name, goal, package and dates are the
 * trainer's. The mobile is required: the studio reaches its members on
 * WhatsApp, and the server refuses to clear it.
 *
 * ── Password ───────────────────────────────────────────────────────────────
 *
 * The new-password rules are `newPasswordSchema(false)`'s — the policy
 * /api/auth/change-password enforces — so this form cannot demand more or
 * less than the endpoint will. The current password is only checked for
 * presence; only the server may judge it.
 */

import { z } from 'zod';
import { phoneField, textField } from '../primitives';
import { newPasswordSchema } from './auth';
import type { MeContactInput, MeProfile } from '@/lib/api';

/* ── Contact ─────────────────────────────────────────────────────────────── */

export const memberContactSchema = z.object({
  mobile: phoneField({ label: 'Mobile', required: true }),
  address: textField({ label: 'Address', maxLength: 500 }),
});

export type MemberContactValues = z.output<typeof memberContactSchema>;
export type MemberContactState = { mobile: string; address: string };

export function blankMemberContact(p?: Pick<MeProfile, 'mobile' | 'address'> | null): MemberContactState {
  return { mobile: p?.mobile ?? '', address: p?.address ?? '' };
}

export function toMemberContactPayload(v: MemberContactValues): MeContactInput {
  // phoneField is required, so a parsed value always carries a mobile.
  return { mobile: v.mobile ?? '', address: v.address };
}

/* ── Password ────────────────────────────────────────────────────────────── */

export const memberPasswordSchema = z
  .object({
    current: textField({ label: 'Current password', required: true, maxLength: 512 }),
    password: z.string(),
    confirm: z.string(),
  })
  .superRefine((v, ctx) => {
    const inner = newPasswordSchema(false).safeParse({ password: v.password, confirm: v.confirm });
    if (!inner.success) {
      for (const issue of inner.error.issues) {
        ctx.addIssue({ code: 'custom', path: issue.path, message: issue.message });
      }
    }
    if (v.password && v.current && v.password === v.current) {
      ctx.addIssue({ code: 'custom', path: ['password'], message: 'Choose a password different from your current one.' });
    }
  });

export type MemberPasswordValues = z.output<typeof memberPasswordSchema>;
export type MemberPasswordState = { current: string; password: string; confirm: string };

export function blankMemberPassword(): MemberPasswordState {
  return { current: '', password: '', confirm: '' };
}

/** Server messages that belong to one field rather than the whole form. */
export const MEMBER_PASSWORD_FIELD_HINTS: Record<string, string> = {
  'Current password is incorrect': 'current',
  'New password must be at least 8 characters': 'password',
};
