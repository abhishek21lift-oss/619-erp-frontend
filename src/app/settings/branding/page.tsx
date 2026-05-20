'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import Image from 'next/image';
import { api } from '@/lib/api';
import {
  ArrowUpRight,
  CheckCircle2,
  CircleOff,
  Download,
  Eye,
  ImageIcon,
  MapPin,
  Monitor,
  Moon,
  Palette,
  PenSquare,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  SunMedium,
  SwatchBook,
  Type,
  Upload,
  Wand2,
  Zap,
  BarChart3,
  Target,
  Hash,
  Globe,
  Smartphone,
  LayoutDashboard,
  CreditCard,
  Menu,
  UserCheck,
  Layers,
  Droplets,
  Contrast,
  Award,
  ChevronRight,
  CircleDot,
  GripVertical,
  AlertCircle,
} from 'lucide-react';

type ThemeMode = 'dark' | 'light';
type Typeface = 'Inter' | 'Satoshi' | 'Geist';
type ButtonStyle = 'soft' | 'solid' | 'glass';
type RadiusStyle = 'rounded' | 'smooth' | 'pill';

type AssetCard = {
  title: string;
  subtitle: string;
  size: string;
  tone: string;
  key: string;
};

const ASSETS: AssetCard[] = [
  {
    title: 'Primary Logo',
    subtitle: 'Used in headers, receipts and dashboard surfaces',
    size: 'SVG / 512×512',
    tone: 'from-rose-500/20 via-red-500/10 to-transparent',
    key: 'primary_logo',
  },
  {
    title: 'App Icon',
    subtitle: 'Launcher icon and PWA application tile',
    size: '1024×1024',
    tone: 'from-red-500/20 via-amber-500/10 to-transparent',
    key: 'app_icon',
  },
  {
    title: 'Cover Image',
    subtitle: 'Brand hero surface for welcome and marketing pages',
    size: '1600×900',
    tone: 'from-zinc-100/10 via-white/5 to-transparent',
    key: 'cover_image',
  },
  {
    title: 'Social Share Banner',
    subtitle: 'Used for social embeds and public sharing previews',
    size: '1200×630',
    tone: 'from-fuchsia-500/20 via-red-500/10 to-transparent',
    key: 'social_share_banner',
  },
];

const BRAND_METRICS = [
  { label: 'Identity Score', value: 96, icon: <Award className="h-4 w-4" />, color: '#dc2626' },
  { label: 'Consistency', value: 94, icon: <Contrast className="h-4 w-4" />, color: '#7c3aed' },
  { label: 'Contrast Ratio', value: 91, icon: <Droplets className="h-4 w-4" />, color: '#0ea5e9' },
  { label: 'Mobile Readiness', value: 98, icon: <Smartphone className="h-4 w-4" />, color: '#10b981' },
];

const FRAMER_UP = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
};

function RadialScoreChart({ score, size = 140 }: { score: number; size?: number }) {
  const radius = size / 2 - 12;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const strokeWidth = 8;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#brandGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        />
        <defs>
          <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="50%" stopColor="#fb7185" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      </svg>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="absolute flex flex-col items-center justify-center"
      >
        <span className="text-[28px] font-[820] tracking-tight text-white">{score}</span>
        <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/50">Brand Score</span>
      </motion.div>
    </div>
  );
}

