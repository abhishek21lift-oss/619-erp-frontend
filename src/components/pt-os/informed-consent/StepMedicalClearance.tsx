'use client';

import { useRef, useState } from 'react';
import { Stethoscope, Upload, FileText, Loader2 } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import type { InformedConsentFormData } from './types';

interface StepMedicalClearanceProps {
  form: InformedConsentFormData;
  set: <K extends keyof InformedConsentFormData>(key: K, val: InformedConsentFormData[K]) => void;
  error?: string;
  recordId: string | null;
  fileUrl: string | null;
  onFileUploaded: (url: string) => void;
}

export function StepMedicalClearance({ form, set, error, recordId, fileUrl, onFileUploaded }: StepMedicalClearanceProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!recordId) { toast.error('Save the form first (advance past Client Info).'); return; }
    setUploading(true);
    try {
      const res = await api.progress.informedConsent.uploadClearance(recordId, file);
      if (res?.data?.medical_clearance_file_url) {
        onFileUploaded(res.data.medical_clearance_file_url);
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
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#7c3aed,#5b21b6)' }} />
      <div className="p-7 sm:p-10 space-y-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#5b21b6' }}>
            <Stethoscope size={20} color="#fff" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Medical Clearance</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Step 4 of 7</p>
          </div>
        </div>

        <div>
          <p className="mb-3 text-[13.5px] font-[650] text-slate-700">Has your physician advised against exercise?</p>
          <div className="flex gap-2">
            {[{ v: true, l: 'Yes' }, { v: false, l: 'No' }].map((opt) => {
              const selected = form.physicianAdvisedAgainst === opt.v;
              return (
                <button
                  key={String(opt.v)} type="button"
                  onClick={() => set('physicianAdvisedAgainst', opt.v)}
                  className="rounded-[10px] px-5 py-2.5 text-[13px] font-[700] transition-all"
                  style={{
                    background: selected ? '#5b21b6' : '#f8fafc',
                    color: selected ? '#fff' : '#64748b',
                    border: selected ? '1.5px solid #5b21b6' : '1.5px solid #e2e8f0',
                  }}
                >
                  {opt.l}
                </button>
              );
            })}
          </div>
        </div>

        {form.physicianAdvisedAgainst && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FloatInput label="Physician Name" value={form.physicianName} onChange={(v) => set('physicianName', v)} required />
              <FloatInput label="Hospital" value={form.hospital} onChange={(v) => set('hospital', v)} required />
            </div>
            <FloatInput label="Medical Condition" value={form.medicalCondition} onChange={(v) => set('medicalCondition', v)} multiline autoGrow />

            <div>
              <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Medical Clearance Document</p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[12px] font-[700] transition-all disabled:opacity-50"
                  style={{ background: 'rgba(124,58,237,0.1)', color: '#5b21b6', border: '1.5px solid rgba(124,58,237,0.35)' }}
                >
                  {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                  {uploading ? 'Uploading…' : 'Upload PDF or Image'}
                </button>
                <input ref={fileInputRef} type="file" className="hidden" accept="application/pdf,image/*" onChange={handleFileChange} />
              </div>
              {fileUrl && (
                <a
                  href={fileUrl} target="_blank" rel="noopener noreferrer"
                  className="mt-3 flex w-fit items-center gap-2 rounded-[10px] px-3 py-2 text-[12px] font-[600]"
                  style={{ background: 'var(--bg-subtle)', color: '#334155' }}
                >
                  <FileText size={13} style={{ color: '#94a3b8' }} /> Medical clearance on file
                </a>
              )}
            </div>
          </div>
        )}

        {error && <p className="text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>
    </div>
  );
}

export default StepMedicalClearance;
