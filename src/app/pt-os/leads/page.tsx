'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import {
  UserSearch, Plus, Search, Phone, Mail, Calendar, Pencil, Trash2,
  ArrowRightCircle, X, Check, Loader2, Users, TrendingUp, Target, PhoneCall,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Button, FloatInput, EmptyState, PullToRefresh } from '@/components/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import SearchableSelect from '@/components/pt-os/SearchableSelect';
import { useAsync } from '@/lib/use-async';
import { api } from '@/lib/api';
import type { PtLead } from '@/lib/api';
import { useToast } from '@/lib/toast';

const SOURCE_OPTIONS = [
  { value: 'walk-in', label: 'Walk-in' },
  { value: 'referral', label: 'Referral' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'website', label: 'Website' },
  { value: 'phone', label: 'Phone Enquiry' },
  { value: 'other', label: 'Other' },
];

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  new:             { label: 'New',             color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  contacted:       { label: 'Contacted',        color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  trial_scheduled: { label: 'Trial Scheduled',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  converted:       { label: 'Converted',        color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  lost:            { label: 'Lost',             color: '#94a3b8', bg: 'rgba(148,163,184,0.14)' },
};

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'trial_scheduled', label: 'Trial Scheduled' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
];

/**
 * A titled group of fields inside the lead dialog.
 *
 * The label wears the same micro-label treatment as the KPI captions on the
 * page behind it, so the dialog reads as part of that screen. Its job is to
 * break eight inputs into groups small enough to take in at a glance.
 */
function FormSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      {/* The trailing rule is doing real work, not decoration. SearchableSelect
          renders its own uppercase label above the field ("SOURCE", "TRAINER"),
          so a group heading in the same case and a similar size reads as a
          competing sibling rather than a level above it. The rule and the
          darker ink settle which is which. */}
      <div className="flex items-center gap-2.5">
        <h3
          className="shrink-0 text-[10.5px] font-[750] uppercase tracking-wide"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </h3>
        <span aria-hidden className="h-px flex-1" style={{ background: 'var(--border)' }} />
      </div>
      {children}
    </section>
  );
}

interface LeadFormState {
  name: string;
  mobile: string;
  email: string;
  source: string;
  interested_package: string;
  trainer_id: string;
  trainer_name: string;
  follow_up_date: string;
  notes: string;
}

const emptyForm: LeadFormState = {
  name: '', mobile: '', email: '', source: 'walk-in', interested_package: '',
  trainer_id: '', trainer_name: '', follow_up_date: '', notes: '',
};

