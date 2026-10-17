'use client';

// One virtual machine — metrics, backups, snapshots and Docker.
//
// ── Everything that changes the machine goes through the gate ───────────────
//
// Start, stop, restart, snapshot, restore, recreate, Docker start/stop/down:
// every one of them is `plan` then `execute`, so each button here produces the
// same card the assistant produces — what will run, against which machine, and
// (for the destructive class) a typed operation id. This screen never calls a
// write endpoint directly, because the server would refuse it anyway and a
// button that looks like it works is worse than no button.
//
// ── What is NOT here, and why ──────────────────────────────────────────────
//
// There is no terminal and no file manager: the Hostinger API has no exec or
// VPS-filesystem endpoint, so there is nothing to build them on. Rather than a
// disabled tab with a lock icon, the screen says so in a sentence, next to the
// Docker projects that ARE supported. A capability gap an operator understands
// costs one sentence; an unexplained missing feature costs a support ticket.
//
// ── Metrics are a read, and reads are cheap but not free ────────────────────
//
// The budget is 90 requests a minute for the whole token. This screen makes one
// metrics call on open and one more on refresh — never a poll.

import { useCallback, useEffect, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowLeft, Boxes, Camera, Database, HardDrive,
  Loader2, Play, RotateCw, Server, Square, Terminal, Trash2, Undo2,
} from 'lucide-react';
import { api } from '@/lib/api';
import type {
  HostingerCatalogue, HostingerDockerProject, HostingerVpsDetail,
} from '@/lib/api';
import { Button, TextInput } from '@/components/ui';
import { Panel, Reveal, SectionLabel } from './console';
import { ErrorState } from '@/app/(platform)/platform/_shared/ui';
import { errorMessage } from '@/lib/forms/errors';
import {
  ApprovalGateCard, CapabilityGaps, SafetyBadge, fmtBytes, fmtDate, fmtDuration,
  fmtMaybeEpoch, fmtMetric, fmtWhen, metric, nf, num, previewJson, prop, rows,
  slotData, slotError, str, useApprovalGate,
} from './hosting-shared';

/** The window the metrics card asks for. The API requires an explicit range. */
function lastDayWindow() {
  const to = new Date();
  const from = new Date(to.getTime() - 24 * 3600 * 1000);
  return { date_from: from.toISOString(), date_to: to.toISOString() };
}

