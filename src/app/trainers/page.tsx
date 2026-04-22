'use client';
import { useEffect, useState, FormEvent } from 'react';
import Guard from '@/components/Guard';
import Sidebar from '@/components/Sidebar';
import { api, Trainer } from '@/lib/api';

export default function TrainersPage() {
  return (
    <Guard role="admin">
      <TrainersContent />
    </Guard>
  );
}

function TrainersContent() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modal, setModal] = useState<Trainer | 'new' | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const EMPTY = {
    name: '',
    mobile: '',
    email: '',
    role: 'Personal Trainer',
    joining_date: '',
    salary: '',
    incentive_rate: '50',
    specialization: '',
    certifications: '',
    status: 'active',
    notes: '',
  };

  const [form, setForm] = useState<any>(EMPTY);

  const load = () => {
    setLoading(true);
    api.trainers
      .list()
      .then(setTrainers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  function openEdit(t: Trainer) {
    setForm({
      ...t,
      incentive_rate: String(Math.round((t.incentive_rate || 0.5) * 100)),
      salary: String(t.salary || 0),
    });
    setModal(t);
  }

  function openNew() {
    setForm(EMPTY);
    setModal('new');
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (modal === 'new') {
        await api.trainers.create(form);
        setSuccess('Trainer created!');
      } else if (modal) {
        await api.trainers.update(modal.id, form);
        setSuccess('Trainer updated!');
      }

      setModal(null);
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string, name: string) {
    if (!confirm(`Delete trainer "${name}"? Their client assignments will be cleared.`)) return;
    setDeleting(id);
    try {
      await api.trainers.delete(id);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeleting(null);
    }
  }

  function S(k: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((f: any) => ({
        ...f,
        [k]: e.target.value,
      }));
    };
  }

  const fmt = (n: any) =>
    '₹' + (isNaN(Number(n)) ? 0 : Number(n)).toLocaleString('en-IN', { maximumFractionDigits: 0 });

  return (
    <div className="app-layout">
      <Sidebar />

      <div className="page-main">
        <div className="topbar">
          <div>
            <div className="topbar-title">Trainers</div>
            <div className="topbar-sub">{trainers.length} staff members</div>
          </div>
          <button className="btn btn-primary" onClick={openNew}>
            + Add Trainer
          </button>
        </div>

        <div className="page-content fade-up">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {loading ? (
            <div className="text-muted">Loading…</div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))' }}>
              {trainers.map((t) => (
                <div key={t.id} className="card card-hover" style={{ opacity: deleting === t.id ? 0.4 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: 'linear-gradient(135deg,var(--brand),var(--purple))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          color: '#fff',
                        }}
                      >
                        {(t.name || '')
                          .split(' ')
                          .map((w: string) => w[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>

                      <div>
                        <div style={{ fontWeight: 700 }}>{t.name}</div>
                        <div className="text-muted">{t.role || 'Personal Trainer'}</div>
                      </div>
                    </div>

                    <span className={`badge badge-${t.status || 'active'}`}>{t.status || 'active'}</span>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => openEdit(t)} className="btn btn-ghost btn-sm">
                      ✏️ Edit
                    </button>

                    <button
                      onClick={() => del(t.id, t.name)}
                      className="btn btn-danger btn-sm"
                      disabled={deleting === t.id}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}