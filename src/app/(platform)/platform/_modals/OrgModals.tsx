'use client';

// Studio and user modals for the platform console.
//
// Extracted verbatim from the 3,197-line platform/page.tsx (audit H-03).
// Component bodies, props and rendered markup are unchanged.
import { useState } from 'react';
import { Save, Mail } from 'lucide-react';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import type { Organization, OrgUser } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { genPassword } from '../_shared/format';
import { ROLE_OPTIONS } from '../_shared/types';
import { roleLabel } from '@/lib/roles';
import { Field, Modal, PasswordField, inputCls, inputStyle } from '../_shared/ui';

export function CreateOrgModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', trainer_name: '', email: '', mobile: '', password: '' });
  const [manual, setManual] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Studio name and a valid login email are required.'); return;
    }
    if (manual && form.password.length < 8) {
      toast.error('A manual password must be at least 8 characters.'); return;
    }
    setSaving(true);
    try {
      const res = await api.superAdmin.createOrg({
        name: form.name.trim(),
        trainer_name: form.trainer_name.trim() || undefined,
        email: form.email.trim(),
        mobile: form.mobile.trim() || undefined,
        // Omitted entirely on the invite path — its absence is what selects it.
        password: manual ? form.password : undefined,
      });
      if (!manual) {
        // The studio exists either way. Whether the email actually left is a
        // separate fact the operator has to be told: only they can resend, and
        // a silent failure leaves an unclaimed studio nobody is chasing.
        if (res.data?.email_sent) toast.success(`Studio created. Invitation sent to ${form.email.trim()}.`);
        else toast.error(`Studio created, but the invitation could not be sent: ${res.data?.email_error ?? 'unknown error'}. Resend it from Invitations.`);
      } else {
        toast.success('Studio created with a manual password.');
      }
      onCreated();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Create failed'); setSaving(false); }
  };

  return (
    <Modal title="New Studio" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Studio name">
          <input className={inputCls} style={inputStyle} value={form.name} placeholder="e.g. Riya's Fitness Studio"
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </Field>
        <Field label="Owner name">
          <input className={inputCls} style={inputStyle} value={form.trainer_name} placeholder="Defaults to studio name"
            onChange={(e) => setForm((f) => ({ ...f, trainer_name: e.target.value }))} />
        </Field>
        <Field label="Login email">
          <input className={inputCls} style={inputStyle} type="email" value={form.email} placeholder="owner@example.com"
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </Field>
        <Field label="Mobile number">
          <input className={inputCls} style={inputStyle} type="tel" value={form.mobile} placeholder="Optional"
            onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} />
        </Field>

        {!manual ? (
          <div className="rounded-[11px] p-3" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
            <p className="flex items-center gap-1.5 text-[12px] font-[700]" style={{ color: 'var(--text-primary)' }}>
              <Mail size={13} /> The owner will be invited by email
            </p>
            <p className="mt-1 text-[11.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              They set their own password through a single-use link that expires in 24 hours. No password is
              created, stored, or sent by you.
            </p>
            <button
              onClick={() => setManual(true)}
              className="mt-2 text-[11.5px] font-[650] underline"
              style={{ color: 'var(--text-muted)' }}
            >
              Set a password manually instead
            </button>
          </div>
        ) : (
          <Field label="Temporary password">
            <PasswordField value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} onGenerate={() => setForm((f) => ({ ...f, password: genPassword() }))} />
            <p className="mt-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              You will have to transmit this to the owner yourself. Prefer an invitation unless email is down.{' '}
              <button onClick={() => setManual(false)} className="underline" style={{ color: 'var(--brand)' }}>
                Send an invitation instead
              </button>
            </p>
          </Field>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} disabled={saving} onClick={submit} style={{ background: 'linear-gradient(135deg,#0f172a,#334155)', color: '#fff' }}>
            {manual ? 'Create' : 'Create & invite'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Add User modal ──────────────────────────────────────────────────────────────
export function AddUserModal({ org, onClose, onAdded }: { org: Organization; onClose: () => void; onAdded: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'admin' });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim() || form.password.length < 8) {
      toast.error('Name, a valid email, and an 8+ character password are required.'); return;
    }
    setSaving(true);
    try {
      await api.superAdmin.addUser(org.id, { name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.role });
      toast.success('Account added.'); onAdded();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Add failed'); setSaving(false); }
  };

  return (
    <Modal title={`Add account · ${org.name}`} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Name">
          <input className={inputCls} style={inputStyle} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </Field>
        <Field label="Login email">
          <input className={inputCls} style={inputStyle} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </Field>
        <Field label="Role">
          <select className={inputCls} style={inputStyle} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
          </select>
        </Field>
        <Field label="Temporary password">
          <PasswordField value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} onGenerate={() => setForm((f) => ({ ...f, password: genPassword() }))} />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} disabled={saving} onClick={submit} style={{ background: 'linear-gradient(135deg,#0f172a,#334155)', color: '#fff' }}>Add</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Edit User modal ─────────────────────────────────────────────────────────────
