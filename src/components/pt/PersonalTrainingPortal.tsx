"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowRightLeft, BarChart3, Bell, CalendarDays, Camera, CheckCircle2, ClipboardList, Clock3, Dumbbell, Filter, IndianRupee, LineChart, Search, ShieldCheck, Sparkles, Target, TrendingUp, UserCog, Users, Wallet, XCircle } from 'lucide-react';

type PtTab = 'dashboard' | 'clients' | 'packages' | 'trainers' | 'sessions' | 'programming' | 'progress' | 'reports' | 'settings';

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

const stats = [
  { label: 'Active PT Clients', value: '148', note: '+12 synced from main member database', tone: 'pt-stat--violet', icon: Users },
  { label: 'Trainers Online', value: '11', note: '3 elite coaches on floor right now', tone: 'pt-stat--blue', icon: UserCog },
  { label: "Today’s Sessions", value: '34', note: '28 confirmed · 6 reschedule risk', tone: 'pt-stat--green', icon: CalendarDays },
  { label: 'PT Revenue', value: '₹2.84L', note: 'PT-only finance, isolated from memberships', tone: 'pt-stat--orange', icon: Wallet },
];

const syncedClients = [
  { id: 'CL-1048', name: 'Aarav Mehta', phone: '+91 98XXXXXX41', status: 'Active Membership', gender: 'Male', age: 28, trainer: 'Ritika', plan: '12 Session Shred' },
  { id: 'CL-1127', name: 'Sana Khan', phone: '+91 97XXXXXX02', status: 'Active Membership', gender: 'Female', age: 24, trainer: 'Aditya', plan: 'Monthly Premium PT' },
  { id: 'CL-0982', name: 'Rohan Sethi', phone: '+91 88XXXXXX95', status: 'Expiring Membership', gender: 'Male', age: 33, trainer: 'Ritika', plan: 'Body Recomp 24' },
  { id: 'CL-1164', name: 'Naina Verma', phone: '+91 93XXXXXX19', status: 'Active Membership', gender: 'Female', age: 30, trainer: 'Shivam', plan: 'Strength Coaching' },
];

const packages = [
  { name: '12 Session Shred', type: 'Session Pack', fee: '₹18,000', duration: '30 days', freeze: '2 holds', status: 'Popular' },
  { name: 'Monthly Premium PT', type: 'Monthly Plan', fee: '₹14,500', duration: '1 month', freeze: '1 hold', status: 'Active' },
  { name: 'Elite Transformation 24', type: 'Premium Coaching', fee: '₹36,000', duration: '60 days', freeze: '3 holds', status: 'Flagship' },
];

const trainers = [
  { name: 'Ritika Sharma', clients: 18, sessions: 7, commission: '₹28,400', score: '94%' },
  { name: 'Aditya Rao', clients: 15, sessions: 5, commission: '₹22,000', score: '91%' },
  { name: 'Shivam Patel', clients: 12, sessions: 4, commission: '₹19,600', score: '89%' },
];

const sessions = [
  { time: '06:30 AM', client: 'Aarav Mehta', trainer: 'Ritika', focus: 'Fat loss + conditioning', state: 'Checked-in' },
  { time: '08:00 AM', client: 'Sana Khan', trainer: 'Aditya', focus: 'Glutes + upper body', state: 'Upcoming' },
  { time: '07:00 PM', client: 'Rohan Sethi', trainer: 'Ritika', focus: 'Strength recomposition', state: 'Reschedule request' },
];

