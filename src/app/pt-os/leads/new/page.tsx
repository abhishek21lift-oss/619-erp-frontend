'use client';

// A full page rather than the dialog every other lead action still uses —
// requested explicitly: Add Lead is the most-used action on this module (a
// walk-in standing at the desk while it's filled in) and deserves its own
// screen, not a sheet stacked over the list. Built to the same measurements
// as the dashboard and every report page: PageHero/PageContainer are the
// shared components that already carry that spacing, not a re-derived copy
// of it — see PageHero.tsx's own header comment for why that split existed.

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import { UserSearch, Check, X } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Button, PageContainer, PageHero } from '@/components/ui';
import { LeadFormFields, emptyLeadForm } from '@/components/pt-os/leads/LeadFormFields';
import type { LeadFormState } from '@/components/pt-os/leads/LeadFormFields';
import { useAsync } from '@/lib/use-async';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

export default function NewLeadPage() {
  return <Guard><AppShell><NewLeadForm /></AppShell></Guard>;
}

function NewLeadForm() {
  const router = useRouter();
  const { toast } = useToast();

  const trainers = useAsync(() => api.pt.trainers().then((r) => (r as { data?: { id: string; name: string }[] })?.data ?? []), []);

  const [form, setForm] = useState<LeadFormState>(emptyLeadForm);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof LeadFormState>(key: K, val: LeadFormState[K]) => setForm((f) => ({ ...f, [key]: val }));

  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(emptyLeadForm), [form]);

  const handleCancel = () => {
    if (isDirty && !window.confirm('Discard this lead?')) return;
    router.push('/pt-os/leads');
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required.'); return; }
    setSaving(true);
    try {
      await api.pt.leads.create({
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
      toast.success('Lead added.');
      router.push('/pt-os/leads');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not save this lead.');
      setSaving(false);
    }
  };

  return (
    <PageContainer>
      <PageHero
        icon={<UserSearch size={20} />}
        title="Add Lead"
        subtitle="Capture the essentials — you can fill in the rest later."
      />

      {/* A column of inputs is unusable at full width — max-w-2xl keeps this
          the same reading measure as the dialog it replaces, just no longer
          boxed inside one. */}
      <div className="mx-auto w-full max-w-2xl pb-24 lg:pb-8">
        <m.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-[20px] p-5 sm:p-6"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}
        >
          <LeadFormFields form={form} set={set} trainers={trainers.data ?? []} />
        </m.div>
      </div>

      <div className="page-action-bar" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--border)' }}>
        <div className="mx-auto flex max-w-2xl items-center justify-end gap-2 px-5 py-3.5 sm:px-6">
          <Button type="button" variant="outline" iconLeft={<X size={14} />} onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            type="button" loading={saving} disabled={saving}
            iconLeft={!saving ? <Check size={15} /> : undefined}
            onClick={handleSave}
            style={{ background: 'linear-gradient(135deg, #0067e0, #0059ce)', color: '#fff' }}
          >
            {saving ? 'Saving…' : 'Add Lead'}
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
