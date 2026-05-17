'use client';

import * as React from 'react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import Image from 'next/image';
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
};

const ASSETS: AssetCard[] = [
  {
    title: 'Primary Logo',
    subtitle: 'Used in headers, receipts and dashboard surfaces',
    size: 'SVG / 512×512',
    tone: 'from-rose-500/20 via-red-500/10 to-transparent',
  },
  {
    title: 'App Icon',
    subtitle: 'Launcher icon and PWA application tile',
    size: '1024×1024',
    tone: 'from-red-500/20 via-amber-500/10 to-transparent',
  },
  {
    title: 'Cover Image',
    subtitle: 'Brand hero surface for welcome and marketing pages',
    size: '1600×900',
    tone: 'from-zinc-100/10 via-white/5 to-transparent',
  },
  {
    title: 'Social Share Banner',
    subtitle: 'Used for social embeds and public sharing previews',
    size: '1200×630',
    tone: 'from-fuchsia-500/20 via-red-500/10 to-transparent',
  },
];

export default function BrandingPage() {
  const [mode, setMode] = React.useState<ThemeMode>('dark');
  const [typeface, setTypeface] = React.useState<Typeface>('Inter');
  const [buttonStyle, setButtonStyle] = React.useState<ButtonStyle>('glass');
  const [radiusStyle, setRadiusStyle] = React.useState<RadiusStyle>('smooth');
  const [primary, setPrimary] = React.useState('#dc2626');
  const [accent, setAccent] = React.useState('#7c3aed');
  const [loading] = React.useState(false);
  const [dirty] = React.useState(true);

  return (
    <Guard role="admin">
      <AppShell>
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(220,38,38,0.16),_transparent_26%),linear-gradient(180deg,_rgba(10,10,10,0.98),_rgba(18,18,20,1)_28%,_rgba(247,247,248,0.92)_100%)] text-zinc-950 dark:text-white">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-28 pt-5 sm:px-6 lg:px-8">
            <HeroBrandHeader primary={primary} accent={accent} />

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <BrandIdentityPanel primary={primary} accent={accent} />
              <BrandHealthPanel />
            </section>

            <LivePreviewSection primary={primary} accent={accent} mode={mode} />

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
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
              <MediaAssetsSection />
            </section>

            <FooterActionBar dirty={dirty} loading={loading} />
          </div>
        </div>
      </AppShell>
    </Guard>
  );
}

