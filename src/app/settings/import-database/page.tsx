'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { DatabaseBackup, Download, FileSpreadsheet, UploadCloud, X } from 'lucide-react';

const sz = (b: number) => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';

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
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{
              background: 'linear-gradient(135deg, #0f172a, #1e293b)',
              borderRadius: 24, padding: '28px 32px',
              display: 'flex', alignItems: 'center', gap: 20,
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(129,140,248,0.15)',
            }}>
              <DatabaseBackup size={26} color="#818cf8" />
            </div>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', margin: 0 }}>Import Database</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 4, margin: 0 }}>Bulk import client &amp; member data from Excel or CSV</p>
            </div>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.9fr', gap: 24, alignItems: 'start' }}>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
              style={{
                borderRadius: 24, padding: 24,
                background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { handleDrop(e); setDragOver(false); }}
                onClick={() => document.getElementById('dbf')?.click()}
                style={{
                  borderRadius: 20, padding: '40px 24px', textAlign: 'center',
                  border: `2px dashed ${dragOver ? 'rgba(129,140,248,0.6)' : 'rgba(255,255,255,0.12)'}`,
                  background: dragOver ? 'rgba(129,140,248,0.06)' : 'rgba(255,255,255,0.02)',
                  cursor: 'pointer', transition: 'all 0.2s ease',
                }}
              >
                <UploadCloud size={34} color="#818cf8" />
                <p style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', margin: '12px 0 2px' }}>Click or drag file here</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>.xlsx &middot; .xls &middot; .csv</p>
              </div>
              <input id="dbf" type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={(e) => setFile(e.target.files?.[0] || null)} />

              {file && (
                <div style={{
                  marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  borderRadius: 16, padding: '12px 16px',
                  background: 'rgba(129,140,248,0.08)', border: '1px solid rgba(129,140,248,0.18)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FileSpreadsheet size={18} color="#818cf8" />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', margin: 0 }}>{file.name}</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{sz(file.size)}</p>
                    </div>
                  </div>
                  <button onClick={clearFile}
                    style={{
                      background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 10,
                      padding: 6, cursor: 'pointer', display: 'flex', lineHeight: 0,
                    }}>
                    <X size={14} color="#94a3b8" />
                  </button>
                </div>
              )}

              {error && (
                <div style={{
                  marginTop: 16, borderRadius: 14, padding: '12px 16px',
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                  fontSize: 13, fontWeight: 500, color: '#fca5a5',
                }}>{error}</div>
              )}
              {success && (
                <div style={{
                  marginTop: 16, borderRadius: 14, padding: '12px 16px',
                  background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                  fontSize: 13, fontWeight: 500, color: '#86efac',
                }}>{success}</div>
              )}

              <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <button onClick={handleImport} disabled={loading}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    borderRadius: 16, padding: '12px 24px',
                    background: loading ? 'rgba(99,102,241,0.5)' : '#6366f1',
                    border: 'none', fontSize: 13, fontWeight: 600, color: '#fff',
                    cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                  }}>
                  {loading ? 'Importing...' : 'Import Database'}
                </button>
                <button onClick={downloadSampleTemplate}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    borderRadius: 16, padding: '12px 24px',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    fontSize: 13, fontWeight: 600, color: '#e2e8f0', cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}>
                  <Download size={15} color="#94a3b8" />
                  Download Sample Template
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
              style={{
                borderRadius: 24, padding: 24,
                background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(129,140,248,0.12)',
              }}>
                <FileSpreadsheet size={22} color="#818cf8" />
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
