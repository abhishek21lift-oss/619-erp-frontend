'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api, Trainer } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

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

  // Membership/payment fields are intentionally NOT collected here any more —
  // they live in the member profile's "Add Subscription" tab. We keep the
  // backend contract identical (it accepts these as null) so this is a
  // pure UI change, no migrations needed.
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

  // Load client data when in edit mode
  useEffect(() => {
    if (!editId) return;
    api.clients.get(editId).then((c: any) => {
      // Pre-fill form fields with existing client data
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
        <style jsx>{`
          .member-lux-shell {
            background:
              radial-gradient(circle at top right, rgba(59,130,246,.10), transparent 28%),
              radial-gradient(circle at left 20%, rgba(16,185,129,.10), transparent 26%),
              linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(241,245,249,1) 100%);
          }
          .member-lux-hero {
            position: relative;
            overflow: hidden;
            border-radius: 30px;
            padding: 28px;
            margin-bottom: 22px;
            background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 46%, #0f766e 100%);
            color: #fff;
            box-shadow: 0 24px 56px rgba(15,23,42,.18);
          }
          .member-lux-hero::before,
          .member-lux-hero::after {
            content: '';
            position: absolute;
            border-radius: 999px;
            pointer-events: none;
            opacity: .34;
            filter: blur(8px);
          }
          .member-lux-hero::before {
            width: 220px;
            height: 220px;
            right: -40px;
            top: -60px;
            background: rgba(255,255,255,.14);
          }
          .member-lux-hero::after {
            width: 180px;
            height: 180px;
            left: 40%;
            bottom: -90px;
            background: rgba(34,211,238,.18);
          }
          .member-lux-hero-grid {
            position: relative;
            z-index: 1;
            display: grid;
            gap: 18px;
          }
          .member-lux-top {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
            flex-wrap: wrap;
          }
          .member-lux-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border-radius: 999px;
            border: 1px solid rgba(255,255,255,.18);
            background: rgba(255,255,255,.12);
            font-size: 12px;
            letter-spacing: .08em;
            text-transform: uppercase;
            font-weight: 800;
          }
          .member-lux-title {
            margin: 14px 0 10px;
            font-size: clamp(2rem, 3vw, 3.2rem);
            line-height: 1.02;
            letter-spacing: -.04em;
            font-weight: 900;
          }
          .member-lux-copy {
            margin: 0;
            max-width: 64ch;
            color: rgba(255,255,255,.82);
            line-height: 1.7;
            font-size: 15px;
          }
          .member-lux-metrics {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
          }
          .member-lux-metric {
            min-width: 150px;
            padding: 14px 16px;
            border-radius: 18px;
            background: rgba(255,255,255,.10);
            border: 1px solid rgba(255,255,255,.16);
          }
          .member-lux-metric strong {
            display: block;
            font-size: 18px;
          }
          .member-lux-metric span {
            font-size: 12px;
            color: rgba(255,255,255,.76);
          }
          .member-lux-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
          }
          .member-lux-btn,
          .member-lux-btn-secondary {
            min-height: 48px;
            padding: 0 18px;
            border-radius: 16px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: 800;
            border: 1px solid transparent;
            transition: transform .18s ease, box-shadow .18s ease, background .18s ease;
          }
          .member-lux-btn {
            background: linear-gradient(135deg, #f97316, #ef4444 52%, #ec4899);
            color: #fff;
            box-shadow: 0 18px 32px rgba(239,68,68,.26);
          }
          .member-lux-btn-secondary {
            background: rgba(255,255,255,.10);
            color: #fff;
            border-color: rgba(255,255,255,.16);
          }
          .member-lux-btn:hover,
          .member-lux-btn-secondary:hover {
            transform: translateY(-1px);
          }
          .member-section-card {
            border-radius: 26px;
            padding: 24px;
            background: rgba(255,255,255,.82);
            border: 1px solid rgba(255,255,255,.68);
            box-shadow: 0 16px 40px rgba(15,23,42,.07);
            backdrop-filter: blur(16px);
          }
          .member-section-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 22px;
            flex-wrap: wrap;
          }
          .member-section-title-wrap {
            display: flex;
            align-items: center;
            gap: 14px;
          }
          .member-section-icon {
            width: 48px;
            height: 48px;
            border-radius: 16px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, rgba(79,70,229,.16), rgba(16,185,129,.14));
            box-shadow: inset 0 1px 0 rgba(255,255,255,.72);
            font-size: 20px;
          }
          .member-section-title {
            margin: 0;
            font-size: 18px;
            line-height: 1.15;
            font-weight: 800;
            letter-spacing: -.02em;
            color: var(--text);
          }
          .member-section-copy {
            margin: 6px 0 0;
            font-size: 13px;
            line-height: 1.65;
            color: var(--text2);
            max-width: 58ch;
          }
          .member-section-chip {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 9px 12px;
            border-radius: 999px;
            background: rgba(59,130,246,.10);
            color: #1d4ed8;
            font-size: 12px;
            font-weight: 800;
          }
          .member-form-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px 18px;
          }
          .member-form-grid > div {
            margin-bottom: 0 !important;
          }
          .member-form-grid .member-span-2 {
            grid-column: 1 / -1;
          }
          .member-form-grid .input,
          .member-form-grid .select {
            min-height: 48px;
            border-radius: 16px;
            border: 1px solid rgba(15,23,42,.08);
            background: rgba(248,250,252,.92);
            box-shadow: inset 0 1px 0 rgba(255,255,255,.74);
          }
          .member-form-grid .input:focus,
          .member-form-grid .select:focus {
            border-color: rgba(99,102,241,.36);
            box-shadow: 0 0 0 4px rgba(99,102,241,.10);
          }
          @media (max-width: 768px) {
            .member-section-card {
              border-radius: 22px;
              padding: 20px;
            }
            .member-form-grid {
              grid-template-columns: 1fr;
            }
          }
          .member-info-card {
            border-radius: 24px;
            padding: 20px 22px;
            background: linear-gradient(135deg, rgba(249,115,22,.10), rgba(236,72,153,.08));
            border: 1px solid rgba(249,115,22,.18);
            box-shadow: 0 14px 32px rgba(249,115,22,.08);
          }
          .member-info-row {
            display: flex;
            align-items: flex-start;
            gap: 14px;
          }
          .member-info-icon {
            width: 46px;
            height: 46px;
            border-radius: 16px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: rgba(255,255,255,.55);
            font-size: 20px;
            flex-shrink: 0;
          }
          .member-info-title {
            margin: 0 0 4px;
            font-size: 15px;
            font-weight: 800;
            color: #9a3412;
          }
          .member-info-copy {
            margin: 0;
            font-size: 13px;
            line-height: 1.7;
            color: #7c2d12;
            max-width: 64ch;
          }
          .member-notes-card textarea.input {
            min-height: 120px;
            border-radius: 18px;
            border: 1px solid rgba(15,23,42,.08);
            background: rgba(248,250,252,.92);
            box-shadow: inset 0 1px 0 rgba(255,255,255,.74);
          }
          .member-bottom-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 18px 20px;
            border-radius: 24px;
            background: rgba(255,255,255,.84);
            border: 1px solid rgba(255,255,255,.72);
            box-shadow: 0 18px 40px rgba(15,23,42,.07);
            backdrop-filter: blur(14px);
            flex-wrap: wrap;
          }
          .member-bottom-copy strong {
            display: block;
            font-size: 15px;
            letter-spacing: -.02em;
            color: var(--text);
          }
          .member-bottom-copy span {
            display: block;
            margin-top: 4px;
            font-size: 13px;
            color: var(--text2);
          }
          .member-bottom-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
          }
          .member-bottom-secondary,
          .member-bottom-primary {
            min-height: 48px;
            padding: 0 18px;
            border-radius: 16px;
            font-size: 14px;
            font-weight: 800;
          }
          .member-bottom-secondary {
            background: rgba(248,250,252,.95);
            border: 1px solid rgba(15,23,42,.08);
            color: var(--text);
          }
          .member-bottom-primary {
            border: none;
            color: #fff;
            background: linear-gradient(135deg, #4f46e5, #2563eb 55%, #0f766e);
            box-shadow: 0 18px 32px rgba(37,99,235,.24);
          }
          @media (max-width: 768px) {
            .member-bottom-bar {
              border-radius: 22px;
            }
            .member-bottom-actions {
              width: 100%;
            }
            .member-bottom-actions > * {
              flex: 1;
            }
          }
          @media (max-width: 768px) {
            .member-lux-hero {
              border-radius: 24px;
              padding: 22px;
            }
            .member-lux-top {
              flex-direction: column;
              align-items: stretch;
            }
            .member-lux-actions > * {
              flex: 1;
            }
            .member-lux-metrics {
              flex-direction: column;
            }
          }
        `}</style>
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
                  {saving ? 'Saving…' : (isEditMode ? 'Update Member' : 'Save Member')}
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

              {/* ── MEMBER SECTION ── */}
              <div className="card member-section-card">
                <div className="member-section-head">
                  <div className="member-section-title-wrap">
                    <span className="member-section-icon">👤</span>
                    <div>
                      <div className="member-section-title">Member Information</div>
                      <div className="member-section-copy">Primary profile, contact, identity, and coaching details organized for a cleaner premium onboarding flow.</div>
                    </div>
                  </div>
                  <div className="member-section-chip">Core Profile</div>
                </div>
                <div className="member-form-grid">

                {/* Name */}
                <FormGroup label="Member Name" required>
                  <div className="member-span-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
                    <input className="input" placeholder="First name" value={f.first_name} onChange={S('first_name')} required />
                    <input className="input" placeholder="Last name" value={f.last_name} onChange={S('last_name')} />
                  </div>
                </FormGroup>

                {/* Email */}
                <FormGroup label="Member Email">
                  <input className="input" type="email" placeholder="e.g. abc@gmail.com" value={f.email} onChange={S('email')} />
                </FormGroup>

                {/* Mobile */}
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

                {/* Alt Mobile */}
                <FormGroup label="Alternate Mobile Number">
                  <div style={{ display: 'flex', gap: '.5rem' }}>
                    <CountryCodeBox />
                    <input className="input" type="tel" placeholder="e.g. 9876543210"
                      value={f.alt_mobile} onChange={S('alt_mobile')} style={{ flex: 1 }} />
                  </div>
                </FormGroup>

                {/* DOB & Anniversary */}
                <FormGroup label="Date of Birth">
                  <input className="input" type="date" value={f.dob} onChange={S('dob')} />
                </FormGroup>

                <FormGroup label="Anniversary Date">
                  <input className="input" type="date" value={f.anniversary} onChange={S('anniversary')} />
                </FormGroup>

                {/* Gender radio */}
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

                {/* Reference Number */}
                <FormGroup label="Reference Number">
                  <input className="input" value={f.reference_no} onChange={S('reference_no')} />
                </FormGroup>

                {/* Aadhaar */}
                <FormGroup label="Aadhaar Number">
                  <input className="input" placeholder="e.g. 3675 9834 6012" value={f.aadhaar_no} onChange={S('aadhaar_no')} />
                </FormGroup>

                {/* PAN */}
                <FormGroup label="PAN Number">
                  <input className="input" placeholder="Enter PAN Number" value={f.pan_no} onChange={S('pan_no')} />
                </FormGroup>

                {/* GST */}
                <FormGroup label="Customer GST Number">
                  <input className="input" value={f.gst_no} onChange={S('gst_no')} />
                </FormGroup>

                {/* Company */}
                <FormGroup label="Customer Company Name">
                  <input className="input" value={f.company_name} onChange={S('company_name')} />
                </FormGroup>

                {/* Assign Trainer */}
                <FormGroup label="Assign Trainer">
                  <select className="input select" value={f.trainer_id} onChange={S('trainer_id')} disabled={user?.role === 'trainer'}>
                    <option value="">Assign Trainer</option>
                    {trainers.filter(t => t.status === 'active').map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </FormGroup>

                {/* Weight */}
                <FormGroup label="Weight (kg)">
                  <input className="input" type="number" step="0.1" placeholder="e.g. 68.5" value={f.weight} onChange={S('weight')} />
                </FormGroup>

                {/* Emergency */}
                <FormGroup label="Emergency Contact Number">
                  <div style={{ display: 'flex', gap: '.5rem' }}>
                    <CountryCodeBox />
                    <input className="input" type="tel" value={f.emergency_no} onChange={S('emergency_no')} style={{ flex: 1 }} />
                  </div>
                </FormGroup>

                {/* Interested In */}
                <FormGroup label="Interested In">
                  <input className="input" placeholder="e.g. Weight Loss, Muscle Gain, Yoga" value={f.interested_in} onChange={S('interested_in')} />
                </FormGroup>
                </div>
              </div>

              {/* ── ADDRESS SECTION ── */}
              <div className="card member-section-card">
                <div className="member-section-head">
                  <div className="member-section-title-wrap">
                    <span className="member-section-icon">📍</span>
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

              {/* Membership + Payment sections live on the member's
                  profile under "Add Subscription" now — keeps onboarding
                  to two short steps instead of one long form. */}
              <div className="member-info-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                  <span className="member-info-icon">💡</span>
                  <div>
                    <div className="member-info-title">Plan & payment moved</div>
                    <div className="member-info-copy">
                      After saving, you'll land on this member's profile where you can pick a plan, set start/end dates and record the payment under <b>Add Subscription</b>.
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="card">
                <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: '.5rem' }}>Notes (optional)</label>
                <textarea className="input" rows={3} value={f.notes} onChange={S('notes')}
                  placeholder="Health conditions, goals, special instructions…" />
              </div>

              <div className="member-bottom-bar">
                <div className="member-bottom-copy">
                  <strong>{isEditMode ? 'Ready to update this member?' : 'Ready to create this member?'}</strong>
                  <span>Subscription setup continues inside the member profile after saving.</span>
                </div>
                <div className="member-bottom-actions">
                  <button type="submit" className="member-bottom-primary" disabled={saving}>
                    {saving ? 'Saving…' : (isEditMode ? 'Update Member' : 'Save Member')}
                  </button>
                  <button type="button" className="member-bottom-secondary" onClick={() => router.back()}>Cancel</button>
                </div>
              </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}

/* ── Sub-components ── */
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