function HeroBrandHeader({ primary, accent }: { primary: string; accent: string }) {
  return (
    <section className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(9,9,11,0.96),rgba(38,7,12,0.92),rgba(24,24,27,0.92))] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8 lg:p-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(220,38,38,0.28),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(124,58,237,0.18),transparent_20%),radial-gradient(circle_at_60%_85%,rgba(255,255,255,0.06),transparent_18%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:22px_22px]" />
      <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div className="space-y-6 text-white">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-md">
              <ShieldCheck className="h-3.5 w-3.5" />
              Primary Brand
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
              <Sparkles className="h-3.5 w-3.5" />
              Luxury identity system
            </span>
          </div>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/10 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_10px_30px_rgba(0,0,0,0.2)] backdrop-blur-xl">
              <div className="absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.22),transparent_42%)]" />
              <Image src="/619-logo.png" alt="619 Fitness Studio logo" width={66} height={66} className="relative h-16 w-16 object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.4)]" />
            </div>
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
          </div>

          <div className="flex flex-wrap gap-3">
            <PremiumButton label="Edit Branding" icon={<PenSquare className="h-4 w-4" />} primary />
            <PremiumButton label="Upload Logo" icon={<Upload className="h-4 w-4" />} />
            <PremiumButton label="Preview Brand" icon={<Eye className="h-4 w-4" />} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <div className="rounded-[24px] border border-white/10 bg-white/10 p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl transition duration-300 group-hover:translate-y-[-2px]">
            <p className="text-xs uppercase tracking-[0.24em] text-white/45">Brand palette</p>
            <div className="mt-4 flex items-center gap-3">
              <ColorBubble color={primary} label="Primary Crimson" />
              <ColorBubble color="#111111" label="Matte Black" />
              <ColorBubble color="#f5f5f5" label="Soft White" ring />
              <ColorBubble color={accent} label="Accent Violet" />
            </div>
            <p className="mt-4 text-sm text-white/65">Tuned for premium admin surfaces with strong contrast and luxury depth.</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/10 p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl transition duration-300 group-hover:translate-y-[-2px]">
            <p className="text-xs uppercase tracking-[0.24em] text-white/45">Brand state</p>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <div className="text-3xl font-semibold">96%</div>
                <div className="mt-1 text-sm text-white/60">Identity completeness</div>
              </div>
              <div className="rounded-2xl bg-white/10 px-3 py-2 text-xs text-white/70">Publish ready</div>
            </div>
            <div className="mt-4 h-2 rounded-full bg-white/10">
              <div className="h-2 rounded-full bg-[linear-gradient(90deg,#dc2626,#fb7185,#7c3aed)]" style={{ width: '96%' }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BrandIdentityPanel({ primary, accent }: { primary: string; accent: string }) {
  return (
    <section className="rounded-[30px] border border-zinc-200/70 bg-white/70 p-5 shadow-[0_10px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl transition duration-300 hover:shadow-[0_18px_60px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-white/5 dark:shadow-[0_10px_50px_rgba(0,0,0,0.25)] sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500 dark:text-white/45">Brand identity panel</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white">Core brand system</h2>
        </div>
        <button className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/10 dark:text-white/80">
          <PenSquare className="h-4 w-4" />
          Edit
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[26px] border border-zinc-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(244,244,245,0.92))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.04))]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-700 dark:text-white/80">Logo preview</p>
            <button className="rounded-full border border-zinc-200 bg-white p-2 text-zinc-500 transition hover:text-zinc-950 dark:border-white/10 dark:bg-white/10 dark:text-white/60 dark:hover:text-white">
              <Upload className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-5 rounded-[24px] border border-dashed border-zinc-300 bg-[radial-gradient(circle_at_top,_rgba(220,38,38,0.08),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,248,249,0.9))] p-6 text-center dark:border-white/10 dark:bg-[radial-gradient(circle_at_top,_rgba(220,38,38,0.18),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))]">
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(56,10,18,0.88))] shadow-[0_20px_50px_rgba(0,0,0,0.25)]">
              <Image src="/619-logo.png" alt="619 studio brand logo" width={82} height={82} className="h-20 w-20 object-contain" />
            </div>
            <p className="mt-5 text-sm font-medium text-zinc-800 dark:text-white/80">Drag & drop logo asset</p>
            <p className="mt-2 text-sm text-zinc-500 dark:text-white/50">Supports SVG, PNG and transparent WebP for platform surfaces.</p>
            <div className="mt-5 flex justify-center gap-3">
              <PremiumButton label="Replace" icon={<RefreshCw className="h-4 w-4" />} compact />
              <PremiumButton label="Upload New" icon={<Plus className="h-4 w-4" />} compact />
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <DetailCard label="Studio Name" value="619 Fitness Studio" icon={<PenSquare className="h-4 w-4" />} />
          <DetailCard label="Location" value="Lucknow, Uttar Pradesh" icon={<MapPin className="h-4 w-4" />} />
          <DetailCard label="Brand Theme" value="Luxury Crimson / Matte Black" icon={<SwatchBook className="h-4 w-4" />} />
          <DetailCard label="Typography" value="Inter with elevated tracking" icon={<Type className="h-4 w-4" />} />
          <div className="rounded-[22px] border border-zinc-200/70 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/5 sm:col-span-2">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-zinc-800 dark:text-white/80">Brand Description</p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-white/45">High-performance luxury fitness operating system</p>
              </div>
              <PenSquare className="h-4 w-4 text-zinc-400 dark:text-white/35" />
            </div>
            <p className="text-sm leading-6 text-zinc-600 dark:text-white/60">
              619 Fitness Studio blends elite coaching energy with premium digital surfaces — creating a sharp, confident brand experience for members, trainers and operators.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <ColorSwatch color={primary} name="Primary" />
              <ColorSwatch color="#111111" name="Base" />
              <ColorSwatch color="#f4f4f5" name="Surface" light />
              <ColorSwatch color={accent} name="Accent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LivePreviewSection({ primary, accent, mode }: { primary: string; accent: string; mode: ThemeMode }) {
  return (
    <section className="rounded-[30px] border border-zinc-200/70 bg-white/75 p-5 shadow-[0_10px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-[0_10px_50px_rgba(0,0,0,0.25)] sm:p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500 dark:text-white/45">Live brand preview</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white">How the brand appears across the platform</h2>
        </div>
        <div className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600 dark:border-white/10 dark:bg-white/10 dark:text-white/60">
          Preview mode: {mode}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MiniMockCard title="Dashboard header" subtitle="Command center surface" primary={primary} accent={accent} />
        <MiniMockCard title="Membership card" subtitle="Member-facing identity" primary={primary} accent={accent} compact />
        <MiniMockCard title="App sidebar" subtitle="Navigation treatment" primary={primary} accent={accent} sidebar />
        <MiniMockCard title="Payment receipt" subtitle="Trust and consistency" primary={primary} accent={accent} receipt />
        <MiniMockCard title="Mobile check-in" subtitle="Fast front-desk moment" primary={primary} accent={accent} mobile />
      </div>
    </section>
  );
}

