'use client';

import * as React from 'react';
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { AnimatePresence, m } from 'framer-motion';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
} from 'recharts';
import Guard from '@/components/Guard';
import { Button } from '@/components/ui/Button';
import { PageTitle } from '@/components/ui/PageTitle';
import { cn } from '@/components/ui/cn';
import { useToast } from '@/lib/toast';
import { moduleService } from '@/lib/module-service';
import type { ModuleConfig, ModuleRecord } from '@/lib/module-config';
import { series } from '@/lib/palette';

type FormState = Omit<ModuleRecord, 'id' | 'createdAt' | 'updatedAt'>;

const pageSizeOptions = [5, 10, 20];
const chartColors = series;

const accentClasses = {
  blue: 'from-blue-600 to-cyan-500',
  green: 'from-emerald-600 to-teal-500',
  yellow: 'from-amber-500 to-orange-500',
  purple: 'from-violet-600 to-fuchsia-500',
  red: 'from-rose-600 to-red-500',
};

const blankForm = (config: ModuleConfig): FormState => ({
  title: '',
  owner: '',
  status: config.statuses[0] || 'Draft',
  priority: 'Medium',
  amount: 0,
  dueDate: new Date().toISOString().slice(0, 10),
  channel: config.channels[0] || 'Front desk',
  notes: '',
});