export default function BrandingPage() {
  const [mode, setMode] = React.useState<ThemeMode>('dark');
  const [typeface, setTypeface] = React.useState<Typeface>('Inter');
  const [buttonStyle, setButtonStyle] = React.useState<ButtonStyle>('glass');
  const [radiusStyle, setRadiusStyle] = React.useState<RadiusStyle>('smooth');
  const [primary, setPrimary] = React.useState('#dc2626');
  const [accent, setAccent] = React.useState('#7c3aed');
  const [saving, setSaving] = React.useState(false);
  const [pageLoading, setPageLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [dirty, setDirty] = React.useState(false);
  const [uploadingAsset, setUploadingAsset] = React.useState<string | null>(null);

  const savedRef = React.useRef({
    primary: '#dc2626',
    accent: '#7c3aed',
    mode: 'dark' as ThemeMode,
    typeface: 'Inter' as Typeface,
    buttonStyle: 'glass' as ButtonStyle,
    radiusStyle: 'smooth' as RadiusStyle,
  });

  const fetchBranding = React.useCallback(async () => {
    setPageLoading(true);
    setError(null);
    try {
      const settings = await api.settings.getBranding();
      if (settings.primary_color) setPrimary(settings.primary_color);
      if (settings.accent_color) setAccent(settings.accent_color);
      if (settings.theme_mode === 'dark' || settings.theme_mode === 'light') setMode(settings.theme_mode);
      if (['Inter', 'Satoshi', 'Geist'].includes(settings.typeface)) setTypeface(settings.typeface as Typeface);
      if (['soft', 'solid', 'glass'].includes(settings.button_style)) setButtonStyle(settings.button_style as ButtonStyle);
      if (['rounded', 'smooth', 'pill'].includes(settings.radius_style)) setRadiusStyle(settings.radius_style as RadiusStyle);
      savedRef.current = {
        primary: settings.primary_color || '#dc2626',
        accent: settings.accent_color || '#7c3aed',
        mode: (settings.theme_mode === 'dark' || settings.theme_mode === 'light') ? settings.theme_mode : 'dark',
        typeface: (['Inter', 'Satoshi', 'Geist'].includes(settings.typeface) ? settings.typeface : 'Inter') as Typeface,
        buttonStyle: (['soft', 'solid', 'glass'].includes(settings.button_style) ? settings.button_style : 'glass') as ButtonStyle,
        radiusStyle: (['rounded', 'smooth', 'pill'].includes(settings.radius_style) ? settings.radius_style : 'smooth') as RadiusStyle,
      };
      setDirty(false);
    } catch {
      setError('Failed to load branding settings');
    } finally {
      setPageLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  const initializedRef = React.useRef(false);
  React.useEffect(() => {
    if (initializedRef.current) {
      setDirty(true);
    } else {
      initializedRef.current = true;
    }
  }, [mode, typeface, buttonStyle, radiusStyle, primary, accent]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.settings.saveBranding({
        primary_color: primary,
        accent_color: accent,
        theme_mode: mode,
        typeface,
        button_style: buttonStyle,
        radius_style: radiusStyle,
      });
      savedRef.current = { primary, accent, mode, typeface, buttonStyle, radiusStyle };
      setDirty(false);
    } catch {
      setError('Failed to save branding settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPrimary(savedRef.current.primary);
    setAccent(savedRef.current.accent);
    setMode(savedRef.current.mode);
    setTypeface(savedRef.current.typeface);
    setButtonStyle(savedRef.current.buttonStyle);
    setRadiusStyle(savedRef.current.radiusStyle);
    setDirty(false);
  };

  const handleUpload = async (file: File, key: string) => {
    setUploadingAsset(key);
    setError(null);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
      await api.settings.uploadAsset(base64, key);
    } catch {
      setError(`Failed to upload ${key}`);
    } finally {
      setUploadingAsset(null);
    }
  };

  if (pageLoading) {
    return (
      <Guard role="admin">
        <AppShell>
          <div className="min-h-screen" style={{ background: 'linear-gradient(145deg,#f8fafc 0%,#f1f5f9 50%,#fafafe 100%)' }}>
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-28 pt-5 sm:px-6 lg:px-8">
              <LoadingSkeleton />
            </div>
          </div>
        </AppShell>
      </Guard>
    );
  }

  return (
    <Guard role="admin">
      <AppShell>
        <div className="min-h-screen" style={{ background: 'linear-gradient(145deg,#f8fafc 0%,#f1f5f9 50%,#fafafe 100%)' }}>
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-28 pt-5 sm:px-6 lg:px-8">
            {error && <ErrorBanner message={error} onRetry={fetchBranding} />}

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
              <HeroBrandHeader primary={primary} accent={accent} />
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
              }}
              className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]"
            >
              <motion.div variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }}>
                <BrandIdentityPanel primary={primary} accent={accent} />
              </motion.div>
              <motion.div variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }}>
                <BrandHealthPanel />
              </motion.div>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
              }}
            >
              <LivePreviewSection primary={primary} accent={accent} mode={mode} />
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
              }}
              className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]"
            >
              <motion.div variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }}>
                <BrandCustomization
                  mode={mode}
                  setMode={setMode}
                  typeface={typeface}
                  setTypeface={setTypeface}
                  buttonStyle={buttonStyle}
                  setButtonStyle={setButtonStyle}
                  radiusStyle={radiusStyle}
                  setRadiusStyle={setRadiusStyle}
                  primary={primary}
                  setPrimary={setPrimary}
                  accent={accent}
                  setAccent={setAccent}
                />
              </motion.div>
              <motion.div variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }}>
                <MediaAssetsSection onUpload={handleUpload} uploadingAsset={uploadingAsset} />
              </motion.div>
            </motion.div>

            <FooterActionBar dirty={dirty} loading={saving} onSave={handleSave} onReset={handleReset} />
          </div>
        </div>
      </AppShell>
    </Guard>
  );
}

