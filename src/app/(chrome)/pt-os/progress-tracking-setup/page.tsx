'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Flag, Loader2, AlertCircle, Check, X, ChevronRight, Camera, Ruler, Zap,
  Move, Accessibility,
} from 'lucide-react';
import Guard from '@/components/Guard';
import {
  Button, Card, CardBody, DonutChart, HeroChip, PageContainer, PageHero,
} from '@/components/ui';
import ClientPicker from '@/components/pt-os/shared/ClientPicker';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/forms/errors';

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
      <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: 'var(--warning-text)' }} /></div>}>
        <ProgressTrackingSetupContent />
      </Suspense>
    </Guard>
  );
}

function ProgressTrackingSetupContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const clientId = sp.get('client_id') || '';

  if (!clientId) return <ClientPicker title="Progress Tracking Overview" icon={<Flag size={20} color="#fff" />} basePath="/pt-os/progress-tracking-setup" />;
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
      setLoadError(errorMessage(err, 'Failed to load client.'));
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

  const items: CompletionItem[] = [
    { key: 'measurements', label: 'Measurements Saved', done: hasMeasurements, icon: <Ruler size={16} />, href: `/pt-os/assessment?client_id=${clientId}`, accent: '#10b981' },
    { key: 'photos', label: 'Photos Uploaded', done: hasPhotos, icon: <Camera size={16} />, href: `/pt-os/progress-photos?client_id=${clientId}`, accent: '#F59E0B' },
    { key: 'strength', label: 'Strength Baseline', done: hasStrength, icon: <Zap size={16} />, href: `/pt-os/strength-tracking?client_id=${clientId}`, accent: '#f59e0b' },
    { key: 'mobility', label: 'Mobility Baseline', done: hasMobility, icon: <Move size={16} />, href: `/pt-os/mobility-assessment?client_id=${clientId}`, accent: '#A33757' },
    { key: 'posture', label: 'Posture Assessment', done: hasPosture, icon: <Accessibility size={16} />, href: `/pt-os/posture-assessment?client_id=${clientId}`, accent: '#A33757' },
  ];

  const scores = [
    latestAssessment?.overall_max != null
      && typeof latestAssessment.overall_fitness_score === 'number' ? latestAssessment.overall_fitness_score : null,
    typeof latestMobility?.mobility_score === 'number' ? latestMobility.mobility_score : null,
    typeof latestPosture?.posture_risk_score === 'number' ? latestPosture.posture_risk_score : null,
  ].filter((s): s is number => s != null);
  const baselineScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: 'var(--warning-text)' }} /></div>;
  }
  if (loadError) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <AlertCircle size={32} style={{ color: 'var(--danger-text)', margin: '0 auto 12px' }} />
        <p className="text-[14px] font-[600]" style={{ color: 'var(--text-secondary)' }}>{loadError}</p>
        <Button variant="outline" className="mt-4" onClick={loadData}>Retry</Button>
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHero
        icon={<Flag size={20} />}
        title={`${clientName}'s Baseline`}
      >
        <HeroChip>Progress Tracking Overview</HeroChip>
      </PageHero>

      <Card>
        <CardBody className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[auto_1fr] lg:gap-8">
          <DonutChart
            data={[
              { name: 'Score', value: baselineScore ?? 0, color: 'var(--warning-text)' },
              { name: 'Remaining', value: 100 - (baselineScore ?? 0), color: 'var(--bg-subtle)' },
            ]}
            centerValue={baselineScore ?? '—'}
            centerLabel="Baseline Score"
            hideLegend
            thin
            height={180}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((it) => (
              <div key={it.key} className="flex items-center gap-2 rounded-[12px] px-3 py-2.5"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                <span
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ background: it.done ? 'var(--success-soft)' : 'var(--border)' }}
                >
                  {it.done ? <Check size={11} strokeWidth={3} style={{ color: 'var(--success-text)' }} /> : <X size={11} style={{ color: 'var(--text-disabled)' }} />}
                </span>
                <span className="text-[11px] font-[640]" style={{ color: it.done ? 'var(--text-primary)' : 'var(--text-muted)' }}>{it.label}</span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <a
            key={it.key} href={it.href}
            className="flex items-center gap-4 rounded-[20px] p-5 transition-all hover:scale-[1.01]"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[13px]" style={{ background: `${it.accent}18`, color: it.accent }}>
              {it.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-[760]" style={{ color: 'var(--text-primary)' }}>{it.label}</p>
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{it.done ? 'On file — tap to review' : 'Not started yet'}</p>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          </a>
        ))}
      </div>
    </PageContainer>
  );
}
