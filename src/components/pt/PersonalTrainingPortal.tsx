'use client';

import Link from 'next/link';
import { Activity, BarChart3, Bell, CalendarDays, Camera, ClipboardList, Dumbbell, IndianRupee, LineChart, Salad, ShieldCheck, Sparkles, Target, UserCog, Users, Wallet } from 'lucide-react';

const stats = [
  { label: 'Total PT Clients', value: '148', note: '+12 this month', tone: 'pt-stat--violet', icon: Users },
  { label: 'Active PT Packages', value: '92', note: '18 renew soon', tone: 'pt-stat--blue', icon: Dumbbell },
  { label: "Today’s Sessions", value: '34', note: '6 pending check-ins', tone: 'pt-stat--green', icon: CalendarDays },
  { label: 'Monthly PT Revenue', value: '₹2.84L', note: 'PT only, gym finance isolated', tone: 'pt-stat--orange', icon: Wallet },
];

const modules = [
  { title: 'PT Client Management', desc: 'Sync members from the main gym database, then track PT-only assessments, goals, photos, workouts, diets, and session progress.', icon: Users, tone: 'pt-card--violet', href: '/pt-portal?tab=clients' },
  { title: 'PT Package Management', desc: 'Session packs, monthly coaching, premium plans, freezes, expiry tracking, and renewals — all financially separated from memberships.', icon: IndianRupee, tone: 'pt-card--blue', href: '/pt-portal?tab=packages' },
  { title: 'Trainer Management', desc: 'Assign trainers, control schedules, manage commissions, monitor PT attendance, and restrict trainer access to assigned clients only.', icon: UserCog, tone: 'pt-card--green', href: '/pt-portal?tab=trainers' },
  { title: 'PT Session System', desc: 'Calendar booking, session completion, attendance, rescheduling, and daily coaching operations in one workflow.', icon: ClipboardList, tone: 'pt-card--orange', href: '/pt-portal?tab=sessions' },
  { title: 'Workout & Diet', desc: 'Workout builders, diet uploads, weekly progress tracking, nutrition notes, and exercise library workflows.', icon: Salad, tone: 'pt-card--pink', href: '/pt-portal?tab=programming' },
  { title: 'Progress Tracking', desc: 'Measurements, body fat, muscle mass, BMI, transformation images, and premium trend dashboards for elite coaching.', icon: Camera, tone: 'pt-card--teal', href: '/pt-portal?tab=progress' },
];

const reports = [
  'PT Revenue reports',
  'Trainer performance reports',
  'Client retention analytics',
  'Session completion reports',
  'PT growth dashboard',
];

export default function PersonalTrainingPortal() {
  return (
    <div className="pt-portal-shell">
      <section className="pt-portal-hero">
        <div>
          <p className="pt-kicker">619 FITNESS STUDIO</p>
          <h1>PERSONAL TRAINING PORTAL</h1>
          <p className="pt-hero-copy">
            A dedicated premium coaching CRM inside the existing system, using shared member identity while keeping PT packages, PT revenue, trainer payouts, sessions, renewals, and analytics financially isolated.
          </p>
          <div className="pt-hero-actions">
            <Link href="/clients" className="pt-btn pt-btn--light">Sync members</Link>
            <Link href="/trainers" className="pt-btn pt-btn--ghost">Manage trainers</Link>
          </div>
        </div>
        <div className="pt-hero-side premium-surface">
          <div className="pt-mini-chip"><ShieldCheck size={16} /> Shared identity, isolated PT finance</div>
          <div className="pt-mini-list">
            <div><span>Client Sync</span><strong>Main 619 member database</strong></div>
            <div><span>PT Revenue</span><strong>Separate module / table layer</strong></div>
            <div><span>Trainer Access</span><strong>Assigned clients only</strong></div>
          </div>
        </div>
      </section>

      <nav className="pt-subnav premium-surface" aria-label="PT portal navigation">
        <a className="is-active">Dashboard</a>
        <a>Clients</a>
        <a>Packages</a>
        <a>Trainers</a>
        <a>Sessions</a>
        <a>Workout & Diet</a>
        <a>Analytics</a>
        <a>Notifications</a>
      </nav>

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

      <section className="pt-panel-grid">
        <article className="premium-surface pt-focus-card">
          <div className="pt-panel-head">
            <div>
              <p className="pt-kicker pt-kicker--dark">Coaching workflow</p>
              <h2>Portal modules</h2>
            </div>
            <Sparkles size={18} />
          </div>
          <div className="pt-module-grid">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <Link key={module.title} href={module.href} className={`pt-module-card ${module.tone}`}>
                  <Icon size={20} />
                  <h3>{module.title}</h3>
                  <p>{module.desc}</p>
                </Link>
              );
            })}
          </div>
        </article>

        <aside className="pt-side-stack">
          <article className="premium-surface pt-analytics-card">
            <div className="pt-panel-head">
              <div>
                <p className="pt-kicker pt-kicker--dark">Analytics</p>
                <h2>Performance overview</h2>
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
            <ul className="pt-bullet-list">
              <li><Activity size={16} /> Attendance analytics</li>
              <li><Target size={16} /> Transformation tracking</li>
              <li><LineChart size={16} /> Retention and renewal insights</li>
            </ul>
          </article>

          <article className="premium-surface pt-report-card">
            <div className="pt-panel-head">
              <div>
                <p className="pt-kicker pt-kicker--dark">Reports</p>
                <h2>PT reporting layer</h2>
              </div>
              <Bell size={18} />
            </div>
            <ul className="pt-report-list">
              {reports.map((report) => (
                <li key={report}>{report}</li>
              ))}
            </ul>
          </article>
        </aside>
      </section>
    </div>
  );
}
