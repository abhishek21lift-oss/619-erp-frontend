'use client';

// Notification Centre — announcements from the platform to its studios.
//
// Delivery lands in each studio's existing notification bell, so what is
// composed here is what a real person reads on their phone tomorrow morning.
// Sending cannot be undone, and the UI is built around that single fact:
//
//   - Composing produces a DRAFT. There is no compose-and-send button.
//   - Send is gated behind a preview that names the actual recipients, because
//     "412 studios" is not something anyone can sanity-check but
//     "Iron House — Priya (admin)" is.
//   - Sent announcements are read-only, and say so, rather than offering
//     controls that would silently do nothing.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  Megaphone, Send, Clock, Trash2, Loader2, AlertTriangle, Plus, X, Eye,
  CheckCircle2, Ban, Users, Pencil, Info,
} from 'lucide-react';
import { api } from '@/lib/api';
import type {
  Announcement, AnnouncementInput, AnnouncementPreview,
  AnnouncementSeverity, AnnouncementAudience, SubPlan,
} from '@/lib/api';
import { useToast } from '@/lib/toast';
import { ASSIGNABLE_ROLES, roleLabel } from '@/lib/roles';

const cardStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)' } as const;
const inputStyle = { ...cardStyle, color: 'var(--text-primary)' } as const;

const SEVERITY: Record<AnnouncementSeverity, { label: string; bg: string; fg: string }> = {
  info:     { label: 'Info',     bg: 'rgba(0,103,224,0.12)',  fg: '#0067e0' },
  success:  { label: 'Good news', bg: 'rgba(16,185,129,0.12)', fg: '#059669' },
  warning:  { label: 'Warning',  bg: 'rgba(245,158,11,0.14)',  fg: '#b45309' },
  critical: { label: 'Critical', bg: 'rgba(239,68,68,0.12)',   fg: '#dc2626' },
};

const STATUS: Record<Announcement['status'], { label: string; bg: string; fg: string }> = {
  draft:     { label: 'Draft',     bg: 'var(--bg-subtle)',       fg: 'var(--text-muted)' },
  scheduled: { label: 'Scheduled', bg: 'rgba(0,103,224,0.12)',  fg: '#0067e0' },
  sent:      { label: 'Sent',      bg: 'rgba(16,185,129,0.12)',  fg: '#059669' },
  cancelled: { label: 'Cancelled', bg: 'rgba(239,68,68,0.10)',   fg: '#dc2626' },
};

/* The subscription states an announcement can target. Mirrors the lifecycle in
   migration 099 — these are billing states, not the super-admin on/off flag. */
const SUB_STATUSES = ['trial', 'active', 'expired', 'frozen', 'cancelled'];
/* Who inside a studio an announcement can target. One role, because one role
   exists: the trainer who owns the studio. The list used to include manager,
   trainer and member, none of which has ever had an account, and the chips
   printed the raw identifier. */
const ROLES = ASSIGNABLE_ROLES;

function fmtWhen(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

/** `datetime-local` wants local wall-clock with no zone; toISOString gives UTC. */
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick} aria-pressed={on}
      className="min-h-[44px] rounded-[9px] px-2.5 text-[11.5px] font-[700] transition"
      style={on
        ? { background: 'rgba(0,103,224,0.12)', color: '#0067e0', border: '1px solid rgba(0,103,224,0.25)' }
        : { background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
    >
      {children}
    </button>
  );
}

