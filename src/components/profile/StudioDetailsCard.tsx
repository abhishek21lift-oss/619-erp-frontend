'use client';
/**
 * Studio details — the trainer's half of what a member sees in their profile.
 *
 * A whole-block save: every field is written on every submit, and a cleared
 * field is sent as `null` rather than an empty string, because the member card
 * decides what to show by testing truthiness. An empty string stored here would
 * pass that test and render a blank row.
 *
 * The read failing is not a dead end — the trainer may still fill the form in,
 * so it is silent rather than an error state.
 */

import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TextAreaField, TextField, useStandaloneField } from '@/components/ui/form';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/forms/errors';
import { useToast } from '@/lib/toast';

export default function StudioDetailsCard() {
  const { toast } = useToast();
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [hours, setHours] = useState('');
  const [busy, setBusy] = useState(false);

  const phoneField = useStandaloneField('studio-phone', phone, setPhone);
  const addressField = useStandaloneField('studio-address', address, setAddress);
  const hoursField = useStandaloneField('studio-hours', hours, setHours);

  useEffect(() => {
    let live = true;
    api.profile.studio()
      .then((row) => {
        if (!live) return;
        setPhone(row.phone ?? '');
        setAddress(row.address ?? '');
        setHours(row.hours ?? '');
      })
      .catch(() => { /* the trainer can still fill it in */ });
    return () => { live = false; };
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.profile.updateStudio({
        phone: phone.trim() || null,
        address: address.trim() || null,
        hours: hours.trim() || null,
      });
      toast.success('Studio details saved');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save studio details'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form aria-label="Studio details" onSubmit={(e) => void save(e)} noValidate className="space-y-4">
      <p className="text-sm text-[var(--text-secondary)]">
        What members see when they need to call or visit.
      </p>
      <TextField field={phoneField} label="Phone" type="tel" maxLength={20} />
      <TextAreaField field={addressField} label="Address" rows={2} maxLength={300} />
      <TextAreaField field={hoursField} label="Opening hours" rows={2} maxLength={120} />
      <Button type="submit" disabled={busy} className="gap-2">
        {busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Save size={15} aria-hidden />}
        Save studio details
      </Button>
    </form>
  );
}
