'use client';

import { useState, useEffect } from 'react';
import { http } from '@/lib/http';
import { useToast } from '@/lib/toast';
import { Monitor, Smartphone, Tablet, Trash2, Loader2, Wifi } from 'lucide-react';

interface Device {
  id: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ip: string;
  location: string;
  lastSeen: string;
  isCurrent: boolean;
}

const ICONS = { desktop: Monitor, mobile: Smartphone, tablet: Tablet };

export default function DevicesPage() {
  const { toast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    http<Device[]>('/api/profile/devices')
      .then(setDevices)
      .catch((err) => {
        console.error('[profile/devices] fetch failed', err);
        toast.error('Could not load devices');
      })
      .finally(() => setLoading(false));
  }, []);

  const revoke = async (id: string) => {
    setRevoking(id);
    try {
      await http(`/api/profile/devices/${id}`, { method: 'DELETE' });
      setDevices(d => d.filter(x => x.id !== id));
      toast.success('Device removed');
    } catch {
      toast.error('Failed to remove device');
    } finally {
      setRevoking(null);
    }
  };

  if (loading) return (
    <div className="animate-pulse space-y-3">
      {[1,2,3].map(i => <div key={i} className="h-24 bg-white/[0.04] rounded-2xl" />)}
    </div>
  );

  return (
    <div className="space-y-3 pb-10">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[13px] text-white/40">
          {devices.length} device{devices.length !== 1 ? 's' : ''} connected
        </p>
      </div>

      {devices.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center gap-3">
          <Monitor size={32} className="text-white/15" />
          <p className="text-[14px] text-white/40">No devices found</p>
        </div>
      )}

      {devices.map(d => {
        const Icon = ICONS[d.type] ?? Monitor;
        return (
          <div
            key={d.id}
            className={`bg-[#141414] border rounded-2xl p-5 flex items-center gap-4 ${
              d.isCurrent ? 'border-[#FF2E63]/30' : 'border-white/[0.07]'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              d.isCurrent ? 'bg-[#FF2E63]/15' : 'bg-white/[0.06]'
            }`}>
              <Icon size={18} className={d.isCurrent ? 'text-[#FF2E63]' : 'text-white/40'} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[14px] font-medium text-white truncate">{d.name}</p>
                {d.isCurrent && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 text-[11px] font-medium">
                    <Wifi size={10} /> Current
                  </span>
                )}
              </div>
              <p className="text-[12px] text-white/35 mt-0.5">{d.browser} · {d.os}</p>
              <p className="text-[12px] text-white/25">{d.ip} · {d.location} · Last seen {d.lastSeen}</p>
            </div>
            {!d.isCurrent && (
              <button
                onClick={() => revoke(d.id)}
                disabled={revoking === d.id}
                className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all"
              >
                {revoking === d.id
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Trash2 size={14} />}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