const progressRows = [
  { client: 'Aarav Mehta', weight: '-4.2 kg', bodyFat: '-3.8%', compliance: '92%', photos: 'Updated' },
  { client: 'Sana Khan', weight: '+1.8 kg lean', bodyFat: '-1.1%', compliance: '89%', photos: 'Pending' },
  { client: 'Naina Verma', weight: '-2.3 kg', bodyFat: '-2.7%', compliance: '95%', photos: 'Updated' },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export default function PersonalTrainingPortal() {
  const [tab, setTab] = useState<PtTab>('dashboard');
  const [search, setSearch] = useState('');

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return syncedClients;
    return syncedClients.filter((client) =>
      [client.name, client.id, client.phone, client.trainer, client.plan].join(' ').toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="pt-app-shell">
      <section className="pt-launch-banner">
        <div>
          <p className="pt-kicker">619 FITNESS STUDIO</p>
          <h1>PERSONAL TRAINING PORTAL</h1>
          <p className="pt-hero-copy">
            Independent coaching SaaS experience inside the 619 ecosystem — shared member identity in, PT-only packages, PT payments, PT commissions, PT sessions, PT renewals, and PT analytics out.
          </p>
          <div className="pt-hero-actions">
            <button className="pt-btn pt-btn--light" onClick={() => setTab('clients')}>Open synced clients</button>
            <button className="pt-btn pt-btn--ghost" onClick={() => setTab('reports')}>View PT analytics</button>
          </div>
        </div>
        <div className="pt-hero-side premium-surface">
          <div className="pt-mini-chip"><ShieldCheck size={16} /> Shared client identity · isolated PT finance</div>
          <div className="pt-mini-list">
            <div><span>Sync source</span><strong>Main 619 member profiles</strong></div>
            <div><span>Access model</span><strong>Admin full control · trainers assigned-only</strong></div>
            <div><span>Finance boundary</span><strong>PT revenue never enters gym payment reports</strong></div>
          </div>
        </div>
      </section>

      <div className="pt-workspace premium-surface">
        <aside className="pt-sidebar">
          <div className="pt-sidebar-brand">
            <span className="pt-brand-pill">Elite CRM</span>
            <h2>PT Operating System</h2>
            <p>Premium coaching workflows, fully separated from gym membership finance.</p>
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
              <li><ArrowRightLeft size={14} /> Client identity synced from main member DB</li>
              <li><Wallet size={14} /> PT money flows isolated from memberships</li>
              <li><ShieldCheck size={14} /> Trainer access limited to assigned clients</li>
            </ul>
          </div>
        </aside>

        <section className="pt-main-panel">
          <header className="pt-topbar">
            <div>
              <p className="pt-kicker pt-kicker--dark">Premium internal app</p>
              <h2>{portalTabs.find((item) => item.key === tab)?.label}</h2>
            </div>
            <div className="pt-toolbar">
              <label className="pt-search">
                <Search size={16} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients, plans, trainer, ID..." />
              </label>
              <button className="pt-icon-btn" type="button"><Filter size={16} /></button>
              <Link href="/clients" className="pt-plain-link">Main members</Link>
            </div>
          </header>

          {tab === 'dashboard' && (
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
                      <p className="pt-kicker pt-kicker--dark">Snapshot</p>
                      <h3>Attendance and progress overview</h3>
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
                      <p className="pt-kicker pt-kicker--dark">Alerts</p>
                      <h3>Expiry and renewal actions</h3>
                    </div>
                    <Bell size={18} />
                  </div>
                  <div className="pt-alert-list">
                    <div><strong>8 packages expiring</strong><span>Need renewal outreach within 5 days</span></div>
                    <div><strong>6 pending session reschedules</strong><span>Trainer confirmation required</span></div>
                    <div><strong>3 assessment updates overdue</strong><span>Progress review pending this week</span></div>
                  </div>
                </article>
              </section>
            </div>
          )}

          {tab === 'clients' && (
            <div className="pt-content-stack">
              <section className="pt-grid-2">
                <article className="pt-panel-card">
                  <div className="pt-panel-head">
                    <div>
                      <p className="pt-kicker pt-kicker--dark">Client sync</p>
                      <h3>Import directly from 619 member database</h3>
                    </div>
                    <Users size={18} />
                  </div>
                  <p className="pt-body-copy">Client identity fields are shared: Name, Client ID, Contact Number, Profile Photo, Gender, Age, and Membership Status. PT-specific plans, notes, sessions, and payments remain inside the PT portal only.</p>
                  <div className="pt-chip-row">
                    <span className="pt-soft-chip"><CheckCircle2 size={14} /> No manual client recreation</span>
                    <span className="pt-soft-chip"><ShieldCheck size={14} /> Shared profile identity only</span>
                  </div>
                </article>

                <article className="pt-form-card">
                  <div className="pt-panel-head">
                    <div>
                      <p className="pt-kicker pt-kicker--dark">Quick assign</p>
                      <h3>Assign PT package</h3>
                    </div>
                    <Dumbbell size={18} />
                  </div>
                  <div className="pt-form-grid">
                    <select><option>Select synced member</option><option>Aarav Mehta</option><option>Sana Khan</option></select>
                    <select><option>Select PT package</option><option>12 Session Shred</option><option>Monthly Premium PT</option></select>
                    <select><option>Assign trainer</option><option>Ritika Sharma</option><option>Aditya Rao</option></select>
                    <input placeholder="Start date" />
                  </div>
                  <div className="pt-form-actions">
                    <button className="pt-btn pt-btn--solid">Create PT assignment</button>
                    <button className="pt-btn pt-btn--muted">Open full profile</button>
                  </div>
                </article>
              </section>

              <article className="pt-table-card">
                <div className="pt-panel-head">
                  <div>
                    <p className="pt-kicker pt-kicker--dark">Client management</p>
                    <h3>Synced PT client table</h3>
                  </div>
                  <span className="pt-table-meta">{filteredClients.length} records</span>
                </div>
                <div className="pt-table-wrap">
                  <table className="pt-table">
                    <thead>
                      <tr><th>Client</th><th>ID</th><th>Contact</th><th>Membership</th><th>Age/Gender</th><th>Trainer</th><th>PT Plan</th></tr>
                    </thead>
                    <tbody>
                      {filteredClients.map((client) => (
                        <tr key={client.id}>
                          <td>{client.name}</td>
                          <td>{client.id}</td>
                          <td>{client.phone}</td>
                          <td>{client.status}</td>
                          <td>{client.age} / {client.gender}</td>
                          <td>{client.trainer}</td>
                          <td>{client.plan}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </div>
          )}

          {tab === 'packages' && (
            <div className="pt-content-stack">
              <section className="pt-grid-3">
                {packages.map((pkg) => (
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
                <div className="pt-panel-head"><div><p className="pt-kicker pt-kicker--dark">Package builder</p><h3>Create PT package</h3></div><IndianRupee size={18} /></div>
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

          {tab === 'trainers' && (
            <div className="pt-content-stack">
              <article className="pt-table-card">
                <div className="pt-panel-head"><div><p className="pt-kicker pt-kicker--dark">Trainer management</p><h3>Allocation, commissions, and performance</h3></div><UserCog size={18} /></div>
                <div className="pt-table-wrap">
                  <table className="pt-table">
                    <thead><tr><th>Trainer</th><th>PT Clients</th><th>Today’s Sessions</th><th>Commission</th><th>Performance</th></tr></thead>
                    <tbody>
                      {trainers.map((trainer) => (
                        <tr key={trainer.name}><td>{trainer.name}</td><td>{trainer.clients}</td><td>{trainer.sessions}</td><td>{trainer.commission}</td><td>{trainer.score}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </div>
          )}

          {tab === 'sessions' && (
            <div className="pt-content-stack">
              <section className="pt-grid-2">
                <article className="pt-panel-card">
                  <div className="pt-panel-head"><div><p className="pt-kicker pt-kicker--dark">Daily session calendar</p><h3>Today’s bookings</h3></div><CalendarDays size={18} /></div>
                  <div className="pt-agenda-list">
                    {sessions.map((session) => (
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
                  <div className="pt-panel-head"><div><p className="pt-kicker pt-kicker--dark">Book session</p><h3>Create or reschedule PT slot</h3></div><ClipboardList size={18} /></div>
                  <div className="pt-form-grid">
                    <select><option>Select client</option></select>
                    <select><option>Select trainer</option></select>
                    <input placeholder="Date" />
                    <input placeholder="Time" />
                  </div>
                  <textarea className="pt-textarea" placeholder="Session notes / focus / reschedule reason" />
                  <div className="pt-form-actions"><button className="pt-btn pt-btn--solid">Save session</button></div>
                </article>
              </section>
            </div>
          )}

          {tab === 'programming' && (
            <div className="pt-content-stack">
              <section className="pt-grid-2">
                <article className="pt-form-card">
                  <div className="pt-panel-head"><div><p className="pt-kicker pt-kicker--dark">Workout system</p><h3>Create workout plan</h3></div><Dumbbell size={18} /></div>
                  <div className="pt-form-grid">
                    <input placeholder="Program name" />
                    <select><option>Goal type</option><option>Fat loss</option><option>Strength</option><option>Muscle gain</option></select>
                    <input placeholder="Training split" />
                    <input placeholder="Weekly frequency" />
                  </div>
                  <textarea className="pt-textarea" placeholder="Exercise structure, progression notes, session guidance" />
                </article>
                <article className="pt-form-card">
                  <div className="pt-panel-head"><div><p className="pt-kicker pt-kicker--dark">Diet system</p><h3>Upload nutrition notes</h3></div><Target size={18} /></div>
                  <div className="pt-form-grid">
                    <select><option>Select client</option></select>
                    <input placeholder="Calories" />
                    <input placeholder="Protein target" />
                    <input placeholder="Meal structure" />
                  </div>
                  <textarea className="pt-textarea" placeholder="Diet instructions, supplementation, adherence notes" />
                </article>
              </section>
            </div>
          )}

          {tab === 'progress' && (
            <div className="pt-content-stack">
              <article className="pt-table-card">
                <div className="pt-panel-head"><div><p className="pt-kicker pt-kicker--dark">Progress tracking</p><h3>Weight, body fat, photos, compliance</h3></div><Camera size={18} /></div>
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

          {tab === 'reports' && (
            <div className="pt-content-stack">
              <section className="pt-grid-2">
                <article className="pt-panel-card">
                  <div className="pt-panel-head"><div><p className="pt-kicker pt-kicker--dark">PT analytics</p><h3>Financial and retention reports</h3></div><LineChart size={18} /></div>
                  <ul className="pt-report-list">
                    <li>PT revenue reports</li>
                    <li>Trainer performance reports</li>
                    <li>Client retention analytics</li>
                    <li>Session completion reports</li>
                    <li>Package expiry alerts</li>
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

          {tab === 'settings' && (
            <div className="pt-content-stack">
              <section className="pt-grid-2">
                <article className="pt-panel-card">
                  <div className="pt-panel-head"><div><p className="pt-kicker pt-kicker--dark">Architecture</p><h3>Data flow rules</h3></div><ShieldCheck size={18} /></div>
                  <ul className="pt-report-list">
                    <li>Shared client identity from main member profiles</li>
                    <li>Separate PT package, payment, commission, renewal, attendance, and revenue modules</li>
                    <li>Role-based access for admins, managers, and assigned trainers</li>
                  </ul>
                </article>
                <article className="pt-panel-card">
                  <div className="pt-panel-head"><div><p className="pt-kicker pt-kicker--dark">Portal controls</p><h3>Notifications and permissions</h3></div><Bell size={18} /></div>
                  <div className="pt-chip-row">
                    <span className="pt-soft-chip">Session reminders</span>
                    <span className="pt-soft-chip">Renewal reminders</span>
                    <span className="pt-soft-chip">Trainer alerts</span>
                    <span className="pt-soft-chip">Progress reviews</span>
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
