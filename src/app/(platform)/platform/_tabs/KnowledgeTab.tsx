'use client';

// The shared MPTS methodology corpus.
//
// This is the one knowledge base that is not a studio's own: an approved
// document here grounds AI workout and diet generation for every studio, added
// to whatever that studio has uploaded itself. Two independent gates decide
// whether a document is live — ingestion (`status`) and review
// (`approval_status`) — so both are shown, and Approve stays disabled until
// ingestion has finished.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, BookOpen, CheckCircle2, FileText, Loader2, RefreshCw, Trash2, Upload, X,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { PlatformKnowledgeDocument } from '@/lib/api/endpoints/platform';
import { useToast } from '@/lib/toast';
import { errorMessage } from '@/lib/forms/errors';
import { acceptAttribute, checkFile, formatBytes, KNOWLEDGE_RULES } from '@/lib/forms/files';

const CATEGORIES: { value: PlatformKnowledgeDocument['category']; label: string }[] = [
  { value: 'sop', label: 'SOP' },
  { value: 'guide', label: 'Guide' },
  { value: 'policy', label: 'Policy' },
];

const INGESTION: Record<PlatformKnowledgeDocument['status'], { label: string; fg: string; bg: string; icon: typeof CheckCircle2 }> = {
  ready: { label: 'Ready', fg: '#059669', bg: 'rgba(16,185,129,0.12)', icon: CheckCircle2 },
  processing: { label: 'Processing', fg: '#A33757', bg: 'rgba(163,55,87,0.10)', icon: Loader2 },
  failed: { label: 'Failed', fg: '#DC2626', bg: 'rgba(220,38,38,0.10)', icon: AlertTriangle },
};

