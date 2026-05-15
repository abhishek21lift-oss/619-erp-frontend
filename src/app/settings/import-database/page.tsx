
'use client';

import { useState } from 'react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { DatabaseBackup, Download, FileSpreadsheet, UploadCloud } from 'lucide-react';

export default function ImportDatabasePage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleImport = async () => {
    setError('');
    setSuccess('');
    if (!file) {
      setError('Please select an Excel file first.');
      return;
    }
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
      const input = document.getElementById('db-import-file') as HTMLInputElement | null;
      if (input) input.value = '';
    } catch (err: any) {
      setError(err?.message || 'Failed to import database file.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Guard role="admin">
      <AppShell>
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[var(--brand-soft)] text-[var(--brand)]">
                <DatabaseBackup size={26} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Import Database</h1>
                <p className="mt-2 text-sm text-[var(--text-muted)]">Upload an external Excel sheet and import data into the web app database.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
              <label htmlFor="db-import-file" className="mb-3 block text-sm font-semibold text-[var(--text-secondary)]">Choose Excel or CSV file</label>
              <label htmlFor="db-import-file" className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-[var(--border)] bg-[var(--bg-subtle)] px-6 py-10 text-center transition hover:border-[var(--brand)] hover:bg-white">
                <UploadCloud size={32} className="text-[var(--brand)]" />
                <span className="mt-4 text-base font-semibold text-[var(--text-primary)]">Click to select a file</span>
                <span className="mt-1 text-sm text-[var(--text-muted)]">Supported formats: .xlsx, .xls, .csv</span>
                {file && <span className="mt-4 rounded-full bg-[var(--brand-soft)] px-4 py-2 text-sm font-medium text-[var(--brand)]">{file.name}</span>}
              </label>
              <input id="db-import-file" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />

              {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</div>}
              {success && <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{success}</div>}

              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={handleImport} disabled={loading} className="inline-flex items-center justify-center rounded-2xl bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-brand)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60">
                  {loading ? 'Importing...' : 'Import Database'}
                </button>
                <a href="/templates/import-database-template.csv" download className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-subtle)]">
                  <Download size={16} />
                  Download Template
                </a>
              </div>
            </div>

            <div className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
                <FileSpreadsheet size={22} />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">Import notes</h2>
              <ul className="mt-4 space-y-3 text-sm text-[var(--text-muted)]">
                <li>- Use Excel or CSV file exported from another software.</li>
                <li>- Keep column names clean and structured before upload.</li>
                <li>- Recommended for admin-only migration or bulk setup.</li>
                <li>- Download the sample template before preparing your data.</li>
                <li>- Backend endpoint required: /api/admin/import-database</li>
              </ul>
            </div>
          </div>
        </div>
      </AppShell>
    </Guard>
  );
}
