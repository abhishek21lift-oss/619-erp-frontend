'use client';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { MapPin } from 'lucide-react';
export default function BranchesPage() {
  return <Guard role="admin"><AppShell>
    <div className="page-container animate-fade-in">
      <div className="page-header"><h1 className="page-title">Branches</h1><p className="page-subtitle">Manage gym locations and branches</p></div>
      <div className="empty-state"><MapPin size={36} className="empty-state-icon"/><p className="empty-state-title">Single Location</p><p className="empty-state-desc">619 Fitness Studio — Lucknow. Multi-branch support coming soon.</p></div>
    </div>
  </AppShell></Guard>;
}
