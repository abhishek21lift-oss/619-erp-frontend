'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import {
  DatabaseBackup, Download, FileSpreadsheet, UploadCloud, X,
  Loader2, CheckCircle2, AlertCircle, Sparkles, Users, GitMerge,
  ClipboardList, Eye, ArrowRight, AlertTriangle, ChevronDown, ChevronUp,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────
interface SubRow {
  plan_name: string;
  start_date: string;
  end_date: string;
  duration_months: number;
  selling_price: number;
  amount_paid: number;
  balance_amount: number;
  trainer_name: string;
  status: string;
}
interface ClientGroup {
  name: string;
  mobile: string | null;
  gender: string;
  joining_date: string;
  trainer_name: string;
  subscriptions: SubRow[];
  needs_review: boolean;
  review_reason: string;
  raw_rows: number;
}

// ── CSV parser ──────────────────────────────────────────────────────────
function parseCsvText(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (!lines.length) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cells = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    if (cells.every(c => !c)) continue;
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { if (h) obj[h] = cells[idx] ?? ''; });
    rows.push(obj);
  }
  return rows;
}

function normPhone(v: string): string {
  const digits = v.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length >= 11 && digits.startsWith('91')) return digits.slice(-10);
  return digits.slice(-10);
}

function parseDate(v: string): string {
  if (!v) return '';
  const s = v.trim();
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    const [, dd, mm, rawY] = m;
    const yyyy = rawY.length === 2 ? (parseInt(rawY) > 50 ? '19' : '20') + rawY : rawY;
    return `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return '';
}

function addMonths(dateStr: string, months: number): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function groupRows(rawRows: Record<string, string>[]): ClientGroup[] {
  const byPhone = new Map<string, ClientGroup>();
  const byName  = new Map<string, ClientGroup>();
  const noKey: ClientGroup[] = [];

  for (const row of rawRows) {
    const rawName  = (row['Full Name'] || '').trim();
    // Strip leading garbage characters (e.g. ???? at start)
    const name     = rawName.replace(/^[^a-zA-Zऀ-ॿ]+/, '').trim() || rawName;
    const mobile   = normPhone(row['Phone Number'] || '');
    const gender   = (row['Gender'] || '').trim();
    const trainer  = (row['Trainer'] || '').trim();
    const plan     = (row['Subscription Plan'] || '').trim();
    const startDate = parseDate(row['Start Date'] || '');
    const duration  = parseInt(row['Duration Months'] || '0') || 0;
    const endDate   = duration && startDate ? addMonths(startDate, duration) : '';
    const selling   = parseFloat(row['Selling Price'] || '0') || 0;
    const paid      = parseFloat(row['Amount Paid'] || '0') || 0;
    const balance   = Math.max(selling - paid, 0);
    const subStatus = endDate && new Date(endDate) < new Date() ? 'expired' : 'active';

    if (!name) continue;

    const sub: SubRow = {
      plan_name: plan, start_date: startDate, end_date: endDate,
      duration_months: duration, selling_price: selling, amount_paid: paid,
      balance_amount: balance, trainer_name: trainer, status: subStatus,
    };

    const earliest_start = startDate;

    if (mobile) {
      if (byPhone.has(mobile)) {
        const g = byPhone.get(mobile)!;
        g.subscriptions.push(sub);
        g.raw_rows++;
        // If name conflicts with phone — flag for review
        if (g.name.toUpperCase() !== name.toUpperCase() && !g.needs_review) {
          g.needs_review = true;
          g.review_reason = `Name mismatch: "${g.name}" vs "${name}"`;
        }
        // Update trainer to latest seen
        if (trainer && !g.trainer_name) g.trainer_name = trainer;
        // Earliest start date
        if (earliest_start && (!g.joining_date || earliest_start < g.joining_date))
          g.joining_date = earliest_start;
      } else {
        const g: ClientGroup = {
          name, mobile, gender, joining_date: earliest_start,
          trainer_name: trainer, subscriptions: [sub],
          needs_review: false, review_reason: '', raw_rows: 1,
        };
        byPhone.set(mobile, g);
        // Also index by name so name-only rows can find it
        byName.set(name.toUpperCase(), g);
      }
    } else {
      // No phone — match by exact name
      const key = name.toUpperCase();
      if (byName.has(key)) {
        const g = byName.get(key)!;
        g.subscriptions.push(sub);
        g.raw_rows++;
      } else if (byPhone.size > 0) {
        // Check if any phone-keyed group has this name
        let found: ClientGroup | null = null;
        for (const g of byPhone.values()) {
          if (g.name.toUpperCase() === key) { found = g; break; }
        }
        if (found) {
          found.subscriptions.push(sub);
          found.raw_rows++;
        } else {
          const g: ClientGroup = {
            name, mobile: null, gender, joining_date: earliest_start,
            trainer_name: trainer, subscriptions: [sub],
            needs_review: true, review_reason: 'No phone number — matched by name only',
            raw_rows: 1,
          };
          byName.set(key, g);
          noKey.push(g);
        }
      } else {
        const g: ClientGroup = {
          name, mobile: null, gender, joining_date: earliest_start,
          trainer_name: trainer, subscriptions: [sub],
          needs_review: true, review_reason: 'No phone number — matched by name only',
          raw_rows: 1,
        };
        byName.set(key, g);
        noKey.push(g);
      }
    }
  }

  const all = [...byPhone.values(), ...noKey];
  // Sort subscriptions by start_date within each group
  for (const g of all) {
    g.subscriptions.sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
  }
  return all;
}

// ── Helpers ────────────────────────────────────────────────────────────
const sz = (b: number) => b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';
const glass = {
  background: '#fff',
  border: '1px solid rgba(0,0,0,0.07)',
  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
};

// ── Main page ───────────────────────────────────────────────────────────
type Step = 'upload' | 'preview' | 'done';

export default function ImportDatabasePage() {
  const [step, setStep]           = useState<Step>('upload');
  const [file, setFile]           = useState<File | null>(null);
  const [dragOver, setDragOver]   = useState(false);
  const [parseError, setParseError] = useState('');
  const [groups, setGroups]       = useState<ClientGroup[]>([]);
  const [rawTotal, setRawTotal]   = useState(0);
  const [loading, setLoading]     = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [expandedIdx, setExpandedIdx]   = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Parse CSV client-side → preview ──────────────────────────────────
  const handleAnalyse = async () => {
    if (!file) return;
    setParseError('');
    setLoading(true);
    try {
      const text = await file.text();
      const rawRows = parseCsvText(text).filter(r => Object.values(r).some(v => v));
      if (!rawRows.length) { setParseError('File is empty or could not be parsed.'); setLoading(false); return; }
      setRawTotal(rawRows.length);
      const grouped = groupRows(rawRows);
      if (!grouped.length) { setParseError('No valid client rows found.'); setLoading(false); return; }
      setGroups(grouped);
      setStep('preview');
    } catch (e: any) {
      setParseError(e?.message || 'Failed to parse file.');
    } finally {
      setLoading(false);
    }
  };

  // ── Confirm → backend ─────────────────────────────────────────────────
  const handleConfirmImport = async () => {
    setLoading(true);
    try {
      const result = await api.admin.smartImport(groups as any);
      setImportResult(result);
      setStep('done');
    } catch (e: any) {
      setParseError(e?.message || 'Import failed.');
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setStep('upload'); setFile(null); setGroups([]); setRawTotal(0);
    setImportResult(null); setParseError(''); setExpandedIdx(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const totalSubs    = groups.reduce((s, g) => s + g.subscriptions.length, 0);
  const mergedCount  = rawTotal - groups.length;
  const reviewCount  = groups.filter(g => g.needs_review).length;
  const totalRevenue = groups.reduce((s, g) =>
    s + g.subscriptions.reduce((ss, sub) => ss + sub.selling_price, 0), 0);

  return (
    <Guard role="admin">
      <AppShell>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ── Hero ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              position: 'relative', overflow: 'hidden',
              borderRadius: 24, padding: '28px 32px',
              display: 'flex', alignItems: 'center', gap: 20,
              background: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 40%, #99f6e4 100%)',
              border: '1px solid rgba(13,148,136,0.2)',
              boxShadow: '0 4px 24px rgba(13,148,136,0.12)',
            }}
          >
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #0d9488, #14b8a6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(13,148,136,0.3)', flexShrink: 0 }}>
              <DatabaseBackup size={24} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: '#134e4a', margin: 0 }}>Smart Import — PT Clients</h1>
              <p style={{ fontSize: 13, color: '#4b5563', marginTop: 3 }}>
                Detects duplicates · merges subscriptions · creates one profile per person
              </p>
            </div>
            {/* Step indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {(['upload','preview','done'] as Step[]).map((s, i) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                    background: step === s ? '#14b8a6' : ((['upload','preview','done'].indexOf(step) > i) ? 'rgba(20,184,166,0.4)' : 'rgba(0,0,0,0.08)'),
                    color: step === s ? '#fff' : '#6b7280',
                    border: step === s ? '2px solid rgba(255,255,255,0.5)' : '2px solid transparent',
                  }}>{i + 1}</div>
                  {i < 2 && <div style={{ width: 24, height: 1, background: 'rgba(0,0,0,0.15)' }} />}
                </div>
              ))}
            </div>
          </motion.div>

          <AnimatePresence mode="wait">

            {/* ═══════════════ STEP 1: UPLOAD ═══════════════ */}
            {step === 'upload' && (
              <motion.div key="upload" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, alignItems: 'start' }}>

                <div style={{ borderRadius: 24, padding: 28, ...glass }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 20px' }}>Upload your CSV file</h2>

                  {/* Drop zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) setFile(f); setDragOver(false); }}
                    onClick={() => fileRef.current?.click()}
                    style={{
                      borderRadius: 20, padding: '44px 24px', textAlign: 'center',
                      border: `2px dashed ${dragOver ? 'rgba(13,148,136,0.6)' : 'rgba(0,0,0,0.12)'}`,
                      background: dragOver ? 'rgba(13,148,136,0.05)' : 'rgba(0,0,0,0.02)',
                      cursor: 'pointer', transition: 'all 0.25s ease',
                    }}
                  >
                    <UploadCloud size={36} color={dragOver ? '#14b8a6' : '#9ca3af'} />
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#374151', margin: '12px 0 2px' }}>
                      {dragOver ? 'Drop here' : 'Click or drag your CSV file here'}
                    </p>
                    <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>.csv only</p>
                  </div>
                  <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
                    onChange={(e) => { setFile(e.target.files?.[0] || null); setParseError(''); }} />

                  {/* File chip */}
                  {file && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, padding: '12px 16px', background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.25)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <FileSpreadsheet size={18} color="#14b8a6" />
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{file.name}</p>
                          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{sz(file.size)}</p>
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                        style={{ background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: 8, padding: 5, cursor: 'pointer', color: '#6b7280', display: 'flex' }}>
                        <X size={14} />
                      </button>
                    </motion.div>
                  )}

                  {parseError && (
                    <div style={{ marginTop: 14, borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 13, color: '#fca5a5' }}>
                      <AlertCircle size={15} /> {parseError}
                    </div>
                  )}

                  <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                    <button onClick={handleAnalyse} disabled={!file || loading}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        borderRadius: 14, padding: '12px 24px',
                        background: (!file || loading) ? 'rgba(13,148,136,0.3)' : 'linear-gradient(135deg, #0d9488, #14b8a6)',
                        border: 'none', fontSize: 13, fontWeight: 600, color: '#fff',
                        cursor: (!file || loading) ? 'not-allowed' : 'pointer',
                        boxShadow: (!file || loading) ? 'none' : '0 4px 16px rgba(13,148,136,0.3)',
                      }}>
                      {loading ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />}
                      {loading ? 'Analysing...' : 'Analyse & Preview'}
                    </button>
                  </div>
                </div>

                {/* Info panel */}
                <div style={{ borderRadius: 24, padding: 28, ...glass }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(13,148,136,0.10)' }}>
                    <Sparkles size={20} color="#14b8a6" />
                  </div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '16px 0 6px' }}>How smart import works</h2>
                  {[
                    ['1. Scan', 'Reads every row in your CSV'],
                    ['2. Group', 'Groups rows by phone number (primary) or full name (fallback)'],
                    ['3. Merge', 'Turns duplicate rows into subscription history entries'],
                    ['4. Preview', 'Shows you exactly what will be created — before anything is saved'],
                    ['5. Import', 'Creates ONE client profile per person with full PT history'],
                  ].map(([t, d]) => (
                    <div key={t} style={{ marginTop: 14, display: 'flex', gap: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#14b8a6', minWidth: 60, paddingTop: 2 }}>{t}</div>
                      <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{d}</div>
                    </div>
                  ))}
                  <div style={{ marginTop: 18, borderRadius: 10, padding: '10px 13px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <AlertTriangle size={13} color="#fbbf24" style={{ marginTop: 1, flexShrink: 0 }} />
                    <p style={{ fontSize: 11.5, color: '#6b7280', lineHeight: 1.5, margin: 0 }}>
                      Required columns: <strong style={{ color: '#fbbf24' }}>Full Name, Phone Number, Trainer, Subscription Plan, Start Date, Duration Months, Selling Price, Amount Paid, Gender</strong>
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═══════════════ STEP 2: PREVIEW ═══════════════ */}
            {step === 'preview' && (
              <motion.div key="preview" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Stats bar */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                  {[
                    { icon: <FileSpreadsheet size={20} color="#14b8a6" />, label: 'Total CSV Rows', value: rawTotal, color: '#14b8a6' },
                    { icon: <Users size={20} color="#60a5fa" />, label: 'Unique Clients', value: groups.length, color: '#60a5fa' },
                    { icon: <GitMerge size={20} color="#a78bfa" />, label: 'Duplicates Merged', value: mergedCount, color: '#a78bfa' },
                    { icon: <ClipboardList size={20} color="#34d399" />, label: 'PT History Records', value: totalSubs, color: '#34d399' },
                  ].map(({ icon, label, value, color }) => (
                    <div key={label} style={{ borderRadius: 20, padding: '20px 24px', ...glass }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                        {icon}
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: '-0.02em' }}>{value}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* Review warning */}
                {reviewCount > 0 && (
                  <div style={{ borderRadius: 16, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', fontSize: 13, color: '#fbbf24' }}>
                    <AlertTriangle size={16} />
                    <span><strong>{reviewCount} client{reviewCount > 1 ? 's' : ''}</strong> flagged for review (no phone or name conflict). Check them below before confirming.</span>
                  </div>
                )}

                {/* Error notice */}
                {parseError && (
                  <div style={{ borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 13, color: '#fca5a5' }}>
                    <AlertCircle size={15} /> {parseError}
                  </div>
                )}

                {/* Client list */}
                <div style={{ borderRadius: 24, overflow: 'hidden', ...glass }}>
                  <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>
                      {groups.length} unique clients · {totalSubs} subscriptions · {fmt(totalRevenue)} total revenue
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>
                      Click a client row to expand subscription history
                    </p>
                  </div>
                  <div style={{ maxHeight: 480, overflowY: 'auto' }}>
                    {groups.map((g, idx) => (
                      <div key={idx} style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                        <div
                          onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                          style={{
                            display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 80px 80px 40px',
                            alignItems: 'center', gap: 12, padding: '14px 24px', cursor: 'pointer',
                            background: g.needs_review ? 'rgba(245,158,11,0.04)' : 'transparent',
                            transition: 'background 0.15s',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {g.needs_review && <AlertTriangle size={13} color="#fbbf24" style={{ flexShrink: 0 }} />}
                            <div>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>{g.name}</p>
                              <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>
                                {g.mobile || <span style={{ color: '#fbbf24' }}>No phone</span>}
                                {g.needs_review && <span style={{ marginLeft: 6, color: '#fbbf24', fontSize: 10 }}>· {g.review_reason}</span>}
                              </p>
                            </div>
                          </div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>{g.trainer_name || '—'}</div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>
                            {fmt(g.subscriptions.reduce((s, sub) => s + sub.selling_price, 0))}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa' }}>{g.subscriptions.length}</span>
                            <span style={{ fontSize: 11, color: '#9ca3af' }}>plans</span>
                          </div>
                          <div>
                            <span style={{
                              fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
                              background: g.subscriptions.some(s => s.status === 'active') ? 'rgba(52,211,153,0.15)' : 'rgba(100,116,139,0.15)',
                              color: g.subscriptions.some(s => s.status === 'active') ? '#34d399' : '#94a3b8',
                            }}>
                              {g.subscriptions.some(s => s.status === 'active') ? 'Active' : 'Expired'}
                            </span>
                          </div>
                          <div style={{ color: '#9ca3af' }}>
                            {expandedIdx === idx ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </div>
                        </div>

                        {/* Expanded subscriptions */}
                        <AnimatePresence>
                          {expandedIdx === idx && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                              style={{ overflow: 'hidden', background: 'rgba(0,0,0,0.02)' }}
                            >
                              <div style={{ padding: '8px 24px 14px 48px' }}>
                                <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
                                  PT History ({g.subscriptions.length} subscription{g.subscriptions.length > 1 ? 's' : ''})
                                </p>
                                {g.subscriptions.map((sub, si) => (
                                  <div key={si} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 0.8fr 0.8fr 0.8fr 80px', gap: 12, padding: '7px 0', borderBottom: si < g.subscriptions.length - 1 ? '1px solid rgba(0,0,0,0.07)' : 'none', alignItems: 'center' }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{sub.plan_name || '—'}</div>
                                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{fmtDate(sub.start_date)}</div>
                                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{sub.end_date ? fmtDate(sub.end_date) : `${sub.duration_months}m`}</div>
                                    <div style={{ fontSize: 12, color: '#0d9488' }}>{fmt(sub.selling_price)}</div>
                                    <div style={{ fontSize: 12, color: '#34d399' }}>{fmt(sub.amount_paid)}</div>
                                    <div style={{ fontSize: 12, color: sub.balance_amount > 0 ? '#f87171' : '#94a3b8' }}>
                                      {sub.balance_amount > 0 ? `${fmt(sub.balance_amount)} due` : 'Paid'}
                                    </div>
                                    <span style={{
                                      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, textAlign: 'center',
                                      background: sub.status === 'active' ? 'rgba(52,211,153,0.12)' : 'rgba(100,116,139,0.12)',
                                      color: sub.status === 'active' ? '#34d399' : '#64748b',
                                    }}>{sub.status}</span>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button onClick={handleConfirmImport} disabled={loading}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      borderRadius: 14, padding: '13px 28px',
                      background: loading ? 'rgba(13,148,136,0.3)' : 'linear-gradient(135deg, #0d9488, #14b8a6)',
                      border: 'none', fontSize: 14, fontWeight: 700, color: '#fff',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      boxShadow: loading ? 'none' : '0 4px 20px rgba(13,148,136,0.35)',
                    }}>
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                    {loading ? 'Importing...' : `Confirm & Import ${groups.length} Clients`}
                  </button>
                  <button onClick={resetAll} disabled={loading}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 14, padding: '13px 20px', background: '#f9fafb', border: '1px solid rgba(0,0,0,0.1)', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                    <X size={14} /> Cancel
                  </button>
                </div>
              </motion.div>
            )}

            {/* ═══════════════ STEP 3: DONE ═══════════════ */}
            {step === 'done' && importResult && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Success banner */}
                <div style={{ borderRadius: 24, padding: '32px 36px', background: '#f0fdf9', border: '1px solid rgba(13,148,136,0.2)', display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(52,211,153,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckCircle2 size={28} color="#34d399" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>Import complete!</h2>
                    <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                      All client data has been saved to the database.
                    </p>
                  </div>
                </div>

                {/* Report cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                  {[
                    { label: 'Clients Created', value: importResult.clients_created, color: '#60a5fa' },
                    { label: 'Clients Updated', value: importResult.clients_updated, color: '#a78bfa' },
                    { label: 'PT History Records', value: importResult.subscriptions_created, color: '#34d399' },
                    { label: 'For Review', value: importResult.review?.length ?? 0, color: '#fbbf24' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ borderRadius: 20, padding: '24px', ...glass, textAlign: 'center' }}>
                      <div style={{ fontSize: 36, fontWeight: 800, color, letterSpacing: '-0.02em' }}>{value}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* Review list */}
                {importResult.review?.length > 0 && (
                  <div style={{ borderRadius: 20, padding: '20px 24px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertTriangle size={15} /> Clients flagged for manual review
                    </p>
                    {importResult.review.map((r: any, i: number) => (
                      <div key={i} style={{ fontSize: 12, color: '#374151', padding: '6px 0', borderBottom: i < importResult.review.length - 1 ? '1px solid rgba(0,0,0,0.07)' : 'none' }}>
                        <strong style={{ color: '#111827' }}>{r.name}</strong>
                        {r.mobile && <span style={{ color: '#9ca3af', marginLeft: 8 }}>{r.mobile}</span>}
                        <span style={{ marginLeft: 8, color: '#fbbf24' }}>· {r.reason}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Errors */}
                {importResult.errors?.length > 0 && (
                  <div style={{ borderRadius: 20, padding: '20px 24px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#f87171', margin: '0 0 10px' }}>Import errors ({importResult.errors.length})</p>
                    {importResult.errors.map((e: any, i: number) => (
                      <div key={i} style={{ fontSize: 12, color: '#fca5a5', padding: '4px 0' }}>
                        <strong>{e.name}</strong>: {e.issue}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12 }}>
                  <Link href="/pt-os/clients"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 14, padding: '12px 24px', background: 'linear-gradient(135deg, #0d9488, #14b8a6)', border: 'none', fontSize: 13, fontWeight: 700, color: '#fff', textDecoration: 'none', boxShadow: '0 4px 16px rgba(13,148,136,0.3)' }}>
                    <Users size={15} /> View All Clients
                  </Link>
                  <button onClick={resetAll}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 14, padding: '12px 20px', background: '#f9fafb', border: '1px solid rgba(0,0,0,0.1)', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                    <UploadCloud size={14} /> Import Another File
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </AppShell>
    </Guard>
  );
}
