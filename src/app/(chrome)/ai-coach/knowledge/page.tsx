'use client';

import { useCallback, useRef, useState } from 'react';
import { m } from 'framer-motion';
import {
  BookOpen, Upload, FileText, RefreshCw, Trash2, CheckCircle2,
  AlertTriangle, Loader2, X,
} from 'lucide-react';
import Guard from '@/components/Guard';
import { Button, PullToRefresh, PageContainer, PageHero } from '@/components/ui';
import { useAsync } from '@/lib/use-async';
import { useToast } from '@/lib/toast';
import { api, AiKnowledgeDocument } from '@/lib/api';

const CATEGORIES: { value: AiKnowledgeDocument['category']; label: string }[] = [
  { value: 'sop', label: 'SOP' },
  { value: 'guide', label: 'Guide' },
  { value: 'policy', label: 'Policy' },
];

const STATUS_CFG: Record<AiKnowledgeDocument['status'], { label: string; bg: string; color: string; icon: typeof CheckCircle2 }> = {
  ready: { label: 'Ready', bg: 'rgba(16,185,129,0.1)', color: '#059669', icon: CheckCircle2 },
  processing: { label: 'Processing', bg: 'rgba(0,103,224,0.1)', color: '#0067e0', icon: Loader2 },
  failed: { label: 'Failed', bg: 'rgba(239,68,68,0.1)', color: '#dc2626', icon: AlertTriangle },
};

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(d: string) {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AiKnowledgeBasePage() {
  const { toast } = useToast();
  const kb = useAsync<{ data: AiKnowledgeDocument[] }>(() => api.ai.knowledge.list(), []);
  const docs = kb.data?.data ?? [];

  const [uploadOpen, setUploadOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<AiKnowledgeDocument['category']>('sop');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setTitle('');
    setCategory('sop');
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleUpload = async () => {
    if (!file) { toast.error('Choose a PDF or text file to upload.'); return; }
    setUploading(true);
    try {
      await api.ai.knowledge.upload(file, title.trim() || file.name, category);
      toast.success('Document uploaded — indexing in the background.');
      setUploadOpen(false);
      resetForm();
      kb.refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, docTitle: string) => {
    if (!window.confirm(`Delete "${docTitle}"? This removes it from the AI Coach's knowledge base permanently.`)) return;
    try {
      await api.ai.knowledge.delete(id);
      toast.success('Document deleted.');
      kb.refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete document.');
    }
  };

  const handleReindex = async (id: string) => {
    try {
      await api.ai.knowledge.reindex(id);
      toast.success('Reindexing started.');
      kb.refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to start reindexing.');
    }
  };

  return (
    <Guard roles={['admin', 'manager']}>
      <PullToRefresh onRefresh={kb.refetch}>
        <PageContainer>

          <PageHero
            icon={<BookOpen size={20} />}
            title="Knowledge Base"
            subtitle="SOPs, guides & policies the AI Coach answers from before general knowledge"
            actions={
              <button type="button" onClick={() => setUploadOpen(true)}
                className="inline-flex h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] px-5 text-[13px] font-[700] transition-transform active:scale-95 sm:w-auto"
                style={{ background: '#fff', color: '#0F172A' }}>
                <Upload size={16} /> Upload Document
              </button>
            }
          />

        <div className="mx-auto w-full max-w-4xl">

          {/* List */}
          {kb.loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ height: 72, borderRadius: 16, background: 'var(--bg-subtle)', opacity: 0.6, animation: 'pulse 1.5s ease-in-out infinite' }} />
              ))}
            </div>
          ) : docs.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 20px', textAlign: 'center' }}>
              <BookOpen size={32} style={{ color: 'var(--text-disabled)', opacity: 0.5, marginBottom: 12 }} />
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', margin: 0 }}>No documents yet</p>
              <p style={{ fontSize: 12, color: 'var(--text-disabled)', margin: '6px 0 0', maxWidth: 340 }}>
                Upload your SOPs, member guides, and policies as PDF or plain text — the AI Coach will answer
                questions using them instead of guessing at your studio&apos;s procedures.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
              {docs.map((doc, i) => {
                const st = STATUS_CFG[doc.status];
                const StatusIcon = st.icon;
                return (
                  <m.div key={doc.id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 10, background: 'rgba(0,103,224,0.1)', flexShrink: 0 }}>
                      <FileText size={16} style={{ color: '#0067e0' }} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320 }}>{doc.title}</p>
                        <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '2px 7px', borderRadius: 6, background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                          {doc.category}
                        </span>
                      </div>
                      <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                        {fmtSize(doc.file_size_bytes)} · {doc.chunk_count} chunk{doc.chunk_count !== 1 ? 's' : ''} · {fmtDate(doc.created_at)}
                        {doc.uploaded_by_name ? ` · ${doc.uploaded_by_name}` : ''}
                      </p>
                      {doc.status === 'failed' && doc.error_message && (
                        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#dc2626' }}>{doc.error_message}</p>
                      )}
                    </div>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, fontSize: 10.5, fontWeight: 700, padding: '4px 9px', borderRadius: 20, background: st.bg, color: st.color }}>
                      <StatusIcon size={11} className={doc.status === 'processing' ? 'animate-spin' : undefined} />
                      {st.label}
                    </span>
                    {(doc.status === 'failed' || doc.status === 'processing') && (
                      <button onClick={() => handleReindex(doc.id)}
                        title={doc.status === 'failed' ? 'Retry indexing' : 'Stuck on Processing for a while? Click to restart indexing.'}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>
                        <RefreshCw size={13} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(doc.id, doc.title)} title="Delete"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 9, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', cursor: 'pointer', flexShrink: 0 }}>
                      <Trash2 size={13} />
                    </button>
                  </m.div>
                );
              })}
            </div>
          )}

          <style>{`@keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 0.3; } }`}</style>
        </div>
        </PageContainer>
      </PullToRefresh>

      {/* Upload modal */}
      {uploadOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', padding: 16 }}
          onClick={() => { setUploadOpen(false); resetForm(); }}>
          <m.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 440, borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 24px 64px rgba(0,0,0,0.25)', padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>Upload Document</h3>
              <button onClick={() => { setUploadOpen(false); resetForm(); }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, border: 'none', background: 'var(--bg-subtle)', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label htmlFor="kb-title" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Title</label>
                <input id="kb-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Gym Cleaning SOP"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box' }} />
              </div>

              <div>
                <span id="kb-category-label" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Category</span>
                <div role="group" aria-labelledby="kb-category-label" style={{ display: 'flex', gap: 6 }}>
                  {CATEGORIES.map((c) => (
                    <button key={c.value} onClick={() => setCategory(c.value)}
                      style={{ flex: 1, padding: '8px 0', borderRadius: 9, border: `1.5px solid ${category === c.value ? '#0067e0' : 'var(--border)'}`, background: category === c.value ? 'rgba(0,103,224,0.1)' : 'transparent', color: category === c.value ? '#0067e0' : 'var(--text-muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="kb-file" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>File (PDF or .txt, up to 15 MB)</label>
                <input id="kb-file" ref={fileInputRef} type="file" accept=".pdf,.txt,application/pdf,text/plain"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  style={{ width: '100%', fontSize: 12.5, color: 'var(--text-primary)' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <Button variant="outline" onClick={() => { setUploadOpen(false); resetForm(); }} style={{ flex: 1 }}>Cancel</Button>
              <Button variant="primary" loading={uploading} disabled={!file} onClick={handleUpload} style={{ flex: 1 }}>
                Upload
              </Button>
            </div>
          </m.div>
        </div>
      )}
    </Guard>
  );
}
