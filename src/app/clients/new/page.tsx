'use client';
import { useState, useEffect, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import Sidebar from '@/components/Sidebar';
import { api, Trainer } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  importSheetFile, getSheetCache, clearSheetCache,
  lookupByMobile, searchByName, mergeEmptyOnly,
  type SheetCache, type SheetMember,
} from '@/lib/sheet-import';

export default function NewClientPage() { return <Guard><NewClientForm /></Guard>; }

function NewClientForm() {
  const router = useRouter();
  const { user } = useAuth();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const today = new Date().toISOString().split('T')[0];

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
    pt_start_date: today,
    pt_end_date: '',
    package_type: 'Half Yearly',
    base_amount: '', discount: '0', final_amount: '', paid_amount: '',
    payment_method: 'CASH', payment_date: today,
    notes: '', status: 'active',
    emergency_no: '',
    interested_in: '',
    weight: '',
  });

  useEffect(() => {
    api.trainers.list().then(setTrainers).catch(console.error);
    setF(p => ({ ...p, pt_end_date: computeEndDate(p.pt_start_date || today, p.package_type) }));
    // load any previously-imported sheet from localStorage
    setSheetCache(getSheetCache());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Sheet-import / auto-fill state ───────────────────────── */
  const [sheetCache, setSheetCache] = useState<SheetCache | null>(null);
  const [sheetBusy, setSheetBusy]   = useState(false);
  const [sheetError, setSheetError] = useState('');
  const [filledFields, setFilledFields] = useState<string[]>([]);
  const [nameSuggestions, setNameSuggestions] = useState<SheetMember[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastLookupMobile = useRef<string>('');

  async function handleSheetUpload(file: File) {
    setSheetBusy(true); setSheetError('');
    try {
      const c = await importSheetFile(file);
      setSheetCache(c);
      if (c.rowCount === 0)
        setSheetError('No recognisable rows found. Make sure the sheet has columns like Name, Mobile, Email, etc.');
    } catch (e: any) {
      setSheetError(e?.message || 'Could not read this file.');
    } finally {
      setSheetBusy(false);
    }
  }

  function applyMember(m: SheetMember) {
    const { merged, filledFields: filled } = mergeEmptyOnly(f, m);
    setF(merged);
    setFilledFields(filled);
    setNameSuggestions([]);
    if (filled.includes('pt_start_date') || filled.includes('package_type'))
      setF(p => ({
        ...merged,
        pt_end_date: merged.pt_end_date || computeEndDate(merged.pt_start_date || today, merged.package_type),
      }));
  }

  // when mobile changes, try to auto-fill
  useEffect(() => {
    const m = (f.mobile || '').replace(/\D/g, '').slice(-10);
    if (m.length !== 10 || m === lastLookupMobile.current) return;
    if (!sheetCache) return;
    const hit = lookupByMobile(m);
    if (hit) {
      lastLookupMobile.current = m;
      applyMember(hit);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.mobile, sheetCache]);

  // when first_name changes, offer name suggestions if mobile is empty
  useEffect(() => {
    if (!sheetCache) { setNameSuggestions([]); return; }
    if (f.mobile && f.mobile.length >= 6) { setNameSuggestions([]); return; }
    const q = (f.first_name + ' ' + f.last_name).trim();
    setNameSuggestions(q.length >= 2 ? searchByName(q, 6) : []);
  }, [f.first_name, f.last_name, f.mobile, sheetCache]);


  function computeEndDate(start: string, pkg: string): string {
    const durations: Record<string, number> = {
      'Monthly': 30, 'Quarterly': 90, 'Half Yearly': 180, 'Yearly': 365,
      'PT': 90,
      'PT - Monthly': 30, 'PT - Quarterly': 90, 'PT - Half Yearly': 180, 'PT - Yearly': 365,
    };
    if (!start) return '';
    const d = new Date(start);
    if (isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + (durations[pkg] || 90));
    return d.toISOString().split('T')[0];
  }

  function handleAmt(k: string, v: string) {
    const next = { ...f, [k]: v };
    const base = parseFloat(next.base_amount) || 0;
    const disc = parseFloat(next.discount) || 0;
    next.final_amount = String(Math.max(0, base - disc));
    setF(next);
  }

  function handlePackage(pkg: string) {
    setF(p => ({ ...p, package_type: pkg, pt_end_date: computeEndDate(p.pt_start_date || today, pkg) }));
  }

  function handleStartDate(newStart: string) {
    setF(p => ({ ...p, pt_start_date: newStart, pt_end_date: computeEndDate(newStart || today, p.package_type) }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!f.first_name.trim()) return setError('First name is required');
    setSaving(true); setError('');
    try {
      const fullName = [f.first_name, f.last_name].filter(Boolean).join(' ');
      const trainer = trainers.find(t => t.id === f.trainer_id);
      await api.clients.create({
        ...f,
        name: fullName,
        trainer_name: trainer?.name || '',
        base_amount: parseFloat(f.base_amount) || 0,
        discount: parseFloat(f.discount) || 0,
        final_amount: parseFloat(f.final_amount) || 0,
        paid_amount: parseFloat(f.paid_amount) || 0,
        weight: parseFloat(f.weight) || undefined,
      });
      router.push('/clients');
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  const S = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="page-main">
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={() => router.back()} className="btn btn-ghost btn-sm">←</button>
            <div>
              <div className="topbar-title">Add New Member</div>
              <div className="topbar-sub">Fill in the member details below</div>
            </div>
          </div>
          <button type="submit" form="member-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : '💾 Save Member'}
          </button>
        </div>

        <div className="page-content fade-up">
          {error && <div className="alert alert-error">{error}</div>}

          <form id="member-form" onSubmit={submit}>
            <div style={{ display: 'grid', gap: '1.25rem' }}>

              {/* ── SHEET-IMPORT / AUTO-FILL ── */}
              <div className="card" style={{ borderColor: 'var(--brand)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.75rem' }}>
                  <div>
                    <div className="card-title" style={{ fontSize: 16, marginBottom: 4 }}>
                      📄 Auto-fill from your sheet
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                      {sheetCache
                        ? <>Using <b>{sheetCache.fileName}</b> — {sheetCache.rowCount} members loaded.
                            Type a 10-digit mobile below and matching details will fill in automatically.</>
                        : <>Upload your Google Sheet (export as <code>.xlsx</code> or <code>.csv</code>).
                            Then typing a known mobile number will fill the form automatically.</>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      style={{ display: 'none' }}
                      onChange={e => { const file = e.target.files?.[0]; if (file) handleSheetUpload(file); e.target.value = ''; }}
                    />
                    <button type="button" className="btn btn-primary btn-sm"
                      disabled={sheetBusy}
                      onClick={() => fileInputRef.current?.click()}>
                      {sheetBusy ? 'Reading…' : (sheetCache ? '🔄 Re-import sheet' : '📥 Import sheet')}
                    </button>
                    {sheetCache && (
                      <button type="button" className="btn btn-ghost btn-sm"
                        onClick={() => { clearSheetCache(); setSheetCache(null); setFilledFields([]); }}>
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                {sheetError && <div className="alert alert-error mt-1">{sheetError}</div>}
                {filledFields.length > 0 && (
                  <div className="alert alert-success mt-1" style={{ fontSize: 13 }}>
                    ✨ Auto-filled {filledFields.length} field{filledFields.length === 1 ? '' : 's'} from sheet:
                    {' '}{filledFields.join(', ')}
                  </div>
                )}
                {nameSuggestions.length > 0 && (
                  <div style={{ marginTop: '.75rem' }}>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: '.35rem' }}>
                      Matches in sheet — click to fill:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
                      {nameSuggestions.map((m, i) => (
                        <button key={i} type="button" className="btn btn-ghost btn-sm"
                          onClick={() => applyMember(m)}
                          style={{ textAlign: 'left' }}>
                          {m.name || `${m.first_name || ''} ${m.last_name || ''}`.trim()}
                          {m.mobile && <span style={{ color: 'var(--text2)', marginLeft: 6 }}>· {m.mobile}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── MEMBER SECTION ── */}
              <div className="card">
                <div className="card-title" style={{ marginBottom: '1.5rem', fontSize: 16 }}>👤 Member</div>

                {/* Name */}
                <FormGroup label="Member Name" required>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
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

              {/* ── ADDRESS SECTION ── */}
              <div className="card">
                <div className="card-title" style={{ marginBottom: '1.5rem', fontSize: 16 }}>📍 Address</div>

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

              {/* ── MEMBERSHIP SECTION ── */}
              <div className="card">
                <div className="card-title" style={{ marginBottom: '1.5rem', fontSize: 16 }}>🏋️ Membership Details</div>
                <div className="form-row form-row-2">
                  <div>
                    <label>Package Type</label>
                    <select className="input select" value={f.package_type} onChange={e => handlePackage(e.target.value)}>
                      {['Monthly', 'Quarterly', 'Half Yearly', 'Yearly', 'PT - Monthly', 'PT - Quarterly', 'PT - Half Yearly', 'PT - Yearly'].map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Status</label>
                    <select className="input select" value={f.status} onChange={S('status')}>
                      <option>active</option><option>frozen</option>
                    </select>
                  </div>
                  <div>
                    <label>Start Date</label>
                    <input className="input" type="date" value={f.pt_start_date} onChange={e => handleStartDate(e.target.value)} />
                  </div>
                  <div>
                    <label>End Date</label>
                    <input className="input" type="date" value={f.pt_end_date} onChange={S('pt_end_date')} />
                  </div>
                </div>
              </div>

              {/* ── PAYMENT SECTION ── */}
              <div className="card">
                <div className="card-title" style={{ marginBottom: '1.5rem', fontSize: 16 }}>💳 Payment Details</div>
                <div className="form-row form-row-4">
                  <div>
                    <label>Base Amount (₹)</label>
                    <input className="input" type="number" value={f.base_amount} onChange={e => handleAmt('base_amount', e.target.value)} />
                  </div>
                  <div>
                    <label>Discount (₹)</label>
                    <input className="input" type="number" value={f.discount} onChange={e => handleAmt('discount', e.target.value)} />
                  </div>
                  <div>
                    <label>Final Amount (₹)</label>
                    <input className="input" type="number" value={f.final_amount} onChange={S('final_amount')}
                      style={{ borderColor: 'var(--brand)', color: 'var(--brand2)', fontWeight: 700 }} />
                  </div>
                  <div>
                    <label>Amount Paid Today (₹)</label>
                    <input className="input" type="number" value={f.paid_amount} onChange={S('paid_amount')} />
                  </div>
                  <div>
                    <label>Payment Method</label>
                    <select className="input select" value={f.payment_method} onChange={S('payment_method')}>
                      <option>CASH</option><option>UPI</option><option>CARD</option><option>BANK_TRANSFER</option>
                    </select>
                  </div>
                  <div>
                    <label>Payment Date</label>
                    <input className="input" type="date" value={f.payment_date} onChange={S('payment_date')} />
                  </div>
                </div>
                {f.final_amount && f.paid_amount && parseFloat(f.final_amount) > parseFloat(f.paid_amount) && (
                  <div className="alert alert-warning mt-1">
                    ⚠️ Balance due: ₹{(parseFloat(f.final_amount) - parseFloat(f.paid_amount)).toLocaleString('en-IN')}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="card">
                <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: '.5rem' }}>Notes (optional)</label>
                <textarea className="input" rows={3} value={f.notes} onChange={S('notes')}
                  placeholder="Health conditions, goals, special instructions…" />
              </div>

              <div style={{ display: 'flex', gap: '.75rem' }}>
                <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
                  {saving ? 'Saving…' : '💾 Save Member'}
                </button>
                <button type="button" className="btn btn-ghost btn-lg" onClick={() => router.back()}>Cancel</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
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
