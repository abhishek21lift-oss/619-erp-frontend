'use client';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import Image from 'next/image';
import { Palette } from 'lucide-react';
export default function BrandingPage() {
  return <Guard role="admin"><AppShell>
    <div className="page-container animate-fade-in">
      <div className="page-header"><h1 className="page-title">Branding</h1><p className="page-subtitle">Studio logo, colours and identity</p></div>
      <div className="card" style={{padding:24,maxWidth:500}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}><Palette size={22} color="var(--brand)"/><h3 style={{margin:0}}>619 Fitness Studio Identity</h3></div>
        <div style={{display:'flex',alignItems:'center',gap:20,padding:'16px',background:'var(--bg-subtle)',borderRadius:10,marginBottom:16}}>
          <Image src="/619-logo.png" alt="Logo" width={72} height={72} style={{objectFit:'contain'}}/>
          <div>
            <div style={{fontWeight:700,fontSize:16}}>619 FITNESS STUDIO</div>
            <div style={{fontSize:12,color:'var(--text-muted)',marginTop:4}}>Primary brand · Lucknow</div>
            <div style={{display:'flex',gap:8,marginTop:8}}>
              <div style={{width:20,height:20,borderRadius:4,background:'#dc2626'}} title="Brand Red"/>
              <div style={{width:20,height:20,borderRadius:4,background:'#1a1a1a'}} title="Brand Black"/>
            </div>
          </div>
        </div>
        <p style={{fontSize:12,color:'var(--text-muted)'}}>To update the logo, replace /public/619-logo.png and redeploy.</p>
      </div>
    </div>
  </AppShell></Guard>;
}
