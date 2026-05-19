'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { Check, ChevronRight, ChevronLeft, User, Phone, Mail, Cake, Dumbbell, MapPin, FileText, Sparkles, Zap, Target, Heart, Activity, Users, Star } from 'lucide-react';

const SOURCES = [
  { value: 'Walk-in', label: 'Walk-in', icon: '🚶', color: '#6366f1' },
  { value: 'Instagram', label: 'Instagram', icon: '📸', color: '#e1306c' },
  { value: 'Facebook', label: 'Facebook', icon: '📘', color: '#1877f2' },
  { value: 'Google', label: 'Google', icon: '🔍', color: '#ea4335' },
  { value: 'Referral', label: 'Referral', icon: '🤝', color: '#16a34a' },
  { value: 'Banner / Hoarding', label: 'Hoarding', icon: '🪧', color: '#d97706' },
  { value: 'WhatsApp', label: 'WhatsApp', icon: '💬', color: '#25d366' },
  { value: 'Other', label: 'Other', icon: '📌', color: '#64748b' },
];

const INTERESTS = [
  { value: 'Powerlifting', label: 'Powerlifting', icon: '🏋️', color: '#7c3aed' },
  { value: 'Strength Training', label: 'Strength', icon: '💪', color: '#dc2626' },
  { value: 'Personal Training', label: 'Personal Training', icon: '🎯', color: '#0ea5e9' },
  { value: 'Group Class', label: 'Group Class', icon: '👥', color: '#16a34a' },
  { value: 'Weight Loss', label: 'Weight Loss', icon: '⚖️', color: '#f59e0b' },
  { value: 'Bodybuilding', label: 'Bodybuilding', icon: '🏆', color: '#f97316' },
  { value: 'Cardio Only', label: 'Cardio', icon: '🏃', color: '#ec4899' },
  { value: 'Yoga', label: 'Yoga', icon: '🧘', color: '#8b5cf6' },
  { value: 'Other', label: 'Other', icon: '✨', color: '#64748b' },
];

const STEPS = [
  { id: 1, label: 'Personal', icon: <User size={14} /> },
  { id: 2, label: 'Interest', icon: <Dumbbell size={14} /> },
  { id: 3, label: 'Source', icon: <MapPin size={14} /> },
  { id: 4, label: 'Notes', icon: <FileText size={14} /> },
];

export default function AddEnquiryPage() { return <Guard><Inner /></Guard>; }