const APPROVAL: Record<PlatformKnowledgeDocument['approval_status'], { label: string; fg: string; bg: string }> = {
  approved: { label: 'Approved', fg: '#059669', bg: 'rgba(16,185,129,0.12)' },
  pending: { label: 'Pending review', fg: '#D97706', bg: 'rgba(245,158,11,0.14)' },
  revoked: { label: 'Revoked', fg: '#64748B', bg: 'rgba(100,116,139,0.12)' },
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function KnowledgeTab() {
  const { toast } = useToast();
  const [docs, setDocs] = useState<PlatformKnowledgeDocument[]>([]);
  const [corpusVersion, setCorpusVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [sourceVersion, setSourceVersion] = useState('');
  const [category, setCategory] = useState<PlatformKnowledgeDocument['category']>('sop');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await api.superAdmin.knowledge.list();
      setDocs(res.data ?? []);
      setCorpusVersion(res.corpus_version ?? null);
    } catch (err) {
      // A polling refresh must not replace the last good list with an error
      // toast every four seconds; only a user-initiated load reports failure.
      if (!quiet) toast.error(errorMessage(err, 'Could not load the MPTS corpus.'));
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  // Ingestion runs in the background. Refresh while anything is processing so
  // the Approve button appears without the operator reloading the page.
  const hasProcessing = docs.some((d) => d.status === 'processing');
  useEffect(() => {
    if (!hasProcessing) return;
    const interval = setInterval(() => { void load(true); }, 4000);
    return () => clearInterval(interval);
  }, [hasProcessing, load]);

  const resetForm = useCallback(() => {
    setTitle('');
    setSourceVersion('');
    setCategory('sop');
    setFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const pickFile = async (picked: File | null) => {
    setFileError(null);
    if (!picked) { setFile(null); return; }

    const check = await checkFile(picked, KNOWLEDGE_RULES);
    if (!check.ok) {
      setFile(null);
      setFileError(check.message);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setFile(picked);
  };

  const run = useCallback(async (id: string, action: () => Promise<unknown>, success: string) => {
    setBusyId(id);
    try {
      await action();
      toast.success(success);
      await load(true);
    } catch (err) {
      toast.error(errorMessage(err, 'That action could not be completed.'));
    } finally {
      setBusyId(null);
    }
  }, [load, toast]);

  const handleUpload = async () => {
    if (!file) { toast.error('Choose a PDF or text file to upload.'); return; }
    setUploading(true);
    try {
      await api.superAdmin.knowledge.upload(
        file,
        title.trim() || file.name,
        category,
        sourceVersion.trim() || undefined,
      );
      toast.success('Uploaded — indexing in the background. Approve it once ingestion is ready.');
      setUploadOpen(false);
      resetForm();
      await load(true);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to upload the document.'));
    } finally {
      setUploading(false);
    }
  };

  const approveDoc = (doc: PlatformKnowledgeDocument) =>
    void run(doc.id, () => api.superAdmin.knowledge.approve(doc.id), `"${doc.title}" is now live for every studio.`);

  const revokeDoc = (doc: PlatformKnowledgeDocument) => {
    if (!window.confirm(`Stop using "${doc.title}" for every studio's AI generation?`)) return;
    void run(doc.id, () => api.superAdmin.knowledge.revoke(doc.id), `"${doc.title}" is no longer used by AI.`);
  };

  const reindexDoc = (doc: PlatformKnowledgeDocument) =>
    void run(
      doc.id,
      () => api.superAdmin.knowledge.reindex(doc.id),
      'Reindexing started. If it was approved, approve it again once ingestion finishes.',
    );

  const deleteDoc = (doc: PlatformKnowledgeDocument) => {
    if (!window.confirm(`Delete "${doc.title}" permanently, including its indexed chunks?`)) return;
    void run(doc.id, () => api.superAdmin.knowledge.delete(doc.id), 'Corpus document deleted.');
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="flex h-11 items-center rounded-full px-3.5 text-[11px] font-[750] tabular-nums"
          style={{ background: 'var(--bg-subtle)', color: '#64748B' }}>
          Corpus {corpusVersion ?? '—'}
        </span>
        <button type="button" onClick={() => setUploadOpen((open) => !open)}
          className="flex h-11 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-[750] text-white transition active:scale-[0.98]"
          style={{ background: '#0F172A' }}>
          <Upload size={14} /> Upload document
        </button>
        <button type="button" onClick={() => void load()} aria-label="Refresh corpus"
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-full"
          style={{ background: 'var(--bg-subtle)', color: '#64748B' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {uploadOpen && (
        <div className="mb-4 rounded-[16px] p-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
          <div className="flex items-center justify-between">
            <p className="text-[13.5px] font-[780]" style={{ color: 'var(--text-primary)' }}>
              Upload a corpus document
            </p>
            <button type="button" onClick={() => { setUploadOpen(false); resetForm(); }}
              aria-label="Close upload form"
              className="flex h-8 w-8 items-center justify-center rounded-[9px]"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
              <X size={14} />
            </button>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="mpts-title" className="mb-1.5 block text-[11px] font-[700]"
                style={{ color: 'var(--text-muted)' }}>Title</label>
              <input id="mpts-title" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. MPTS Training Methodology"
                className="w-full rounded-[10px] px-3 py-2 text-[13px]"
                style={{ border: '1.5px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label htmlFor="mpts-source-version" className="mb-1.5 block text-[11px] font-[700]"
                style={{ color: 'var(--text-muted)' }}>Source version (optional)</label>
              <input id="mpts-source-version" value={sourceVersion} onChange={(e) => setSourceVersion(e.target.value)}
                placeholder="e.g. 2026.1"
                className="w-full rounded-[10px] px-3 py-2 text-[13px]"
                style={{ border: '1.5px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-primary)' }} />
            </div>
          </div>

          <div className="mt-3">
            <span id="mpts-category-label" className="mb-1.5 block text-[11px] font-[700]"
              style={{ color: 'var(--text-muted)' }}>Category</span>
            <div role="group" aria-labelledby="mpts-category-label" className="flex gap-1.5">
              {CATEGORIES.map((c) => (
                <button key={c.value} type="button" onClick={() => setCategory(c.value)}
                  aria-pressed={category === c.value}
                  className="rounded-[9px] px-3 py-2 text-[12px] font-[750] transition"
                  style={category === c.value
                    ? { border: '1.5px solid #A33757', background: 'rgba(163,55,87,0.10)', color: '#A33757' }
                    : { border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-muted)' }}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <label htmlFor="mpts-file" className="mb-1.5 block text-[11px] font-[700]"
              style={{ color: 'var(--text-muted)' }}>
              File (PDF or .txt, up to {formatBytes(KNOWLEDGE_RULES.maxBytes)})
            </label>
            <input id="mpts-file" ref={fileInputRef} type="file" accept={acceptAttribute(KNOWLEDGE_RULES)}
              aria-describedby={fileError ? 'mpts-file-error' : undefined}
              aria-invalid={fileError ? true : undefined}
              onChange={(e) => void pickFile(e.target.files?.[0] ?? null)}
              className="w-full text-[12.5px]" style={{ color: 'var(--text-primary)' }} />
            {file && <p className="mt-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{file.name}</p>}
            {fileError && (
              <p id="mpts-file-error" role="alert" className="mt-1.5 text-[11.5px] font-[600]"
                style={{ color: 'var(--danger-text)' }}>{fileError}</p>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => { setUploadOpen(false); resetForm(); }}
              className="flex h-10 items-center rounded-[10px] px-3.5 text-[12.5px] font-[750]"
              style={{ background: 'var(--bg-subtle)', color: '#64748B' }}>
              Cancel
            </button>
            <button type="button" onClick={() => void handleUpload()} disabled={!file || uploading}
              className="flex h-10 items-center gap-1.5 rounded-[10px] px-3.5 text-[12.5px] font-[750] text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#A33757,#852E4E)' }}>
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Upload
            </button>
          </div>
        </div>
      )}

      {loading && docs.length === 0 && (
        <p className="py-10 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>Loading corpus…</p>
      )}

      {!loading && docs.length === 0 && (
        <div className="rounded-[18px] p-10 text-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <BookOpen size={22} className="mx-auto" style={{ color: '#94A3B8' }} />
          <p className="mt-2 text-[13.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>No corpus documents yet</p>
          <p className="mx-auto mt-0.5 max-w-md text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
            Upload the methodology documents every studio&apos;s AI should be grounded in. A document is used
            only after ingestion finishes and it is approved here.
          </p>
        </div>
      )}

      <div className="space-y-2.5">
        {docs.map((doc) => {
          const ingestion = INGESTION[doc.status];
          const approval = APPROVAL[doc.approval_status];
          const IngestionIcon = ingestion.icon;
          const busy = busyId === doc.id;
          return (
            <div key={doc.id} className="rounded-[16px] p-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[14px] font-[780]" style={{ color: 'var(--text-primary)' }}>
                    <FileText size={14} style={{ color: '#94A3B8' }} /> {doc.title}
                  </p>
                  <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
                    {doc.category.toUpperCase()}
                    {doc.source_version ? ` · v${doc.source_version}` : ''}
                    {' · '}{doc.filename}
                  </p>
                  <p className="mt-0.5 text-[11.5px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {formatBytes(doc.file_size_bytes)} · {doc.chunk_count} chunk{doc.chunk_count === 1 ? '' : 's'} · {fmtDate(doc.created_at)}
                  </p>
                  {doc.status === 'failed' && doc.error_message && (
                    <p className="mt-1 text-[11.5px]" style={{ color: '#DC2626' }}>{doc.error_message}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <span className="rounded-full px-2.5 py-1 text-[10.5px] font-[800] uppercase tracking-wide"
                    style={{ background: approval.bg, color: approval.fg }}>
                    {approval.label}
                  </span>
                  <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-[800] uppercase tracking-wide"
                    style={{ background: ingestion.bg, color: ingestion.fg }}>
                    <IngestionIcon size={11} className={doc.status === 'processing' ? 'animate-spin' : undefined} />
                    {ingestion.label}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {doc.approval_status !== 'approved' && (
                  <button type="button" onClick={() => approveDoc(doc)}
                    disabled={doc.status !== 'ready' || busy}
                    title={doc.status !== 'ready' ? 'Wait for ingestion to finish before approving.' : undefined}
                    className="flex h-10 items-center gap-1.5 rounded-[10px] px-3.5 text-[12.5px] font-[750] text-white transition active:scale-[0.98] disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}>
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    {doc.approval_status === 'revoked' ? 'Re-approve' : 'Approve'}
                  </button>
                )}
                {doc.approval_status === 'approved' && (
                  <button type="button" onClick={() => revokeDoc(doc)} disabled={busy}
                    className="flex h-10 items-center gap-1.5 rounded-[10px] px-3.5 text-[12.5px] font-[750] transition active:scale-[0.98] disabled:opacity-50"
                    style={{ background: 'rgba(245,158,11,0.10)', color: '#B45309' }}>
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />} Revoke
                  </button>
                )}
                {doc.status !== 'ready' && (
                  <button type="button" onClick={() => reindexDoc(doc)} disabled={busy}
                    className="flex h-10 items-center gap-1.5 rounded-[10px] px-3.5 text-[12.5px] font-[750] transition active:scale-[0.98] disabled:opacity-50"
                    style={{ background: 'var(--bg-subtle)', color: '#64748B' }}>
                    <RefreshCw size={14} /> Reindex
                  </button>
                )}
                <button type="button" onClick={() => deleteDoc(doc)} disabled={busy}
                  className="flex h-10 items-center gap-1.5 rounded-[10px] px-3.5 text-[12.5px] font-[750] transition active:scale-[0.98] disabled:opacity-50"
                  style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626' }}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
