'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { api } from '@/lib/api';

const SOURCES = [
  'Walk-in',
  'Instagram',
  'Facebook',
  'Google',
  'Referral',
  'Banner / Hoarding',
  'Existing Member',
  'Other',
];

const INTERESTS = [
  'Powerlifting',
  'Strength Training',
  'Personal Training',
  'Group Class',
  'Weight Loss',
  'Bodybuilding',
  'Cardio Only',
  'Other',
];

export default function AddEnquiryPage() {
  return (
    <Guard>
      <Inner />
    </Guard>
  );
}

function Inner() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    email: '',
    gender: '',
    dob: '',
    interested_in: '',
    source: 'Walk-in',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.name.trim() || !form.mobile.trim()) {
      setError('Name and mobile are required.');
      return;
    }
    setSaving(true);
    try {
      // We tag enquiries as a "lead" status — backend stores it as a client row
      // with no plan or end date until they convert. `reference_no` carries the source.
      await api.clients.create({
        name: form.name,
        mobile: form.mobile,
        email: form.email || null,
        gender: form.gender || null,
        dob: form.dob || null,
        interested_in: form.interested_in || null,
        reference_no: form.source,
        notes: form.notes || null,
        status: 'lead',
        joining_date: new Date().toISOString().split('T')[0],
      });
      setSuccess('Enquiry saved. They are now in your Lead Inbox.');
      setForm({
        name: '',
        mobile: '',
        email: '',
        gender: '',
        dob: '',
        interested_in: '',
        source: 'Walk-in',
        notes: '',
      });
      setTimeout(() => router.push('/sales/leads'), 900);
    } catch (e: any) {
      setError(e.message || 'Could not save enquiry.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="page-main">
        <TopBar
          title="Add Enquiry"
          subtitle="Capture a walk-in or phone enquiry — convert later"
        />
        <div className="page-content fade-up">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <form
            onSubmit={handleSubmit}
            className="card"
            style={{ maxWidth: 760, padding: '1.6rem' }}
          >
            <div className="card-title">Prospect details</div>

            <div className="form-row form-row-2">
              <div>
                <label>Name *</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Full name"
                  required
                />
              </div>
              <div>
                <label>Mobile *</label>
                <input
                  className="input"
                  type="tel"
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  placeholder="10-digit mobile"
                  required
                />
              </div>
            </div>

            <div className="form-row form-row-2" style={{ marginTop: '1rem' }}>
              <div>
                <label>Email</label>
                <input
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="optional@example.com"
                />
              </div>
              <div>
                <label>Date of Birth</label>
                <input
                  className="input"
                  type="date"
                  value={form.dob}
                  onChange={(e) => setForm({ ...form, dob: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row form-row-3" style={{ marginTop: '1rem' }}>
              <div>
                <label>Gender</label>
                <select
                  className="input select"
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label>Interested In</label>
                <select
                  className="input select"
                  value={form.interested_in}
                  onChange={(e) =>
                    setForm({ ...form, interested_in: e.target.value })
                  }
                >
                  <option value="">Select</option>
                  {INTERESTS.map((i) => (
                    <option key={i}>{i}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Lead Source</label>
                <select
                  className="input select"
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                >
                  {SOURCES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <label>Notes</label>
              <textarea
                className="input"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Anything the next person picking this up should know — goals, schedule, objections, etc."
              />
            </div>

            <div
              style={{
                display: 'flex',
                gap: '0.6rem',
                marginTop: '1.4rem',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={() => router.back()}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save Enquiry'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
