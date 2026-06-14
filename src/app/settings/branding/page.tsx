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

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

const glass = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' };
const glassCard: React.CSSProperties = { ...glass, padding: 24, marginBottom: 20 };
const l: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' };
const inp: React.CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.6)', color: '#f1f5f9', fontSize: 14, outline: 'none' };
const sel: React.CSSProperties = { ...inp, cursor: 'pointer' };

function Skeleton() {
  const p = { background: 'rgba(255,255,255,0.05)', borderRadius: 8 };
  return (
    <div style={{ padding: 40 }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ ...glass, padding: 28 }}>
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
          {/* ── Hero ── */}
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
            style={{
              position: 'relative', overflow: 'hidden',
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '36px 40px', borderRadius: 20,
              background: 'linear-gradient(135deg, #0a0f1a 0%, #4c0519 25%, #7f1d1d 50%, #4c0519 75%, #0a0f1a 100%)',
              color: '#fff', marginBottom: 28,
              border: '1px solid rgba(220,38,38,0.15)',
              boxShadow: '0 25px 60px -12px rgba(76,5,25,0.6)',
            }}
          >
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 20% 40%, rgba(220,38,38,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 60%, rgba(225,29,72,0.08) 0%, transparent 50%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: -80, right: -40, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(220,38,38,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -60, left: -20, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(225,29,72,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255,255,255,0.015) 1px, rgba(255,255,255,0.015) 2px), repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(255,255,255,0.015) 1px, rgba(255,255,255,0.015) 2px)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1, width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #dc2626, #e11d48)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(220,38,38,0.3)' }}>
              <Palette size={24} color="#fff" />
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>Branding</h1>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', margin: '2px 0 0' }}>Customize your studio&apos;s look and feel</p>
            </div>
          </motion.div>

          {err && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10, background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.3)', color: '#fca5a5', marginBottom: 20, fontSize: 14 }}>
              <AlertCircle size={18} />
              <span style={{ flex: 1 }}>{err}</span>
              <button onClick={() => setErr('')} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: 16 }}>&times;</button>
            </motion.div>
          )}

          <motion.div variants={containerVariants} initial="hidden" animate="show">
            {/* ── Split layout: settings + live preview ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
              <div>
                {/* ── Color Settings ── */}
                <motion.div variants={itemVariants} style={glassCard}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', margin: '0 0 4px' }}>Colors</h2>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '0 0 20px' }}>Pick a preset or enter a custom hex value</p>

                  {/* Preset palettes */}
                  {([
                    { name: 'Primary', val: primary, set: setPrimary, presets: ['#dc2626','#e11d48','#f97316','#f59e0b','#10b981','#06b6d4','#3b82f6','#6366f1','#8b5cf6','#a855f7','#ec4899','#14b8a6'] },
                    { name: 'Accent',  val: accent,  set: setAccent,  presets: ['#7c3aed','#6d28d9','#4f46e5','#0ea5e9','#10b981','#f59e0b','#e11d48','#db2777','#0891b2','#059669','#d97706','#dc2626'] },
                  ] as const).map((cfg) => (
                    <div key={cfg.name} style={{ marginBottom: 20 }}>
                      <label style={l}>{cfg.name} Color</label>
                      {/* Swatches */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                        {cfg.presets.map((c) => (
                          <button key={c} onClick={() => cfg.set(c)} title={c}
                            style={{ width: 26, height: 26, borderRadius: 7, background: c, border: cfg.val === c ? '2.5px solid #fff' : '2px solid transparent', cursor: 'pointer', transition: 'all 0.15s', boxShadow: cfg.val === c ? `0 0 0 2px ${c}` : 'none', transform: cfg.val === c ? 'scale(1.15)' : 'scale(1)' }} />
                        ))}
                      </div>
                      {/* Native picker + hex input */}
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <div style={{ width: 42, height: 42, borderRadius: 10, background: cfg.val, border: '2px solid rgba(255,255,255,0.15)', boxShadow: `0 0 20px ${cfg.val}40`, cursor: 'pointer', overflow: 'hidden' }}>
                            <input type="color" value={hexOk(cfg.val) ? cfg.val : '#000000'} onChange={e => cfg.set(e.target.value)}
                              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', border: 'none', padding: 0 }} />
                          </div>
                        </div>
                        <input style={inp} value={cfg.val} onChange={(e) => cfg.set(e.target.value)} placeholder={cfg.name === 'Primary' ? '#dc2626' : '#7c3aed'} />
                      </div>
                      {cfg.val && !hexOk(cfg.val) && <p style={{ fontSize: 12, color: '#f87171', margin: '4px 0 0' }}>Invalid hex — use format #RRGGBB</p>}
                    </div>
                  ))}
                </motion.div>

                {/* ── Theme Settings ── */}
                <motion.div variants={itemVariants} style={glassCard}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', margin: '0 0 20px' }}>Theme &amp; Typography</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={l}>Theme Mode</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {(['dark', 'light'] as ThemeMode[]).map((m) => (
                          <button key={m} onClick={() => setMode(m)}
                            style={{
                              flex: 1, padding: '10px 0', borderRadius: 10,
                              border: `1px solid ${mode === m ? primary : 'rgba(255,255,255,0.1)'}`,
                              background: mode === m ? `${primary}20` : 'rgba(15,23,42,0.6)',
                              color: mode === m ? '#fff' : 'rgba(255,255,255,0.5)',
                              fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                              transition: 'all 0.15s',
                            }}>
                            {m === 'dark' ? '🌙 Dark' : '☀️ Light'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={l}>Typeface</label>
                      <select style={sel} value={typeface} onChange={(e) => setTypeface(e.target.value as Typeface)}>
                        {(['Inter', 'Satoshi', 'Geist'] as Typeface[]).map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={l}>Button Style</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {(['soft', 'solid', 'glass'] as ButtonStyle[]).map((b) => {
                          const active = buttonStyle === b;
                          const borderR = b === 'soft' ? 8 : b === 'solid' ? 6 : 20;
                          return (
                            <button key={b} onClick={() => setButtonStyle(b)}
                              style={{ flex: 1, padding: '8px 0', borderRadius: borderR, border: `1.5px solid ${active ? primary : 'rgba(255,255,255,0.1)'}`, background: active ? `${primary}20` : 'rgba(15,23,42,0.6)', color: active ? '#fff' : 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s' }}>
                              {b}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label style={l}>Radius Style</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {(['rounded', 'smooth', 'pill'] as RadiusStyle[]).map((r) => {
                          const active = radiusStyle === r;
                          const borderR = r === 'rounded' ? 8 : r === 'smooth' ? 16 : 30;
                          return (
                            <button key={r} onClick={() => setRadiusStyle(r)}
                              style={{ flex: 1, padding: '8px 0', borderRadius: borderR, border: `1.5px solid ${active ? accent : 'rgba(255,255,255,0.1)'}`, background: active ? `${accent}20` : 'rgba(15,23,42,0.6)', color: active ? '#fff' : 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s' }}>
                              {r}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* ── Live Preview Panel ── */}
              <motion.div variants={itemVariants} style={{ ...glassCard, position: 'sticky', top: 80 }}>
                <h2 style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live Preview</h2>
                {/* Simulated app card */}
                <div style={{ borderRadius: radiusStyle === 'pill' ? 24 : radiusStyle === 'smooth' ? 16 : 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 16 }}>
                  <div style={{ padding: '14px 16px', background: primary }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 14 }}>🏋️</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: typeface }}>619 FITNESS STUDIO</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontFamily: typeface }}>Studio Suite</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: 16, background: mode === 'dark' ? '#0f172a' : '#f8fafc' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, fontFamily: typeface }}>Dashboard</div>
                    {[{ label: 'Revenue', val: '₹2.4L', color: primary }, { label: 'Members', val: '142', color: accent }, { label: 'Sessions', val: '38', color: '#10b981' }].map(stat => (
                      <div key={stat.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, padding: '8px 12px', borderRadius: radiusStyle === 'pill' ? 20 : radiusStyle === 'smooth' ? 12 : 7, background: mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                        <span style={{ fontSize: 11, color: mode === 'dark' ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)', fontFamily: typeface }}>{stat.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: stat.color, fontFamily: typeface }}>{stat.val}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
                      <button style={{ flex: 1, padding: '8px 0', borderRadius: radiusStyle === 'pill' ? 30 : radiusStyle === 'smooth' ? 12 : 8, border: 'none', background: buttonStyle === 'glass' ? 'rgba(255,255,255,0.1)' : buttonStyle === 'soft' ? `${primary}20` : primary, color: buttonStyle === 'soft' ? primary : '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: typeface, backdropFilter: buttonStyle === 'glass' ? 'blur(8px)' : undefined }}>
                        Record Payment
                      </button>
                      <button style={{ flex: 1, padding: '8px 0', borderRadius: radiusStyle === 'pill' ? 30 : radiusStyle === 'smooth' ? 12 : 8, border: 'none', background: buttonStyle === 'glass' ? 'rgba(255,255,255,0.1)' : buttonStyle === 'soft' ? `${accent}20` : accent, color: buttonStyle === 'soft' ? accent : '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: typeface, backdropFilter: buttonStyle === 'glass' ? 'blur(8px)' : undefined }}>
                        Add Client
                      </button>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textAlign: 'center', fontFamily: typeface }}>
                  {typeface} · {mode} · {buttonStyle} · {radiusStyle}
                </div>
              </motion.div>
            </div>

            {/* ── Logo & Assets ── */}
            <motion.div variants={itemVariants} style={glassCard}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', margin: '0 0 16px' }}>Logo &amp; Assets</h2>
              <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{
                  width: 120, height: 120, borderRadius: 16,
                  border: '2px dashed rgba(220,38,38,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                  background: 'rgba(15,23,42,0.4)', flexShrink: 0,
                  transition: 'border-color 0.2s',
                  boxShadow: '0 0 30px rgba(220,38,38,0.05)',
                }}>
                  <Image src={uploadedAssets[assetKey] || '/619-logo.png'} alt="" width={120} height={120} style={{ objectFit: 'contain', opacity: uploadedAssets[assetKey] ? 1 : 0.5 }} />
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={l}>Asset Key</label>
                  <select style={{ ...sel, marginBottom: 12 }} value={assetKey} onChange={(e) => setAssetKey(e.target.value)}>
                    {ASSET_KEYS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                  </select>
                  <label style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '12px 24px', borderRadius: 10,
                    background: uploading ? 'rgba(220,38,38,0.3)' : 'linear-gradient(135deg, #dc2626, #e11d48)',
                    color: '#fff', fontSize: 14, fontWeight: 600,
                    cursor: uploading ? 'not-allowed' : 'pointer', border: 'none',
                    boxShadow: uploading ? 'none' : '0 4px 16px rgba(220,38,38,0.3)',
                    transition: 'all 0.15s',
                  }}>
                    {uploading ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={16} />}
                    {uploading ? 'Uploading…' : 'Choose File'}
                    <input type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} disabled={uploading} />
                  </label>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '8px 0 0' }}>Supports PNG, JPG, SVG &middot; Recommended size: 512x512px</p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* ── Action bar ── */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            style={{ ...glass, display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px', borderRadius: 14, marginTop: 4 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
              {dirty && <CheckCircle2 size={16} color="#fbbf24" />}
              <span style={{ fontSize: 13, color: dirty ? '#fbbf24' : 'rgba(255,255,255,0.35)' }}>{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
            </div>
            <button onClick={handleReset} disabled={!dirty || saving}
              style={{
                padding: '8px 20px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.12)', background: 'transparent',
                color: dirty ? '#f1f5f9' : 'rgba(255,255,255,0.3)',
                fontSize: 14, fontWeight: 600, cursor: dirty && !saving ? 'pointer' : 'not-allowed',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
              <RefreshCw size={15} /> Reset
            </button>
            <button onClick={handleSave} disabled={!dirty || saving}
              style={{
                padding: '8px 24px', borderRadius: 10, border: 'none',
                background: !dirty || saving ? 'rgba(220,38,38,0.3)' : 'linear-gradient(135deg, #dc2626, #e11d48)',
                color: '#fff', fontSize: 14, fontWeight: 600,
                cursor: !dirty || saving ? 'not-allowed' : 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                boxShadow: !dirty || saving ? 'none' : '0 4px 16px rgba(220,38,38,0.3)',
              }}>
              {saving ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
              {saving ? 'Saving…' : 'Save'}
            </button>
          </motion.div>
        </div>
      </AppShell>
    </Guard>
  );
}
