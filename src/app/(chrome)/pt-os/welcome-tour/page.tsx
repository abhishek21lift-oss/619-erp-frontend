'use client';

// The K11 Welcome & Gym Tour — step 1 of the intake journey:
//
//   Welcome & Gym Tour → PT Enrolment → Informed Consent → PAR-Q →
//   Client Interview → Goals → Fitness Assessment → Program Design
//
// A checklist the trainer works through with the client on day one, and one
// write: "Mark tour complete". It is a checklist, not an API gate — enrolment
// can still be opened directly — but the journey keeps pointing here until it
// is stamped. Once stamped the page is read-only and hands over to the next
// outstanding step.

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import Guard from '@/components/Guard';
import { Button, Card, PageContainer, PageHero } from '@/components/ui';
import ClientPicker, { ClientAvatar } from '@/components/pt-os/shared/ClientPicker';
import JourneyNextButton from '@/components/pt-os/client/JourneyNextButton';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { errorMessage } from '@/lib/forms/errors';
import { semantic } from '@/lib/palette';

/** The K11 checklist, in the three groups the sequence asks for. */
const GROUPS: { title: string; items: string[] }[] = [
  {
    title: 'Professional preparation',
    items: [
      'Arrive 15 minutes early and be ready before the client walks in.',
      'Wear a clean, sporty uniform.',
      'Fresh breath — water, not coffee, before the session.',
      'Phone on silent and out of sight.',
    ],
  },
  {
    title: 'Ice-breaking',
    items: [
      'Greet the client with a smile and use their name.',
      'Ask about well-being, sleep quality and last meal.',
    ],
  },
  {
    title: 'Gym tour',
    items: [
      'Walk the floor and point out each training zone.',
      'Equipment introduction: what it is for and how it is set up.',
      'Safety protocols — water, rest, when to stop, where the exits are.',
      'Reduce first-visit anxiety: show the locker room, washroom and water station.',
    ],
  },
];

export default function WelcomeTourPage() {
  return (
    <Guard>
      <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: semantic.primary }} /></div>}>
        <WelcomeTourContent />
      </Suspense>
    </Guard>
  );
}

function WelcomeTourContent() {
  const sp = useSearchParams();
  const clientId = sp.get('client_id') || '';
  if (!clientId) {
    return <ClientPicker title="Welcome & Gym Tour" icon={<Sparkles size={20} color="#fff" />} basePath="/pt-os/welcome-tour" />;
  }
  return <WelcomeTour key={clientId} clientId={clientId} />;
}

function WelcomeTour({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await api.pt.client(clientId) as { data?: Record<string, unknown> | null };
      const c = res?.data;
      if (!c) { setLoadError('Client not found.'); return; }
      setName(String(c.name ?? ''));
      setCompletedAt(c.welcome_tour_completed_at ? String(c.welcome_tour_completed_at) : null);
    } catch (err: unknown) {
      setLoadError(errorMessage(err, 'Could not load this client.'));
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const markComplete = async () => {
    setSaving(true);
    try {
      const res = await api.pt.completeWelcomeTour(clientId);
      setCompletedAt(res?.data?.welcome_tour_completed_at ?? new Date().toISOString());
      toast.success('Welcome and gym tour marked complete.');
    } catch (err: unknown) {
      toast.error(errorMessage(err, 'Could not mark the tour complete.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: semantic.primary }} /></div>;
  }
  if (loadError) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <AlertCircle size={32} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
        <p className="text-[14px] font-[600] text-[color:var(--text-secondary)]">{loadError}</p>
        <Button variant="outline" className="mt-4" onClick={load}>Retry</Button>
      </div>
    );
  }

  const done = Boolean(completedAt);

  return (
    <PageContainer>
      <PageHero
        icon={<Sparkles size={20} color="#fff" />}
        title="Welcome & Gym Tour"
        subtitle="Step 1 — the client's first hour in the studio."
      />

      <Card className="mb-4 p-4">
        <div className="flex items-center gap-3">
          <ClientAvatar name={name} />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-[700]" style={{ color: 'var(--text-primary)' }}>{name}</p>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              {done ? 'Recorded' : 'Not recorded yet'}
            </p>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {GROUPS.map((group) => (
          <Card key={group.title} className="p-4">
            <h2 className="mb-2 text-[13.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>{group.title}</h2>
            <ul className="space-y-1.5">
              {group.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  <CheckCircle2 size={15} className="mt-[1px] flex-shrink-0" style={{ color: done ? semantic.success : 'var(--text-disabled)' }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <div className="mt-5">
        {done ? (
          <p role="status" className="mb-3 rounded-[14px] px-3 py-2.5 text-[12.5px]"
            style={{ background: 'rgba(16,185,129,0.10)', color: 'var(--text-primary)' }}>
            Tour completed on {new Date(completedAt as string).toLocaleDateString()}. This record is read-only.
          </p>
        ) : (
          <Button onClick={markComplete} disabled={saving} className="min-h-[44px] w-full sm:w-auto">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Mark tour complete
          </Button>
        )}
        <div className="mt-3">
          <JourneyNextButton clientId={clientId} current="welcome_tour" />
        </div>
      </div>
    </PageContainer>
  );
}
