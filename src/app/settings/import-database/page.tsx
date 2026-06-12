'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { DatabaseBackup, Download, FileSpreadsheet, UploadCloud, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const sz = (b: number) => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const glass = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' };

export default function ImportDatabasePage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleImport = async () => {
    setError('');
    setSuccess('');
    if (!file) { setError('Please select a file first.'); return; }
    const lower = file.name.toLowerCase();
    if (!(lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv'))) {
      setError('Only .xlsx, .xls, or .csv files are allowed.');
      return;
    }
    setLoading(true);
    try {
      const res: any = await api.admin.importDatabase(file);
      setSuccess(res?.message || 'Database import completed successfully.');
      setFile(null);
      const inp = document.getElementById('dbf') as HTMLInputElement | null;
      if (inp) inp.value = '';
    } catch (err: any) {
      setError(err?.message || 'Failed to import database file.');
    } finally {
      setLoading(false);
    }
  };

  const downloadSampleTemplate = useCallback(() => {
    const headers = ['name', 'email', 'mobile', 'gender', 'dob', 'address', 'weight', 'notes'];
    const rows = [
      ['John Doe', 'john@example.com', '9876543210', 'Male', '1995-06-15', '123 Main St, City', '75', 'Regular member'],
      ['Jane Smith', 'jane@example.com', '9876543211', 'Female', '1998-12-20', '456 Oak Ave, Town', '62', 'New joinee'],
    ];
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import-database-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }, []);

  const clearFile = () => {
    setFile(null);
    const inp = document.getElementById('dbf') as HTMLInputElement | null;
    if (inp) inp.value = '';
  };

  const [dragOver, setDragOver] = useState(false);

  return (
    <Guard role="admin">
      <AppShell>
        <div style={{ maxWidth: 1024, margin: '0 auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* ── Hero ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              position: 'relative', overflow: 'hidden',
              borderRadius: 24, padding: '32px 36px',
              display: 'flex', alignItems: 'center', gap: 20,
              background: 'linear-gradient(135deg, #0a0f1a 0%, #042f2e 25%, #0d9488 50%, #042f2e 75%, #0a0f1a 100%)',
              border: '1px solid rgba(13,148,136,0.15)',
              boxShadow: '0 25px 60px -12px rgba(4,47,46,0.6)',
            }}
          >
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 20% 40%, rgba(13,148,136,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 60%, rgba(20,184,166,0.08) 0%, transparent 50%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: -80, right: -40, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(13,148,136,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -60, left: -20, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,184,166,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255,255,255,0.015) 1px, rgba(255,255,255,0.015) 2px), repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(255,255,255,0.015) 1px, rgba(255,255,255,0.015) 2px)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1, width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #0d9488, #14b8a6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(13,148,136,0.3)' }}>
              <DatabaseBackup size={26} color="#fff" />
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', margin: 0 }}>Import Database</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>Bulk import client &amp; member data from Excel or CSV</p>
            </div>
          </motion.div>

          {/* ── Main grid ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.9fr', gap: 24, alignItems: 'start' }}>
            <motion.div variants={containerVariants} initial="hidden" animate="show">
              <motion.div variants={itemVariants}
                style={{
                  borderRadius: 24, padding: 28,
                  ...glass,
                }}
              >
                {/* ── Drop zone ── */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { handleDrop(e); setDragOver(false); }}
                  onClick={() => document.getElementById('dbf')?.click()}
                  style={{
                    borderRadius: 20, padding: '44px 24px', textAlign: 'center',
                    border: `2px dashed ${dragOver ? 'rgba(13,148,136,0.5)' : 'rgba(255,255,255,0.12)'}`,
                    background: dragOver ? 'rgba(13,148,136,0.08)' : 'rgba(255,255,255,0.02)',
                    cursor: 'pointer', transition: 'all 0.25s ease',
                    boxShadow: dragOver ? '0 0 40px rgba(13,148,136,0.08)' : 'none',
                  }}
                >
                  <motion.div animate={{ scale: dragOver ? 1.1 : 1 }} transition={{ duration: 0.2 }}>
                    <UploadCloud size={36} color={dragOver ? '#14b8a6' : 'rgba(255,255,255,0.4)'} />
                  </motion.div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', margin: '12px 0 2px' }}>{dragOver ? 'Drop your file here' : 'Click or drag file here'}</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>.xlsx &middot; .xls &middot; .csv</p>
                </div>
                <input id="dbf" type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={(e) => setFile(e.target.files?.[0] || null)} />

                {/* ── File info ── */}
                {file && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    style={{
                      marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      borderRadius: 16, padding: '14px 18px',
                      background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.2)',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <FileSpreadsheet size={20} color="#14b8a6" />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', margin: 0 }}>{file.name}</p>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{sz(file.size)}</p>
                      </div>
                    </div>
                    <button onClick={clearFile}
                      style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 10, padding: 6, cursor: 'pointer', display: 'flex', lineHeight: 0, color: 'rgba(255,255,255,0.5)' }}>
                      <X size={14} />
                    </button>
                  </motion.div>
                )}

                {/* ── Error ── */}
                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ marginTop: 16, borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 13, fontWeight: 500, color: '#fca5a5' }}>
                    <AlertCircle size={16} />
                    {error}
                  </motion.div>
                )}

                {/* ── Success ── */}
                {success && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ marginTop: 16, borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)', fontSize: 13, fontWeight: 500, color: '#5eead4' }}>
                    <CheckCircle2 size={16} />
                    {success}
                  </motion.div>
                )}

                {/* ── Buttons ── */}
                <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  <button onClick={handleImport} disabled={loading}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      borderRadius: 16, padding: '12px 24px',
                      background: loading ? 'rgba(13,148,136,0.3)' : 'linear-gradient(135deg, #0d9488, #14b8a6)',
                      border: 'none', fontSize: 13, fontWeight: 600, color: '#fff',
                      cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                      boxShadow: loading ? 'none' : '0 4px 16px rgba(13,148,136,0.3)',
                    }}>
                    {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <UploadCloud size={16} />}
                    {loading ? 'Importing...' : 'Import Database'}
                  </button>
                  <button onClick={downloadSampleTemplate}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      borderRadius: 16, padding: '12px 24px',
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                      fontSize: 13, fontWeight: 600, color: '#e2e8f0', cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}>
                    <Download size={15} color="#14b8a6" />
                    Download Sample Template
                  </button>
                </div>
              </motion.div>
            </motion.div>

            {/* ── Info card ── */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
              style={{
                borderRadius: 24, padding: 28,
                ...glass,
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(13,148,136,0.12)',
              }}>
                <FileSpreadsheet size={22} color="#14b8a6" />
              </div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#e2e8f0', margin: '16px 0 0' }}>Import notes</h2>
              <ul style={{
                marginTop: 16, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 10,
                fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6,
              }}>
                <li>Use Excel or CSV file exported from another software.</li>
                <li>Keep column names clean and structured before upload.</li>
                <li>Recommended for admin-only migration or bulk setup.</li>
                <li>Download the sample template before preparing your data.</li>
                <li>Backend endpoint used: /api/import/import-excel</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </AppShell>
    </Guard>
  );
}