export function HostingVps({ virtualMachineId, onBack }: { virtualMachineId: number; onBack: () => void }) {
  const [detail, setDetail] = useState<HostingerVpsDetail | null>(null);
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [catalogue, setCatalogue] = useState<HostingerCatalogue | null>(null);
  const [openProject, setOpenProject] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState('');
  const [rootPassword, setRootPassword] = useState('');
  const [panelPassword, setPanelPassword] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');

  const load = useCallback(async () => {
    setError(null);
    setMetricsError(null);
    try {
      const [nextDetail, nextMetrics, nextCatalogue] = await Promise.all([
        api.superAdmin.hostingerVps(virtualMachineId),
        api.superAdmin.hostingerRead('vps.metrics', { path: { virtualMachineId }, query: lastDayWindow() })
          .then((r) => r.data as Record<string, unknown>)
          .catch((err) => { setMetricsError(errorMessage(err, 'Metrics could not be read.')); return null; }),
        api.superAdmin.hostingerCatalogue().catch(() => null),
      ]);
      setDetail(nextDetail);
      setMetrics(nextMetrics);
      if (nextCatalogue) setCatalogue(nextCatalogue);
    } catch (err) {
      setError(errorMessage(err, 'That machine could not be read.'));
    } finally {
      setLoading(false);
    }
  }, [virtualMachineId]);

  // Re-reading after a write is the point of onDone: a restart that succeeded
  // should change the state on screen without the operator reloading.
  const gate = useApprovalGate(load);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-2.5 py-16">
        <Loader2 size={22} className="animate-spin" style={{ color: 'var(--brand)' }} />
        <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>Reading machine #{virtualMachineId}…</p>
      </div>
    );
  }

  if (error && !detail) return <ErrorState error={error} onRetry={() => { void load(); }} />;

  const machine = slotData<Record<string, unknown>>(detail?.machine);
  const machineError = slotError(detail?.machine);
  const actions = rows(slotData(detail?.actions));
  const backups = rows(slotData(detail?.backups));
  const snapshot = slotData<Record<string, unknown>>(detail?.snapshot);
  const snapshotError = slotError(detail?.snapshot);
  const projects = rows(slotData(detail?.docker));
  const state = str(machine?.state);
  const labels = catalogue?.safetyLabels;
  /** null when the API did not report a state — then nothing is disabled on a guess. */
  const running = state ? /running/i.test(state) : null;

  /** The three machine-level controls, each through the gate. */
  const quick: { id: string; label: string; icon: React.ReactNode; disabled?: boolean }[] = [
    { id: 'vps.start', label: 'Start', icon: <Play size={13} />, disabled: running === true },
    { id: 'vps.restart', label: 'Restart', icon: <RotateCw size={13} />, disabled: running === false },
    { id: 'vps.stop', label: 'Stop', icon: <Square size={13} />, disabled: running === false },
  ];

  const path = { virtualMachineId };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="outline" size="sm" iconLeft={<ArrowLeft size={13} />} onClick={onBack}>Back to the estate</Button>
        <p className="text-[11px]" style={{ color: 'var(--text-disabled)' }}>
          Machine #{virtualMachineId} · reads are audited, writes need approval
        </p>
      </div>

      {/* ── What it is ─────────────────────────────────────────────────────── */}
      <Reveal>
        <Panel>
          {machineError ? (
            <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
              <AlertTriangle size={13} className="mr-1.5 inline" style={{ color: '#b45309' }} />
              This machine could not be read: {machineError.message}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[11px]" style={{ background: 'rgba(10,132,255,0.12)', color: 'var(--brand)' }}>
                    <Server size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-[800]" style={{ color: 'var(--text-primary)' }}>
                      {str(machine?.hostname) ?? `machine #${virtualMachineId}`}
                    </p>
                    <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                      {state ?? 'state not reported'} · {str(machine?.plan) ?? 'plan not reported'} · created {fmtDate(machine?.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {quick.map((q) => (
                    <Button key={q.id} variant="outline" size="sm" iconLeft={q.icon} disabled={q.disabled || gate.busy}
                      onClick={() => { void gate.request(q.id, { path }); }}>
                      {q.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Fact label="vCPU" value={num(machine?.cpus) !== null ? nf(num(machine?.cpus) as number) : '—'} />
                <Fact label="Memory" value={num(machine?.memory) !== null ? `${nf(num(machine?.memory) as number)} MB` : '—'} />
                <Fact label="Disk" value={num(machine?.disk) !== null ? `${nf(num(machine?.disk) as number)} MB` : '—'} />
                <Fact label="IPv4" value={str(machine?.ipv4) ?? '—'} mono />
              </div>
            </>
          )}
        </Panel>
      </Reveal>

      {gate.state.phase !== 'idle' && (
        <Reveal>
          <ApprovalGateCard gate={gate} onDismiss={gate.reset} />
        </Reveal>
      )}

      {/* ── What it is doing ───────────────────────────────────────────────── */}
      <Reveal delay={0.04}>
        <Panel>
          <SectionLabel hint="Last 24 hours, one read on open">Readings</SectionLabel>
          {metricsError ? (
            <p className="py-2 text-[12px]" style={{ color: '#b45309' }}>
              <AlertTriangle size={13} className="mr-1.5 inline" />{metricsError}
            </p>
          ) : !metrics ? (
            <p className="py-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>No metrics were returned for this window.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Reading icon={<Activity size={13} />} label="CPU" data={metrics} keyName="cpu_usage" />
              <Reading icon={<Database size={13} />} label="RAM" data={metrics} keyName="ram_usage" />
              <Reading icon={<HardDrive size={13} />} label="Disk" data={metrics} keyName="disk_space" />
              <div className="rounded-[11px] px-3 py-2" style={{ background: 'var(--bg-subtle)' }}>
                <p className="text-[9.5px] font-[750] uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>Uptime</p>
                <p className="mt-0.5 text-[15px] font-[800] tabular-nums" style={{ color: 'var(--text-primary)' }}>
                  {fmtDuration(metric(metrics, 'uptime')?.value ?? null)}
                </p>
              </div>
            </div>
          )}
        </Panel>
      </Reveal>

      {/* ── Snapshots and backups ──────────────────────────────────────────── */}
      <Reveal delay={0.08}>
        <Panel>
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <SectionLabel hint="The restore point, and the plan's backups">Snapshots and backups</SectionLabel>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" iconLeft={<Camera size={13} />} disabled={gate.busy}
                onClick={() => { void gate.request('vps.snapshot.create', { path }); }}>Take a snapshot</Button>
              {snapshot && (
                <>
                  <Button variant="outline" size="sm" iconLeft={<Undo2 size={13} />} disabled={gate.busy}
                    onClick={() => { void gate.request('vps.snapshot.restore', { path }); }}>Restore it</Button>
                  <Button variant="outline" size="sm" iconLeft={<Trash2 size={13} />} disabled={gate.busy}
                    onClick={() => { void gate.request('vps.snapshot.delete', { path }); }}>Delete it</Button>
                </>
              )}
            </div>
          </div>

          {snapshotError ? (
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>The snapshot could not be read: {snapshotError.message}</p>
          ) : !snapshot ? (
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>No snapshot on this machine. Take one before anything risky.</p>
          ) : (
            <div className="rounded-[11px] px-3 py-2" style={{ background: 'var(--bg-subtle)' }}>
              <p className="text-[12.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>
                Snapshot #{num(snapshot.id) ?? '?'}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                created {fmtWhen(snapshot.created_at)} · expires {fmtDate(snapshot.expires_at)}
                {num(snapshot.restore_time) !== null ? ` · restorable ${fmtMaybeEpoch(snapshot.restore_time)}` : ''}
              </p>
            </div>
          )}

          <div className="mt-3">
            {!backups.length ? (
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>No plan backups listed for this machine.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {backups.slice(0, 8).map((b, i) => (
                  <div key={num(b.id) ?? i} className="flex flex-wrap items-center justify-between gap-2 rounded-[11px] px-3 py-2" style={{ background: 'var(--bg-subtle)' }}>
                    <div className="min-w-0">
                      <p className="text-[12px] font-[700]" style={{ color: 'var(--text-primary)' }}>
                        Backup #{num(b.id) ?? '?'} · {fmtBytes(b.size)}
                      </p>
                      <p className="text-[10.5px]" style={{ color: 'var(--text-disabled)' }}>
                        {fmtWhen(b.created_at)}{str(b.location) ? ` · ${b.location}` : ''}
                        {num(b.restore_time) !== null ? ` · restorable from ${fmtMaybeEpoch(b.restore_time)}` : ''}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" disabled={gate.busy}
                      onClick={() => { void gate.request('vps.backup.restore', { path: { virtualMachineId, backupId: num(b.id) ?? 0 } }); }}>
                      Restore
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>
      </Reveal>

      {/* ── Docker ─────────────────────────────────────────────────────────── */}
      <Reveal delay={0.12}>
        <Panel>
          <SectionLabel hint={`${projects.length} Compose project${projects.length === 1 ? '' : 's'}`}>Docker projects</SectionLabel>
          {!projects.length ? (
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>No Docker Compose projects on this machine.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {projects.map((p, i) => {
                const name = str(p.name) ?? `project-${i + 1}`;
                const isOpen = openProject === name;
                return (
                  <div key={name} className="rounded-[12px]" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                      <button type="button" onClick={() => setOpenProject(isOpen ? null : name)} className="min-w-0 text-left">
                        <p className="truncate text-[12.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>
                          {name} <span className="text-[10.5px] font-[600]" style={{ color: 'var(--text-disabled)' }}>{isOpen ? '▾' : '▸'}</span>
                        </p>
                        <p className="truncate text-[10.5px]" style={{ color: 'var(--text-disabled)' }}>
                          {[str(p.status), str(p.state), num(p.containers) !== null ? `${nf(num(p.containers) as number)} containers` : null, str(p.path)]
                            .filter(Boolean).join(' · ') || 'state not reported'}
                        </p>
                      </button>
                      <div className="flex flex-wrap gap-1.5">
                        {(['start', 'stop', 'restart', 'update'] as const).map((verb) => (
                          <Button key={verb} variant="outline" size="sm" disabled={gate.busy}
                            onClick={() => { void gate.request(`vps.docker.${verb}`, { path: { virtualMachineId, projectName: name } }); }}>
                            {verb === 'update' ? 'Pull & recreate' : verb[0].toUpperCase() + verb.slice(1)}
                          </Button>
                        ))}
                        <Button variant="outline" size="sm" disabled={gate.busy}
                          onClick={() => { void gate.request('vps.docker.down', { path: { virtualMachineId, projectName: name } }); }}>
                          Take down
                        </Button>
                      </div>
                    </div>
                    {isOpen && <ProjectDetail virtualMachineId={virtualMachineId} projectName={name} />}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </Reveal>

      {/* ── What has already happened ──────────────────────────────────────── */}
      <Reveal delay={0.16}>
        <Panel>
          <SectionLabel hint="As the API reports them">Recent machine actions</SectionLabel>
          {!actions.length ? (
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>No actions recorded upstream.</p>
          ) : (
            <div className="flex flex-col">
              {actions.slice(0, 10).map((a, i) => (
                <div key={num(a.id) ?? i} className="flex items-baseline justify-between gap-2 border-b py-1.5 last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                  <p className="truncate text-[12px] font-[650]" style={{ color: 'var(--text-primary)' }}>{str(a.name) ?? 'action'}</p>
                  <p className="shrink-0 text-[10.5px]" style={{ color: statusColor(str(a.state)) }}>
                    {str(a.state) ?? 'state not reported'} · {fmtWhen(a.updated_at ?? a.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </Reveal>

      {/* ── Recreate and recovery are destructive and get their own block ──── */}
      <Reveal delay={0.2}>
        <Panel>
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            <SectionLabel hint="Not a button you press by accident">Rebuild the machine</SectionLabel>
            <SafetyBadge safety="destructive" labels={labels} />
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Recreating returns the machine to a fresh template — everything on the disk goes with it. Both of these ask for their
            credentials here so the approval you read is the request that runs; the passwords are never stored, never audited and
            never shown to the assistant.
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[12px] p-3" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              <p className="text-[12px] font-[750]" style={{ color: 'var(--text-primary)' }}>Recreate from a template</p>
              <TextInput
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value.replace(/[^0-9]/g, ''))}
                inputMode="numeric"
                placeholder="Template id"
                aria-label="Template id"
                className="mt-2"
              />
              <TextInput
                type="password"
                value={rootPassword}
                onChange={(e) => setRootPassword(e.target.value)}
                placeholder="Root password (optional)"
                aria-label="Root password"
                autoComplete="new-password"
                className="mt-2"
              />
              <TextInput
                type="password"
                value={panelPassword}
                onChange={(e) => setPanelPassword(e.target.value)}
                placeholder="Panel password (optional)"
                aria-label="Panel password"
                autoComplete="new-password"
                className="mt-2"
              />
              <Button variant="outline" size="sm" className="mt-2" disabled={gate.busy || !templateId}
                onClick={() => {
                  void gate.request('vps.recreate', {
                    path,
                    body: {
                      template_id: Number(templateId),
                      ...(rootPassword ? { password: rootPassword } : {}),
                      ...(panelPassword ? { panel_password: panelPassword } : {}),
                    },
                  });
                }}>
                Recreate
              </Button>
            </div>

            <div className="rounded-[12px] p-3" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              <p className="text-[12px] font-[750]" style={{ color: 'var(--text-primary)' }}>Enter recovery mode</p>
              <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Reboots into a rescue image with the root password you set. The machine stays offline until you leave it.
              </p>
              <TextInput
                type="password"
                value={recoveryPassword}
                onChange={(e) => setRecoveryPassword(e.target.value)}
                placeholder="Root password"
                aria-label="Recovery root password"
                autoComplete="new-password"
                className="mt-2"
              />
              <Button variant="outline" size="sm" className="mt-2" disabled={gate.busy || recoveryPassword.length < 8}
                onClick={() => { void gate.request('vps.recovery', { path, body: { root_password: recoveryPassword } }); }}>
                Reboot into recovery
              </Button>
            </div>
          </div>
        </Panel>
      </Reveal>

      <Reveal delay={0.24}>
        <CapabilityGaps spec={catalogue?.spec} scope="vps" />
      </Reveal>
    </div>
  );
}

function Fact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-[10px] px-2.5 py-2" style={{ background: 'var(--bg-subtle)' }}>
      <p className="text-[9px] font-[750] uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>{label}</p>
      <p className="mt-0.5 truncate text-[12.5px] font-[700]" style={{ color: 'var(--text-primary)', fontFamily: mono ? 'ui-monospace, monospace' : undefined }}>{value}</p>
    </div>
  );
}

function Reading({ icon, label, data, keyName }: { icon: React.ReactNode; label: string; data: unknown; keyName: string }) {
  const m = metric(data, keyName);
  return (
    <div className="rounded-[11px] px-3 py-2" style={{ background: 'var(--bg-subtle)' }}>
      <p className="flex items-center gap-1 text-[9.5px] font-[750] uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
        {icon}{label}
      </p>
      <p className="mt-0.5 text-[15px] font-[800] tabular-nums" style={{ color: 'var(--text-primary)' }}>{fmtMetric(m)}</p>
      {m?.at && <p className="text-[9.5px]" style={{ color: 'var(--text-disabled)' }}>{fmtWhen(new Date(m.at * 1000).toISOString())}</p>}
    </div>
  );
}

function statusColor(state: string | null) {
  if (!state) return 'var(--text-muted)';
  if (/success/i.test(state)) return '#047857';
  if (/error|delayed/i.test(state)) return '#b45309';
  return 'var(--text-muted)';
}

/* ── One Docker project, read on demand ───────────────────────────────────── */

function ProjectDetail({ virtualMachineId, projectName }: { virtualMachineId: number; projectName: string }) {
  const [detail, setDetail] = useState<HostingerDockerProject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.superAdmin.hostingerDockerProject(virtualMachineId, projectName)
      .then((d) => { if (!cancelled) setDetail(d); })
      .catch((err) => { if (!cancelled) setError(errorMessage(err, 'That project could not be read.')); });
    return () => { cancelled = true; };
  }, [virtualMachineId, projectName]);

  if (error) return <p className="px-3 pb-3 text-[11.5px]" style={{ color: '#b45309' }}>{error}</p>;
  if (!detail) {
    return (
      <p className="flex items-center gap-2 px-3 pb-3 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
        <Loader2 size={12} className="animate-spin" />Reading the project…
      </p>
    );
  }

  const project = slotData<Record<string, unknown>>(detail.project);
  const containers = rows(slotData(detail.containers));
  const logs = slotData<unknown>(detail.logs);
  const projectError = slotError(detail.project);

  return (
    <div className="border-t px-3 py-3" style={{ borderColor: 'var(--border)' }}>
      {projectError && <p className="mb-2 text-[11.5px]" style={{ color: '#b45309' }}>{projectError.message}</p>}

      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-[750] uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.12em' }}>
          Containers — {containers.length}
        </p>
        <Button variant="outline" size="sm" iconLeft={<Boxes size={12} />} onClick={() => setShowConfig((v) => !v)}>
          {showConfig ? 'Hide compose file' : 'Show compose file'}
        </Button>
      </div>

      {!containers.length ? (
        <p className="mt-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>No containers reported.</p>
      ) : (
        <div className="mt-1 flex flex-col gap-1">
          {containers.map((c, i) => {
            const health = str(c.health);
            return (
              <div key={str(c.id) ?? i} className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] px-2.5 py-1.5"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <div className="min-w-0">
                  <p className="truncate text-[11.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>{str(c.name) ?? `container ${i + 1}`}</p>
                  <p className="truncate text-[10px]" style={{ color: 'var(--text-disabled)' }}>
                    {str(c.image) ?? 'image not reported'} · {str(c.status) ?? 'status not reported'}
                  </p>
                </div>
                <p className="shrink-0 text-[10.5px]" style={{ color: health && /healthy/i.test(health) ? '#047857' : 'var(--text-muted)' }}>
                  {health ?? str(c.state) ?? ''}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {showConfig && (
        <div className="mt-2">
          <p className="mb-1 text-[10px] font-[750] uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.12em' }}>Project file</p>
          <pre className="max-h-64 overflow-auto rounded-[10px] p-2.5 text-[10.5px] leading-relaxed"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            {str(prop(project, 'content')) ?? 'not reported'}
          </pre>
        </div>
      )}

      <div className="mt-2">
        <p className="mb-1 flex items-center gap-1 text-[10px] font-[750] uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.12em' }}>
          <Terminal size={11} />Container logs
        </p>
        <pre className="max-h-64 overflow-auto rounded-[10px] p-2.5 text-[10.5px] leading-relaxed"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          {typeof logs === 'string' ? logs : previewJson(logs, 6000) || 'No logs returned.'}
        </pre>
      </div>
    </div>
  );
}

export default HostingVps;
