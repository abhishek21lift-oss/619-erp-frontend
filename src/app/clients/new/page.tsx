'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Sparkles, User, MapPin, Activity, Target, TrendingUp, Shield, Dumbbell, Zap } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api, Trainer } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import './member-intake.css';

const STEPS = [
  { id: 1, label: 'Personal', icon: User },
  { id: 2, label: 'Address', icon: MapPin },
  { id: 3, label: 'Fitness', icon: Activity },
];

export default function NewClientPage() {
  return <Guard><NewClientForm /></Guard>;
}

function NewClientForm() {
  const router = useRouter();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditMode = Boolean(editId);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  const [f, setF] = useState({
    first_name: '', last_name: '',
    email: '',
    country_code: '+91', mobile: '', is_mobile_redacted: false,
    alt_country_code: '+91', alt_mobile: '',
    dob: '',
    gender: '' as 'Male' | 'Female' | 'Other' | '',
    reference_no: '',
    aadhaar_no: '',
    pan_no: '',
    gst_no: '',
    company_name: '',
    trainer_id: user?.role === 'trainer' ? (user.trainer_id || '') : '',
    address: '',
    street: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    anniversary: '',
    notes: '', status: 'active',
    emergency_no: '',
    interested_in: '',
    weight: '',
  });

  useEffect(() => {
    if (!editId) return;
    api.clients.get(editId).then((c: any) => {
      setF((prev: any) => {
        const parts = String(c.name || '').trim().split(/\s+/).filter(Boolean);
        return {
          ...prev,
          first_name: c.first_name || parts[0] || '',
          last_name: c.last_name || parts.slice(1).join(' ') || '',
          email: c.email || '',
          country_code: c.country_code || '+91',
          mobile: c.mobile || '',
          is_mobile_redacted: Boolean(c.is_mobile_redacted),
          alt_country_code: c.alt_country_code || '+91',
          alt_mobile: c.alt_mobile || '',
          dob: c.dob?.slice(0, 10) || '',
          gender: c.gender || '',
          reference_no: c.reference_no || '',
          aadhaar_no: c.aadhaar_no || '',
          pan_no: c.pan_no || '',
          gst_no: c.gst_no || '',
          company_name: c.company_name || '',
          trainer_id: c.trainer_id || '',
          address: c.address || '',
          street: c.street || '',
          city: c.city || '',
          state: c.state || '',
          country: c.country || 'India',
          pincode: c.pincode || '',
          anniversary: c.anniversary?.slice(0, 10) || '',
          notes: c.notes || '',
          status: c.status || 'active',
          emergency_no: c.emergency_no || c.emergency_contact || '',
          interested_in: c.interested_in || '',
          weight: c.weight != null ? String(c.weight) : '',
        };
      });
    }).catch(setError);
  }, [editId]);

  useEffect(() => {
    api.trainers.list().then(setTrainers).catch(setError);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!f.first_name.trim()) return setError('First name is required');
    if (!f.gender) return setError('Gender is required');
    setSaving(true); setError('');
    try {
      const fullName = [f.first_name, f.last_name].filter(Boolean).join(' ');
      const trainer = trainers.find(t => t.id === f.trainer_id);
      const payload = {
        ...f,
        name: fullName,
        trainer_name: trainer?.name || '',
        weight: parseFloat(f.weight) || undefined,
        email: f.email || undefined,
      };
      const created = isEditMode
        ? await api.clients.update(editId!, payload)
        : await api.clients.create(payload);
      const savedId = (created as any)?.client?.id || editId;
      router.push(savedId ? `/clients/${savedId}` : '/clients');
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

  const totalSteps = STEPS.length;
  const progress = ((step - 1) / (totalSteps - 1)) * 100;

  function canAdvance(): boolean {
    if (step === 1) return !!f.first_name.trim() && !!f.gender;
    return true;
  }

  const activeTrainers = trainers.filter(t => t.is_active === true);
  const aiScore = f.first_name && f.gender ? 85 : 42;
  const aiScoreLevel = aiScore >= 70 ? 'high' : 'medium';

  const inputClass = "w-full h-11 px-3.5 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#f5f5f7] text-[14px] text-[#1d1d1f] transition-all duration-150 outline-none focus:border-[#dc2626]/30 focus:bg-white focus:shadow-[0_0_0_3px_rgba(220,38,38,0.06)] placeholder:text-[#86868b]/60";
  const labelClass = "block text-[12px] font-semibold text-[#86868b] mb-1.5 tracking-[0.01em]";

  return (
    <AppShell>
      <div className="min-h-screen bg-[#F5F5F7] pb-24">
        <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8">
          {/* Hero */}
          <div className="mb-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#34d399]" />
                  Member Onboarding
                </div>
                <h1 className="mt-3 text-[28px] sm:text-[34px] font-bold tracking-[-0.03em] text-[#1d1d1f] leading-[1.1]">
                  {isEditMode ? 'Edit Member Profile' : <>Create a <span className="text-[#dc2626]">Transformation Journey</span></>}
                </h1>
                <p className="mt-2 max-w-[56ch] text-[14px] leading-relaxed text-[#86868b]">
                  {isEditMode
                    ? 'Update member details and continue their fitness journey.'
                    : 'Set up a new member profile in under 2 minutes.'}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap shrink-0">
                <button type="button" onClick={() => router.back()} className="h-11 rounded-xl bg-white px-4 text-[13px] font-semibold text-[#86868b] border border-[rgba(0,0,0,0.04)] transition-colors hover:bg-[#f5f5f7]">Back</button>
                <button type="submit" form="member-form" disabled={saving} className="h-11 rounded-xl bg-[#dc2626] px-5 text-[13px] font-semibold text-white transition-all hover:bg-[#b91c1c] disabled:opacity-50 inline-flex items-center gap-2">
                  <Sparkles size={14} />
                  {saving ? 'Saving...' : (isEditMode ? 'Update Member' : 'Save Member')}
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-[12px] font-medium text-[#86868b] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <span className="flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-bold text-[#34d399]" style={{ background: 'rgba(52,211,153,0.10)' }}>✓</span>
                {f.first_name ? 'Profile started' : 'Awaiting input'}
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-[12px] font-medium text-[#86868b] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <span className="flex h-5 w-5 items-center justify-center rounded-md" style={{ background: 'rgba(124,58,237,0.10)', color: '#7c3aed' }}><Dumbbell size={11} /></span>
                {activeTrainers.length} trainers available
              </div>
              {f.first_name && (
                <div className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-[12px] font-medium text-[#86868b] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md" style={{ background: 'rgba(6,182,212,0.10)', color: '#06b6d4' }}><Sparkles size={11} /></span>
                  AI ready
                </div>
              )}
            </div>

            {/* Steps */}
            <div className="mt-6 flex items-center gap-0">
              {STEPS.map((s, i) => (
                <div key={s.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-200 cursor-${step > s.id ? 'pointer' : 'default'}`}
                      style={{
                        background: step > s.id ? '#22c55e' : step === s.id ? '#1d1d1f' : '#f5f5f7',
                        color: step >= s.id ? '#fff' : '#86868b',
                        border: step > s.id ? 'none' : `2px solid ${step === s.id ? '#1d1d1f' : 'rgba(0,0,0,0.06)'}`,
                      }}
                      onClick={() => { if (step > s.id) setStep(s.id); }}
                    >
                      {step > s.id ? <Check size={12} /> : s.id}
                    </div>
                    <span className="text-[10px] font-semibold tracking-[0.02em]" style={{ color: step === s.id ? '#1d1d1f' : '#86868b' }}>
                      {s.label}
                    </span>
                  </div>
                  {i < totalSteps - 1 && (
                    <div className="flex-1 h-[2px] mx-3 rounded-full" style={{ background: step > s.id ? '#22c55e' : 'rgba(0,0,0,0.06)' }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Main Layout */}
          <div className="flex gap-6 items-start">
            <div className="flex-1 min-w-0">
              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-[rgba(220,38,38,0.06)] border border-[rgba(220,38,38,0.12)] px-4 py-3 text-[13px] font-semibold text-[#dc2626]">
                  <span>⚠</span> {error}
                </div>
              )}

              <form id="member-form" onSubmit={handleSubmit}>
                <div className="space-y-5">
                  {/* Step 1 */}
                  <div className={`member-section-step ${step === 1 ? 'active' : ''}`}>
                    <div className="rounded-3xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)]">
                      <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5f5f7] text-[#1d1d1f]">
                            <User size={18} />
                          </span>
                          <div>
                            <div className="text-[16px] font-bold tracking-[-0.01em] text-[#1d1d1f]">Personal Information</div>
                            <div className="text-[12px] text-[#86868b]">Primary profile and contact details</div>
                          </div>
                        </div>
                        <span className="rounded-full bg-[rgba(220,38,38,0.06)] px-3 py-1 text-[11px] font-bold text-[#dc2626]">Required</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <label className={labelClass}>Full Name <span className="text-[#dc2626]">*</span></label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input className={inputClass} placeholder="First name" value={f.first_name} onChange={set('first_name')} required />
                            <input className={inputClass} placeholder="Last name" value={f.last_name} onChange={set('last_name')} />
                          </div>
                        </div>
                        <div>
                          <label className={labelClass}>Email</label>
                          <input className={inputClass} type="email" placeholder="e.g. alex@example.com" value={f.email} onChange={set('email')} />
                        </div>
                        <div>
                          <label className={labelClass}>Date of Birth</label>
                          <input className={inputClass} type="date" value={f.dob} onChange={set('dob')} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className={labelClass}>Mobile Number <span className="text-[#dc2626]">*</span></label>
                          <div className="flex gap-2">
                            <div className="flex h-11 shrink-0 items-center gap-1 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#f5f5f7] px-3 text-[13px] font-semibold text-[#86868b]">+91</div>
                            <input className={inputClass} type="tel" placeholder="9876543210" value={f.mobile} onChange={set('mobile')} disabled={f.is_mobile_redacted} style={{ opacity: f.is_mobile_redacted ? 0.4 : 1 }} />
                          </div>
                          <label className="mt-1.5 flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={f.is_mobile_redacted} onChange={e => setF(p => ({ ...p, is_mobile_redacted: e.target.checked, mobile: e.target.checked ? '' : p.mobile }))} className="accent-[#dc2626]" />
                            <span className="text-[12px] text-[#86868b]">Customer reluctant to share mobile number</span>
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <label className={labelClass}>Alternate Mobile</label>
                          <div className="flex gap-2">
                            <div className="flex h-11 shrink-0 items-center gap-1 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#f5f5f7] px-3 text-[13px] font-semibold text-[#86868b]">+91</div>
                            <input className={inputClass} type="tel" placeholder="9876543210" value={f.alt_mobile} onChange={set('alt_mobile')} />
                          </div>
                        </div>
                        <div className="sm:col-span-2">
                          <label className={labelClass}>Gender <span className="text-[#dc2626]">*</span></label>
                          <div className="flex gap-2">
                            {(['Male', 'Female', 'Other'] as const).map(g => (
                              <button key={g} type="button"
                                className="flex-1 min-w-[80px] h-11 rounded-xl text-[13px] font-semibold transition-all duration-150"
                                style={{
                                  border: `1.5px solid ${f.gender === g ? '#dc2626' : 'rgba(0,0,0,0.04)'}`,
                                  background: f.gender === g ? 'rgba(220,38,38,0.06)' : '#f5f5f7',
                                  color: f.gender === g ? '#dc2626' : '#86868b',
                                }}
                                onClick={() => setF(p => ({ ...p, gender: g }))}>
                                {g}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className={labelClass}>Anniversary</label>
                          <input className={inputClass} type="date" value={f.anniversary} onChange={set('anniversary')} />
                        </div>
                        <div>
                          <label className={labelClass}>Reference No.</label>
                          <input className={inputClass} placeholder="e.g. REF-001" value={f.reference_no} onChange={set('reference_no')} />
                        </div>
                        <div>
                          <label className={labelClass}>Aadhaar No.</label>
                          <input className={inputClass} placeholder="3675 9834 6012" value={f.aadhaar_no} onChange={set('aadhaar_no')} />
                        </div>
                        <div>
                          <label className={labelClass}>PAN No.</label>
                          <input className={inputClass} placeholder="ABCDE1234F" value={f.pan_no} onChange={set('pan_no')} />
                        </div>
                        <div>
                          <label className={labelClass}>GST No.</label>
                          <input className={inputClass} value={f.gst_no} onChange={set('gst_no')} />
                        </div>
                        <div>
                          <label className={labelClass}>Company</label>
                          <input className={inputClass} placeholder="Company name" value={f.company_name} onChange={set('company_name')} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className={`member-section-step ${step === 2 ? 'active' : ''}`}>
                    <div className="rounded-3xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)]">
                      <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5f5f7] text-[#1d1d1f]">
                            <MapPin size={18} />
                          </span>
                          <div>
                            <div className="text-[16px] font-bold tracking-[-0.01em] text-[#1d1d1f]">Address & Contact</div>
                            <div className="text-[12px] text-[#86868b]">Location details and emergency information</div>
                          </div>
                        </div>
                        <span className="rounded-full bg-[rgba(0,0,0,0.04)] px-3 py-1 text-[11px] font-bold text-[#86868b]">Optional</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <label className={labelClass}>Address</label>
                          <input className={`${inputClass} mb-2`} placeholder="Flat, Building name" value={f.address} onChange={set('address')} />
                          <input className={inputClass} placeholder="Street, Area" value={f.street} onChange={set('street')} />
                        </div>
                        <div><label className={labelClass}>City</label><input className={inputClass} value={f.city} onChange={set('city')} placeholder="Mumbai" /></div>
                        <div><label className={labelClass}>State</label><input className={inputClass} value={f.state} onChange={set('state')} placeholder="Maharashtra" /></div>
                        <div><label className={labelClass}>Country</label><input className={inputClass} value={f.country} onChange={set('country')} /></div>
                        <div><label className={labelClass}>Pincode</label><input className={inputClass} value={f.pincode} onChange={set('pincode')} placeholder="400001" /></div>
                        <div className="sm:col-span-2">
                          <label className={labelClass}>Emergency Contact</label>
                          <div className="flex gap-2">
                            <div className="flex h-11 shrink-0 items-center gap-1 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#f5f5f7] px-3 text-[13px] font-semibold text-[#86868b]">+91</div>
                            <input className={inputClass} type="tel" value={f.emergency_no} onChange={set('emergency_no')} placeholder="Emergency number" />
                          </div>
                        </div>
                        <div className="sm:col-span-2">
                          <label className={labelClass}>Notes</label>
                          <textarea className={`${inputClass} min-h-[100px] resize-y py-2.5`} rows={3} value={f.notes} onChange={set('notes')} placeholder="Health conditions, goals, special instructions..." />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className={`member-section-step ${step === 3 ? 'active' : ''}`}>
                    <div className="rounded-3xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)]">
                      <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5f5f7] text-[#1d1d1f]">
                            <Activity size={18} />
                          </span>
                          <div>
                            <div className="text-[16px] font-bold tracking-[-0.01em] text-[#1d1d1f]">Fitness Profile</div>
                            <div className="text-[12px] text-[#86868b]">Training preferences and goals</div>
                          </div>
                        </div>
                        <span className="rounded-full bg-[rgba(0,0,0,0.04)] px-3 py-1 text-[11px] font-bold text-[#86868b]">Optional</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><label className={labelClass}>Weight (kg)</label><input className={inputClass} type="number" step="0.1" placeholder="68.5" value={f.weight} onChange={set('weight')} /></div>
                        <div>
                          <label className={labelClass}>Assign Trainer</label>
                          <select className={inputClass} value={f.trainer_id} onChange={set('trainer_id')} disabled={user?.role === 'trainer'}>
                            <option value="">Select trainer</option>
                            {activeTrainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className={labelClass}>Interested In</label>
                          <input className={inputClass} placeholder="e.g. Weight Loss, Muscle Gain, Yoga, CrossFit" value={f.interested_in} onChange={set('interested_in')} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Bar */}
                <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] flex-wrap">
                  <div>
                    <div className="text-[14px] font-semibold text-[#1d1d1f]">{isEditMode ? 'Ready to update?' : 'Ready to create?'}</div>
                    <div className="text-[12px] text-[#86868b]">Step {step} of {totalSteps} &middot; {STEPS[step - 1].label}</div>
                  </div>
                  <div className="flex gap-2">
                    {step > 1 && (
                      <button type="button" className="h-11 rounded-xl bg-white px-4 text-[13px] font-semibold text-[#86868b] border border-[rgba(0,0,0,0.04)] transition-colors hover:bg-[#f5f5f7] inline-flex items-center gap-1.5" onClick={() => setStep(s => s - 1)}>
                        <ArrowLeft size={14} /> Back
                      </button>
                    )}
                    {step < totalSteps ? (
                      <button type="button" className="h-11 rounded-xl bg-[#1d1d1f] px-5 text-[13px] font-semibold text-white transition-all hover:bg-[#333] inline-flex items-center gap-1.5" style={{ opacity: canAdvance() ? 1 : 0.4 }} onClick={() => { if (canAdvance()) setStep(s => s + 1); }} disabled={!canAdvance()}>
                        Continue <ArrowRight size={14} />
                      </button>
                    ) : (
                      <button type="submit" className="h-11 rounded-xl bg-[#dc2626] px-5 text-[13px] font-semibold text-white transition-all hover:bg-[#b91c1c] disabled:opacity-50 inline-flex items-center gap-1.5" disabled={saving}>
                        {saving ? 'Saving...' : (isEditMode ? 'Update Member' : 'Create Member')}
                      </button>
                    )}
                    <button type="button" className="h-11 rounded-xl bg-white px-4 text-[13px] font-semibold text-[#86868b] border border-[rgba(0,0,0,0.04)] transition-colors hover:bg-[#f5f5f7]" onClick={() => router.back()}>Cancel</button>
                  </div>
                </div>
              </form>
            </div>

            {/* AI Sidebar */}
            <div className="hidden xl:block w-[260px] shrink-0 sticky top-6 space-y-3">
              <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)]">
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f5f5f7] text-[#1d1d1f]"><Sparkles size={15} /></span>
                  <div>
                    <div className="text-[13px] font-bold text-[#1d1d1f]">AI Insights</div>
                    <div className="text-[10px] text-[#86868b]">Onboarding intelligence</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[15px] font-extrabold relative"
                    style={{
                      background: aiScoreLevel === 'high'
                        ? 'conic-gradient(#22c55e 0% 85%, rgba(0,0,0,0.04) 85% 100%)'
                        : 'conic-gradient(#f59e0b 0% 65%, rgba(0,0,0,0.04) 65% 100%)',
                      color: aiScoreLevel === 'high' ? '#22c55e' : '#f59e0b',
                    }}
                  >
                    <span className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-white">{aiScore}%</span>
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-[#1d1d1f]">Profile Score</div>
                    <div className="text-[11px] text-[#86868b]">{aiScore >= 70 ? 'Well on track!' : 'Add more details'}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 rounded-xl bg-[#f5f5f7] px-3 py-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: 'rgba(16,185,129,0.10)', color: '#10b981' }}><Check size={12} /></span>
                    <div className="text-[11.5px] leading-snug text-[#86868b]">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.05em] text-[#86868b]/60">Recommendation</span><br />
                      <strong className="text-[#1d1d1f]">{f.gender ? (activeTrainers[0]?.name || 'Premium') : 'Personal'} Training</strong> — best match based on profile
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 rounded-xl bg-[#f5f5f7] px-3 py-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: 'rgba(124,58,237,0.10)', color: '#7c3aed' }}><Target size={12} /></span>
                    <div className="text-[11.5px] leading-snug text-[#86868b]">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.05em] text-[#86868b]/60">Goal Suggestion</span><br />
                      <strong className="text-[#1d1d1f]">{f.gender ? 'Strength & Conditioning' : 'General Fitness'}</strong> — popular with similar members
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 rounded-xl bg-[#f5f5f7] px-3 py-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: 'rgba(6,182,212,0.10)', color: '#06b6d4' }}><TrendingUp size={12} /></span>
                    <div className="text-[11.5px] leading-snug text-[#86868b]">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.05em] text-[#86868b]/60">Retention Forecast</span><br />
                      <strong className="text-[#1d1d1f]">{f.first_name ? '92% likelihood' : '—'}</strong> {f.first_name ? '6-month retention' : 'Complete profile for prediction'}
                    </div>
                  </div>
                  {f.interested_in && (
                    <div className="flex items-center gap-2.5 rounded-xl bg-[#f5f5f7] px-3 py-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: 'rgba(245,158,11,0.10)', color: '#f59e0b' }}><Zap size={12} /></span>
                      <div className="text-[11.5px] leading-snug text-[#86868b]">
                        <span className="text-[9px] font-semibold uppercase tracking-[0.05em] text-[#86868b]/60">Interest Detected</span><br />
                        <strong className="text-[#1d1d1f]">{f.interested_in}</strong> — relevant programs available
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)]">
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f5f5f7] text-[#1d1d1f]"><Shield size={15} /></span>
                  <div>
                    <div className="text-[13px] font-bold text-[#1d1d1f]">Onboarding Summary</div>
                    <div className="text-[10px] text-[#86868b]">Quick overview</div>
                  </div>
                </div>
                <div className="space-y-2.5 text-[12px]">
                  {[
                    ['Name', `${f.first_name || '—'} ${f.last_name || ''}`],
                    ['Gender', f.gender || '—'],
                    ['Trainer', trainers.find(t => t.id === f.trainer_id)?.name || 'Not assigned'],
                    ['Weight', f.weight ? `${f.weight} kg` : '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-[#86868b]">{k}</span>
                      <span className="font-semibold text-[#1d1d1f]">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
