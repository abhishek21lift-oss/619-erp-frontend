'use client';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Fingerprint } from 'lucide-react';
export default function BiometricPage() {
  return <Guard role="admin"><AppShell>
    <div className="page-container animate-fade-in">
      <div className="page-header"><h1 className="page-title">Biometric Settings</h1><p className="page-subtitle">Configure biometric device integration</p></div>
      <div className="card" style={{padding:24,maxWidth:500}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}><Fingerprint size={24} color="var(--brand)"/><h3 style={{margin:0}}>Biometric Device</h3></div>
        <p style={{color:'var(--text-secondary)',marginBottom:20}}>Each member can be assigned a biometric code for quick attendance marking. Use the member profile page to assign or update biometric codes.</p>
        <div style={{background:'var(--bg-subtle)',borderRadius:10,padding:16,fontSize:13,color:'var(--text-muted)'}}>
          <strong>How it works:</strong> Assign a code to each member → Use POST /api/attendance/biometric with the code → Attendance is automatically marked.
        </div>
      </div>
    </div>
  </AppShell></Guard>;
}
