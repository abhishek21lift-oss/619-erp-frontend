'use client';
import { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import { Ruler, Plus, Loader2, Search, Users } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { PremiumButton } from '@/components/premium/PremiumButton';

const MEASUREMENT_FIELDS = [
  { key: 'weight', label: 'Weight (kg)' },
  { key: 'chest_cm', label: 'Chest (cm)' },
  { key: 'waist_cm', label: 'Waist (cm)' },
  { key: 'hips_cm', label: 'Hips (cm)' },
  { key: 'arms_cm', label: 'Arms (cm)' },
  { key: 'thighs_cm', label: 'Thighs (cm)' },
  { key: 'body_fat_pct', label: 'Body Fat %' },
  { key: 'muscle_mass_pct', label: 'Muscle Mass %' },
];

export default function MeasurementsPage() {
  const { toast } = useToast();
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    setLoadError(false);
    api.pt.clients().then((r: any) => {
      const arr = Array.isArray(r?.data) ? r.data : [];
      setClients(arr.map((c: any) => ({ id: c.id, name: c.name })));
    }).catch(() => {
      setLoadError(true);
    });
  }, [loadAttempt]);

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  function update(k: string, v: string) { setForm(prev => ({ ...prev, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClient) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = { client_id: selectedClient, assessment_type: 'monthly' };
      for (const f of MEASUREMENT_FIELDS) {
        if (form[f.key]) body[f.key] = parseFloat(form[f.key]);
      }
      await api.progress.assessments.create(body);
      setForm({});
      toast.success('Measurements saved successfully!');
    } finally { setSaving(false); }
  }

  if (loadError) {
    return (
      <Guard>
        <AppShell>
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, padding: 40 }}>
              <div style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 20,
                padding: '40px 32px',
                textAlign: 'center',
                maxWidth: 400,
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
              }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
                  Unable to Load Data
                </h2>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>
                  This feature is not available yet or there was a problem loading the page. Please try again later.
                </p>
                <button
                  onClick={() => setLoadAttempt(n => n + 1)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '10px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg, #6d28d9, #8b5cf6)',
                    color: '#fff', fontSize: 13, fontWeight: 700,
                    boxShadow: '0 4px 12px rgba(109,40,217,0.25)',
                  }}
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </AppShell>
      </Guard>
    );
  }

  return (
    <Guard>
      <AppShell>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[24px] p-8 sm:p-10 mb-6"
            style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: '#f3f4f6' }}>
                  <Ruler size={16} style={{ color: '#6b7280' }} />
                </div>
                <span className="text-[11px] font-[650] uppercase tracking-[0.08em]" style={{ color: '#9ca3af' }}>Measurements</span>
              </div>
              <h1 className="text-[32px] sm:text-[40px] font-[860] tracking-[-0.03em] leading-tight" style={{ color: '#111827' }}>
                Body Measurements
              </h1>
              <p className="mt-3 max-w-xl text-[14px]" style={{ color: '#6b7280' }}>
                Track progress with detailed body measurements over time.
              </p>
            </div>
          </m.div>

          {/* Client Selector */}
          <div className="rounded-[20px] p-5 mb-6" style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h2 className="text-[14px] font-[700] mb-3" style={{ color: '#111827' }}>Select Client</h2>
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="Search clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-[10px] text-[12px] outline-none transition-all"
                style={{ background: '#fff', border: '1px solid #d1d5db', color: '#111827' }}
              />
            </div>
            <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto">
              {filteredClients.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedClient(c.id); setSearch(''); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-[600] transition-all"
                  style={{
                    background: selectedClient === c.id ? 'rgba(139,92,246,0.12)' : '#F9FAFB',
                    border: `1px solid ${selectedClient === c.id ? 'rgba(139,92,246,0.3)' : '#e5e7eb'}`,
                    color: selectedClient === c.id ? '#7c3aed' : '#6b7280',
                  }}
                >
                  <Users size={12} />
                  {c.name}
                </button>
              ))}
              {filteredClients.length === 0 && (
                <p className="text-[12px]" style={{ color: '#9ca3af' }}>No clients found</p>
              )}
            </div>
          </div>

          {/* Measurements Form */}
          {selectedClient && (
            <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-[20px] p-6 max-w-lg" style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <h2 className="text-[18px] font-[760] mb-1" style={{ color: '#111827' }}>Log Measurements</h2>
              <p className="text-[11px] mb-5" style={{ color: '#9ca3af' }}>
                For: {clients.find(c => c.id === selectedClient)?.name}
              </p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {MEASUREMENT_FIELDS.map(f => (
                    <input key={f.key} type="number" step="0.1" placeholder={f.label} value={form[f.key] || ''}
                      onChange={e => update(f.key, e.target.value)}
                      className="rounded-[12px] px-4 py-2.5 text-sm outline-none"
                      style={{ background: '#fff', border: '1px solid #d1d5db', color: '#111827' }} />
                  ))}
                </div>
                <PremiumButton tone="primary" glow icon={saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  disabled={saving} className="!w-full justify-center">
                  {saving ? 'Saving...' : 'Save Measurements'}
                </PremiumButton>
              </form>
            </m.div>
          )}
        </div>
      </AppShell>
    </Guard>
  );
}