/* ── Composer ────────────────────────────────────────────────────────────── */
function Composer({ initial, plans, onClose, onSaved }: {
  initial: Announcement | null;
  plans: SubPlan[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<AnnouncementInput>({
    title: initial?.title ?? '',
    body: initial?.body ?? '',
    severity: initial?.severity ?? 'info',
    link: initial?.link ?? '',
    audience: initial?.audience ?? 'all',
    audience_plans: initial?.audience_plans ?? [],
    audience_statuses: initial?.audience_statuses ?? [],
    audience_org_ids: initial?.audience_org_ids ?? [],
    audience_roles: initial?.audience_roles ?? ['admin'],
  });
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof AnnouncementInput>(k: K, v: AnnouncementInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggle = (k: 'audience_plans' | 'audience_statuses' | 'audience_roles', v: string) =>
    setForm((f) => {
      const cur = f[k] ?? [];
      return { ...f, [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] };
    });

  const save = async () => {
    setSaving(true);
    try {
      const payload: AnnouncementInput = { ...form, link: form.link?.trim() || null };
      if (initial) await api.superAdmin.updateAnnouncement(initial.id, payload);
      else await api.superAdmin.createAnnouncement(payload);
      toast.success(initial ? 'Draft updated.' : 'Draft saved — preview it before sending.');
      onSaved();
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save the draft'); }
    finally { setSaving(false); }
  };

  const audiences: { id: AnnouncementAudience; label: string }[] = [
    { id: 'all', label: 'Every studio' },
    { id: 'plan', label: 'By plan' },
    { id: 'status', label: 'By subscription state' },
    { id: 'studios', label: 'Specific studios' },
  ];

  return (
    <div className="rounded-[16px] p-4" style={cardStyle}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-[750]" style={{ color: 'var(--text-primary)' }}>
            {initial ? 'Edit draft' : 'New announcement'}
          </p>
          <p className="mt-0.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            Saves as a draft. Nothing is delivered until you send it.
          </p>
        </div>
        <button onClick={onClose} aria-label="Close composer" className="flex items-center justify-center rounded-[9px]" style={{ color: 'var(--text-muted)', minHeight: 44, minWidth: 44 }}><X size={16} /></button>
      </div>

      <div className="space-y-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>Title</span>
          <input
            value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={140}
            placeholder="Scheduled maintenance this Sunday"
            className="h-10 rounded-[10px] px-2.5 text-[12.5px] outline-none" style={inputStyle}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>Message</span>
          <textarea
            value={form.body} onChange={(e) => set('body', e.target.value)} rows={4} maxLength={4000}
            placeholder="We are upgrading the platform on Sunday between 2am and 4am IST. Bookings and check-ins will be unavailable for about 20 minutes."
            className="resize-y rounded-[10px] px-2.5 py-2 text-[12.5px] outline-none" style={inputStyle}
          />
          <span className="text-[10.5px]" style={{ color: 'var(--text-disabled)' }}>{form.body.length} / 4000</span>
        </label>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>Tone</span>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(SEVERITY) as AnnouncementSeverity[]).map((s) => (
                <Chip key={s} on={form.severity === s} onClick={() => set('severity', s)}>{SEVERITY[s].label}</Chip>
              ))}
            </div>
          </div>
          <label className="flex min-w-[180px] flex-1 flex-col gap-1">
            <span className="text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>Link (optional)</span>
            <input
              value={form.link ?? ''} onChange={(e) => set('link', e.target.value)}
              placeholder="/subscription"
              className="h-10 rounded-[10px] px-2.5 text-[12.5px] outline-none" style={inputStyle}
            />
          </label>
        </div>
        {/* Stated up front rather than as a validation error after typing a
            full URL: the server rejects absolute links, and the reason is
            worth knowing. */}
        <p className="flex items-start gap-1.5 text-[11px]" style={{ color: 'var(--text-disabled)' }}>
          <Info size={11} className="mt-0.5 shrink-0" />
          In-app paths only — a platform notice must never link off-site.
        </p>

        <div>
          <span className="text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>Send to</span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {audiences.map((a) => (
              <Chip key={a.id} on={form.audience === a.id} onClick={() => set('audience', a.id)}>{a.label}</Chip>
            ))}
          </div>

          {form.audience === 'plan' && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {plans.map((p) => (
                <Chip key={p.code} on={(form.audience_plans ?? []).includes(p.code)} onClick={() => toggle('audience_plans', p.code)}>
                  {p.name}
                </Chip>
              ))}
            </div>
          )}
          {form.audience === 'status' && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SUB_STATUSES.map((s) => (
                <Chip key={s} on={(form.audience_statuses ?? []).includes(s)} onClick={() => toggle('audience_statuses', s)}>
                  {s}
                </Chip>
              ))}
            </div>
          )}
          {form.audience === 'studios' && (
            <label className="mt-2 flex flex-col gap-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
              <span>Paste studio IDs, one per line.</span>
              <textarea
                value={(form.audience_org_ids ?? []).join('\n')}
                onChange={(e) => set('audience_org_ids', e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))}
                rows={3} aria-label="Studio IDs, one per line"
                className="w-full resize-y rounded-[10px] px-2.5 py-2 font-mono text-[11.5px] outline-none" style={inputStyle}
              />
            </label>
          )}
        </div>

        <div>
          <span className="text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>Who inside each studio</span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {ROLES.map((r) => (
              <Chip key={r} on={(form.audience_roles ?? []).includes(r)} onClick={() => toggle('audience_roles', r)}>{roleLabel(r)}</Chip>
            ))}
          </div>
          <p className="mt-1 text-[11px]" style={{ color: 'var(--text-disabled)' }}>
            Goes to the trainer who owns each studio.
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={save} disabled={saving || !form.title.trim() || !form.body.trim()}
          className="flex h-10 items-center gap-1.5 rounded-[11px] px-4 text-[12.5px] font-[700] text-white disabled:opacity-50"
          style={{ background: 'var(--brand)' }}
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : null}
          {initial ? 'Save changes' : 'Save draft'}
        </button>
        <button onClick={onClose} className="text-[12px] font-[650]" style={{ color: 'var(--text-muted)' }}>Cancel</button>
      </div>
    </div>
  );
}

