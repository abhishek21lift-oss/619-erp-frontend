'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import Image from 'next/image';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { Palette, Upload, RefreshCw, Save, AlertCircle, CheckCircle2 } from 'lucide-react';

type ThemeMode = 'dark' | 'light';
type Typeface = 'Inter' | 'Satoshi' | 'Geist';
type ButtonStyle = 'soft' | 'solid' | 'glass';
type RadiusStyle = 'rounded' | 'smooth' | 'pill';

const VALID_HEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

const ASSET_KEYS = [
  { value: 'primary_logo', label: 'Primary Logo' },
  { value: 'app_icon', label: 'App Icon' },
  { value: 'cover_image', label: 'Cover Image' },
  { value: 'social_share_banner', label: 'Social Share Banner' },
];

const s = (obj: React.CSSProperties) => obj;

const c: React.CSSProperties = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', padding: 24, marginBottom: 20 };
const l: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' };
const inp: React.CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.6)', color: '#f1f5f9', fontSize: 14, outline: 'none' };
const sel: React.CSSProperties = { ...inp, cursor: 'pointer' };

function Skeleton() {
  const p = { background: 'rgba(255,255,255,0.05)', borderRadius: 8 };
  return (
    <div style={{ padding: 40 }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ ...c, padding: 28 }}>
          <div style={{ height: 20, width: '40%', marginBottom: 16, ...p }} />
          <div style={{ height: 14, width: '70%', marginBottom: 12, ...p }} />
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ height: 42, flex: 1, ...p }} />
            <div style={{ height: 42, flex: 1, ...p }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BrandingPage() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [err, setErr] = React.useState('');
  const [primary, setPrimary] = React.useState('#dc2626');
  const [accent, setAccent] = React.useState('#7c3aed');
  const [mode, setMode] = React.useState<ThemeMode>('dark');
  const [typeface, setTypeface] = React.useState<Typeface>('Inter');
  const [buttonStyle, setButtonStyle] = React.useState<ButtonStyle>('soft');
  const [radiusStyle, setRadiusStyle] = React.useState<RadiusStyle>('rounded');
  const [uploadedAssets, setUploadedAssets] = React.useState<Record<string, string>>({});
  const [assetKey, setAssetKey] = React.useState('primary_logo');
  const [dirty, setDirty] = React.useState(false);
  const saved = React.useRef({ primary, accent, mode, typeface, buttonStyle, radiusStyle });

  React.useEffect(() => {
    (async () => {
      try {
        const data = await api.settings.getBranding();
        setPrimary(data.primary_color || '#dc2626');
        setAccent(data.accent_color || '#7c3aed');
        setMode((data.theme_mode as ThemeMode) || 'dark');
        setTypeface((data.typeface as Typeface) || 'Inter');
        setButtonStyle((data.button_style as ButtonStyle) || 'soft');
        setRadiusStyle((data.radius_style as RadiusStyle) || 'rounded');
        setUploadedAssets({
          primary_logo: data.primary_logo || '',
          app_icon: data.app_icon || '',
          cover_image: data.cover_image || '',
          social_share_banner: data.social_share_banner || '',
        });
        saved.current = { primary: data.primary_color || '#dc2626', accent: data.accent_color || '#7c3aed', mode: (data.theme_mode as ThemeMode) || 'dark', typeface: (data.typeface as Typeface) || 'Inter', buttonStyle: (data.button_style as ButtonStyle) || 'soft', radiusStyle: (data.radius_style as RadiusStyle) || 'rounded' };
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed to load branding');
        toast.error('Failed to load branding settings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  React.useEffect(() => {
    const s = saved.current;
    setDirty(primary !== s.primary || accent !== s.accent || mode !== s.mode || typeface !== s.typeface || buttonStyle !== s.buttonStyle || radiusStyle !== s.radiusStyle);
  }, [primary, accent, mode, typeface, buttonStyle, radiusStyle]);

  const hexOk = (v: string) => VALID_HEX.test(v);

  const handleSave = async () => {
    if (!hexOk(primary)) { toast.error('Invalid primary color hex'); return; }
    if (!hexOk(accent)) { toast.error('Invalid accent color hex'); return; }
    setSaving(true); setErr('');
    try {
      const res = await api.settings.saveBranding({ primary_color: primary, accent_color: accent, theme_mode: mode, typeface, button_style: buttonStyle, radius_style: radiusStyle });
      saved.current = { primary, accent, mode, typeface, buttonStyle, radiusStyle };
      setDirty(false);
      toast.success(res.message || 'Branding saved');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      setErr(msg); toast.error(msg);
    } finally { setSaving(false); }
  };

  const handleReset = () => {
    setPrimary(saved.current.primary); setAccent(saved.current.accent);
    setMode(saved.current.mode); setTypeface(saved.current.typeface);
    setButtonStyle(saved.current.buttonStyle); setRadiusStyle(saved.current.radiusStyle);
    toast.success('Reverted to saved values');
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await api.settings.uploadAsset(base64, assetKey);
      setUploadedAssets((prev) => ({ ...prev, [assetKey]: res.url }));
      toast.success('Asset uploaded');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Upload failed'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  if (loading) return <Guard role="admin"><AppShell title="Branding"><Skeleton /></AppShell></Guard>;

  return (
    <Guard role="admin">
      <AppShell title="Branding">
        <div style={{ padding: 28, maxWidth: 880, margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} style={s({ display: 'flex', alignItems: 'center', gap: 16, padding: '32px 40px', borderRadius: 20, background: 'linear-gradient(135deg,#0f172a,#1e293b)', color: '#fff', marginBottom: 28 })}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Palette size={24} color="#fff" /></div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Branding</h1>
              <p style={{ fontSize: 14, color: '#94a3b8', margin: '2px 0 0' }}>Customize your studio&apos;s look and feel</p>
            </div>
          </motion.div>

          {err && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10, background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.3)', color: '#fca5a5', marginBottom: 20, fontSize: 14 }}>
              <AlertCircle size={18} />
              <span style={{ flex: 1 }}>{err}</span>
              <button onClick={() => setErr('')} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: 16 }}>&times;</button>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={c}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9', margin: '0 0 16px' }}>Color Settings</h2>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {([['Primary', primary, setPrimary], ['Accent', accent, setAccent]] as const).map(([name, val, set]) => (
                <div key={name} style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <label style={l}>{name} Color</label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: val, border: '2px solid rgba(255,255,255,0.15)', flexShrink: 0 }} />
                    <input style={inp} value={val} onChange={(e) => set(e.target.value)} placeholder={name === 'Primary' ? '#dc2626' : '#7c3aed'} />
                  </div>
                  {val && !hexOk(val) && <p style={{ fontSize: 12, color: '#f87171', margin: '4px 0 0' }}>Invalid hex</p>}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={c}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9', margin: '0 0 16px' }}>Theme Settings</h2>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <label style={l}>Theme Mode</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['dark', 'light'] as ThemeMode[]).map((m) => (
                    <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `1px solid ${mode === m ? '#dc2626' : 'rgba(255,255,255,0.1)'}`, background: mode === m ? 'rgba(220,38,38,0.15)' : 'rgba(15,23,42,0.6)', color: mode === m ? '#fff' : '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>{m === 'dark' ? '🌙 Dark' : '☀️ Light'}</button>
                  ))}
                </div>
              </div>
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <label style={l}>Typeface</label>
                <select style={sel} value={typeface} onChange={(e) => setTypeface(e.target.value as Typeface)}>
                  {(['Inter', 'Satoshi', 'Geist'] as Typeface[]).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 16 }}>
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <label style={l}>Button Style</label>
                <select style={sel} value={buttonStyle} onChange={(e) => setButtonStyle(e.target.value as ButtonStyle)}>
                  {(['soft', 'solid', 'glass'] as ButtonStyle[]).map((o) => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                </select>
              </div>
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <label style={l}>Radius Style</label>
                <select style={sel} value={radiusStyle} onChange={(e) => setRadiusStyle(e.target.value as RadiusStyle)}>
                  {(['rounded', 'smooth', 'pill'] as RadiusStyle[]).map((o) => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                </select>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={c}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9', margin: '0 0 16px' }}>Logo &amp; Assets</h2>
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ width: 100, height: 100, borderRadius: 14, border: '2px dashed rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: 'rgba(15,23,42,0.4)', flexShrink: 0 }}>
                <Image src={uploadedAssets[assetKey] || '/619-logo.png'} alt="" width={100} height={100} style={{ objectFit: 'contain', opacity: uploadedAssets[assetKey] ? 1 : 0.5 }} />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={l}>Asset Key</label>
                <select style={{ ...sel, marginBottom: 12 }} value={assetKey} onChange={(e) => setAssetKey(e.target.value)}>
                  {ASSET_KEYS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                </select>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, background: uploading ? 'rgba(220,38,38,0.3)' : '#dc2626', color: '#fff', fontSize: 14, fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer', border: 'none' }}>
                  {uploading ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={16} />}
                  {uploading ? 'Uploading…' : 'Choose File'}
                  <input type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} disabled={uploading} />
                </label>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
              {dirty && <CheckCircle2 size={16} color="#fbbf24" />}
              <span style={{ fontSize: 13, color: dirty ? '#fbbf24' : '#64748b' }}>{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
            </div>
            <button onClick={handleReset} disabled={!dirty || saving} style={{ padding: '8px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: dirty ? '#f1f5f9' : '#64748b', fontSize: 14, fontWeight: 600, cursor: dirty && !saving ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <RefreshCw size={15} /> Reset
            </button>
            <button onClick={handleSave} disabled={!dirty || saving} style={{ padding: '8px 24px', borderRadius: 10, border: 'none', background: !dirty || saving ? 'rgba(220,38,38,0.3)' : '#dc2626', color: '#fff', fontSize: 14, fontWeight: 600, cursor: !dirty || saving ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {saving ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
              {saving ? 'Saving…' : 'Save'}
            </button>
          </motion.div>
        </div>
      </AppShell>
    </Guard>
  );
}