function Inner() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', mobile: '', email: '', gender: '', dob: '', interested_in: '', source: 'Walk-in', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  async function handleSubmit() {
    setError('');
    if (!form.name.trim() || !form.mobile.trim()) { setError('Name and mobile are required.'); return; }
    setSaving(true);
    try {
      await api.clients.create({
        name: form.name, mobile: form.mobile, email: form.email || undefined,
        gender: form.gender || undefined, dob: form.dob || undefined,
        interested_in: form.interested_in || undefined, reference_no: form.source,
        notes: form.notes || undefined, status: 'lead',
        joining_date: new Date().toISOString().split('T')[0],
      });
      setSuccess('Enquiry saved!');
      setTimeout(() => router.push('/sales/leads'), 900);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Could not save.'); }
    finally { setSaving(false); }
  }

  const leadScore = [
    form.name ? 20 : 0, form.mobile ? 20 : 0, form.interested_in ? 20 : 0,
    form.source !== 'Other' ? 15 : 5, form.notes ? 15 : 0, form.email ? 10 : 0,
  ].reduce((a, b) => a + b, 0);

  const scoreColor = leadScore >= 70 ? '#16a34a' : leadScore >= 40 ? '#d97706' : '#dc2626';
  const scoreLabel = leadScore >= 70 ? 'High Quality' : leadScore >= 40 ? 'Medium' : 'Low';

  return (
    <AppShell>
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-[0.06]" style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
        <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full opacity-[0.05]" style={{ background: 'radial-gradient(circle, #0ea5e9, transparent)' }} />
      </div>

      <div className="relative" style={{ zIndex: 1, padding: '1.5rem 1.75rem', maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10b981, #0ea5e9)' }}>
                <Sparkles size={14} className="text-white" />
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a' }}>New Enquiry</h1>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', marginLeft: 40 }}>Add a new lead to your CRM pipeline</p>
          </div>
          <button onClick={() => router.back()} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)', background: '#fff', color: '#64748b', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>← Back</button>
        </div>

        <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 300px' }}>
          {/* LEFT: Form */}
          <div style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: 24, padding: '1.75rem', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

            {/* Step progress */}
            <div className="flex items-center gap-2 mb-6">
              {STEPS.map((s, i) => (
                <>
                  <button key={s.id} onClick={() => setStep(s.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', transition: 'all 0.2s', fontSize: 12, fontWeight: 700,
                      background: step === s.id ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : step > s.id ? 'linear-gradient(135deg,#10b981,#0ea5e9)' : 'rgba(0,0,0,0.05)',
                      color: step >= s.id ? '#fff' : '#64748b',
                    }}
                  >
                    {step > s.id ? <Check size={12} /> : s.icon} {s.label}
                  </button>
                  {i < STEPS.length - 1 && <div style={{ width: 20, height: 1, background: step > s.id ? '#7c3aed' : '#e2e8f0' }} />}
                </>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* STEP 1: Personal */}
                {step === 1 && (
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', marginBottom: 4 }}>Personal Details</h3>
                    <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Basic contact information</p>
                    <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                      <Field label="Full Name *" icon={<User size={14} />}>
                        <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Rahul Sharma" style={inputStyle} />
                      </Field>
                      <Field label="Mobile *" icon={<Phone size={14} />}>
                        <input value={form.mobile} onChange={e => set('mobile', e.target.value)} placeholder="9876543210" type="tel" style={inputStyle} />
                      </Field>
                      <Field label="Email" icon={<Mail size={14} />}>
                        <input value={form.email} onChange={e => set('email', e.target.value)} placeholder="rahul@email.com" type="email" style={inputStyle} />
                      </Field>
                      <Field label="Date of Birth" icon={<Cake size={14} />}>
                        <input value={form.dob} onChange={e => set('dob', e.target.value)} type="date" style={inputStyle} />
                      </Field>
                      <Field label="Gender">
                        <select value={form.gender} onChange={e => set('gender', e.target.value)} style={inputStyle}>
                          <option value="">Select</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </Field>
                    </div>
                  </div>
                )}

                {/* STEP 2: Interest */}
                {step === 2 && (
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', marginBottom: 4 }}>What are they interested in?</h3>
                    <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Select the primary fitness goal</p>
                    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
                      {INTERESTS.map(int => (
                        <button key={int.value} type="button" onClick={() => set('interested_in', int.value)}
                          style={{
                            padding: '14px 12px', borderRadius: 14, border: form.interested_in === int.value ? `2px solid ${int.color}` : '2px solid rgba(0,0,0,0.07)',
                            background: form.interested_in === int.value ? `${int.color}12` : '#fff',
                            cursor: 'pointer', transition: 'all 0.18s', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6
                          }}
                        >
                          <span style={{ fontSize: 22 }}>{int.icon}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: form.interested_in === int.value ? int.color : '#475569' }}>{int.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 3: Source */}
                {step === 3 && (
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', marginBottom: 4 }}>How did they find you?</h3>
                    <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Track your best lead acquisition channels</p>
                    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
                      {SOURCES.map(src => (
                        <button key={src.value} type="button" onClick={() => set('source', src.value)}
                          style={{
                            padding: '16px 12px', borderRadius: 14, border: form.source === src.value ? `2px solid ${src.color}` : '2px solid rgba(0,0,0,0.07)',
                            background: form.source === src.value ? `${src.color}12` : '#fff',
                            cursor: 'pointer', transition: 'all 0.18s', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6
                          }}
                        >
                          <span style={{ fontSize: 24 }}>{src.icon}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: form.source === src.value ? src.color : '#475569' }}>{src.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 4: Notes */}
                {step === 4 && (
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', marginBottom: 4 }}>Notes & Summary</h3>
                    <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Any additional context about this lead</p>
                    <textarea
                      value={form.notes}
                      onChange={e => set('notes', e.target.value)}
                      placeholder="Goals, budget, schedule preference, objections, anything useful…"
                      rows={5}
                      style={{ ...inputStyle, resize: 'vertical' }}
                    />
                    {error && (
                      <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', fontSize: 13, fontWeight: 600 }}>
                        ⚠ {error}
                      </div>
                    )}
                    {success && (
                      <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: '#ecfdf5', border: '1px solid #6ee7b7', color: '#065f46', fontSize: 13, fontWeight: 600 }}>
                        ✓ {success}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <button onClick={() => step > 1 ? setStep(s => s - 1) : router.back()}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 11, border: '1px solid rgba(0,0,0,0.08)', background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.18s' }}
              >
                <ChevronLeft size={14} /> {step > 1 ? 'Back' : 'Cancel'}
              </button>
              {step < 4 ? (
                <button onClick={() => setStep(s => s + 1)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(124,58,237,0.3)', transition: 'all 0.18s' }}
                >
                  Next <ChevronRight size={14} />
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleSubmit} disabled={saving}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: '0 4px 14px rgba(124,58,237,0.3)', transition: 'all 0.18s' }}
                  >
                    {saving ? 'Saving…' : '✓ Save Enquiry'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Live preview panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Lead Score */}
            <div style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: 20, padding: '1.25rem', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Sparkles size={14} style={{ color: '#7c3aed' }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Lead Quality Score</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: scoreColor, letterSpacing: '-0.04em', lineHeight: 1 }}>{leadScore}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: scoreColor }}>{scoreLabel}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>out of 100</div>
                </div>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: '#f1f5f9', overflow: 'hidden' }}>
                <motion.div
                  animate={{ width: `${leadScore}%` }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  style={{ height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}99)` }}
                />
              </div>
            </div>

            {/* Live preview */}
            <div style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: 20, padding: '1.25rem', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>Live Preview</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <PreviewRow label="Name" value={form.name || '—'} />
                <PreviewRow label="Mobile" value={form.mobile || '—'} />
                <PreviewRow label="Interest" value={form.interested_in || '—'} />
                <PreviewRow label="Source" value={form.source} />
                {form.email && <PreviewRow label="Email" value={form.email} />}
                {form.dob && <PreviewRow label="DOB" value={form.dob} />}
              </div>
            </div>

            {/* Tips */}
            <div style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(79,70,229,0.04))', border: '1px solid rgba(124,58,237,0.12)', borderRadius: 16, padding: '1rem 1.1rem' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>💡 CRM Tip</div>
              <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
                {step === 1 ? 'Always capture mobile — it\'s your primary follow-up channel.' :
                 step === 2 ? 'Knowing their goal helps you recommend the right plan.' :
                 step === 3 ? 'Tracking source helps you double down on what works.' :
                 'Add notes from your initial conversation for better follow-up context.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1.5px solid rgba(0,0,0,0.08)', background: 'rgba(248,250,252,0.8)',
  fontSize: 14, outline: 'none', color: '#0f172a',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'border-color 0.2s',
};

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b', marginBottom: 6 }}>
        {icon} {label}
      </label>
      {children}
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
      <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 12, color: '#0f172a', fontWeight: 700, maxWidth: '60%', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}
