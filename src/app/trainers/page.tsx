'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Award,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import Guard from '@/components/Guard';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { api, type Trainer } from '@/lib/api';

function initials(name: string) {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function trainerSpecialty(trainer: Trainer) {
  return trainer.specialization || trainer.specialty || trainer.role || 'Trainer';
}

function formatMoney(value: number | string | undefined) {
  const amount = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(amount || 0) || !amount) return 'Rs 0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function TrainerCard({ trainer }: { trainer: Trainer }) {
  const isActive = trainer.is_active !== false;

  return (
    <Card className="rounded-lg">
      <CardBody className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-600 text-sm font-bold text-white">
              {initials(trainer.name)}
            </div>
            <div className="min-w-0">
              <Link
                href={`/trainers/${trainer.id}`}
                className="block truncate text-sm font-semibold text-slate-950 hover:text-red-700"
              >
                {trainer.name}
              </Link>
              <p className="truncate text-xs text-slate-500">{trainerSpecialty(trainer)}</p>
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
              isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Active clients</div>
            <div className="mt-1 font-semibold text-slate-950">{trainer.active_clients ?? 0}</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Total clients</div>
            <div className="mt-1 font-semibold text-slate-950">{trainer.total_clients ?? 0}</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Revenue</div>
            <div className="mt-1 truncate font-semibold text-slate-950">
              {formatMoney(trainer.month_revenue ?? trainer.total_revenue)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          {trainer.mobile && (
            <span className="inline-flex items-center gap-1">
              <Phone size={13} /> {trainer.mobile}
            </span>
          )}
          {trainer.email && (
            <span className="inline-flex items-center gap-1">
              <Mail size={13} /> {trainer.email}
            </span>
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          <Link href={`/trainers/${trainer.id}`}>
            <Button variant="secondary" size="sm">View</Button>
          </Link>
          <Link href={`/trainers/${trainer.id}/edit`}>
            <Button variant="outline" size="sm">Edit</Button>
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}

function TrainersContent() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadTrainers() {
    setLoading(true);
    setError(null);
    try {
      const rows = await api.trainers.list();
      setTrainers(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError((err as Error)?.message || 'Could not load trainers');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTrainers();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return trainers;
    return trainers.filter((trainer) => {
      const haystack = [
        trainer.name,
        trainer.email,
        trainer.mobile,
        trainer.role,
        trainer.specialty,
        trainer.specialization,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [search, trainers]);

  const activeCount = trainers.filter((trainer) => trainer.is_active !== false).length;
  const clientCount = trainers.reduce((sum, trainer) => sum + Number(trainer.active_clients || 0), 0);
  const revenue = trainers.reduce((sum, trainer) => {
    const value = trainer.month_revenue ?? trainer.total_revenue ?? 0;
    return sum + Number(value || 0);
  }, 0);

  return (
    <AppShell title="Trainers">
      <div className="page-container space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="page-title">Trainers</h1>
            <p className="page-subtitle">Manage coaching team, availability, and client load.</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              iconLeft={<RefreshCw size={16} />}
              loading={loading}
              onClick={() => void loadTrainers()}
            >
              Refresh
            </Button>
            <Link href="/trainers/add">
              <Button iconLeft={<Plus size={16} />}>Add trainer</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <ShieldCheck size={16} className="text-red-600" /> Active trainers
              </CardTitle>
            </CardHeader>
            <CardBody className="pt-3 text-2xl font-semibold text-slate-950">{activeCount}</CardBody>
          </Card>
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users size={16} className="text-red-600" /> Assigned clients
              </CardTitle>
            </CardHeader>
            <CardBody className="pt-3 text-2xl font-semibold text-slate-950">{clientCount}</CardBody>
          </Card>
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Award size={16} className="text-red-600" /> Monthly revenue
              </CardTitle>
            </CardHeader>
            <CardBody className="pt-3 text-2xl font-semibold text-slate-950">{formatMoney(revenue)}</CardBody>
          </Card>
        </div>

        <Card className="rounded-lg">
          <CardBody>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search trainers"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />
            </div>
          </CardBody>
        </Card>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-56 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : filtered.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((trainer) => (
              <TrainerCard key={trainer.id} trainer={trainer} />
            ))}
          </div>
        ) : (
          <Card className="rounded-lg">
            <CardBody className="py-12 text-center text-sm text-slate-500">
              No trainers found.
            </CardBody>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

export default function TrainersPage() {
  return (
    <Guard>
      <TrainersContent />
    </Guard>
  );
}