/* ── One announcement ────────────────────────────────────────────────────── */
function Row({ a, onChanged, onEdit }: { a: Announcement; onChanged: () => void; onEdit: () => void }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState('');
  const [preview, setPreview] = useState<AnnouncementPreview | null>(null);

  const sev = SEVERITY[a.severity] ?? SEVERITY.info;
  const st = STATUS[a.status] ?? STATUS.draft;
  const sendable = a.status === 'draft' || a.status === 'scheduled';

  const act = async (label: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(label);
    try { await fn(); toast.success(ok); onChanged(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'That did not work'); }
    finally { setBusy(''); }
  };

  const doPreview = async () => {
    setBusy('preview');
    try { setPreview((await api.superAdmin.previewAnnouncement(a.id)).data); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not work out the audience'); }
    finally { setBusy(''); }
  };

  const doSend = async () => {
    // The confirm names the real reach, from the same resolver the send uses.
    const reach = preview
      ? `${preview.recipient_count} people across ${preview.studio_count} studio${preview.studio_count === 1 ? '' : 's'}`
      : 'every studio matching this audience';
    if (!window.confirm(
      `Send “${a.title}” to ${reach}?\n\nThis cannot be undone — it lands in their notifications immediately.`,
    )) return;
    await act('send', () => api.superAdmin.sendAnnouncement(a.id), 'Announcement sent.');
  };

  const doSchedule = async () => {
    const when = window.prompt(
      'Send at (your local time, YYYY-MM-DDTHH:MM):',
      toLocalInput(new Date(Date.now() + 3600_000)),
    );
    if (!when) return;
    const d = new Date(when);
    if (isNaN(d.getTime())) { toast.error('That is not a valid date and time.'); return; }
    await act('schedule', () => api.superAdmin.scheduleAnnouncement(a.id, d.toISOString()), 'Scheduled.');
  };

  const readPct = a.delivered ? Math.round(((a.read_count ?? 0) / a.delivered) * 100) : null;

  return (
    <div className="px-3 py-3 sm:px-4" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="rounded-[6px] px-1.5 py-0.5 text-[10px] font-[750]" style={{ background: st.bg, color: st.fg }}>
              {st.label}
            </span>
            <span className="rounded-[6px] px-1.5 py-0.5 text-[10px] font-[700]" style={{ background: sev.bg, color: sev.fg }}>
              {sev.label}
            </span>
            <span className="text-[13px] font-[750]" style={{ color: 'var(--text-primary)' }}>{a.title}</span>
          </div>
          <p className="mt-1 line-clamp-2 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{a.body}</p>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]" style={{ color: 'var(--text-disabled)' }}>
            {a.status === 'sent' && (
              <>
                <span className="flex items-center gap-1">
                  <Users size={10} /> {a.recipient_count ?? 0} in {a.studio_count ?? 0} studio{a.studio_count === 1 ? '' : 's'}
                </span>
                {readPct !== null && (
                  <span style={{ color: readPct >= 50 ? '#059669' : 'var(--text-disabled)' }}>
                    {a.read_count}/{a.delivered} read ({readPct}%)
                  </span>
                )}
                <span>· sent {fmtWhen(a.sent_at)}</span>
              </>
            )}
            {a.status === 'scheduled' && <span>Sends {fmtWhen(a.scheduled_for)}</span>}
            {a.status === 'draft' && <span>Drafted by {a.created_by_name || '—'}</span>}
          </div>
        </div>
      </div>

      {/* Actions. A sent announcement gets none — offering controls that
          silently do nothing is worse than not offering them. */}
      {sendable && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <button
            onClick={doPreview} disabled={busy === 'preview'}
            className="flex min-h-[44px] items-center gap-1.5 rounded-[9px] px-2.5 text-[11.5px] font-[700] disabled:opacity-50"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            {busy === 'preview' ? <Loader2 size={11} className="animate-spin" /> : <Eye size={11} />} Preview
          </button>
          <button
            onClick={doSend} disabled={!!busy}
            className="flex min-h-[44px] items-center gap-1.5 rounded-[9px] px-2.5 text-[11.5px] font-[700] text-white disabled:opacity-50"
            style={{ background: 'var(--brand)' }}
          >
            {busy === 'send' ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />} Send now
          </button>
          <button
            onClick={doSchedule} disabled={!!busy}
            className="flex min-h-[44px] items-center gap-1.5 rounded-[9px] px-2.5 text-[11.5px] font-[650] disabled:opacity-50"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            <Clock size={11} /> {a.status === 'scheduled' ? 'Reschedule' : 'Schedule'}
          </button>
          {a.status === 'draft' && (
            <button onClick={onEdit} className="flex min-h-[44px] items-center gap-1.5 rounded-[9px] px-2.5 text-[11.5px] font-[650]"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <Pencil size={11} /> Edit
            </button>
          )}
          {a.status === 'scheduled' && (
            <button
              onClick={() => act('cancel', () => api.superAdmin.cancelAnnouncement(a.id), 'Cancelled.')}
              disabled={!!busy}
              className="flex min-h-[44px] items-center gap-1.5 rounded-[9px] px-2.5 text-[11.5px] font-[650] disabled:opacity-50"
              style={{ border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626' }}
            >
              <Ban size={11} /> Cancel
            </button>
          )}
          {a.status === 'draft' && (
            <button
              onClick={() => { if (window.confirm(`Delete the draft “${a.title}”?`)) act('delete', () => api.superAdmin.deleteAnnouncement(a.id), 'Draft deleted.'); }}
              disabled={!!busy}
              aria-label={`Delete draft ${a.title}`}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[9px] disabled:opacity-50"
              style={{ border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626' }}
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      )}

      <AnimatePresence initial={false}>
        {preview && (
          <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }} className="overflow-hidden">
            <div className="mt-2.5 rounded-[12px] p-3" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              <p className="text-[12px] font-[750]" style={{ color: 'var(--text-primary)' }}>
                {preview.recipient_count} recipient{preview.recipient_count === 1 ? '' : 's'} across{' '}
                {preview.studio_count} studio{preview.studio_count === 1 ? '' : 's'}
              </p>
              {preview.recipient_count === 0 ? (
                // The one outcome that looks identical to success once sent.
                <p className="mt-1 flex items-center gap-1.5 text-[11.5px] font-[650]" style={{ color: '#b45309' }}>
                  <AlertTriangle size={11} /> This would reach nobody. Widen the audience.
                </p>
              ) : (
                <ul className="mt-1.5 space-y-0.5">
                  {preview.sample.map((s, i) => (
                    <li key={i} className="truncate text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                      {s.organization_name} — {s.name} ({roleLabel(s.role)})
                    </li>
                  ))}
                  {preview.recipient_count > preview.sample.length && (
                    <li className="text-[11px]" style={{ color: 'var(--text-disabled)' }}>
                      …and {preview.recipient_count - preview.sample.length} more
                    </li>
                  )}
                </ul>
              )}
              <button onClick={() => setPreview(null)} className="mt-2 text-[11px] font-[650]" style={{ color: 'var(--text-muted)' }}>
                Hide
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Panel ───────────────────────────────────────────────────────────────── */
export default function NotificationCentre() {
  const [rows, setRows] = useState<Announcement[] | null>(null);
  const [plans, setPlans] = useState<SubPlan[]>([]);
  const [error, setError] = useState('');
  const [composing, setComposing] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [filter, setFilter] = useState('');

  const load = useCallback(() => {
    setError('');
    api.superAdmin.announcements(filter || undefined)
      .then((r) => setRows(r.data))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load announcements.'));
  }, [filter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    // The plan catalogue is the same one studios see; there is no super-admin
    // variant of it, and the rest of the Control Centre reads it from here too.
    api.subscription.plans().then((r) => setPlans(r.data.plans ?? [])).catch(() => setPlans([]));
  }, []);

  const counts = useMemo(() => {
    const c = { draft: 0, scheduled: 0, sent: 0 };
    for (const a of rows ?? []) if (a.status in c) c[a.status as keyof typeof c]++;
    return c;
  }, [rows]);

  const filters = [
    { id: '', label: 'All' },
    { id: 'draft', label: `Drafts${counts.draft ? ` (${counts.draft})` : ''}` },
    { id: 'scheduled', label: `Scheduled${counts.scheduled ? ` (${counts.scheduled})` : ''}` },
    { id: 'sent', label: 'Sent' },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-[14px] p-3.5" style={cardStyle}>
        <p className="flex items-start gap-2 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
          <Megaphone size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--brand)' }} />
          <span>
            Announcements land in each studio&rsquo;s notification bell. <strong>Sending cannot be undone</strong> —
            compose a draft, preview exactly who it reaches, then send.
          </span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-[11px] p-1" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
          {filters.map((f) => (
            <button
              key={f.id} onClick={() => setFilter(f.id)}
              className="min-h-[44px] rounded-[8px] px-2.5 text-[11px] font-[700] transition-colors"
              style={filter === f.id
                ? { background: 'var(--bg-card)', color: 'var(--text-primary)', boxShadow: '0 1px 3px rgba(15,23,42,0.10)' }
                : { color: 'var(--text-muted)' }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setEditing(null); setComposing(true); }}
          className="flex h-10 items-center gap-1.5 rounded-[11px] px-3 text-[12px] font-[700] text-white"
          style={{ background: 'var(--brand)' }}
        >
          <Plus size={13} /> New announcement
        </button>
      </div>

      <AnimatePresence initial={false}>
        {composing && (
          <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }} className="overflow-hidden">
            <Composer
              initial={editing} plans={plans}
              onClose={() => { setComposing(false); setEditing(null); }}
              onSaved={load}
            />
          </m.div>
        )}
      </AnimatePresence>

      <div className="overflow-hidden rounded-[16px]" style={cardStyle}>
        {!rows && !error && (
          <div className="flex flex-col items-center gap-2.5 py-14">
            <Loader2 size={22} className="animate-spin" style={{ color: 'var(--brand)' }} />
            <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>Loading announcements…</p>
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center gap-2.5 py-14 text-center">
            <AlertTriangle size={22} style={{ color: 'var(--danger-text)' }} />
            <p className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{error}</p>
            <button onClick={load} className="mt-1 text-[12px] font-[700]" style={{ color: 'var(--brand)' }}>Try again</button>
          </div>
        )}
        {rows?.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <CheckCircle2 size={22} style={{ color: 'var(--text-disabled)' }} />
            <p className="text-[13px] font-[650]" style={{ color: 'var(--text-secondary)' }}>Nothing here yet</p>
            <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
              Announcements you compose will appear here as drafts first.
            </p>
          </div>
        )}
        {rows?.map((a) => (
          <Row
            key={a.id} a={a} onChanged={load}
            onEdit={() => { setEditing(a); setComposing(true); }}
          />
        ))}
      </div>
    </div>
  );
}
