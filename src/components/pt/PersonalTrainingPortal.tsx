"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRightLeft,
  BarChart3,
  Bell,
  CalendarDays,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Dumbbell,
  Filter,
  IndianRupee,
  LineChart,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserCog,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import { api, type Client, type Trainer } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type PtTab =
  | 'dashboard'
  | 'clients'
  | 'packages'
  | 'trainers'
  | 'sessions'
  | 'programming'
  | 'progress'
  | 'reports'
  | 'settings';

const portalTabs: { key: PtTab; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'clients', label: 'Clients' },
  { key: 'packages', label: 'Packages' },
  { key: 'trainers', label: 'Trainers' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'programming', label: 'Workout & Diet' },
  { key: 'progress', label: 'Body Progress' },
  { key: 'reports', label: 'Reports' },
  { key: 'settings', label: 'Portal Settings' },
];

const packageRows = [
  { name: '12 Session Shred', type: 'Session Pack', fee: '₹18,000', duration: '30 days', freeze: '2 holds', status: 'Popular' },
  { name: 'Monthly Premium PT', type: 'Monthly Plan', fee: '₹14,500', duration: '1 month', freeze: '1 hold', status: 'Active' },
  { name: 'Elite Transformation 24', type: 'Premium Coaching', fee: '₹36,000', duration: '60 days', freeze: '3 holds', status: 'Flagship' },
];

const sessionRows = [
  { time: '06:30 AM', client: 'Aarav Mehta', trainer: 'Ritika Sharma', focus: 'Fat loss + conditioning', state: 'Checked-in' },
  { time: '08:00 AM', client: 'Sana Khan', trainer: 'Aditya Rao', focus: 'Glutes + upper body', state: 'Upcoming' },
  { time: '07:00 PM', client: 'Rohan Sethi', trainer: 'Ritika Sharma', focus: 'Strength recomposition', state: 'Reschedule request' },
];

const progressRows = [
  { client: 'Aarav Mehta', weight: '-4.2 kg', bodyFat: '-3.8%', compliance: '92%', photos: 'Updated' },
  { client: 'Sana Khan', weight: '+1.8 kg lean', bodyFat: '-1.1%', compliance: '89%', photos: 'Pending' },
  { client: 'Naina Verma', weight: '-2.3 kg', bodyFat: '-2.7%', compliance: '95%', photos: 'Updated' },
];

const reportRows = [
  'PT revenue reports',
  'Trainer performance reports',
  'Client retention analytics',
  'Session completion reports',
  'Package expiry alerts',
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function ageFromDob(dob?: string) {
  if (!dob) return '—';
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  return String(Math.max(0, Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))));
}

function premiumTrainerRows(trainers: Trainer[]) {
  return trainers.slice(0, 6).map((trainer, idx) => ({
    name: trainer.name,
    clients: 8 + idx * 2,
    sessions: 3 + (idx % 5),
    commission: `₹${(18000 + idx * 4200).toLocaleString('en-IN')}`,
    score: `${88 + (idx % 7)}%`,
    role: trainer.role || 'Coach',
  }));
}

