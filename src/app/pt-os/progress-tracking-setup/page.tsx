'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import {
  Flag, Loader2, AlertCircle, Check, X, ChevronRight, Camera, Ruler, Zap,
  Move, Accessibility, AlertTriangle,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Button, DonutChart } from '@/components/ui';
import ClientPicker from '@/components/pt-os/shared/ClientPicker';
import { api } from '@/lib/api';

interface CompletionItem {
  key: string;
  label: string;
  done: boolean;
  icon: ReactNode;
  href: string;
  accent: string;
}

export default function ProgressTrackingSetupPage() {
  return (
    <Guard>
      <AppShell>
        <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#F59E0B' }} /></div>}>
          <ProgressTrackingSetupContent />
        </Suspense>
      </AppShell>
    </Guard>
  );
}

function ProgressTrackingSetupContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const clientId = sp.get('client_id') || '';

  if (!clientId) return <ClientPicker title="Progress Tracking Overview" subtitle="Pick a client to see their baseline completion" icon={<Flag size={20} color="#fff" />} basePath="/pt-os/progress-tracking-setup" />;
  return <BaselineDashboard key={clientId} clientId={clientId} router={router} />;
}

/* ─────────────────────────────────────────────────────── DASHBOARD */
interface BaselineDashboardProps { clientId: string; router: ReturnType<typeof useRouter>; }

