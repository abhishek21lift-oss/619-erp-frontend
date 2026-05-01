'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

interface Props { children: React.ReactNode; role?: 'admin'|'trainer'|'member'; }

export default function Guard({ children, role }: Props) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (role && user.role !== role) { router.replace('/dashboard'); }
  }, [user, loading, role, router]);

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'var(--muted)'}}>
      <div>
        <div style={{fontSize:32,textAlign:'center',marginBottom:12}}>🏋️</div>
        <div style={{fontSize:14}}>Loading…</div>
      </div>
    </div>
  );

  if (!user || (role && user.role !== role)) return null;
  return <>{children}</>;
}