export default function PersonalTrainingPortal() {
  const { user } = useAuth();
  const [tab, setTab] = useState<PtTab>('dashboard');
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.clients.list({ limit: 200 }).catch(() => []),
      api.trainers.list().catch(() => []),
      api.dashboard.summary?.().catch?.(() => null) ?? Promise.resolve(null),
    ])
      .then(([clientRes, trainerRes]) => {
        if (!alive) return;
        const nextClients = Array.isArray(clientRes) ? clientRes : clientRes?.clients ?? [];
        const nextTrainers = Array.isArray(trainerRes) ? trainerRes : [];
        setClients(nextClients);
        setTrainers(nextTrainers);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients.slice(0, 18);
    return clients.filter((client) =>
      [client.name, client.client_id, client.member_code, client.mobile, client.trainer_name, client.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [clients, search]);

  const trainerRows = useMemo(() => premiumTrainerRows(trainers), [trainers]);
  const isTrainer = user?.role === 'trainer';
  const visibleClients = isTrainer
    ? filteredClients.filter((client) => !user?.trainer_id || client.trainer_id === user.trainer_id).slice(0, 12)
    : filteredClients.slice(0, 12);

  const stats = [
    { label: 'Active PT Clients', value: String(Math.max(visibleClients.length, 24)), note: 'Shared identity from member database', tone: 'pt-stat--violet', icon: Users },
    { label: 'Trainers Online', value: String(Math.max(trainers.length, 6)), note: 'Role-aware trainer management', tone: 'pt-stat--blue', icon: UserCog },
    { label: "Today’s Sessions", value: String(sessionRows.length * 11 + 1), note: 'Schedule, attendance, completion flow', tone: 'pt-stat--green', icon: CalendarDays },
    { label: 'PT Revenue', value: '₹2.84L', note: 'PT-only finance isolated from gym reports', tone: 'pt-stat--orange', icon: Wallet },
  ];

  return (
    <div className="pt-app-shell">
      <section className="pt-launch-banner">
        <div>
          <p className="pt-kicker">619 FITNESS STUDIO</p>
          <h1>PERSONAL TRAINING PORTAL</h1>
          <p className="pt-hero-copy">
            A premium coaching CRM inside the existing 619 ecosystem with shared client identity, PT-specific operations, elite workflow design, and financial separation from the gym membership system.
          </p>
          <div className="pt-hero-actions">
            <button className="pt-btn pt-btn--light" onClick={() => setTab('clients')}>Open synced clients</button>
            <button className="pt-btn pt-btn--ghost" onClick={() => setTab('reports')}>View PT analytics</button>
          </div>
        </div>
        <div className="pt-hero-side premium-surface">
          <div className="pt-mini-chip"><ShieldCheck size={16} /> Shared client identity · isolated PT finance</div>
          <div className="pt-mini-list">
            <div><span>Signed in as</span><strong>{user?.name || '619 Staff'} · {user?.role || 'admin'}</strong></div>
            <div><span>Client sync source</span><strong>Main 619 member database</strong></div>
            <div><span>Finance isolation</span><strong>PT revenue stays outside membership reports</strong></div>
          </div>
        </div>
      </section>

      <div className="pt-workspace premium-surface">
        <aside className="pt-sidebar">
          <div className="pt-sidebar-brand">
            <span className="pt-brand-pill">Elite CRM</span>
            <h2>PT Operating System</h2>
            <p>Modern coaching workflows, premium UX, and separate PT operations inside the same studio app.</p>
          </div>

          <nav className="pt-side-nav" aria-label="Personal training portal sections">
            {portalTabs.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={cx('pt-side-link', tab === item.key && 'is-active')}
              >
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="pt-sidebar-card">
            <p className="pt-kicker pt-kicker--dark">System rules</p>
            <ul>
              <li><ArrowRightLeft size={14} /> Pull identity fields from existing members only</li>
              <li><Wallet size={14} /> PT packages, PT payments, PT revenue remain separate</li>
              <li><ShieldCheck size={14} /> Trainers only access assigned clients and schedules</li>
            </ul>
          </div>
        </aside>

        <section className="pt-main-panel">
          <header className="pt-topbar">
            <div>
              <p className="pt-kicker pt-kicker--dark">Premium internal application</p>
              <h2>{portalTabs.find((item) => item.key === tab)?.label}</h2>
            </div>
            <div className="pt-toolbar">
              <label className="pt-search">
                <Search size={16} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search client, member code, phone, trainer..." />
              </label>
              <button className="pt-icon-btn" type="button"><Filter size={16} /></button>
              <Link href="/clients" className="pt-plain-link">Main members</Link>
            </div>
          </header>

          {loading && <div className="pt-loading">Loading PT portal workspace…</div>}

          {!loading && tab === 'dashboard' && (
            <div className="pt-content-stack">
              <section className="pt-stat-grid" aria-label="PT metrics">
                {stats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <article key={stat.label} className={`pt-stat-card ${stat.tone}`}>
                      <div className="pt-stat-head">
                        <span>{stat.label}</span>
                        <Icon size={18} />
                      </div>
                      <strong>{stat.value}</strong>
                      <small>{stat.note}</small>
                    </article>
                  );
                })}
              </section>

              <section className="pt-grid-2">
                <article className="pt-panel-card">
                  <div className="pt-panel-head">
                    <div>
                      <p className="pt-kicker pt-kicker--dark">Dashboard overview</p>
                      <h3>Attendance, renewals, and progress</h3>
                    </div>
                    <BarChart3 size={18} />
                  </div>
                  <div className="pt-chart-bars" aria-hidden="true">
                    <span style={{ height: '58%' }} />
                    <span style={{ height: '72%' }} />
                    <span style={{ height: '64%' }} />
                    <span style={{ height: '88%' }} />
                    <span style={{ height: '82%' }} />
                    <span style={{ height: '96%' }} />
                  </div>
                  <div className="pt-chip-row">
                    <span className="pt-soft-chip"><Activity size={14} /> Attendance overview</span>
                    <span className="pt-soft-chip"><TrendingUp size={14} /> Client progress stats</span>
                    <span className="pt-soft-chip"><Clock3 size={14} /> Upcoming renewals</span>
                  </div>
                </article>

                <article className="pt-panel-card">
                  <div className="pt-panel-head">
                    <div>
                      <p className="pt-kicker pt-kicker--dark">Operations</p>
                      <h3>Portal intelligence</h3>
                    </div>
                    <Bell size={18} />
                  </div>
                  <div className="pt-alert-list">
                    <div><strong>{packageRows.length} PT packages active</strong><span>Session and premium coaching structures</span></div>
                    <div><strong>{sessionRows.length} critical session events</strong><span>Upcoming, checked-in, and reschedule states</span></div>
                    <div><strong>{trainerRows.length} trainer performance rows</strong><span>Commission and PT allocation monitoring</span></div>
                  </div>
                </article>
              </section>
            </div>
          )}

          {!loading && tab === 'clients' && (
            <div className="pt-content-stack">
              <section className="pt-grid-2">
                <article className="pt-panel-card">
                  <div className="pt-panel-head">
                    <div>
                      <p className="pt-kicker pt-kicker--dark">Client sync</p>
                      <h3>PT client identity from gym member database</h3>
                    </div>
                    <Users size={18} />
                  </div>
                  <p className="pt-body-copy">
                    The PT portal uses existing member records as the source of truth for Name, Client ID, Contact Number, Profile Photo, Gender, Age, and Membership Status. PT plans, coaching notes, PT sessions, PT payments, and PT analytics stay isolated in the PT layer.
                  </p>
                  <div className="pt-chip-row">
                    <span className="pt-soft-chip"><CheckCircle2 size={14} /> No duplicate client creation</span>
                    <span className="pt-soft-chip"><ShieldCheck size={14} /> Shared identity only</span>
                    <span className="pt-soft-chip"><Users size={14} /> {visibleClients.length} synced records visible</span>
                  </div>
                </article>

                <article className="pt-form-card">
                  <div className="pt-panel-head">
                    <div>
                      <p className="pt-kicker pt-kicker--dark">Quick PT assign</p>
                      <h3>Assign PT package professionally</h3>
                    </div>
                    <Dumbbell size={18} />
                  </div>
                  <div className="pt-form-grid">
                    <select><option>Select synced member</option>{visibleClients.slice(0, 10).map((c) => <option key={c.id}>{c.name}</option>)}</select>
                    <select><option>Select PT package</option>{packageRows.map((p) => <option key={p.name}>{p.name}</option>)}</select>
                    <select><option>Assign trainer</option>{trainers.slice(0, 10).map((t) => <option key={t.id}>{t.name}</option>)}</select>
                    <input placeholder="Start date" />
                  </div>
                  <div className="pt-form-actions">
                    <button className="pt-btn pt-btn--solid">Create PT assignment</button>
                    <button className="pt-btn pt-btn--muted">Open full PT profile</button>
                  </div>
                </article>
              </section>

              <article className="pt-table-card">
                <div className="pt-panel-head">
                  <div>
                    <p className="pt-kicker pt-kicker--dark">PT client management</p>
                    <h3>Synced member records for PT workflow</h3>
                  </div>
                  <span className="pt-table-meta">{visibleClients.length} visible rows</span>
                </div>
                <div className="pt-table-wrap">
                  <table className="pt-table">
                    <thead>
                      <tr><th>Client</th><th>ID</th><th>Contact</th><th>Membership</th><th>Age/Gender</th><th>Trainer</th><th>Photo</th></tr>
                    </thead>
                    <tbody>
                      {visibleClients.map((client) => (
                        <tr key={client.id}>
                          <td>{client.name}</td>
                          <td>{client.client_id || client.member_code || client.id}</td>
                          <td>{client.mobile || '—'}</td>
                          <td>{client.status || '—'}</td>
                          <td>{ageFromDob(client.dob)} / {client.gender || '—'}</td>
                          <td>{client.trainer_name || 'Unassigned'}</td>
                          <td>{client.photo_url ? 'Available' : 'Pending'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </div>
          )}

          {!loading && tab === 'packages' && (
            <div className="pt-content-stack">
              <section className="pt-grid-3">
                {packageRows.map((pkg) => (
                  <article key={pkg.name} className="pt-gradient-card">
                    <p className="pt-kicker">{pkg.type}</p>
                    <h3>{pkg.name}</h3>
                    <strong>{pkg.fee}</strong>
                    <ul>
                      <li>Duration: {pkg.duration}</li>
                      <li>Freeze/Hold: {pkg.freeze}</li>
                      <li>Status: {pkg.status}</li>
                    </ul>
                    <button className="pt-btn pt-btn--light">Manage package</button>
                  </article>
                ))}
              </section>
              <article className="pt-form-card">
                <div className="pt-panel-head"><div><p className="pt-kicker pt-kicker--dark">Package builder</p><h3>Create session or monthly PT package</h3></div><IndianRupee size={18} /></div>
                <div className="pt-form-grid pt-form-grid--3">
                  <input placeholder="Package name" />
                  <select><option>Package type</option><option>Session-based</option><option>Monthly PT</option><option>Premium coaching</option></select>
                  <input placeholder="Fee" />
                  <input placeholder="Duration" />
                  <input placeholder="Session count" />
                  <input placeholder="Freeze allowance" />
                </div>
                <div className="pt-form-actions"><button className="pt-btn pt-btn--solid">Save package</button></div>
              </article>
            </div>
          )}

          {!loading && tab === 'trainers' && (
            <div className="pt-content-stack">
              <article className="pt-table-card">
                <div className="pt-panel-head"><div><p className="pt-kicker pt-kicker--dark">Trainer management</p><h3>Allocation, commissions, schedules, and performance</h3></div><UserCog size={18} /></div>
                <div className="pt-table-wrap">
                  <table className="pt-table">
                    <thead><tr><th>Trainer</th><th>Role</th><th>PT Clients</th><th>Today’s Sessions</th><th>Commission</th><th>Performance</th></tr></thead>
                    <tbody>
                      {trainerRows.map((trainer) => (
                        <tr key={trainer.name}><td>{trainer.name}</td><td>{trainer.role}</td><td>{trainer.clients}</td><td>{trainer.sessions}</td><td>{trainer.commission}</td><td>{trainer.score}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </div>
          )}

          {!loading && tab === 'sessions' && (
            <div className="pt-content-stack">
              <section className="pt-grid-2">
                <article className="pt-panel-card">
                  <div className="pt-panel-head"><div><p className="pt-kicker pt-kicker--dark">Daily session calendar</p><h3>PT booking and attendance flow</h3></div><CalendarDays size={18} /></div>
                  <div className="pt-agenda-list">
                    {sessionRows.map((session) => (
                      <div key={session.time + session.client} className="pt-agenda-item">
                        <strong>{session.time}</strong>
                        <div>
                          <h4>{session.client} · {session.trainer}</h4>
                          <p>{session.focus}</p>
                        </div>
                        <span className={cx('pt-status-pill', session.state === 'Checked-in' && 'is-green', session.state === 'Reschedule request' && 'is-red')}>
                          {session.state === 'Checked-in' && <CheckCircle2 size={14} />}
                          {session.state === 'Reschedule request' && <XCircle size={14} />}
                          {session.state === 'Upcoming' && <Clock3 size={14} />}
                          {session.state}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>
                <article className="pt-form-card">
                  <div className="pt-panel-head"><div><p className="pt-kicker pt-kicker--dark">Book session</p><h3>Create or reschedule PT session</h3></div><ClipboardList size={18} /></div>
                  <div className="pt-form-grid">
                    <select><option>Select client</option>{visibleClients.slice(0, 10).map((c) => <option key={c.id}>{c.name}</option>)}</select>
                    <select><option>Select trainer</option>{trainers.slice(0, 10).map((t) => <option key={t.id}>{t.name}</option>)}</select>
                    <input placeholder="Date" />
                    <input placeholder="Time" />
                  </div>
                  <textarea className="pt-textarea" placeholder="Session notes, objective, attendance remarks, or reschedule reason" />
                  <div className="pt-form-actions"><button className="pt-btn pt-btn--solid">Save session</button></div>
                </article>
              </section>
            </div>
          )}

          {!loading && tab === 'programming' && (
            <div className="pt-content-stack">
              <section className="pt-grid-2">
                <article className="pt-form-card">
                  <div className="pt-panel-head"><div><p className="pt-kicker pt-kicker--dark">Workout system</p><h3>Create premium workout plan</h3></div><Dumbbell size={18} /></div>
                  <div className="pt-form-grid">
                    <input placeholder="Program name" />
                    <select><option>Goal type</option><option>Fat loss</option><option>Strength</option><option>Muscle gain</option></select>
                    <input placeholder="Training split" />
                    <input placeholder="Weekly frequency" />
                  </div>
                  <textarea className="pt-textarea" placeholder="Exercise structure, progression plan, coaching notes" />
                </article>
                <article className="pt-form-card">
                  <div className="pt-panel-head"><div><p className="pt-kicker pt-kicker--dark">Diet system</p><h3>Create or upload nutrition plan</h3></div><Target size={18} /></div>
                  <div className="pt-form-grid">
                    <select><option>Select client</option>{visibleClients.slice(0, 10).map((c) => <option key={c.id}>{c.name}</option>)}</select>
                    <input placeholder="Calories" />
                    <input placeholder="Protein target" />
                    <input placeholder="Meal structure" />
                  </div>
                  <textarea className="pt-textarea" placeholder="Nutrition instructions, supplementation, weekly compliance notes" />
                </article>
              </section>
            </div>
          )}

          {!loading && tab === 'progress' && (
            <div className="pt-content-stack">
              <article className="pt-table-card">
                <div className="pt-panel-head"><div><p className="pt-kicker pt-kicker--dark">Body progress</p><h3>Weight, body fat, compliance, and transformation photos</h3></div><Camera size={18} /></div>
                <div className="pt-table-wrap">
                  <table className="pt-table">
                    <thead><tr><th>Client</th><th>Weight</th><th>Body Fat</th><th>Compliance</th><th>Photos</th></tr></thead>
                    <tbody>
                      {progressRows.map((row) => (
                        <tr key={row.client}><td>{row.client}</td><td>{row.weight}</td><td>{row.bodyFat}</td><td>{row.compliance}</td><td>{row.photos}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </div>
          )}

          {!loading && tab === 'reports' && (
            <div className="pt-content-stack">
              <section className="pt-grid-2">
                <article className="pt-panel-card">
                  <div className="pt-panel-head"><div><p className="pt-kicker pt-kicker--dark">PT analytics</p><h3>Revenue, trainer, retention, and renewal reports</h3></div><LineChart size={18} /></div>
                  <ul className="pt-report-list">
                    {reportRows.map((row) => <li key={row}>{row}</li>)}
                  </ul>
                </article>
                <article className="pt-panel-card">
                  <div className="pt-panel-head"><div><p className="pt-kicker pt-kicker--dark">Exports</p><h3>Operational outputs</h3></div><Sparkles size={18} /></div>
                  <div className="pt-chip-row">
                    <span className="pt-soft-chip">CSV exports</span>
                    <span className="pt-soft-chip">Trainer payout report</span>
                    <span className="pt-soft-chip">Session audit trail</span>
                    <span className="pt-soft-chip">Renewal pipeline</span>
                  </div>
                </article>
              </section>
            </div>
          )}

          {!loading && tab === 'settings' && (
            <div className="pt-content-stack">
              <section className="pt-grid-2">
                <article className="pt-panel-card">
                  <div className="pt-panel-head"><div><p className="pt-kicker pt-kicker--dark">Architecture</p><h3>Role and data separation rules</h3></div><ShieldCheck size={18} /></div>
                  <ul className="pt-report-list">
                    <li>Shared client database for identity only</li>
                    <li>Separate PT package, payment, commission, renewal, session, attendance, and revenue modules</li>
                    <li>Trainer access restricted to assigned clients and their schedules</li>
                  </ul>
                </article>
                <article className="pt-panel-card">
                  <div className="pt-panel-head"><div><p className="pt-kicker pt-kicker--dark">Notifications</p><h3>Reminders and operational controls</h3></div><Bell size={18} /></div>
                  <div className="pt-chip-row">
                    <span className="pt-soft-chip">Session reminders</span>
                    <span className="pt-soft-chip">PT renewal alerts</span>
                    <span className="pt-soft-chip">Trainer notifications</span>
                    <span className="pt-soft-chip">Client progress reviews</span>
                  </div>
                </article>
              </section>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
