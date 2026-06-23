'use client';
import { use, useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { ArrowLeft, Save } from 'lucide-react';

// Validate Indian mobile: starts with 6-9, exactly 10 digits
const MOBILE_RE = /^[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EditTrainerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Guard role="admin"><EditContent id={id} /></Guard>;
}

function EditContent({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  // All trainer fields that the backend PUT accepts and the DB stores
  const [form, setForm] = useState({
    name:           '',
    mobile:         '',
    email:          '',
    dob:            '',
    gender:         '',
    joining_date:   '',
    address:        '',
    specialization: '',
    certifications: '',
    salary:         '',
    incentive_rate: '',
    status:         'active',
    notes:          '',
    role:           '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.trainers.get(id).then((t: any) => {
      setForm({
        name:           t.name || '',
        mobile:         t.mobile || '',
        email:          t.email || '',
        // date fields: DB returns ISO date string; HTML date input needs YYYY-MM-DD
        dob:            t.dob ? String(t.dob).slice(0, 10) : '',
        // gender must be 'Male'|'Female'|'Other' or '' — matches DB CHECK constraint
        gender:         t.gender || '',
        joining_date:   t.joining_date ? String(t.joining_date).slice(0, 10) : '',
        address:        t.address || '',
        specialization: t.specialization || '',
        // certifications stored as TEXT; show as-is
        certifications: t.certifications || '',
        // incentive_rate stored as decimal (0–1) in DB; backend converts %÷100 on write
        // On read we multiply back to percentage for the UI
        incentive_rate: t.incentive_rate != null ? String(Math.round(parseFloat(t.incentive_rate) * 100)) : '',
        salary:         t.salary != null ? String(t.salary) : '',
        status:         t.status || 'active',
        notes:          t.notes || '',
        role:           t.role || '',
      });
      setLoading(false);
    }).catch((err: any) => {
      toast.error(err?.message || 'Failed to load trainer');
      setLoading(false);
    });
  }, [id, toast]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    if (form.email && !EMAIL_RE.test(form.email.trim())) {
      setError('Please enter a valid email address');
      return;
    }
    if (form.mobile && !MOBILE_RE.test(form.mobile.trim())) {
      setError('Phone must be a valid 10-digit Indian mobile number starting with 6–9');
      return;
    }

    setSaving(true);
    try {
      await api.trainers.update(id, {
        name:           form.name.trim(),
        mobile:         form.mobile || null,
        email:          form.email || null,
        dob:            form.dob || null,
        gender:         form.gender || null,
        joining_date:   form.joining_date || null,
        address:        form.address || null,
        specialization: form.specialization || null,
        certifications: form.certifications || null,
        // salary as number (rupees)
        salary:         form.salary ? parseFloat(form.salary) : null,
        // incentive_rate as percentage (0–100); backend divides by 100 before DB storage
        incentive_rate: form.incentive_rate ? parseFloat(form.incentive_rate) : null,
        status:         form.status,
        notes:          form.notes || null,
        role:           form.role || null,
      });
      setSuccess('Trainer updated successfully!');
      setTimeout(() => router.push(`/trainers/${id}`), 1200);
    } catch (err: any) {
      setError(err.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  const F = (k: keyof typeof form) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value })),
  });

  if (loading) return <AppShell><div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div></AppShell>;

  return (
    <AppShell>
      <div className="page-container animate-fade-in" style={{ maxWidth: 600 }}>
        <Link href={`/trainers/${id}`} className="btn btn-ghost btn-sm" style={{ marginBottom: 20, display: 'inline-flex', gap: 6 }}>
          <ArrowLeft size={14} /> Back to Trainer
        </Link>
        <div className="page-header" style={{ marginBottom: 20 }}>
          <h1 className="page-title">Edit Trainer</h1>
        </div>

        {success && <div style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success-border)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontWeight: 600 }}>{success}</div>}
        {error && <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger-border)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>{error}</div>}

        <form onSubmit={submit}>
          <div className="card" style={{ padding: 24, display: 'grid', gap: 16 }}>

            {/* Row 1: Name + Mobile */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Full Name *</span>
                <input className="input" type="text" {...F('name')} required />
              </label>
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Mobile</span>
                <input className="input" type="tel" {...F('mobile')} />
              </label>
            </div>

            {/* Row 2: Email + Role */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Email</span>
                <input className="input" type="email" {...F('email')} />
              </label>
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Role</span>
                <input className="input" type="text" {...F('role')} placeholder="Personal Trainer" />
              </label>
            </div>

            {/* Row 3: Gender + DOB */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Gender</span>
                {/* Values match DB CHECK constraint: 'Male'|'Female'|'Other' */}
                <select className="input" {...F('gender')}>
                  <option value="">— select —</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Date of Birth</span>
                <input className="input" type="date" {...F('dob')} />
              </label>
            </div>

            {/* Row 4: Join Date + Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Join Date</span>
                <input className="input" type="date" {...F('joining_date')} />
              </label>
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Status</span>
                <select className="input" {...F('status')}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>

            {/* Address */}
            <label style={{ display: 'grid', gap: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Address</span>
              <input className="input" type="text" {...F('address')} />
            </label>

            {/* Row 5: Specialization + Certifications */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Specialization</span>
                <input className="input" type="text" {...F('specialization')} />
              </label>
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Certifications</span>
                <input className="input" type="text" {...F('certifications')} placeholder="K11 Fitness, ACE Certified" />
              </label>
            </div>

            {/* Row 6: Salary + Incentive Rate */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Base Salary (₹)</span>
                <input className="input" type="number" {...F('salary')} min="0" step="0.01" />
              </label>
              <label style={{ display: 'grid', gap: 5 }}>
                {/* Displayed as a percentage; backend divides by 100 before storing */}
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Incentive Rate (%)</span>
                <input className="input" type="number" {...F('incentive_rate')} min="0" max="100" step="0.01" />
              </label>
            </div>

            {/* Notes */}
            <label style={{ display: 'grid', gap: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Notes</span>
              <textarea className="input" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </label>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Link href={`/trainers/${id}`} className="btn btn-outline btn-sm">Cancel</Link>
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                <Save size={13} /> {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