function BaselineDashboard({ clientId }: BaselineDashboardProps) {
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [assessments, setAssessments] = useState<Record<string, unknown>[]>([]);
  const [photos, setPhotos] = useState<Record<string, unknown>[]>([]);
  const [strengthLogs, setStrengthLogs] = useState<Record<string, unknown>[]>([]);
  const [mobilityAssessments, setMobilityAssessments] = useState<Record<string, unknown>[]>([]);
  const [postureAssessments, setPostureAssessments] = useState<Record<string, unknown>[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [clientRes, assessRes, photosRes, strengthRes, mobilityRes, postureRes] = await Promise.all([
        api.pt.client(clientId) as Promise<{ data?: Record<string, unknown> }>,
        api.progress.assessments.list({ client_id: clientId }) as Promise<{ data?: Record<string, unknown>[] }>,
        api.progress.progressPhotos.list({ client_id: clientId }) as Promise<{ data?: Record<string, unknown>[] }>,
        api.progress.strengthLogs.list({ client_id: clientId }) as Promise<{ data?: Record<string, unknown>[] }>,
        api.progress.mobilityPerformanceAssessments.list({ client_id: clientId }) as Promise<{ data?: Record<string, unknown>[] }>,
        api.progress.postureAssessments.list({ client_id: clientId }) as Promise<{ data?: Record<string, unknown>[] }>,
      ]);
      const c = clientRes?.data;
      if (!c) { setLoadError('Client not found.'); setLoading(false); return; }
      setClientName(String(c.name ?? ''));
      setAssessments(Array.isArray(assessRes?.data) ? assessRes.data : []);
      setPhotos(Array.isArray(photosRes?.data) ? photosRes.data : []);
      setStrengthLogs(Array.isArray(strengthRes?.data) ? strengthRes.data : []);
      setMobilityAssessments(Array.isArray(mobilityRes?.data) ? mobilityRes.data : []);
      setPostureAssessments(Array.isArray(postureRes?.data) ? postureRes.data : []);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load client.');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { loadData(); }, [loadData]);

  const latestAssessment = useMemo(
    () => [...assessments].sort((a, b) => String(b.assessment_date ?? '').localeCompare(String(a.assessment_date ?? '')))[0],
    [assessments]
  );
  const latestMobility = useMemo(
    () => [...mobilityAssessments].sort((a, b) => String(b.assessment_date ?? '').localeCompare(String(a.assessment_date ?? '')))[0],
    [mobilityAssessments]
  );
  const latestPosture = useMemo(
    () => [...postureAssessments].sort((a, b) => String(b.assessment_date ?? '').localeCompare(String(a.assessment_date ?? '')))[0],
    [postureAssessments]
  );

  const hasMeasurements = assessments.length > 0;
  const hasPhotos = photos.length > 0;
  const hasStrength = strengthLogs.length > 0;
  const hasMobility = mobilityAssessments.length > 0;
  const hasPosture = postureAssessments.length > 0;
  const baselineCreated = hasMeasurements && hasPhotos && hasStrength && hasMobility && hasPosture;

  const items: CompletionItem[] = [
    { key: 'measurements', label: 'Measurements Saved', done: hasMeasurements, icon: <Ruler size={16} />, href: `/pt-os/assessment?client_id=${clientId}`, accent: '#10b981' },
    { key: 'photos', label: 'Photos Uploaded', done: hasPhotos, icon: <Camera size={16} />, href: `/pt-os/progress-photos?client_id=${clientId}`, accent: '#F59E0B' },
    { key: 'strength', label: 'Strength Baseline', done: hasStrength, icon: <Zap size={16} />, href: `/pt-os/strength-tracking?client_id=${clientId}`, accent: '#f59e0b' },
    { key: 'mobility', label: 'Mobility Baseline', done: hasMobility, icon: <Move size={16} />, href: `/pt-os/mobility-assessment?client_id=${clientId}`, accent: '#0067e0' },
    { key: 'posture', label: 'Posture Assessment', done: hasPosture, icon: <Accessibility size={16} />, href: `/pt-os/posture-assessment?client_id=${clientId}`, accent: '#0067e0' },
  ];

  const scores = [
    typeof latestAssessment?.overall_fitness_score === 'number' ? latestAssessment.overall_fitness_score : null,
    typeof latestMobility?.mobility_score === 'number' ? latestMobility.mobility_score : null,
    typeof latestPosture?.posture_risk_score === 'number' ? latestPosture.posture_risk_score : null,
  ].filter((s): s is number => s != null);
  const baselineScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  const alerts: string[] = [];
  if (!hasPhotos) alerts.push('No progress photos uploaded yet.');
  if (!hasMeasurements) alerts.push('No body measurements recorded yet — start with Fitness Testing.');
  if (!hasStrength) alerts.push('No strength baseline logged yet.');
  if (!hasMobility) alerts.push('No mobility assessment on file yet.');
  if (!hasPosture) alerts.push('No posture assessment on file yet.');

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#F59E0B' }} /></div>;
  }
  if (loadError) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <AlertCircle size={32} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
        <p className="text-[14px] font-[600] text-slate-600">{loadError}</p>
        <Button variant="outline" className="mt-4" onClick={loadData}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl py-6 space-y-6">
      <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[24px] p-8 sm:p-10"
        style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)', boxShadow: '0 12px 40px rgba(15,23,42,0.25)' }}>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: 'rgba(245,158,11,0.15)' }}>
            <Flag size={16} color="#F59E0B" />
          </div>
          <span className="text-[11px] font-[650] uppercase tracking-[0.08em]" style={{ color: 'rgba(255,255,255,0.5)' }}>Progress Tracking Overview</span>
        </div>
        <h1 className="text-[26px] sm:text-[32px] font-[860] tracking-[-0.03em] leading-tight text-white">
          {clientName}&apos;s Baseline
        </h1>
        <p className="mt-2 text-[13px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {baselineCreated ? 'Baseline complete — every component is on file.' : 'Create Your Baseline Transformation Record'}
        </p>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 items-center">
          <DonutChart
            data={[
              { name: 'Score', value: baselineScore ?? 0, color: '#F59E0B' },
              { name: 'Remaining', value: 100 - (baselineScore ?? 0), color: 'rgba(255,255,255,0.08)' },
            ]}
            centerValue={<span style={{ color: '#fff' }}>{baselineScore ?? '—'}</span>}
            centerLabel="Baseline Score"
            hideLegend
            thin
            height={180}
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {items.map((it) => (
              <div key={it.key} className="flex items-center gap-2 rounded-[12px] px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ background: it.done ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.08)' }}
                >
                  {it.done ? <Check size={11} color="#10b981" strokeWidth={3} /> : <X size={11} color="rgba(255,255,255,0.3)" />}
                </span>
                <span className="text-[11px] font-[640]" style={{ color: it.done ? '#fff' : 'rgba(255,255,255,0.45)' }}>{it.label}</span>
              </div>
            ))}
          </div>
        </div>
      </m.div>

      {alerts.length > 0 && (
        <div className="rounded-[20px] p-5" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <div className="flex items-center gap-2 mb-2.5">
            <AlertTriangle size={14} style={{ color: '#d97706' }} />
            <p className="text-[12.5px] font-[760]" style={{ color: '#92400e' }}>Smart Alerts</p>
          </div>
          <div className="space-y-1.5">
            {alerts.map((a) => (
              <p key={a} className="text-[12.5px]" style={{ color: '#92400e' }}>· {a}</p>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((it) => (
          <a
            key={it.key} href={it.href}
            className="flex items-center gap-4 rounded-[20px] p-5 transition-all hover:scale-[1.01]"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}
          >
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[13px]" style={{ background: `${it.accent}18`, color: it.accent }}>
              {it.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-[760] text-slate-900">{it.label}</p>
              <p className="text-[12px] text-slate-400">{it.done ? 'On file — tap to review' : 'Not started yet'}</p>
            </div>
            <ChevronRight size={16} style={{ color: '#cbd5e1', flexShrink: 0 }} />
          </a>
        ))}
      </div>
    </div>
  );
}
