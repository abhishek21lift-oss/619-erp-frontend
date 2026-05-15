'use client';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Users } from 'lucide-react';
export default function StaffSettingsPage() {
  const router = useRouter();
  return <Guard role="admin"><AppShell>
    <div className="page-container animate-fade-in">
      <div className="page-header"><h1 className="page-title">Staff Settings</h1><p className="page-subtitle">Manage trainer and staff accounts</p></div>
      <div className="empty-state"><Users size={36} className="empty-state-icon"/><p className="empty-state-title">Manage via Trainers</p><p className="empty-state-desc">Staff accounts and trainer profiles are managed in the Trainers section.</p>
        <button className="btn btn-primary btn-sm" onClick={()=>router.push('/trainers')}>Go to Trainers →</button>
      </div>
    </div>
  </AppShell></Guard>;
}
