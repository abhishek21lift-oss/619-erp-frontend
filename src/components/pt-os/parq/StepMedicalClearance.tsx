'use client';

import { useRef, useState } from 'react';
import { Stethoscope, Upload, FileText, Loader2 } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import { api } from '@/lib/api';
import type { ParqDocument, ParqDocumentType } from '@/lib/api';
import { useToast } from '@/lib/toast';
import type { ParqFormData, MedicalClearanceForm } from './types';

const DOC_TYPES: { value: ParqDocumentType; label: string }[] = [
  { value: 'medical_report', label: 'Medical Report' },
  { value: 'medical_certificate', label: 'Medical Certificate' },
  { value: 'other', label: 'Other' },
];

interface StepMedicalClearanceProps {
  form: ParqFormData;
  set: <K extends keyof ParqFormData>(key: K, val: ParqFormData[K]) => void;
  error?: string;
  formId: string | null;
  documents: ParqDocument[];
  onDocumentUploaded: (doc: ParqDocument) => void;
}

export function StepMedicalClearance({ form, set, error, formId, documents, onDocumentUploaded }: StepMedicalClearanceProps) {
  const { toast } = useToast();
  const mc = form.medicalClearance;
  const setMc = <K extends keyof MedicalClearanceForm>(key: K, val: MedicalClearanceForm[K]) => {
    set('medicalClearance', { ...mc, [key]: val });
  };

  const [docType, setDocType] = useState<ParqDocumentType>('medical_certificate');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!formId) { toast.error('Save the form as a draft first (advance past Client Details).'); return; }
    setUploading(true);
    try {
      const res = await api.progress.parqDocuments.upload(formId, docType, file);
      if (res?.data) {
        onDocumentUploaded(res.data);
        if (docType === 'medical_certificate' && !mc.certificate_url) setMc('certificate_url', res.data.file_url);
        toast.success('Document uploaded.');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#dc2626,#991b1b)' }} />
      <div className="p-7 sm:p-10 space-y-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#991b1b' }}>
            <Stethoscope size={20} color="#fff" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Medical Clearance</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Step 6 of 9 — required because this client&apos;s live risk is HIGH.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FloatInput label="Doctor Name" value={mc.doctor_name} onChange={(v) => setMc('doctor_name', v)} required />
          <FloatInput label="Hospital / Clinic" value={mc.hospital} onChange={(v) => setMc('hospital', v)} required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FloatInput label="Doctor Contact" value={mc.doctor_contact} onChange={(v) => setMc('doctor_contact', v)} />
          <FloatInput label="Clearance Date" type="date" value={mc.clearance_date} onChange={(v) => setMc('clearance_date', v)} required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FloatInput label="Expiry Date" type="date" value={mc.expiry_date} onChange={(v) => setMc('expiry_date', v)} />
          <FloatInput label="Certificate URL" value={mc.certificate_url} onChange={(v) => setMc('certificate_url', v)} placeholder="Auto-filled after upload, or paste a link" />
        </div>

        <div>
          <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Supporting Documents</p>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {DOC_TYPES.map((d) => {
              const selected = docType === d.value;
              return (
                <button
                  key={d.value} type="button" onClick={() => setDocType(d.value)}
                  className="rounded-[10px] px-3.5 py-2 text-[12px] font-[700] transition-all"
                  style={{ background: selected ? '#0f172a' : '#f8fafc', color: selected ? '#fff' : '#64748b', border: selected ? '1.5px solid #0f172a' : '1.5px solid #e2e8f0' }}
                >
                  {d.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[12px] font-[700] transition-all disabled:opacity-50"
              style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706', border: '1.5px solid rgba(245,158,11,0.35)' }}
            >
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              {uploading ? 'Uploading…' : 'Upload File'}
            </button>
            <input ref={fileInputRef} type="file" className="hidden" accept="application/pdf,image/*" onChange={handleFileChange} />
          </div>

          {documents.length > 0 && (
            <div className="space-y-1.5">
              {documents.map((d) => (
                <a
                  key={d.id} href={d.file_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-[12px] font-[600]"
                  style={{ background: 'var(--bg-subtle)', color: '#334155' }}
                >
                  <FileText size={13} style={{ color: '#94a3b8' }} />
                  {d.file_name || d.doc_type}
                </a>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>
    </div>
  );
}

export default StepMedicalClearance;
