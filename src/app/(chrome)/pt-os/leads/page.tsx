'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import {
  UserSearch, Plus, Search, Phone, Mail, Calendar, Pencil, Trash2,
  ArrowRightCircle, X, Check, Users, TrendingUp, Target, PhoneCall,
} from 'lucide-react';
import Guard from '@/components/Guard';
import {
  Button, EmptyState, KpiCard, PageActions, PageContainer, PageHero, PullToRefresh, Skeleton,
} from '@/components/ui';
import { ChartDataTable, PremiumBarChart, semantic, series as chartPalette } from '@/components/visualizations';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { LeadFormFields, SOURCE_OPTIONS, emptyLeadForm } from '@/components/pt-os/leads/LeadFormFields';
import type { LeadFormState } from '@/components/pt-os/leads/LeadFormFields';
import LeadFollowupAction from '@/components/pt-os/leads/LeadFollowupAction';
import { useAsync } from '@/lib/use-async';
import { api } from '@/lib/api';
import type { PtLead } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { errorMessage } from '@/lib/forms/errors';

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  new:             { label: 'New',             color: 'var(--info-text)', bg: 'var(--info-soft)' },
  contacted:       { label: 'Contacted',        color: 'var(--accent-warm-text)', bg: 'var(--accent-warm-soft)' },
  trial_scheduled: { label: 'Trial Scheduled',  color: 'var(--warning-text)', bg: 'var(--warning-soft)' },
  converted:       { label: 'Converted',        color: 'var(--success-text)', bg: 'var(--success-soft)' },
  lost:            { label: 'Lost',             color: 'var(--text-muted)', bg: 'var(--bg-subtle)' },
};

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'trial_scheduled', label: 'Trial Scheduled' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
];

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
      className="rounded-[20px] p-4 transition-shadow duration-200 hover:shadow-[var(--shadow-card-hover)] sm:p-5"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-[800] text-white"
            style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--shadow-brand)' }}
          >
            {initials || '?'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-[760]" style={{ color: 'var(--text-primary)' }}>{lead.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
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
          className="rounded-full px-2.5 py-1 text-[11px] font-[650] capitalize"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
        >
          {SOURCE_OPTIONS.find((s) => s.value === lead.source)?.label || lead.source}
        </span>
        {lead.interested_package && (
          <span className="rounded-full px-2.5 py-1 text-[11px] font-[650]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
            {lead.interested_package}
          </span>
        )}
        {lead.trainer_name && (
          <span className="rounded-full px-2.5 py-1 text-[11px] font-[650]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
            {lead.trainer_name}
          </span>
        )}
        {followUp && (
          <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-[650]"
            style={{ background: 'var(--warning-soft)', color: 'var(--warning-text)' }}>
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
            variant="success" iconLeft={converting ? undefined : <ArrowRightCircle size={14} />}
            loading={converting} disabled={converting}
            onClick={onConvert}
          >
            Convert to Client
          </Button>
        ) : (
          <span className="flex items-center gap-1.5 text-[12px] font-[700]" style={{ color: 'var(--success-text)' }}>
            <Check size={13} />Converted{lead.converted_at ? ` on ${fmtDate(lead.converted_at)}` : ''}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {!isConverted && (
            <button
              type="button" onClick={onEdit} aria-label="Edit lead"
              className="flex h-10 w-10 items-center justify-center rounded-[11px] transition-colors hover:bg-[var(--bg-hover)]"
              style={{ border: '1px solid var(--border)' }}
            >
              <Pencil size={14} style={{ color: 'var(--text-muted)' }} />
            </button>
          )}
          <button
            type="button" onClick={onDelete} aria-label="Delete lead"
            className="flex h-10 w-10 items-center justify-center rounded-[11px] transition-colors hover:bg-[var(--bg-hover)]"
            style={{ border: '1px solid var(--border)' }}
          >
            <Trash2 size={14} style={{ color: 'var(--danger-text)' }} />
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
  const [form, setForm] = useState<LeadFormState>(emptyLeadForm);
  const [saving, setSaving] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const set = <K extends keyof LeadFormState>(key: K, val: LeadFormState[K]) => setForm((f) => ({ ...f, [key]: val }));

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

  // One pass for the chart. Status is the lead's current state, not a history,
  // so these are stage counts — not a cumulative conversion funnel.
  const byStatus = useMemo(() => {
    const out: Record<string, number> = {};
    for (const l of leads.data?.data ?? []) out[l.status] = (out[l.status] ?? 0) + 1;
    return out;
  }, [leads.data]);

  const handleSave = async () => {
    if (!editingId) return;
    if (!form.name.trim()) { toast.error('Name is required.'); return; }
    setSaving(true);
    try {
      await api.pt.leads.update(editingId, {
        name: form.name.trim(),
        mobile: form.mobile.replace(/\D/g, '') || undefined,
        email: form.email.trim() || undefined,
        source: form.source || 'other',
        interested_package: form.interested_package.trim() || undefined,
        trainer_id: form.trainer_id || undefined,
        trainer_name: form.trainer_name || undefined,
        follow_up_date: form.follow_up_date || undefined,
        notes: form.notes.trim() || undefined,
      });
      toast.success('Lead updated.');
      setDialogOpen(false);
      leads.refetch();
    } catch (err: unknown) {
      toast.error(errorMessage(err, 'Could not save this lead.'));
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
      toast.error(errorMessage(err, 'Could not delete this lead.'));
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
      toast.error(errorMessage(err, 'Could not convert this lead.'));
    } finally {
      setConvertingId(null);
    }
  };

  const filteredView = !!search || statusFilter !== 'all';

  return (
    <Guard>
      <PullToRefresh onRefresh={leads.refetch}>
        {/* max-w-7xl, exactly as the dashboard — this was
            max-w-[1600px] with mt-1. */}
        <PageContainer>
          <PageHero
            accent="amber"
            icon={<UserSearch size={20} />}
            title="Leads"
          />
          <PageActions>
            <LeadFollowupAction />
            <Button iconLeft={<Plus size={15} />} onClick={() => router.push('/pt-os/leads/new')}>
              Add Lead
            </Button>
          </PageActions>

          {/* KPIs — 2x2 on a phone, 4 across from `sm`. Each takes its own
              accent rather than four of the same, and the semantics drive the
              choice: In Progress is work outstanding so it is amber,
              Converted is a success so it is emerald. Counts come from the
              loaded leads and the status values the backend actually uses —
              nothing here is hardcoded, so a zero is a real zero. */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Total Leads', value: counts.total, icon: <Users size={17} />, accent: 'blue' as const },
              { label: 'New', value: counts.new, icon: <Target size={17} />, accent: 'orange' as const },
              { label: 'In Progress', value: counts.inProgress, icon: <PhoneCall size={17} />, accent: 'amber' as const },
              { label: 'Converted', value: counts.converted, icon: <TrendingUp size={17} />, accent: 'emerald' as const },
            ].map((c) => (
              <KpiCard
                key={c.label}
                label={c.label}
                value={leads.data ? c.value : '—'}
                icon={c.icon}
                accent={c.accent}
                loading={leads.loading && !leads.data}
              />
            ))}
          </div>

          {leads.error && (
            <div
              role="alert"
              className="flex items-center gap-3 rounded-[16px] px-4 py-3 text-[12.5px]"
              style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)' }}
            >
              <span className="flex-1">The lead list did not come back — this is unknown, not empty.</span>
              <Button size="sm" variant="secondary" onClick={() => { void leads.refetch(); }}>Retry</Button>
            </div>
          )}

          {/* Search and filters come before the pipeline chart. The list is
              what the page is for; the chart summarises the whole pipeline
              regardless of either control. */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search size={18} aria-hidden className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                aria-label="Search leads"
                type="search" placeholder="Search leads…" value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-[52px] w-full rounded-[15px] pl-11 pr-4 text-[15px] font-[500] outline-none transition-all focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] sm:max-w-md"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  boxShadow: 'var(--shadow-xs)',
                }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div
                className="flex flex-wrap gap-1 rounded-full p-1"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
              >
                {STATUS_FILTERS.map((f) => (
                  <button key={f.value} type="button" onClick={() => setStatusFilter(f.value)}
                    aria-pressed={statusFilter === f.value}
                    className="rounded-full px-2.5 py-2 text-[11.5px] font-[700] transition-all active:scale-[0.97] sm:px-3.5 sm:text-[13px]"
                    style={statusFilter === f.value
                      ? { background: 'var(--gradient-brand)', color: '#fff', boxShadow: 'var(--shadow-sm)' }
                      : { color: 'var(--text-secondary)' }}>
                    {f.label}
                  </button>
                ))}
              </div>
              <span className="ml-auto text-[11.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>
                {filteredView
                  ? <><span className="font-[800] text-[var(--text-primary)]">{filtered.length}</span> of {counts.total}</>
                  : <><span className="font-[800] text-[var(--text-primary)]">{counts.total}</span> {counts.total === 1 ? 'lead' : 'leads'}</>}
              </span>
            </div>
          </div>

          {/* List */}
          {leads.loading && !leads.data && (
            <div className="space-y-3" aria-busy="true" aria-label="Loading leads">
              {[0, 1, 2].map((i) => <Skeleton key={i} height={168} className="rounded-[20px]" />)}
            </div>
          )}

          {!leads.loading && !leads.error && filtered.length === 0 && (
            <div className="rounded-[20px] p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
              <EmptyState
                icon={<UserSearch size={22} />}
                title={filteredView ? 'No leads found' : 'No leads yet'}
                description={filteredView
                  ? 'Try adjusting your search or filters.'
                  : 'Capture a walk-in, referral, or enquiry here before they enrol.'}
                action={!filteredView
                  ? <Button iconLeft={<Plus size={14} />} onClick={() => router.push('/pt-os/leads/new')}>Add Lead</Button>
                  : undefined}
              />
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

          {/* Whole-pipeline counts, independent of search and status filters.
              The list endpoint returns every lead, so these are exact; the
              chart is the same data the KPI row above already trusts.
              shortcut: counts come from the full list because /leads is
              uncapped. If it ever paginates, move the counts server-side. */}
          <PremiumBarChart
            data={counts.total > 0
              ? [
                  { stage: 'New', leads: byStatus.new ?? 0, color: semantic.info },
                  { stage: 'Contacted', leads: byStatus.contacted ?? 0, color: chartPalette[0] },
                  { stage: 'Trial', leads: byStatus.trial_scheduled ?? 0, color: chartPalette[3] },
                  { stage: 'Converted', leads: byStatus.converted ?? 0, color: semantic.success },
                  { stage: 'Lost', leads: byStatus.lost ?? 0, color: chartPalette[6] },
                ]
              : []}
            xKey="stage"
            bars={[{ key: 'leads', label: 'Leads', color: semantic.info, colorKey: 'color' }]}
            showLegend={false}
            title="Lead funnel"
            subtitle="Every lead by current stage — states, not cumulative conversion"
            height={240}
            loading={leads.loading && !leads.data}
            error={!leads.data ? (leads.error?.message ?? null) : null}
            onRetry={() => { void leads.refetch(); }}
            emptyTitle="No leads yet"
            emptyDescription="Capture a lead to start the pipeline."
            ariaLabel={`Lead stages: ${byStatus.new ?? 0} new, ${byStatus.contacted ?? 0} contacted, ${byStatus.trial_scheduled ?? 0} trial scheduled, ${byStatus.converted ?? 0} converted, ${byStatus.lost ?? 0} lost.`}
          />

          <ChartDataTable
            title="Lead funnel"
            caption="Every lead counted once by its current stage; stages are not cumulative"
            columns={[{ header: 'Stage' }, { header: 'Leads' }]}
            rows={counts.total > 0
              ? [
                  { key: 'new', cells: ['New', byStatus.new ?? 0] },
                  { key: 'contacted', cells: ['Contacted', byStatus.contacted ?? 0] },
                  { key: 'trial', cells: ['Trial', byStatus.trial_scheduled ?? 0] },
                  { key: 'converted', cells: ['Converted', byStatus.converted ?? 0] },
                  { key: 'lost', cells: ['Lost', byStatus.lost ?? 0] },
                ]
              : []}
            footer={counts.total > 0 ? ['Total', counts.total] : undefined}
            emptyMessage={leads.data ? 'No leads yet.' : 'The lead list did not come back.'}
          />
        </PageContainer>
      </PullToRefresh>

      {/* Add / Edit dialog */}
      {/*
        Built to the same language as the page behind it — the brand gradient
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
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-white"
              style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--shadow-brand)' }}
            >
              <UserSearch size={19} />
            </div>
            {/* pr-8 keeps the title clear of the dialog's own close button. */}
            <div className="min-w-0 pr-8">
              <DialogTitle className="text-[17px] font-[820] tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
                Edit Lead
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-[12px] font-[500]" style={{ color: 'var(--text-muted)' }}>
                Capture the essentials — you can fill in the rest later.
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* The only scrolling region. overscroll-contain stops a flick at
              the end of the list from scrolling the page underneath. */}
          <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
            <LeadFormFields form={form} set={set} trainers={trainers.data ?? []} />
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
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Guard>
  );
}