function BrandCustomization({
  mode,
  setMode,
  typeface,
  setTypeface,
  buttonStyle,
  setButtonStyle,
  radiusStyle,
  setRadiusStyle,
  primary,
  setPrimary,
  accent,
  setAccent,
}: {
  mode: ThemeMode;
  setMode: (v: ThemeMode) => void;
  typeface: Typeface;
  setTypeface: (v: Typeface) => void;
  buttonStyle: ButtonStyle;
  setButtonStyle: (v: ButtonStyle) => void;
  radiusStyle: RadiusStyle;
  setRadiusStyle: (v: RadiusStyle) => void;
  primary: string;
  setPrimary: (v: string) => void;
  accent: string;
  setAccent: (v: string) => void;
}) {
  return (
    <section className="rounded-[30px] border border-zinc-200/70 bg-white/75 p-5 shadow-[0_10px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-[0_10px_50px_rgba(0,0,0,0.25)] sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500 dark:text-white/45">Brand customization</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white">Premium visual controls</h2>
        </div>
        <button className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/10 dark:text-white/80">
          <Wand2 className="h-4 w-4" />
          Auto-balance
        </button>
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

      <div className="mt-5 rounded-[24px] border border-zinc-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,245,246,0.92))] p-5 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-800 dark:text-white/80">Live customization preview</p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-white/45">Changes update this sample instantly</p>
          </div>
          <Palette className="h-5 w-5 text-zinc-400 dark:text-white/35" />
        </div>
        <div className="mt-4 rounded-[22px] border border-white/10 p-5 text-white shadow-[0_18px_50px_rgba(0,0,0,0.2)]" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-white/60">619 Fitness Studio</p>
              <p className="mt-2 text-2xl font-semibold">Brand touchpoint preview</p>
            </div>
            <button className="rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur-md">Primary CTA</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function MediaAssetsSection() {
  return (
    <section className="rounded-[30px] border border-zinc-200/70 bg-white/75 p-5 shadow-[0_10px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-[0_10px_50px_rgba(0,0,0,0.25)] sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500 dark:text-white/45">Media & assets</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white">Platform-ready asset library</h2>
        </div>
        <button className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/10 dark:text-white/80">
          <Upload className="h-4 w-4" />
          Upload all
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {ASSETS.map((asset) => (
          <div key={asset.title} className="group rounded-[24px] border border-zinc-200/70 bg-white/85 p-4 transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-white/5">
            <div className={`rounded-[20px] border border-zinc-200/70 bg-gradient-to-br ${asset.tone} p-4 dark:border-white/10`}>
              <div className="flex h-28 items-center justify-center rounded-[18px] border border-dashed border-zinc-300 bg-white/60 dark:border-white/10 dark:bg-black/20">
                <ImageIcon className="h-8 w-8 text-zinc-400 dark:text-white/30" />
              </div>
            </div>
            <div className="mt-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{asset.title}</h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-white/45">{asset.subtitle}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-zinc-400 dark:text-white/35">Recommended {asset.size}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <PremiumButton label="Replace" icon={<RefreshCw className="h-4 w-4" />} compact />
              <PremiumButton label="Download" icon={<Download className="h-4 w-4" />} compact />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function BrandHealthPanel() {
  const items = [
    { title: 'Brand completeness', value: '96%', state: 'Excellent', width: '96%' },
    { title: 'Missing assets', value: '1', state: 'Needs social banner alt export', width: '72%' },
    { title: 'Theme consistency', value: '94%', state: 'Aligned across app surfaces', width: '94%' },
    { title: 'Mobile optimization', value: '98%', state: 'Strong on compact devices', width: '98%' },
    { title: 'Contrast score', value: 'AA+', state: 'Accessible and balanced', width: '91%' },
  ];

  return (
    <section className="rounded-[30px] border border-zinc-200/70 bg-white/75 p-5 shadow-[0_10px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-[0_10px_50px_rgba(0,0,0,0.25)] sm:p-6">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.24em] text-zinc-500 dark:text-white/45">Brand health</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white">Consistency analytics</h2>
      </div>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.title} className="rounded-[22px] border border-zinc-200/70 bg-white/85 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-zinc-800 dark:text-white/80">{item.title}</p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-white/45">{item.state}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-zinc-950 dark:text-white">{item.value}</p>
                <CheckCircle2 className="ml-auto mt-1 h-4 w-4 text-emerald-500" />
              </div>
            </div>
            <div className="mt-4 h-2 rounded-full bg-zinc-200 dark:bg-white/10">
              <div className="h-2 rounded-full bg-[linear-gradient(90deg,#dc2626,#fb7185,#7c3aed)]" style={{ width: item.width }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FooterActionBar({ dirty, loading }: { dirty: boolean; loading: boolean }) {
  return (
    <div className="sticky bottom-4 z-20">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,20,23,0.82),rgba(20,20,23,0.7))] px-4 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-3 text-white">
          <span className={`inline-flex h-2.5 w-2.5 rounded-full ${dirty ? 'bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.8)]' : 'bg-emerald-400'}`} />
          <div>
            <p className="text-sm font-medium">{dirty ? 'Unsaved brand changes' : 'All brand changes saved'}</p>
            <p className="text-xs text-white/55">Publishing updates your platform identity across admin and member surfaces.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <PremiumButton label="Reset" icon={<CircleOff className="h-4 w-4" />} compact dark />
          <PremiumButton label="Preview" icon={<Eye className="h-4 w-4" />} compact dark />
          <PremiumButton label={loading ? 'Saving…' : 'Save Changes'} icon={<CheckCircle2 className="h-4 w-4" />} compact primary />
          <PremiumButton label="Publish Brand" icon={<ArrowUpRight className="h-4 w-4" />} compact primary />
        </div>
      </div>
    </div>
  );
}

function PremiumButton({
  label,
  icon,
  primary,
  compact,
  dark,
}: {
  label: string;
  icon: React.ReactNode;
  primary?: boolean;
  compact?: boolean;
  dark?: boolean;
}) {
  const base = compact ? 'px-3.5 py-2 text-sm' : 'px-4 py-2.5 text-sm';
  const tone = primary
    ? 'border-transparent bg-[linear-gradient(135deg,#dc2626,#991b1b)] text-white shadow-[0_12px_30px_rgba(220,38,38,0.32)] hover:shadow-[0_16px_40px_rgba(220,38,38,0.4)]'
    : dark
      ? 'border-white/10 bg-white/10 text-white/85 hover:bg-white/15'
      : 'border-zinc-200 bg-white/80 text-zinc-700 hover:bg-white hover:text-zinc-950 dark:border-white/10 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15';

  return (
    <button className={`inline-flex items-center gap-2 rounded-full border ${base} font-medium transition duration-300 hover:-translate-y-0.5 ${tone}`}>
      {icon}
      {label}
    </button>
  );
}

function ColorBubble({ color, label, ring }: { color: string; label: string; ring?: boolean }) {
  return <div title={label} className={`h-10 w-10 rounded-full ${ring ? 'ring-1 ring-white/30' : ''}`} style={{ background: color }} />;
}

function ColorSwatch({ color, name, light }: { color: string; name: string; light?: boolean }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 dark:border-white/10 dark:bg-white/10 dark:text-white/75">
      <span className={`h-4 w-4 rounded-full ${light ? 'ring-1 ring-zinc-300' : ''}`} style={{ background: color }} />
      {name}
    </div>
  );
}

function DetailCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-[22px] border border-zinc-200/70 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-zinc-800 dark:text-white/80">{label}</p>
        <span className="text-zinc-400 dark:text-white/35">{icon}</span>
      </div>
      <p className="mt-3 text-base font-semibold text-zinc-950 dark:text-white">{value}</p>
    </div>
  );
}

function MiniMockCard({
  title,
  subtitle,
  primary,
  accent,
  compact,
  sidebar,
  receipt,
  mobile,
}: {
  title: string;
  subtitle: string;
  primary: string;
  accent: string;
  compact?: boolean;
  sidebar?: boolean;
  receipt?: boolean;
  mobile?: boolean;
}) {
  return (
    <div className="group rounded-[24px] border border-zinc-200/70 bg-white/85 p-4 transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-white/5">
      <div className="mb-3">
        <p className="text-sm font-medium text-zinc-800 dark:text-white/80">{title}</p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-white/45">{subtitle}</p>
      </div>
      <div className={`overflow-hidden rounded-[20px] border border-white/10 bg-zinc-950 p-3 text-white ${mobile ? 'mx-auto max-w-[170px]' : ''}`}>
        <div className="rounded-[16px] p-3" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}>
          <div className={`rounded-[14px] bg-black/35 p-3 backdrop-blur-md ${sidebar ? 'min-h-[130px]' : compact ? 'min-h-[120px]' : receipt ? 'min-h-[128px]' : mobile ? 'min-h-[220px]' : 'min-h-[140px]'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-white/15" />
                <div>
                  <div className="h-2 w-16 rounded-full bg-white/65" />
                  <div className="mt-2 h-2 w-10 rounded-full bg-white/30" />
                </div>
              </div>
              {mobile ? <Monitor className="h-4 w-4 text-white/60" /> : <Palette className="h-4 w-4 text-white/60" />}
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
    <div className="rounded-[22px] border border-zinc-200/70 bg-white/85 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <p className="text-sm font-medium text-zinc-800 dark:text-white/80">{title}</p>
      <p className="mt-1 text-sm text-zinc-500 dark:text-white/45">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string; icon?: React.ReactNode }[];
}) {
  return (
    <div className="grid grid-cols-3 gap-2 rounded-[18px] border border-zinc-200 bg-zinc-50 p-1 dark:border-white/10 dark:bg-black/20">
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            onClick={() => onChange(option.id)}
            className={`inline-flex items-center justify-center gap-2 rounded-[14px] px-3 py-2 text-sm font-medium transition ${active ? 'bg-white text-zinc-950 shadow-sm dark:bg-white/12 dark:text-white' : 'text-zinc-500 hover:text-zinc-900 dark:text-white/45 dark:hover:text-white/75'}`}
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
    <div className="flex items-center gap-3 rounded-[18px] border border-zinc-200 bg-zinc-50 px-3 py-3 dark:border-white/10 dark:bg-black/20">
      <input value={value} onChange={(e) => onChange(e.target.value)} type="color" className="h-10 w-14 cursor-pointer rounded-xl border-0 bg-transparent p-0" />
      <div>
        <p className="text-sm font-medium text-zinc-900 dark:text-white">{value}</p>
        <p className="text-xs text-zinc-500 dark:text-white/45">Live brand color token</p>
      </div>
    </div>
  );
}
