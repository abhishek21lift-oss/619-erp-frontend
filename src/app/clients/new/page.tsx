'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api, Trainer } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import './member-intake.css';

export default function NewClientPage() { return <Guard><NewClientForm /></Guard>; }

function NewClientForm() {
  const router = useRouter();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditMode = Boolean(editId);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

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
          dob: c.dob?.slice(0,10) || '',
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
          anniversary: c.anniversary?.slice(0,10) || '',
          notes: c.notes || '',
          status: c.status || 'active',
          emergency_no: c.emergency_no || c.emergency_contact || '',
          interested_in: c.interested_in || '',
          weight: c.weight != null ? String(c.weight) : '',
        };
      });
    }).catch(console.error);
  }, [editId]);

  useEffect(() => {
    api.trainers.list().then(setTrainers).catch(console.error);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!f.first_name.trim()) return setError('First name is required');
    setSaving(true); setError('');
    try {
      const fullName = [f.first_name, f.last_name].filter(Boolean).join(' ');
      const trainer = trainers.find(t => t.id === f.trainer_id);
      const payload = {
        ...f,
        name: fullName,
        trainer_name: trainer?.name || '',
        weight: parseFloat(f.weight) || undefined,
      };
      const created = isEditMode
        ? await api.clients.update(editId!, payload)
        : await api.clients.create(payload);
      const savedId = (created as any)?.client?.id || editId;
      router.push(savedId ? `/clients/${savedId}` : '/clients');
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  const S = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

  return (
    <AppShell>
      <div className="page-main member-lux-shell">
        <section className="member-lux-hero fade-up">
          <div className="member-lux-hero-grid">
            <div className="member-lux-top">
              <div>
                <span className="member-lux-badge">619 Fitness Studio Member Intake</span>
                <h1 className="member-lux-title">{isEditMode ? 'Edit Member Profile' : 'Add New Member'}</h1>
                <p className="member-lux-copy">Premium intake flow with cleaner spacing, better visual hierarchy, and a modern gym-style dashboard experience for fast front-desk onboarding.</p>
              </div>
              <div className="member-lux-actions">
                <button type="button" onClick={() => router.back()} className="member-lux-btn-secondary">Back</button>
                <button type="submit" form="member-form" className="member-lux-btn" disabled={saving}>
                  {saving ? 'Saving...' : (isEditMode ? 'Update Member' : 'Save Member')}
                </button>
              </div>
            </div>
            <div className="member-lux-metrics">
              <div className="member-lux-metric"><strong>{f.first_name ? 'Active' : 'Draft'}</strong><span>member profile state</span></div>
              <div className="member-lux-metric"><strong>{trainers.filter(t => t.status === 'active').length}</strong><span>active trainers available</span></div>
              <div className="member-lux-metric"><strong>{isEditMode ? 'Update mode' : 'New onboarding'}</strong><span>workflow context</span></div>
            </div>
          </div>
        </section>

        <div className="page-content fade-up">
          {error && <div className="alert alert-error">{error}</div>}

          <form id="member-form" onSubmit={submit}>
            <div style={{ display: 'grid', gap: '1.25rem' }}>

              {/* MEMBER SECTION */}
              <div className="card member-section-card">
                <div className="member-section-head">
                  <div className="member-section-title-wrap">
                    <span className="member-section-icon">&#128100;</span>
                    <div>
                      <div className="member-section-title">Member Information</div>
                      <div className="member-section-copy">Primary profile, contact, identity, and coaching details organized for a cleaner premium onboarding flow.</div>
                    </div>
                  </div>
                  <div className="member-section-chip">Core Profile</div>
                </div>
                <div className="member-form-grid">

                <FormGroup label="Member Name" required>
                  <div className="member-span-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
                    <input className="input" placeholder="First name" value={f.first_name} onChange={S('first_name')} required />
                    <input className="input" placeholder="Last name" value={f.last_name} onChange={S('last_name')} />
                  </div>
                </FormGroup>

                <FormGroup label="Member Email">
                  <input className="input" type="email" placeholder="e.g. abc@gmail.com" value={f.email} onChange={S('email')} />
                </FormGroup>

                <FormGroup label="Mobile Number" required>
                  <div style={{ display: 'flex', gap: '.5rem' }}>
                    <CountryCodeBox />
                    <input className="input" type="tel" placeholder="e.g. 9876543210"
                      value={f.mobile} onChange={S('mobile')}
                      disabled={f.is_mobile_redacted}
                      style={{ flex: 1, opacity: f.is_mobile_redacted ? 0.4 : 1 }} />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginTop: '.6rem', cursor: 'pointer', fontSize: 13, color: 'var(--text2)' }}>
                    <input type="checkbox" checked={f.is_mobile_redacted}
                      onChange={e => setF(p => ({ ...p, is_mobile_redacted: e.target.checked, mobile: e.target.checked ? '' : p.mobile }))}
                      style={{ width: 15, height: 15, accentColor: 'var(--brand)', cursor: 'pointer' }} />
                    Customer reluctant to give Mobile Number.
                  </label>
                </FormGroup>

                <FormGroup label="Alternate Mobile Number">
                  <div style={{ display: 'flex', gap: '.5rem' }}>
                    <CountryCodeBox />
                    <input className="input" type="tel" placeholder="e.g. 9876543210"
                      value={f.alt_mobile} onChange={S('alt_mobile')} style={{ flex: 1 }} />
                  </div>
                </FormGroup>

                <FormGroup label="Date of Birth">
                  <input className="input" type="date" value={f.dob} onChange={S('dob')} />
                </FormGroup>

                <FormGroup label="Anniversary Date">
                  <input className="input" type="date" value={f.anniversary} onChange={S('anniversary')} />
                </FormGroup>

                <FormGroup label="Gender" required>
                  <div style={{ display: 'flex', gap: '2.5rem', paddingTop: '.25rem' }}>
                    {(['Male', 'Female', 'Other'] as const).map(g => (
                      <label key={g} onClick={() => setF(p => ({ ...p, gender: g }))}
                        style={{ display: 'flex', alignItems: 'center', gap: '.6rem', cursor: 'pointer', fontSize: 14, color: f.gender === g ? 'var(--text)' : 'var(--text2)', userSelect: 'none' }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%', border: '2px solid',
                          borderColor: f.gender === g ? 'var(--brand)' : 'var(--muted)',
                          background: 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all .15s', flexShrink: 0,
                        }}>
                          {f.gender === g && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand)' }} />}
                        </div>
                        {g}
                      </label>
                    ))}
                  </div>
                </FormGroup>

                <FormGroup label="Reference Number">
                  <input className="input" value={f.reference_no} onChange={S('reference_no')} />
                </FormGroup>

                <FormGroup label="Aadhaar Number">
                  <input className="input" placeholder="e.g. 3675 9834 6012" value={f.aadhaar_no} onChange={S('aadhaar_no')} />
                </FormGroup>

                <FormGroup label="PAN Number">
                  <input className="input" placeholder="Enter PAN Number" value={f.pan_no} onChange={S('pan_no')} />
                </FormGroup>

                <FormGroup label="Customer GST Number">
                  <input className="input" value={f.gst_no} onChange={S('gst_no')} />
                </FormGroup>

                <FormGroup label="Customer Company Name">
                  <input className="input" value={f.company_name} onChange={S('company_name')} />
                </FormGroup>

                <FormGroup label="Assign Trainer">
                  <select className="input select" value={f.trainer_id} onChange={S('trainer_id')} disabled={user?.role === 'trainer'}>
                    <option value="">Assign Trainer</option>
                    {trainers.filter(t => t.status === 'active').map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </FormGroup>

                <FormGroup label="Weight (kg)">
                  <input className="input" type="number" step="0.1" placeholder="e.g. 68.5" value={f.weight} onChange={S('weight')} />
                </FormGroup>

                <FormGroup label="Emergency Contact Number">
                  <div style={{ display: 'flex', gap: '.5rem' }}>
                    <CountryCodeBox />
                    <input className="input" type="tel" value={f.emergency_no} onChange={S('emergency_no')} style={{ flex: 1 }} />
                  </div>
                </FormGroup>

                <FormGroup label="Interested In">
                  <input className="input" placeholder="e.g. Weight Loss, Muscle Gain, Yoga" value={f.interested_in} onChange={S('interested_in')} />
                </FormGroup>

                </div>
              </div>

              {/* ADDRESS SECTION */}
              <div className="card member-section-card">
                <div className="member-section-head">
                  <div className="member-section-title-wrap">
                    <span className="member-section-icon">&#128205;</span>
                    <div>
                      <div className="member-section-title">Address Details</div>
                      <div className="member-section-copy">Capture billing and location details in the same visual language as the member profile experience.</div>
                    </div>
                  </div>
                  <div className="member-section-chip">Address</div>
                </div>
                <div className="member-form-grid">

                <FormGroup label="Address">
                  <input className="input" placeholder="Flat No., Building name" value={f.address} onChange={S('address')} style={{ marginBottom: '.5rem' }} />
                  <input className="input" placeholder="Street, Area" value={f.street} onChange={S('street')} />
                </FormGroup>

                <FormGroup label="City">
                  <input className="input" value={f.city} onChange={S('city')} />
                </FormGroup>

                <FormGroup label="State">
                  <input className="input" value={f.state} onChange={S('state')} />
                </FormGroup>

                <FormGroup label="Country">
                  <input className="input" value={f.country} onChange={S('country')} />
                </FormGroup>

                <FormGroup label="Pincode">
                  <input className="input" value={f.pincode} onChange={S('pincode')} />
                </FormGroup>

                </div>
              </div>

              {/* Membership + Payment: handled via member profile after save */}
              <div className="member-info-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                  <span className="member-info-icon">&#128161;</span>
                  <div>
                    <div className="member-info-title">Plan &amp; payment moved</div>
                    <div className="member-info-copy">
                      After saving, you will land on this member profile where you can pick a plan, set start/end dates and record the payment under <b>Add Subscription</b>.
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="card">
                <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: '.5rem' }}>Notes (optional)</label>
                <textarea className="input" rows={3} value={f.notes} onChange={S('notes')}
                  placeholder="Health conditions, goals, special instructions..." />
              </div>

              <div className="member-bottom-bar">
                <div className="member-bottom-copy">
                  <strong>{isEditMode ? 'Ready to update this member?' : 'Ready to create this member?'}</strong>
                  <span>Subscription setup continues inside the member profile after saving.</span>
                </div>
                <div className="member-bottom-actions">
                  <button type="submit" className="member-bottom-primary" disabled={saving}>
                    {saving ? 'Saving...' : (isEditMode ? 'Update Member' : 'Save Member')}
                  </button>
                  <button type="button" className="member-bottom-secondary" onClick={() => router.back()}>Cancel</button>
                </div>
              </div>

            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}

/* Sub-components */
function FormGroup({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.1rem' }}>
      <label style={{ display: 'block', fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: '.5rem' }}>
        {label}{required && <span style={{ color: 'var(--brand)', marginLeft: 2 }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function CountryCodeBox() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 14px', borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--glass-border-strong)',
      background: 'var(--glass-bg-2)', color: 'var(--text2)',
      fontSize: 14, fontWeight: 600, minWidth: 62, whiteSpace: 'nowrap',
    }}>+91</div>
  );
}