export function EditUserModal({ user, onClose, onSaved }: { user: OrgUser; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: user.name, email: user.email, role: user.role });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim()) { toast.error('Name and email are required.'); return; }
    setSaving(true);
    try {
      await api.superAdmin.updateUser(user.id, { name: form.name.trim(), email: form.email.trim(), role: form.role });
      toast.success('Account updated.'); onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Update failed'); setSaving(false); }
  };

  return (
    <Modal title="Edit account" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Name">
          <input className={inputCls} style={inputStyle} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </Field>
        <Field label="Email">
          <input className={inputCls} style={inputStyle} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </Field>
        <Field label="Role">
          <select className={inputCls} style={inputStyle} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
          </select>
          <p className="mt-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>Changing the role signs the account out so it re-authenticates with its new powers.</p>
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} disabled={saving} onClick={submit} style={{ background: 'linear-gradient(135deg,#0f172a,#334155)', color: '#fff' }}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Reset Password modal ─────────────────────────────────────────────────────────
/**
 * Two ways to get someone a working password, with the better one first.
 *
 * Emailing a set-password link is the default because typing one in here means
 * the operator now knows a password they will have to convey somehow — down a
 * chat window, over the phone — and the account holder never chose it. The
 * emailed route ends with a password only its owner has seen.
 *
 * Setting one directly stays, because it is the only option when email is not
 * configured or the address on the account is wrong — which is exactly when
 * someone is locked out and needs it most.
 */
export function ResetPasswordModal({ user, onClose }: { user: OrgUser; onClose: () => void }) {
  const { toast } = useToast();
  const [mode, setMode] = useState<'email' | 'manual'>('email');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (password.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
    setSaving(true);
    try {
      await api.superAdmin.resetPassword(user.id, password);
      toast.success('Password reset. Existing sessions revoked.'); onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Reset failed'); setSaving(false); }
  };

  const sendLink = async () => {
    setSaving(true);
    try {
      const r = await api.superAdmin.sendPasswordSetup(user.id);
      toast.success(r.data.message); onClose();
    } catch (e) {
      // The backend distinguishes "SMTP is not configured" from "the send
      // failed" and says which; surfacing its message verbatim is the whole
      // point of not reusing the public forgot-password endpoint here.
      toast.error(e instanceof Error ? e.message : 'Could not send the email');
      setSaving(false);
    }
  };

  return (
    <Modal title="Set a new password" onClose={onClose}>
      <p className="mb-4 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
        For <strong>{user.name}</strong> ({user.email || 'no email on file'}).
        Either way, this signs them out everywhere.
      </p>

      <div className="mb-4 flex gap-1 rounded-[11px] p-1" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
        {([['email', 'Email them a link'], ['manual', 'Set one myself']] as const).map(([id, label]) => (
          <button
            key={id} onClick={() => setMode(id)} disabled={saving}
            className="min-h-[44px] flex-1 rounded-[8px] px-2 text-[12px] font-[700] transition-colors disabled:opacity-60"
            style={mode === id
              ? { background: 'var(--bg-elevated)', color: 'var(--text-primary)', boxShadow: '0 1px 3px rgba(15,23,42,0.10)' }
              : { color: 'var(--text-muted)' }}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'email' ? (
        <>
          <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Sends a link to <strong style={{ color: 'var(--text-primary)' }}>{user.email || '—'}</strong> where
            they choose their own password. You never see it, and it never has to
            be passed along in a message.
          </p>
          <div className="flex justify-end gap-2 pt-5">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              loading={saving} disabled={saving || !user.email} onClick={sendLink}
              style={{ background: 'linear-gradient(135deg,#0f172a,#334155)', color: '#fff' }}
            >
              Send link
            </Button>
          </div>
        </>
      ) : (
        <>
          <Field label="New password">
            <PasswordField value={password} onChange={setPassword} onGenerate={() => setPassword(genPassword())} />
          </Field>
          <div className="flex justify-end gap-2 pt-5">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button loading={saving} disabled={saving} onClick={submit} style={{ background: 'linear-gradient(135deg,#0f172a,#334155)', color: '#fff' }}>Reset</Button>
          </div>
        </>
      )}
    </Modal>
  );
}

