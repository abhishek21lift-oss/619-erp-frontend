'use client';

import { useState, useEffect } from 'react';
import { http } from '@/lib/http';
import { useToast } from '@/lib/toast';
import { Sun, Moon, Globe, Clock, Loader2, Sliders } from 'lucide-react';

interface Prefs {
  theme: 'dark' | 'light' | 'system';
  language: string;
  timezone: string;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
  compactMode: boolean;
}

const DEFAULT: Prefs = {
  theme: 'dark', language: 'en', timezone: 'Asia/Kolkata',
  dateFormat: 'DD/MM/YYYY', timeFormat: '12h', compactMode: false
};

const TIMEZONES = [
  'Asia/Kolkata', 'UTC', 'America/New_York', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Asia/Dubai', 'Asia/Singapore', 'Australia/Sydney'
];

const LANGUAGES = [
  { code: 'en', label: 'English' }, { code: 'hi', label: 'हिन्दी' },
  { code: 'es', label: 'Español' }, { code: 'fr', label: 'Français' }
];

function SegmentedControl<T extends string>({ options, value, onChange, renderLabel }: {
  options: T[]; value: T; onChange: (v: T) => void;
  renderLabel?: (v: T) => React.ReactNode;
}) {
  return (
    <div className="flex bg-white/[0.04] rounded-xl p-1 gap-1">
      {options.map(o => (
        <button
          key={o} onClick={() => onChange(o)}
          className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-all capitalize ${
            value === o ? 'bg-[#FF2E63] text-white shadow' : 'text-white/40 hover:text-white/70'
          }`}
        >
          {renderLabel ? renderLabel(o) : o}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch" aria-checked={checked} onClick={onChange}
      className={`relative rounded-full transition-all duration-200 flex-shrink-0 ${
        checked ? 'bg-[#FF2E63]' : 'bg-white/[0.12]'
      }`}
      style={{ height: '22px', width: '40px' }}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${
        checked ? 'left-[22px]' : 'left-0.5'
      }`} />
    </button>
  );
}

export default function PreferencesPage() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    http<Prefs>('/api/profile/preferences')
      .then(d => setPrefs({ ...DEFAULT, ...d }))
      .catch((err) => {
        console.error('[profile/preferences] fetch failed', err);
        toast.error('Could not load preferences');
      })
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof Prefs>(key: K, val: Prefs[K]) =>
    setPrefs(p => ({ ...p, [key]: val }));

  const save = async () => {
    setSaving(true);
    try {
      await http('/api/profile/preferences', { method: 'PUT', body: JSON.stringify(prefs) });
      toast.success('Preferences saved');
    } catch {
      toast.error('Failed to save preferences');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="animate-pulse space-y-4">{[1,2,3].map(i => <div key={i} className="h-36 bg-white/[0.04] rounded-2xl" />)}</div>;

  return (
    <div className="space-y-4 pb-10">
      {/* Theme */}
      <div className="bg-[#141414] border border-white/[0.07] rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sun size={14} className="text-[#FF2E63]" />
          <h3 className="text-[14px] font-semibold text-white">Appearance</h3>
        </div>
        <SegmentedControl
          options={['dark', 'light', 'system'] as const}
          value={prefs.theme}
          onChange={v => set('theme', v)}
          renderLabel={v => (
            <span className="flex items-center justify-center gap-1.5">
              {v === 'dark' ? <Moon size={12} /> : v === 'light' ? <Sun size={12} /> : <Globe size={12} />}
              {v}
            </span>
          )}
        />
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-[13px] text-white/80 font-medium">Compact mode</p>
            <p className="text-[12px] text-white/35">Denser layout for power users</p>
          </div>
          <Toggle checked={prefs.compactMode} onChange={() => set('compactMode', !prefs.compactMode)} />
        </div>
      </div>

      {/* Locale */}
      <div className="bg-[#141414] border border-white/[0.07] rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Globe size={14} className="text-[#FF2E63]" />
          <h3 className="text-[14px] font-semibold text-white">Language & Region</h3>
        </div>
        <div className="space-y-1.5">
          <label className="text-[12px] text-white/45 uppercase tracking-wide font-medium">Language</label>
          <select
            value={prefs.language} onChange={e => set('language', e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[14px] text-white focus:outline-none focus:border-[#FF2E63]/60 transition-all"
          >
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[12px] text-white/45 uppercase tracking-wide font-medium">Timezone</label>
          <select
            value={prefs.timezone} onChange={e => set('timezone', e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[14px] text-white focus:outline-none focus:border-[#FF2E63]/60 transition-all"
          >
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>
      </div>

      {/* Date & Time format */}
      <div className="bg-[#141414] border border-white/[0.07] rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-[#FF2E63]" />
          <h3 className="text-[14px] font-semibold text-white">Date & Time</h3>
        </div>
        <div className="space-y-1.5">
          <label className="text-[12px] text-white/45 uppercase tracking-wide font-medium">Date Format</label>
          <SegmentedControl
            options={['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] as const}
            value={prefs.dateFormat}
            onChange={v => set('dateFormat', v)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[12px] text-white/45 uppercase tracking-wide font-medium">Time Format</label>
          <SegmentedControl
            options={['12h', '24h'] as const}
            value={prefs.timeFormat}
            onChange={v => set('timeFormat', v)}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF2E63] hover:bg-[#E11D48] text-[13px] text-white font-medium transition-all active:scale-95 disabled:opacity-60"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Sliders size={13} />}
          {saving ? 'Saving…' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}
