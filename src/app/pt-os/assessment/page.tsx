'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck, Plus, Loader2, Ruler, Weight, Heart, Activity } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api, Client } from '@/lib/api';
import { useAsync } from '@/lib/use-async';
import { Button } from '@/components/ui';

export default function PtAssessmentPage() {
  const [clientId, setClientId] = useState('');
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const clients = useAsync<Client[]>(() => api.clients.list({ status: 'active' }), []);
  const assessments = useAsync(() => api.progress.assessments.list(clientId ? { client_id: clientId } : {}).then(r => r.data), [clientId]);

  function updateField(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) return;
    setSaving(true);
    try {
      await api.progress.assessments.create({
        client_id: clientId,
        assessment_type: 'initial',
        weight: form.weight ? parseFloat(form.weight) : undefined,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : undefined,
        body_fat_pct: form.body_fat_pct ? parseFloat(form.body_fat_pct) : undefined,
        muscle_mass_pct: form.muscle_mass_pct ? parseFloat(form.muscle_mass_pct) : undefined,
        chest_cm: form.chest_cm ? parseFloat(form.chest_cm) : undefined,
        waist_cm: form.waist_cm ? parseFloat(form.waist_cm) : undefined,
        hips_cm: form.hips_cm ? parseFloat(form.hips_cm) : undefined,
        arms_cm: form.arms_cm ? parseFloat(form.arms_cm) : undefined,
        thighs_cm: form.thighs_cm ? parseFloat(form.thighs_cm) : undefined,
        flexibility_score: form.flexibility_score ? parseInt(form.flexibility_score) : undefined,
        cardio_score: form.cardio_score ? parseInt(form.cardio_score) : undefined,
        strength_score: form.strength_score ? parseInt(form.strength_score) : undefined,
        posture_notes: form.posture_notes,
        health_notes: form.health_notes,
        trainer_notes: form.trainer_notes,
      });
      setForm({});
      assessments.refetch();
    } finally { setSaving(false); }
  }

  const fields = [
    { key: 'weight', label: 'Weight (kg)', icon: <Weight size={14} />, type: 'number' },
    { key: 'height_cm', label: 'Height (cm)', icon: <Ruler size={14} />, type: 'number' },
    { key: 'body_fat_pct', label: 'Body Fat %', icon: <Activity size={14} />, type: 'number' },
    { key: 'muscle_mass_pct', label: 'Muscle Mass %', icon: <Heart size={14} />, type: 'number' },
    { key: 'chest_cm', label: 'Chest (cm)', type: 'number' },
    { key: 'waist_cm', label: 'Waist (cm)', type: 'number' },
    { key: 'hips_cm', label: 'Hips (cm)', type: 'number' },
    { key: 'arms_cm', label: 'Arms (cm)', type: 'number' },
    { key: 'thighs_cm', label: 'Thighs (cm)', type: 'number' },
    { key: 'flexibility_score', label: 'Flexibility (1-10)', type: 'number' },
    { key: 'cardio_score', label: 'Cardio (1-10)', type: 'number' },
    { key: 'strength_score', label: 'Strength (1-10)', type: 'number' },
  ];

  return (
    <Guard>
      <AppShell>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[24px] p-8 sm:p-10 mb-6"
            style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)', boxShadow: '0 20px 60px rgba(15,23,42,0.3)' }}>
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(148,163,184,0.4), transparent 70%)' }} />
            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <ClipboardCheck size={16} style={{ color: 'var(--text-disabled)' }} />
                </div>
                <span className="text-[11px] font-[650] uppercase tracking-[0.08em]" style={{ color: 'var(--text-disabled)' }}>PT Assessment</span>
              </div>
              <h1 className="text-[32px] sm:text-[40px] font-[860] tracking-[-0.03em] leading-tight" style={{ color: '#ffffff' }}>
                Initial Assessment
              </h1>
              <p className="mt-3 max-w-xl text-[14px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Record body measurements, fitness scores, and health notes for new PT clients.
              </p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
              className="rounded-[20px] p-6" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 20px rgba(15,23,42,0.06)' }}>
              <h2 className="text-[18px] font-[760] mb-5" style={{ color: 'rgb(15,23,42)' }}>Record Assessment</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <select value={clientId} onChange={e => setClientId(e.target.value)}
                  className="w-full rounded-[12px] px-4 py-2.5 text-sm outline-none"
                  style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', color: 'rgb(15,23,42)' }}>
                  <option value="">Select client...</option>
                  {clients.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {fields.map(f => (
                    <input key={f.key} type={f.type} step="0.1" placeholder={f.label} value={form[f.key] || ''}
                      onChange={e => updateField(f.key, e.target.value)}
                      className="rounded-[12px] px-3 py-2 text-xs outline-none"
                      style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', color: 'rgb(15,23,42)' }} />
                  ))}
                </div>
                <textarea placeholder="Posture notes..." rows={2} value={form.posture_notes || ''}
                  onChange={e => updateField('posture_notes', e.target.value)}
                  className="w-full rounded-[12px] px-4 py-2.5 text-sm outline-none resize-none"
                  style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', color: 'rgb(15,23,42)' }} />
                <textarea placeholder="Health notes..." rows={2} value={form.health_notes || ''}
                  onChange={e => updateField('health_notes', e.target.value)}
                  className="w-full rounded-[12px] px-4 py-2.5 text-sm outline-none resize-none"
                  style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', color: 'rgb(15,23,42)' }} />
                <Button type="submit" disabled={!clientId || saving}
                  className="!w-full !rounded-[14px] !py-3 !font-[700]"
                  style={{ background: !clientId || saving ? 'rgba(0,0,0,0.1)' : 'linear-gradient(135deg, #1e293b, #475569)', color: '#fff' }}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {saving ? 'Saving...' : 'Save Assessment'}
                </Button>
              </form>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
              className="rounded-[20px] p-6" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 20px rgba(15,23,42,0.06)' }}>
              <h2 className="text-[18px] font-[760] mb-5" style={{ color: 'rgb(15,23,42)' }}>Assessment History</h2>
              {assessments.loading && <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin" /></div>}
              {!assessments.loading && (!assessments.data || (assessments.data as unknown[]).length === 0) && (
                <p className="text-center py-8 text-sm" style={{ color: 'rgb(148,163,184)' }}>No assessments recorded yet.</p>
              )}
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {(assessments.data as any[] || []).map((a: any) => (
                  <div key={a.id} className="rounded-[14px] p-4" style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.04)' }}>
                    <div className="flex justify-between mb-2">
                      <span className="text-[12px] font-semibold" style={{ color: 'rgb(148,163,184)' }}>{a.assessment_date}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-[6px]" style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed' }}>{a.assessment_type?.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-[11px]">
                      {a.weight && <div><span style={{ color: 'rgb(148,163,184)' }}>Wt: </span><span className="font-semibold">{a.weight}kg</span></div>}
                      {a.body_fat_pct && <div><span style={{ color: 'rgb(148,163,184)' }}>BF: </span><span className="font-semibold">{a.body_fat_pct}%</span></div>}
                      {a.bmi && <div><span style={{ color: 'rgb(148,163,184)' }}>BMI: </span><span className="font-semibold">{a.bmi}</span></div>}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </AppShell>
    </Guard>
  );
}