function HeroBrandHeader({ primary, accent }: { primary: string; accent: string }) {
  return (
    <section className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(9,9,11,0.96),rgba(38,7,12,0.92),rgba(24,24,27,0.92))] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8 lg:p-10">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(220,38,38,0.28),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(124,58,237,0.18),transparent_20%),radial-gradient(circle_at_60%_85%,rgba(255,255,255,0.06),transparent_18%)]"
      />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:22px_22px]" />
      <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
        <div className="space-y-6 text-white">
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-md">
              <ShieldCheck className="h-3.5 w-3.5" />
              Primary Brand
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
              <Sparkles className="h-3.5 w-3.5" />
              Luxury identity system
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="flex flex-col gap-5 sm:flex-row sm:items-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/10 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_10px_30px_rgba(0,0,0,0.2)] backdrop-blur-xl"
            >
              <div className="absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.22),transparent_42%)]" />
              <Image src="/619-logo.png" alt="619 Fitness Studio logo" width={66} height={66} className="relative h-16 w-16 object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.4)]" />
            </motion.div>
            <div className="min-w-0 flex-1">
              <p className="text-sm uppercase tracking-[0.25em] text-white/50">Brand identity control center</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[3.35rem] lg:leading-[1.05]">619 Fitness Studio</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
                A premium fitness-tech brand system engineered for a bold studio presence across dashboards, memberships, receipts and mobile touchpoints.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/60">
                <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />Lucknow, Uttar Pradesh</span>
                <span>Last updated 2 hours ago</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap gap-3"
          >
            <HeroButton label="Edit Branding" icon={<PenSquare className="h-4 w-4" />} primary />
            <HeroButton label="Upload Logo" icon={<Upload className="h-4 w-4" />} />
            <HeroButton label="Preview Brand" icon={<Eye className="h-4 w-4" />} />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="rounded-[24px] border border-white/10 bg-white/10 p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl transition duration-300 group-hover:translate-y-[-2px]">
            <RadialScoreChart score={96} size={140} />
            <p className="mt-2 text-center text-xs text-white/50">Overall brand health indicator</p>
          </div>
          <div className="grid w-full grid-cols-2 gap-3">
            {BRAND_METRICS.slice(0, 2).map((metric) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + Math.random() * 0.2 }}
                className="rounded-[16px] border border-white/10 bg-white/10 p-3 text-center backdrop-blur-xl transition duration-200 hover:bg-white/15"
              >
                <span className="mx-auto mb-1.5 flex h-6 w-6 items-center justify-center rounded-[8px]" style={{ background: `${metric.color}25`, color: metric.color }}>
                  {metric.icon}
                </span>
                <p className="text-[17px] font-[760] text-white">{metric.value}%</p>
                <p className="text-[10px] text-white/50">{metric.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function BrandIdentityPanel({ primary, accent }: { primary: string; accent: string }) {
  return (
    <section className="rounded-[30px] border border-zinc-200/70 bg-white/80 p-5 shadow-[0_10px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl transition duration-300 hover:shadow-[0_18px_60px_rgba(15,23,42,0.12)] sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Brand identity panel</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">Core brand system</h2>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <PenSquare className="h-4 w-4" />
          Edit
        </motion.button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="rounded-[26px] border border-zinc-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(244,244,245,0.92))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-700">Logo preview</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="rounded-full border border-zinc-200 bg-white p-2 text-zinc-500 transition hover:text-zinc-950"
            >
              <Upload className="h-4 w-4" />
            </motion.button>
          </div>
          <div className="mt-5 rounded-[24px] border border-dashed border-zinc-300 bg-[radial-gradient(circle_at_top,_rgba(220,38,38,0.08),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,248,249,0.9))] p-6 text-center">
            <motion.div
              initial={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              className="mx-auto flex h-28 w-28 items-center justify-center rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(56,10,18,0.88))] shadow-[0_20px_50px_rgba(0,0,0,0.25)]"
            >
              <Image src="/619-logo.png" alt="619 studio brand logo" width={82} height={82} className="h-20 w-20 object-contain" />
            </motion.div>
            <p className="mt-5 text-sm font-medium text-zinc-800">Drag & drop logo asset</p>
            <p className="mt-2 text-sm text-zinc-500">Supports SVG, PNG and transparent WebP for platform surfaces.</p>
            <div className="mt-5 flex justify-center gap-3">
              <PremiumButton label="Replace" icon={<RefreshCw className="h-4 w-4" />} compact />
              <PremiumButton label="Upload New" icon={<Plus className="h-4 w-4" />} compact />
            </div>
          </div>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2">
          <DetailCard label="Studio Name" value="619 Fitness Studio" icon={<PenSquare className="h-4 w-4" />} />
          <DetailCard label="Location" value="Lucknow, Uttar Pradesh" icon={<MapPin className="h-4 w-4" />} />
          <DetailCard label="Brand Theme" value="Luxury Crimson / Matte Black" icon={<SwatchBook className="h-4 w-4" />} />
          <DetailCard label="Typography" value="Inter with elevated tracking" icon={<Type className="h-4 w-4" />} />
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-[22px] border border-zinc-200/70 bg-white/80 p-4 shadow-sm sm:col-span-2"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-zinc-800">Brand Description</p>
                <p className="mt-1 text-sm text-zinc-500">High-performance luxury fitness operating system</p>
              </div>
              <PenSquare className="h-4 w-4 text-zinc-400" />
            </div>
            <p className="text-sm leading-6 text-zinc-600">
              619 Fitness Studio blends elite coaching energy with premium digital surfaces — creating a sharp, confident brand experience for members, trainers and operators.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <ColorSwatch color={primary} name="Primary" />
              <ColorSwatch color="#111111" name="Base" />
              <ColorSwatch color="#f4f4f5" name="Surface" light />
              <ColorSwatch color={accent} name="Accent" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function BrandHealthPanel() {
  const items = [
    { title: 'Brand completeness', value: '96%', state: 'Excellent', width: '96%', icon: <Award className="h-4 w-4" /> },
    { title: 'Missing assets', value: '1', state: 'Needs social banner alt export', width: '72%', icon: <Target className="h-4 w-4" /> },
    { title: 'Theme consistency', value: '94%', state: 'Aligned across app surfaces', width: '94%', icon: <BarChart3 className="h-4 w-4" /> },
    { title: 'Mobile optimization', value: '98%', state: 'Strong on compact devices', width: '98%', icon: <Smartphone className="h-4 w-4" /> },
    { title: 'Contrast score', value: 'AA+', state: 'Accessible and balanced', width: '91%', icon: <Contrast className="h-4 w-4" /> },
  ];

  return (
    <section className="rounded-[30px] border border-zinc-200/70 bg-white/80 p-5 shadow-[0_10px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl transition duration-300 hover:shadow-[0_18px_60px_rgba(15,23,42,0.12)] sm:p-6">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Brand health</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">Consistency analytics</h2>
      </div>
      <AnimatePresence>
        <div className="space-y-3">
          {items.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="group rounded-[22px] border border-zinc-200/70 bg-white/90 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-zinc-100 text-zinc-600 transition-colors group-hover:bg-red-50 group-hover:text-red-600">
                    {item.icon}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-zinc-800">{item.title}</p>
                    <p className="mt-0.5 text-sm text-zinc-500">{item.state}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-zinc-950">{item.value}</p>
                  <CheckCircle2 className="ml-auto mt-1 h-3.5 w-3.5 text-emerald-500" />
                </div>
              </div>
              <div className="mt-4 h-2.5 rounded-full bg-zinc-100">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: item.width }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="h-2.5 rounded-full bg-[linear-gradient(90deg,#dc2626,#fb7185,#7c3aed)]"
                />
              </div>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>
    </section>
  );
}

function LivePreviewSection({ primary, accent, mode }: { primary: string; accent: string; mode: ThemeMode }) {
  const items = [
    { title: 'Dashboard header', subtitle: 'Command center surface', type: 'dashboard' as const },
    { title: 'Membership card', subtitle: 'Member-facing identity', type: 'compact' as const },
    { title: 'App sidebar', subtitle: 'Navigation treatment', type: 'sidebar' as const },
    { title: 'Payment receipt', subtitle: 'Trust and consistency', type: 'receipt' as const },
    { title: 'Mobile check-in', subtitle: 'Fast front-desk moment', type: 'mobile' as const },
  ];

  return (
    <section className="rounded-[30px] border border-zinc-200/70 bg-white/80 p-5 shadow-[0_10px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Live brand preview</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">How the brand appears across the platform</h2>
        </div>
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600 shadow-sm"
        >
          Preview mode: {mode}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {items.map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <MiniMockCard title={item.title} subtitle={item.subtitle} primary={primary} accent={accent} type={item.type} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function BrandCustomization({
  mode, setMode, typeface, setTypeface, buttonStyle, setButtonStyle,
  radiusStyle, setRadiusStyle, primary, setPrimary, accent, setAccent,
}: {
  mode: ThemeMode; setMode: (v: ThemeMode) => void;
  typeface: Typeface; setTypeface: (v: Typeface) => void;
  buttonStyle: ButtonStyle; setButtonStyle: (v: ButtonStyle) => void;
  radiusStyle: RadiusStyle; setRadiusStyle: (v: RadiusStyle) => void;
  primary: string; setPrimary: (v: string) => void;
  accent: string; setAccent: (v: string) => void;
}) {
  return (
    <section className="rounded-[30px] border border-zinc-200/70 bg-white/80 p-5 shadow-[0_10px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl transition duration-300 hover:shadow-[0_18px_60px_rgba(15,23,42,0.12)] sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Brand customization</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">Premium visual controls</h2>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <Wand2 className="h-4 w-4" />
          Auto-balance
        </motion.button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SettingCard title="Primary color" subtitle="Core brand recognition">
          <ColorInput value={primary} onChange={setPrimary} />
        </SettingCard>
        <SettingCard title="Accent color" subtitle="Highlights and focus states">
          <ColorInput value={accent} onChange={setAccent} />
        </SettingCard>
        <SettingCard title="Dark / Light mode" subtitle="Platform appearance preference">
          <Segmented value={mode} onChange={setMode} options={[{ id: 'dark', label: 'Dark', icon: <Moon className='h-4 w-4' /> }, { id: 'light', label: 'Light', icon: <SunMedium className='h-4 w-4' /> }]} />
        </SettingCard>
        <SettingCard title="Typography" subtitle="Primary interface typeface">
          <Segmented value={typeface} onChange={setTypeface} options={[{ id: 'Inter', label: 'Inter' }, { id: 'Satoshi', label: 'Satoshi' }, { id: 'Geist', label: 'Geist' }]} />
        </SettingCard>
        <SettingCard title="Button style" subtitle="Action treatment">
          <Segmented value={buttonStyle} onChange={setButtonStyle} options={[{ id: 'soft', label: 'Soft' }, { id: 'solid', label: 'Solid' }, { id: 'glass', label: 'Glass' }]} />
        </SettingCard>
        <SettingCard title="Border radius" subtitle="Shape language">
          <Segmented value={radiusStyle} onChange={setRadiusStyle} options={[{ id: 'rounded', label: 'Rounded' }, { id: 'smooth', label: 'Smooth' }, { id: 'pill', label: 'Pill' }]} />
        </SettingCard>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mt-5 rounded-[24px] border border-zinc-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,245,246,0.92))] p-5"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-800">Live customization preview</p>
            <p className="mt-1 text-sm text-zinc-500">Changes update this sample instantly</p>
          </div>
          <Palette className="h-5 w-5 text-zinc-400" />
        </div>
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="mt-4 rounded-[22px] border border-white/10 p-5 text-white shadow-[0_18px_50px_rgba(0,0,0,0.2)]"
          style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-white/60">619 Fitness Studio</p>
              <p className="mt-2 text-2xl font-semibold">Brand touchpoint preview</p>
            </div>
            <button className="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur-md">Primary CTA</button>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

function MediaAssetsSection({ onUpload, uploadingAsset }: { onUpload: (file: File, key: string) => Promise<void>; uploadingAsset: string | null }) {
  const fileInputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileSelect = (key: string) => {
    fileInputRefs.current[key]?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await onUpload(file, key);
    e.target.value = '';
  };

  return (
    <section className="rounded-[30px] border border-zinc-200/70 bg-white/80 p-5 shadow-[0_10px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl transition duration-300 hover:shadow-[0_18px_60px_rgba(15,23,42,0.12)] sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Media & assets</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">Platform-ready asset library</h2>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <Upload className="h-4 w-4" />
          Upload all
        </motion.button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {ASSETS.map((asset, i) => (
          <motion.div
            key={asset.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="group rounded-[24px] border border-zinc-200/70 bg-white/90 p-4 shadow-sm transition-all duration-200 hover:shadow-[0_16px_40px_rgba(15,23,42,0.12)]"
          >
            <div className={`rounded-[20px] border border-zinc-200/70 bg-gradient-to-br ${asset.tone} p-4`}>
              <div className="flex h-28 items-center justify-center rounded-[18px] border border-dashed border-zinc-300 bg-white/60">
                {uploadingAsset === asset.key ? (
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-zinc-400" />
                )}
              </div>
            </div>
            <div className="mt-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-zinc-900">{asset.title}</h3>
                <p className="mt-1 text-sm text-zinc-500">{asset.subtitle}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-zinc-400">Recommended {asset.size}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={(el) => { fileInputRefs.current[asset.key] = el; }}
                onChange={(e) => handleFileChange(e, asset.key)}
              />
              <PremiumButton
                label={uploadingAsset === asset.key ? 'Uploading…' : 'Replace'}
                icon={uploadingAsset === asset.key ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent" /> : <RefreshCw className="h-4 w-4" />}
                compact
                onClick={() => handleFileSelect(asset.key)}
                disabled={uploadingAsset === asset.key}
              />
              <PremiumButton
                label="Download"
                icon={<Download className="h-4 w-4" />}
                compact
              />
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function FooterActionBar({ dirty, loading, onSave, onReset }: { dirty: boolean; loading: boolean; onSave: () => void; onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="sticky bottom-4 z-20"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,20,23,0.82),rgba(20,20,23,0.7))] px-4 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-3 text-white">
          <motion.span
            animate={{ scale: dirty ? [1, 1.2, 1] : 1 }}
            transition={{ repeat: dirty ? Infinity : 0, duration: 2 }}
            className={`inline-flex h-2.5 w-2.5 rounded-full ${dirty ? 'bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.8)]' : 'bg-emerald-400'}`}
          />
          <div>
            <p className="text-sm font-medium">{dirty ? 'Unsaved brand changes' : 'All brand changes saved'}</p>
            <p className="text-xs text-white/55">Publishing updates your platform identity across admin and member surfaces.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <FooterButton label="Reset" icon={<CircleOff className="h-4 w-4" />} onClick={onReset} />
          <FooterButton label="Preview" icon={<Eye className="h-4 w-4" />} />
          <FooterButton
            label={loading ? 'Saving…' : 'Save Changes'}
            icon={loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <CheckCircle2 className="h-4 w-4" />}
            primary
            onClick={onSave}
            disabled={loading}
          />
          <FooterButton label="Publish Brand" icon={<ArrowUpRight className="h-4 w-4" />} primary />
        </div>
      </div>
    </motion.div>
  );
}

function getValidChildren(children: React.ReactNode) {
  return React.Children.toArray(children).filter(Boolean);
}

function HeroButton({ label, icon, primary }: { label: string; icon: React.ReactNode; primary?: boolean }) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition duration-300 ${
        primary
          ? 'border-transparent bg-[linear-gradient(135deg,#dc2626,#991b1b)] text-white shadow-[0_12px_30px_rgba(220,38,38,0.32)] hover:shadow-[0_16px_40px_rgba(220,38,38,0.4)]'
          : 'border border-white/10 bg-white/10 text-white/85 hover:bg-white/15'
      }`}
    >
      {icon}
      {label}
    </motion.button>
  );
}

function FooterButton({ label, icon, primary, onClick, disabled }: { label: string; icon: React.ReactNode; primary?: boolean; onClick?: () => void; disabled?: boolean }) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition duration-300 ${
        disabled ? 'opacity-60 cursor-not-allowed' : ''
      } ${
        primary
          ? 'border-transparent bg-[linear-gradient(135deg,#dc2626,#991b1b)] text-white shadow-[0_12px_30px_rgba(220,38,38,0.32)] hover:shadow-[0_16px_40px_rgba(220,38,38,0.4)]'
          : 'border border-white/10 bg-white/10 text-white/85 hover:bg-white/15'
      }`}
    >
      {icon}
      {label}
    </motion.button>
  );
}

function PremiumButton({ label, icon, compact, onClick, disabled }: { label: string; icon: React.ReactNode; compact?: boolean; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-3.5 py-2 text-sm font-medium text-zinc-700 transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-zinc-950 hover:shadow-md ${compact ? 'px-3 py-1.5 text-xs' : ''} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      {icon}
      {label}
    </button>
  );
}

function ColorSwatch({ color, name, light }: { color: string; name: string; light?: boolean }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
      <span className={`h-4 w-4 rounded-full ${light ? 'ring-1 ring-zinc-300' : ''}`} style={{ background: color }} />
      {name}
    </div>
  );
}

function DetailCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="rounded-[22px] border border-zinc-200/70 bg-white/85 p-4 shadow-sm transition-all duration-200 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-zinc-800">{label}</p>
        <span className="text-zinc-400">{icon}</span>
      </div>
      <p className="mt-3 text-base font-semibold text-zinc-950">{value}</p>
    </motion.div>
  );
}

function MiniMockCard({ title, subtitle, primary, accent, type }: {
  title: string; subtitle: string; primary: string; accent: string;
  type: 'dashboard' | 'compact' | 'sidebar' | 'receipt' | 'mobile';
}) {
  const heightMap = {
    dashboard: 'min-h-[140px]',
    compact: 'min-h-[120px]',
    sidebar: 'min-h-[130px]',
    receipt: 'min-h-[128px]',
    mobile: 'min-h-[220px]',
  };

  return (
    <div className="group rounded-[24px] border border-zinc-200/70 bg-white/90 p-4 shadow-sm transition-all duration-200 hover:shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
      <div className="mb-3">
        <p className="text-sm font-medium text-zinc-800">{title}</p>
        <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
      </div>
      <div className={`overflow-hidden rounded-[20px] border border-white/10 bg-zinc-950 p-3 text-white ${type === 'mobile' ? 'mx-auto max-w-[170px]' : ''}`}>
        <div className="rounded-[16px] p-3" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}>
          <div className={`rounded-[14px] bg-black/35 p-3 backdrop-blur-md ${heightMap[type]}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-white/15" />
                <div>
                  <div className="h-2 w-16 rounded-full bg-white/65" />
                  <div className="mt-2 h-2 w-10 rounded-full bg-white/30" />
                </div>
              </div>
              {type === 'mobile' ? <Monitor className="h-4 w-4 text-white/60" /> : <Palette className="h-4 w-4 text-white/60" />}
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-2.5 rounded-full bg-white/70" />
              <div className="h-2.5 w-4/5 rounded-full bg-white/35" />
              <div className="h-2.5 w-2/3 rounded-full bg-white/20" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="h-12 rounded-2xl bg-white/12" />
              <div className="h-12 rounded-2xl bg-white/8" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[22px] border border-zinc-200/70 bg-white/88 p-4 shadow-sm">
      <p className="text-sm font-medium text-zinc-800">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Segmented<T extends string>({ value, onChange, options }: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string; icon?: React.ReactNode }[];
}) {
  return (
    <div className="grid grid-cols-3 gap-2 rounded-[18px] border border-zinc-200 bg-zinc-50 p-1">
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            onClick={() => onChange(option.id)}
            className={`inline-flex items-center justify-center gap-2 rounded-[14px] px-3 py-2 text-sm font-medium transition ${
              active ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-zinc-200 bg-zinc-50 px-3 py-3">
      <input value={value} onChange={(e) => onChange(e.target.value)} type="color" className="h-10 w-14 cursor-pointer rounded-xl border-0 bg-transparent p-0" />
      <div>
        <p className="text-sm font-medium text-zinc-900">{value}</p>
        <p className="text-xs text-zinc-500">Live brand color token</p>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="rounded-[32px] bg-zinc-200/60 h-[300px]" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[30px] bg-zinc-200/60 h-[420px]" />
        <div className="rounded-[30px] bg-zinc-200/60 h-[420px]" />
      </div>
      <div className="rounded-[30px] bg-zinc-200/60 h-[200px]" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[30px] bg-zinc-200/60 h-[520px]" />
        <div className="rounded-[30px] bg-zinc-200/60 h-[520px]" />
      </div>
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[16px] border border-red-200 bg-red-50 p-4 flex items-center gap-3"
    >
      <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
      <p className="text-sm text-red-700 flex-1">{message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
      >
        <RefreshCw className="h-4 w-4" />
        Retry
      </button>
    </motion.div>
  );
}
