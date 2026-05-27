'use client';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { CreditCard } from 'lucide-react';
export default function BillingSettingsPage() {
  const router = useRouter();
  return <Guard role="admin"><AppShell>
    <div className="page-container animate-fade-in">
      <div className="page-header"><h1 className="page-title">Billing Settings</h1><p className="page-subtitle">Payment modes, receipt format and billing preferences</p></div>
      <div className="card" style={{padding:24,maxWidth:500}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}><CreditCard size={22} color="var(--brand)"/><h3 style={{margin:0}}>Payment Methods</h3></div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {['Cash','UPI / GPay','Card','Bank Transfer','Cheque'].map(m=>(
            <div key={m} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',background:'var(--bg-subtle)',borderRadius:8}}>
              <span style={{fontWeight:500}}>{m}</span>
              <span style={{fontSize:12,color:'var(--success)',fontWeight:700}}>✓ Enabled</span>
            </div>
          ))}
        </div>
        <button className="btn btn-primary btn-sm" style={{marginTop:16}} onClick={()=>router.push('/payments')}>View Payments →</button>
      </div>
    </div>
  </AppShell></Guard>;
}