function fmtDate(d?: string | null) {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function LeadCard({
  lead, index, onEdit, onConvert, onDelete, converting,
}: {
  lead: PtLead; index: number;
  onEdit: () => void; onConvert: () => void; onDelete: () => void;
  converting: boolean;
}) {
  const meta = STATUS_META[lead.status] ?? STATUS_META.new;
  const initials = lead.name.split(' ').map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const isConverted = lead.status === 'converted';
  const followUp = fmtDate(lead.follow_up_date);

  return (
    <m.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.03, duration: 0.3 }}
      className="rounded-[18px] p-4 sm:p-5"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[13px] text-[12px] font-[800] text-white"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}
          >
            {initials || '?'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-[760]" style={{ color: 'var(--text-primary)' }}>{lead.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2.5">
              {lead.mobile && (
                <span className="flex items-center gap-1 text-[11.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>
                  <Phone size={11} />{lead.mobile}
                </span>
              )}
              {lead.email && (
                <span className="flex items-center gap-1 text-[11.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>
                  <Mail size={11} />{lead.email}
                </span>
              )}
            </div>
          </div>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-[750] uppercase tracking-wide"
          style={{ background: meta.bg, color: meta.color }}
        >
          {meta.label}
        </span>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <span
          className="rounded-[8px] px-2.5 py-1 text-[11px] font-[650] capitalize"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
        >
          {SOURCE_OPTIONS.find((s) => s.value === lead.source)?.label || lead.source}
        </span>
        {lead.interested_package && (
          <span className="rounded-[8px] px-2.5 py-1 text-[11px] font-[650]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
            {lead.interested_package}
          </span>
        )}
        {lead.trainer_name && (
          <span className="rounded-[8px] px-2.5 py-1 text-[11px] font-[650]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
            {lead.trainer_name}
          </span>
        )}
        {followUp && (
          <span className="flex items-center gap-1 rounded-[8px] px-2.5 py-1 text-[11px] font-[650]" style={{ background: 'rgba(245,158,11,0.1)', color: '#b45309' }}>
            <Calendar size={11} />Follow up {followUp}
          </span>
        )}
      </div>

      {lead.notes && (
        <p className="mt-3 text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{lead.notes}</p>
      )}

      <div className="mt-4 flex items-center gap-2 border-t pt-3.5" style={{ borderColor: 'var(--border)' }}>
        {!isConverted ? (
          <Button
            variant="primary" iconLeft={converting ? undefined : <ArrowRightCircle size={14} />}
            loading={converting} disabled={converting}
            onClick={onConvert}
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff' }}
          >
            Convert to Client
          </Button>
        ) : (
          <span className="flex items-center gap-1.5 text-[12px] font-[700]" style={{ color: '#10b981' }}>
            <Check size={13} />Converted{lead.converted_at ? ` on ${fmtDate(lead.converted_at)}` : ''}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {!isConverted && (
            <button
              type="button" onClick={onEdit} aria-label="Edit lead"
              className="flex h-8 w-8 items-center justify-center rounded-[9px] transition-colors hover:bg-[var(--bg-hover)]"
              style={{ border: '1px solid var(--border)' }}
            >
              <Pencil size={13} style={{ color: 'var(--text-muted)' }} />
            </button>
          )}
          <button
            type="button" onClick={onDelete} aria-label="Delete lead"
            className="flex h-8 w-8 items-center justify-center rounded-[9px] transition-colors hover:bg-[var(--bg-hover)]"
            style={{ border: '1px solid var(--border)' }}
          >
            <Trash2 size={13} style={{ color: '#ef4444' }} />
          </button>
        </div>
      </div>
    </m.div>
  );
}

export default function LeadsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const leads = useAsync(() => api.pt.leads.list().then((r) => r), []);
  const trainers = useAsync(() => api.pt.trainers().then((r) => (r as { data?: { id: string; name: string }[] })?.data ?? []), []);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LeadFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const set = <K extends keyof LeadFormState>(key: K, val: LeadFormState[K]) => setForm((f) => ({ ...f, [key]: val }));

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (lead: PtLead) => {
    setEditingId(lead.id);
    setForm({
      name: lead.name,
      mobile: lead.mobile || '',
      email: lead.email || '',
      source: lead.source || 'other',
      interested_package: lead.interested_package || '',
      trainer_id: lead.trainer_id || '',
      trainer_name: lead.trainer_name || '',
      follow_up_date: lead.follow_up_date ? String(lead.follow_up_date).slice(0, 10) : '',
      notes: lead.notes || '',
    });
    setDialogOpen(true);
  };

  const filtered = useMemo(() => (leads.data?.data ?? []).filter((l) => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(l.name.toLowerCase().includes(q) || (l.mobile || '').includes(q) || (l.email || '').toLowerCase().includes(q))) return false;
    }
    return true;
  }), [leads.data, search, statusFilter]);

  const counts = useMemo(() => {
    const all = leads.data?.data ?? [];
    return {
      total: all.length,
      new: all.filter((l) => l.status === 'new').length,
      inProgress: all.filter((l) => l.status === 'contacted' || l.status === 'trial_scheduled').length,
      converted: all.filter((l) => l.status === 'converted').length,
    };
  }, [leads.data]);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required.'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        mobile: form.mobile.replace(/\D/g, '') || undefined,
        email: form.email.trim() || undefined,
        source: form.source || 'other',
        interested_package: form.interested_package.trim() || undefined,
        trainer_id: form.trainer_id || undefined,
        trainer_name: form.trainer_name || undefined,
        follow_up_date: form.follow_up_date || undefined,
        notes: form.notes.trim() || undefined,
      };
      if (editingId) {
        await api.pt.leads.update(editingId, payload);
        toast.success('Lead updated.');
      } else {
        await api.pt.leads.create(payload);
        toast.success('Lead added.');
      }
      setDialogOpen(false);
      leads.refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not save this lead.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (lead: PtLead) => {
    if (!window.confirm(`Delete the lead "${lead.name}"? This can't be undone.`)) return;
    try {
      await api.pt.leads.delete(lead.id);
      toast.success('Lead deleted.');
      leads.refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not delete this lead.');
    }
  };

  const handleConvert = async (lead: PtLead) => {
    if (!window.confirm(`Convert "${lead.name}" into a client? You'll continue on to enroll them in a PT package.`)) return;
    setConvertingId(lead.id);
    try {
      const res = await api.pt.leads.convert(lead.id);
      const clientId = res?.data?.client_id;
      toast.success('Lead converted — continue enrolling them.');
      leads.refetch();
      if (clientId) router.push(`/pt-os/clients/${clientId}/enroll`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not convert this lead.');
    } finally {
      setConvertingId(null);
    }
  };

  return (
    <Guard>
      <AppShell>
        <PullToRefresh onRefresh={leads.refetch}>
          {/* No background or horizontal padding of our own: .shell-main
              (globals.css) already paints the canvas and supplies the page
              gutter + max-width. Re-declaring them here painted a greyer
              --bg-subtle panel on top of --bg-canvas and doubled the side
              padding, so the page sat narrower and a different colour than
              every other screen. */}
          <div className="relative z-10 mx-auto mt-1 w-full max-w-[1600px] pb-6">

              {/* Header */}
              <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px]"
                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', boxShadow: '0 8px 28px rgba(139,92,246,0.35)' }}>
                    <UserSearch size={24} className="text-white" />
                  </div>
                  <div>
                    <h1 className="text-[24px] sm:text-[28px] font-[860] tracking-[-0.03em]" style={{ color: 'var(--text-primary)' }}>Leads</h1>
                    <p className="mt-0.5 text-[13px] font-[500]" style={{ color: 'var(--text-muted)' }}>Prospective clients, before they enrol in PT</p>
                  </div>
                </div>
                <Button iconLeft={<Plus size={15} />} onClick={openCreate}
                  style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: '#fff' }}>
                  Add Lead
                </Button>
              </m.div>

              {/* KPIs */}
              <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Total Leads', value: counts.total, icon: <Users size={16} className="text-white" />, from: '#8b5cf6', to: '#6d28d9' },
                  { label: 'New', value: counts.new, icon: <Target size={16} className="text-white" />, from: '#8b5cf6', to: '#7c3aed' },
                  { label: 'In Progress', value: counts.inProgress, icon: <PhoneCall size={16} className="text-white" />, from: '#3b82f6', to: '#2563eb' },
                  { label: 'Converted', value: counts.converted, icon: <TrendingUp size={16} className="text-white" />, from: '#10b981', to: '#059669' },
                ].map((c) => (
                  <div key={c.label} className="rounded-[16px] p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
                    <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}>
                      {c.icon}
                    </div>
                    <p className="text-[20px] font-[820] tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>{leads.data ? c.value : '—'}</p>
                    <p className="mt-0.5 text-[10.5px] font-[650] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{c.label}</p>
                  </div>
                ))}
              </div>

              {/* Toolbar */}
              <div className="mb-4 flex flex-wrap items-center gap-2.5">
                <div className="relative min-w-[200px] flex-1 sm:max-w-sm">
                  <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-disabled)' }} />
                  <input
                    type="text" placeholder="Search leads…" value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-[12px] py-2.5 pl-9 pr-4 text-[12.5px] font-[500] outline-none transition-colors"
                    style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div className="flex flex-wrap gap-1 rounded-[12px] p-1" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                  {STATUS_FILTERS.map((f) => (
                    <button key={f.value} onClick={() => setStatusFilter(f.value)}
                      className="rounded-[8px] px-3 py-2 text-[11px] font-[700] transition-all"
                      style={statusFilter === f.value
                        ? { background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: '#fff' }
                        : { color: 'var(--text-muted)' }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* List */}
              {leads.loading && !leads.data && (
                <div className="flex flex-col items-center justify-center gap-3 py-20">
                  <Loader2 size={26} className="animate-spin" style={{ color: '#8b5cf6' }} />
                  <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Loading leads…</p>
                </div>
              )}

              {!leads.loading && filtered.length === 0 && (
                <div className="rounded-[20px] p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
                  <EmptyState
                    icon={<UserSearch size={22} />}
                    title={search || statusFilter !== 'all' ? 'No leads found' : 'No leads yet'}
                    description={search || statusFilter !== 'all'
                      ? 'Try adjusting your search or filters.'
                      : 'Capture a walk-in, referral, or enquiry here before they enrol.'}
                  />
                  {!search && statusFilter === 'all' && (
                    <div className="mt-4 flex justify-center">
                      <Button iconLeft={<Plus size={14} />} onClick={openCreate}>Add Lead</Button>
                    </div>
                  )}
                </div>
              )}

              {filtered.length > 0 && (
                <div className="space-y-3">
                  {filtered.map((lead, i) => (
                    <LeadCard
                      key={lead.id} lead={lead} index={i}
                      onEdit={() => openEdit(lead)}
                      onConvert={() => handleConvert(lead)}
                      onDelete={() => handleDelete(lead)}
                      converting={convertingId === lead.id}
                    />
                  ))}
                </div>
              )}
          </div>
        </PullToRefresh>

        {/* Add / Edit dialog */}
        {/*
          Built to the same language as the page behind it — the violet gradient
          badge, the uppercase micro-labels and the card radii all come from the
          header and KPI row above, so opening the dialog does not feel like
          landing in a different product.

          Three structural choices, all of them about the phone:

          · p-0 with its own header / body / footer rows, so the BODY scrolls
            and the actions stay put. Previously the whole form was one column
            inside a centred dialog: with the keyboard up, Save was somewhere
            below the fold and the fields after Trainer were unreachable.
          · Fields are grouped and titled rather than run together. Eight
            unlabelled inputs in a stack is a wall; four short named groups is
            a form you can see the end of.
          · max-h-[85dvh] on a phone. Deliberately not 100dvh — leaving the
            page visible behind the dialog is what makes it read as a sheet
            over the list rather than a new screen.
        */}
        <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) setDialogOpen(false); }}>
          {/* grid-rows-[auto_minmax(0,1fr)_auto]: header and footer take their
              natural height and the body gets whatever is left. The minmax(0,…)
              is the load-bearing part — a default `1fr` row refuses to shrink
              below its content, so the body would push the footer off the
              bottom and overflow-hidden would clip it. Sizing the body with a
              hand-computed calc() instead is what broke first: it assumed a
              one-line header, and the description wraps to two on a phone. */}
          <DialogContent className="grid max-h-[85dvh] max-w-lg grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-xl">
            <DialogHeader
              className="shrink-0 flex-row items-center gap-3.5 px-5 pb-4 pt-5 sm:px-6"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', boxShadow: '0 6px 20px rgba(139,92,246,0.32)' }}
              >
                <UserSearch size={19} className="text-white" />
              </div>
              {/* pr-8 keeps the title clear of the dialog's own close button. */}
              <div className="min-w-0 pr-8">
                <DialogTitle className="text-[17px] font-[820] tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
                  {editingId ? 'Edit Lead' : 'Add Lead'}
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-[12px] font-[500]" style={{ color: 'var(--text-muted)' }}>
                  Capture the essentials — you can fill in the rest later.
                </DialogDescription>
              </div>
            </DialogHeader>

            {/* The only scrolling region. overscroll-contain stops a flick at
                the end of the list from scrolling the page underneath. */}
            <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-5">
                <FormSection label="Contact">
                  <FloatInput label="Full Name" required value={form.name} onChange={(v) => set('name', v)} />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FloatInput label="Mobile" type="tel" value={form.mobile} onChange={(v) => set('mobile', v)} />
                    <FloatInput label="Email" type="email" value={form.email} onChange={(v) => set('email', v)} />
                  </div>
                </FormSection>

                <FormSection label="Where they came from">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <SearchableSelect
                      label="Source" allowCustom={false}
                      value={form.source} onChange={(v) => set('source', v)}
                      options={SOURCE_OPTIONS}
                    />
                    <SearchableSelect
                      label="Trainer" allowCustom={false}
                      value={form.trainer_id}
                      onChange={(v) => {
                        set('trainer_id', v);
                        set('trainer_name', (trainers.data ?? []).find((t) => t.id === v)?.name || '');
                      }}
                      options={(trainers.data ?? []).map((t) => ({ value: t.id, label: t.name }))}
                      placeholder="Unassigned"
                    />
                  </div>
                </FormSection>

                <FormSection label="What they want">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FloatInput label="Interested Package" value={form.interested_package} onChange={(v) => set('interested_package', v)} />
                    <FloatInput label="Follow-up Date" type="date" value={form.follow_up_date} onChange={(v) => set('follow_up_date', v)} />
                  </div>
                </FormSection>

                <FormSection label="Notes">
                  <FloatInput label="Anything worth remembering" multiline rows={3} value={form.notes} onChange={(v) => set('notes', v)} />
                </FormSection>
              </div>
            </div>

            {/* Pinned, so the primary action is reachable at any scroll
                position and with the keyboard open. */}
            <div
              className="shrink-0 flex items-center justify-end gap-2 px-5 py-3.5 sm:px-6"
              style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-subtle)' }}
            >
              <Button type="button" variant="outline" iconLeft={<X size={14} />} onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button" loading={saving} disabled={saving}
                iconLeft={!saving ? <Check size={15} /> : undefined}
                onClick={handleSave}
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: '#fff' }}
              >
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Lead'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </AppShell>
    </Guard>
  );
}