export default function ModuleWorkspace({ config }: { config: ModuleConfig }) {
  const { toast } = useToast();
  const [records, setRecords] = React.useState<ModuleRecord[]>([]);
  const [source, setSource] = React.useState<'api'>('api');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState('All');
  const [priority, setPriority] = React.useState('All');
  const [sortBy, setSortBy] = React.useState<'dueDate' | 'amount' | 'title' | 'status'>('dueDate');
  const [pageSize, setPageSize] = React.useState(10);
  const [page, setPage] = React.useState(1);
  const [form, setForm] = React.useState<FormState>(() => blankForm(config));
  const [formError, setFormError] = React.useState('');
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await moduleService.list(config);
      setRecords(result.records);
      setSource(result.source);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load module data');
    } finally {
      setLoading(false);
    }
  }, [config]);

  React.useEffect(() => {
    setForm(blankForm(config));
    setEditingId(null);
    setPage(1);
    void load();
  }, [config, load]);

  const filtered = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return records
      .filter((record) => {
        const matchesSearch =
          !normalized ||
          [record.title, record.owner, record.status, record.priority, record.channel, record.notes]
            .join(' ')
            .toLowerCase()
            .includes(normalized);
        const matchesStatus = status === 'All' || record.status === status;
        const matchesPriority = priority === 'All' || record.priority === priority;
        return matchesSearch && matchesStatus && matchesPriority;
      })
      .sort((a, b) => {
        if (sortBy === 'amount') return b.amount - a.amount;
        return String(a[sortBy]).localeCompare(String(b[sortBy]));
      });
  }, [records, query, status, priority, sortBy]);

  React.useEffect(() => {
    setPage(1);
  }, [query, status, priority, pageSize, config.key]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRecords = filtered.slice((page - 1) * pageSize, page * pageSize);
  const activeCount = records.filter((r) => ['Active', 'Approved', 'Confirmed', 'On Track', 'Online', 'Published', 'Assigned'].includes(r.status)).length;
  const pendingCount = records.filter((r) => ['Pending', 'Draft', 'Requested', 'Scheduled', 'Syncing', 'Queued'].includes(r.status)).length;
  const urgentCount = records.filter((r) => ['High', 'Urgent'].includes(r.priority)).length;

  const statusData = React.useMemo(
    () =>
      config.statuses.map((name) => ({
        name,
        value: records.filter((record) => record.status === name).length,
      })).filter((item) => item.value > 0),
    [config.statuses, records],
  );

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormError('');
  }

  function validate() {
    if (!form.title.trim()) return 'Title is required';
    if (!form.owner.trim()) return 'Owner is required';
    if (!form.status) return 'Status is required';
    if (!form.priority) return 'Priority is required';
    if (!form.channel) return 'Channel is required';
    if (!form.dueDate) return 'Due date is required';
    if (Number.isNaN(Number(form.amount)) || Number(form.amount) < 0) return 'Value must be zero or greater';
    return '';
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const validation = validate();
    if (validation) {
      setFormError(validation);
      toast.warning(validation);
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const updated = await moduleService.update(config, editingId, form);
        setRecords((prev) => prev.map((record) => (record.id === editingId ? updated : record)));
        toast.success(`${config.entityName} updated`);
      } else {
        const created = await moduleService.create(config, form);
        setRecords((prev) => [created, ...prev]);
        toast.success(`${config.entityName} created`);
      }
      setForm(blankForm(config));
      setEditingId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove(record: ModuleRecord) {
    if (!window.confirm(`Delete "${record.title}"?`)) return;
    await moduleService.remove(config, record.id);
    setRecords((prev) => prev.filter((item) => item.id !== record.id));
    toast.success(`${config.entityName} deleted`);
  }

  function startEdit(record: ModuleRecord) {
    setEditingId(record.id);
    setForm({
      title: record.title,
      owner: record.owner,
      status: record.status,
      priority: record.priority,
      amount: record.amount,
      dueDate: record.dueDate,
      channel: record.channel,
      notes: record.notes,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function exportCsv() {
    const headers = ['Title', 'Owner', 'Status', 'Priority', 'Value', 'Due Date', 'Channel', 'Notes'];
    const rows = filtered.map((record) =>
      [record.title, record.owner, record.status, record.priority, record.amount, record.dueDate, record.channel, record.notes]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(','),
    );
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${config.key}-export.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success('CSV export started');
  }

  return (
    // The role Guard stays here — it is per-config, and (chrome)/layout.tsx
    // deliberately guards only "is there a session". AppShell used to be here
    // too, which is why these eight routes read as unshelled in their own
    // page.tsx while rendering the full staff chrome; they now inherit it from
    // the layout like everything else. PageTitle preserves the plain heading
    // AppShell's `title` prop drew above the workspace's own hero.
    <Guard role={config.role}>
      <PageTitle>{config.title}</PageTitle>
      <div className="page-main">
        <div className="page-content fade-up">
          <div className="grid gap-4">
            <section className="overflow-hidden rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F172A] shadow-sm">
              <div className={cn('h-1.5 bg-gradient-to-r', accentClasses[config.accent])} />
              <div className="grid gap-4 p-4 lg:grid-cols-[1.4fr_0.9fr] lg:items-center">
                <div>
                  <p className="eyebrow">{config.eyebrow}</p>
                  <h1 className="m-0 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-3xl">{config.title}</h1>
                  <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600 dark:text-white/60">{config.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {config.workflows.map((item) => (
                      <span key={item} className="rounded border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-white/70">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
                  <MetricCard label="Records" value={records.length} icon={<BarChart3 className="h-4 w-4" />} />
                  <MetricCard label="Active" value={activeCount} icon={<CheckCircle2 className="h-4 w-4" />} />
                  <MetricCard label="Pending" value={pendingCount} icon={<CalendarDays className="h-4 w-4" />} />
                  <MetricCard label="Urgent" value={urgentCount} icon={<AlertTriangle className="h-4 w-4" />} />
                </div>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[0.95fr_1.35fr]">
              <form onSubmit={submit} className="rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F172A] p-4 shadow-sm">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="m-0 text-base font-bold text-slate-900 dark:text-white">{editingId ? 'Edit record' : config.primaryAction}</h2>
                    <p className="mt-1 text-xs text-slate-500 dark:text-white/50">Validated form with API-backed save.</p>
                  </div>
                  {editingId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(null);
                        setForm(blankForm(config));
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
                {formError && <div className="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">{formError}</div>}
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Title" required>
                    <input className="input" value={form.title} onChange={(e) => updateForm('title', e.target.value)} placeholder="May renewal campaign" />
                  </Field>
                  <Field label="Owner" required>
                    <input className="input" value={form.owner} onChange={(e) => updateForm('owner', e.target.value)} placeholder="Owner name" />
                  </Field>
                  <Field label="Status" required>
                    <select className="input select" value={form.status} onChange={(e) => updateForm('status', e.target.value)}>
                      {config.statuses.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </Field>
                  <Field label="Priority" required>
                    <select className="input select" value={form.priority} onChange={(e) => updateForm('priority', e.target.value)}>
                      {config.priorities.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </Field>
                  <Field label="Value" required>
                    <input className="input" type="number" min={0} value={form.amount} onChange={(e) => updateForm('amount', Number(e.target.value))} />
                  </Field>
                  <Field label="Due date" required>
                    <input className="input" type="date" value={form.dueDate} onChange={(e) => updateForm('dueDate', e.target.value)} />
                  </Field>
                  <Field label="Channel" required>
                    <select className="input select" value={form.channel} onChange={(e) => updateForm('channel', e.target.value)}>
                      {config.channels.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Notes">
                      <textarea className="input" rows={3} value={form.notes} onChange={(e) => updateForm('notes', e.target.value)} placeholder="Add details, approvals, audience, receipt notes, or reminders" />
                    </Field>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="submit" loading={saving} iconLeft={<Plus className="h-4 w-4" />}>
                    {editingId ? 'Save changes' : config.primaryAction}
                  </Button>
                  <Button variant="outline" iconLeft={<RefreshCw className="h-4 w-4" />} onClick={load} disabled={loading}>
                    Refresh
                  </Button>
                </div>
              </form>

              {/* One card, not two.
                *
                * The card that used to sit beside this one was titled
                * "Performance Trend" and plotted eight points built from
                * `index * 8 + (index % 2) * 11` — a line that rose because the
                * arithmetic made it rise, on every tab of eight route groups.
                * The panel that used to sit inside this one showed
                * `(records.length + index * 3) % 19` beside labels like
                * "Campaign ROI". Neither number came from a record.
                *
                * The status mix below is real: it counts `records` by status.
                * The breakdown beside it replaces the invented figures with
                * the counts the chart is actually drawn from, which also
                * means the slices carry their values in text — the reason
                * there is no tooltip here.
                *
                * A genuine trend needs a server-side aggregate: this client
                * only ever holds 500 rows, ordered by due date, so it cannot
                * see a module's history well enough to chart it. */}
              <section className="rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F172A] p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="m-0 text-base font-bold text-slate-900 dark:text-white">Status Mix</h2>
                  <SlidersHorizontal className="h-4 w-4 text-slate-500 dark:text-white/50" />
                </div>
                {statusData.length === 0 ? (
                  <p className="m-0 py-10 text-center text-sm text-slate-500 dark:text-white/50">
                    {loading ? 'Loading…' : `No ${config.entityName.toLowerCase()}s yet — add one above and the mix appears here.`}
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-[0.9fr_1fr] sm:items-center">
                    <div
                      className="h-48"
                      role="img"
                      aria-label={`${config.entityName} status mix: ${statusData.map((d) => `${d.name} ${d.value}`).join(', ')}`}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={72} paddingAngle={3} isAnimationActive={false}>
                            {statusData.map((entry, index) => (
                              <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid gap-2">
                      {statusData.map((entry, index) => (
                        <div key={entry.name} className="flex items-center justify-between gap-3 rounded border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 px-3 py-2">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: chartColors[index % chartColors.length] }} />
                            <span className="truncate text-xs font-semibold text-slate-600 dark:text-white/60">{entry.name}</span>
                          </span>
                          <span className="shrink-0 text-sm font-extrabold tabular-nums text-slate-900 dark:text-white">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </section>

            <section className="rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F172A] shadow-sm">
              <div className="grid gap-3 border-b border-slate-200 dark:border-white/10 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-white/40" />
                    <input aria-label={`Search ${config.entityName.toLowerCase()}s`} className="input pl-8" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${config.entityName.toLowerCase()}s`} />
                  </div>
                  <select aria-label="Filter by status" className="input select max-w-[180px]" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option>All</option>
                    {config.statuses.map((item) => <option key={item}>{item}</option>)}
                  </select>
                  <select aria-label="Filter by priority" className="input select max-w-[160px]" value={priority} onChange={(e) => setPriority(e.target.value)}>
                    <option>All</option>
                    {config.priorities.map((item) => <option key={item}>{item}</option>)}
                  </select>
                  <select aria-label="Sort by" className="input select max-w-[160px]" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
                    <option value="dueDate">Due date</option>
                    <option value="amount">Value</option>
                    <option value="title">Title</option>
                    <option value="status">Status</option>
                  </select>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-2 py-1 text-xs font-semibold text-slate-600 dark:text-white/60">
                    {source === 'api' ? 'API connected' : 'Mock API fallback'}
                  </span>
                  <Button variant="outline" iconLeft={<Download className="h-4 w-4" />} onClick={exportCsv}>
                    Export CSV
                  </Button>
                </div>
              </div>

              <div className="table-wrap overflow-x-auto">
                {loading ? (
                  <div className="grid min-h-64 place-items-center p-8 text-slate-500 dark:text-white/50">
                    <Loader2 className="mb-3 h-6 w-6 animate-spin" />
                    Loading {config.title.toLowerCase()}...
                  </div>
                ) : error ? (
                  <EmptyState title="Could not load records" description={error} icon={<AlertTriangle className="h-8 w-8" />} />
                ) : pageRecords.length === 0 ? (
                  <EmptyState title="No records found" description="Adjust filters or create a new record to populate this module." icon={<Filter className="h-8 w-8" />} />
                ) : (
                  <table className="min-w-[900px]">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Owner</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th>Value</th>
                        <th>Due</th>
                        <th>Channel</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence initial={false}>
                        {pageRecords.map((record) => (
                          <m.tr key={record.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <td>
                              <div className="font-semibold text-slate-900 dark:text-white">{record.title}</div>
                              <div className="max-w-sm truncate text-xs text-slate-500 dark:text-white/50">{record.notes || 'No notes'}</div>
                            </td>
                            <td>{record.owner}</td>
                            <td><StatusPill status={record.status} /></td>
                            <td><PriorityPill priority={record.priority} /></td>
                            <td className="tabular font-bold">₹{Number(record.amount || 0).toLocaleString('en-IN')}</td>
                            <td className="tabular text-slate-600 dark:text-white/60">{record.dueDate}</td>
                            <td>{record.channel}</td>
                            <td>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => startEdit(record)}>Edit</Button>
                                <Button size="sm" variant="danger" onClick={() => remove(record)} aria-label={`Delete ${record.title}`}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </m.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-white/10 p-3">
                <div className="text-xs font-medium text-slate-500 dark:text-white/50">
                  Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)} of {filtered.length}
                </div>
                <div className="flex items-center gap-2">
                  <select aria-label="Rows per page" className="input select h-8 max-w-[90px]" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                    {pageSizeOptions.map((size) => <option key={size} value={size}>{size}/page</option>)}
                  </select>
                  <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Previous page">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs font-bold text-slate-600 dark:text-white/60">Page {page} / {totalPages}</span>
                  <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} aria-label="Next page">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Guard>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3">
      <div className="mb-2 flex items-center justify-between text-slate-500 dark:text-white/50">
        <span className="text-[11px] font-bold uppercase tracking-wide">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-extrabold tabular text-slate-900 dark:text-white">{value.toLocaleString('en-IN')}</div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-white/60">
      <span>{label}{required ? ' *' : ''}</span>
      {children}
    </label>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone = /active|approved|paid|ready|online|published|confirmed|achieved|completed/i.test(status)
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : /pending|draft|scheduled|queued|requested/i.test(status)
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : /rejected|failed|overdue|critical|damaged|offline/i.test(status)
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-white/70';
  return <span className={cn('rounded border px-2 py-1 text-xs font-bold', tone)}>{status}</span>;
}

function PriorityPill({ priority }: { priority: string }) {
  const tone = priority === 'Urgent' || priority === 'High' ? 'bg-rose-100 text-rose-700' : priority === 'Medium' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/60';
  return <span className={cn('rounded px-2 py-1 text-xs font-bold', tone)}>{priority}</span>;
}

function EmptyState({ title, description, icon }: { title: string; description: string; icon: React.ReactNode }) {
  return (
    <div className="grid min-h-64 place-items-center p-8 text-center">
      <div>
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-white/40">{icon}</div>
        <h3 className="m-0 text-base font-bold text-slate-900 dark:text-white">{title}</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-white/50">{description}</p>
      </div>
    </div>
  );
}
