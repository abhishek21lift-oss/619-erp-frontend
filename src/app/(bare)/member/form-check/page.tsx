'use client';
/**
 * Member — Form check.
 *
 * Record a lift, send it to the trainer, and read their comments back at the
 * exact second they are about. This is the loop that used to need both people
 * in the same room: the member trains on their own schedule, the trainer
 * watches when they can.
 *
 * The video is uploaded as a file (60 MB at most) and stored under a key that
 * belongs to this member's row, so /uploads refuses it to anyone else. The
 * server decides the file type from the bytes, not from the phone's claim.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Play, Upload, Video } from 'lucide-react';
import Guard from '@/components/Guard';
import MemberShell from '@/components/member/MemberShell';
import {
  Card, EmptyState, LoadError, MC, PageSkeleton, PageTitle, Section, longDate,
} from '@/components/member/MemberUI';
import { api } from '@/lib/api';
import type { FormCheckComment, MeFormCheck } from '@/lib/api';
import { errorMessage } from '@/lib/forms/errors';
import { useToast } from '@/lib/toast';

const MB = 1024 * 1024;
const MAX_VIDEO = 60 * MB;

/** 83 → "1:23". */
const clock = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export default function MemberFormCheckPage() {
  return (
    <Guard role="member">
      <MemberShell>
        <FormCheckBody />
      </MemberShell>
    </Guard>
  );
}

function FormCheckBody() {
  const { toast } = useToast();
  const [checks, setChecks] = useState<MeFormCheck[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [exercise, setExercise] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    api.me.formChecks()
      .then((r) => { setChecks(r.data); setFailed(false); })
      .catch(() => setFailed(true));
  }, []);
  useEffect(() => { void load(); }, [load]);

  const pick = (picked: File | null) => {
    if (picked && picked.size > MAX_VIDEO) {
      toast.error('That video is over 60 MB. Trim it and try again.');
      return;
    }
    setFile(picked);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error('Choose the video first.');
    if (!exercise.trim()) return toast.error('Name the lift in the video.');
    setBusy(true);
    try {
      await api.me.uploadFormCheck(file, exercise.trim(), note.trim() || undefined);
      toast.success('Sent to your trainer');
      setFile(null);
      setExercise('');
      setNote('');
      if (fileInput.current) fileInput.current.value = '';
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'The video did not upload. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  const title = <PageTitle accent="workout" icon={<Video size={20} />} title="Form check"
    sub="Send a lift. Your trainer comments at the exact second." />;

  if (failed) return <>{title}<LoadError what="form checks" /></>;
  if (checks === null) return <PageSkeleton />;

  return (
    <>
      {title}

      <Section title="Send a lift">
        <Card className="p-4">
          <form onSubmit={send} className="space-y-3">
            <div>
              <label htmlFor="fc-video" className="mb-1.5 block text-[11px] font-[750]" style={{ color: MC.muted }}>
                Video (MP4 or MOV, 60 MB max)
              </label>
              <input
                id="fc-video" ref={fileInput} type="file" accept="video/mp4,video/quicktime"
                className="sr-only"
                onChange={(e) => pick(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-[13px] px-3.5 py-3 text-[13px] font-[700]"
                style={{ background: 'var(--bg-subtle)', border: '1px dashed var(--border)', color: MC.ink }}
              >
                <Upload size={15} /> {file ? file.name : 'Choose a video'}
              </button>
            </div>

            <div>
              <label htmlFor="fc-exercise" className="mb-1.5 block text-[11px] font-[750]" style={{ color: MC.muted }}>
                Lift
              </label>
              <input
                id="fc-exercise" value={exercise} maxLength={120} required
                onChange={(e) => setExercise(e.target.value)}
                placeholder="e.g. Back squat, 80 kg"
                className="w-full rounded-[13px] px-3.5 py-2.5 text-[13.5px] outline-none"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: MC.ink }}
              />
            </div>

            <div>
              <label htmlFor="fc-note" className="mb-1.5 block text-[11px] font-[750]" style={{ color: MC.muted }}>
                Anything they should know (optional)
              </label>
              <textarea
                id="fc-note" value={note} maxLength={500} rows={2}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Third set — lower back felt tight."
                className="w-full resize-none rounded-[13px] px-3.5 py-2.5 text-[13.5px] outline-none"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: MC.ink }}
              />
            </div>

            <button
              type="submit" disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-[13px] px-4 py-3 text-[13.5px] font-[800] text-white disabled:opacity-60"
              style={{ background: MC.primary }}
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              {busy ? 'Sending…' : 'Send to trainer'}
            </button>
          </form>
        </Card>
      </Section>

      <Section title="Your videos" aside={<span className="text-[11px]" style={{ color: MC.muted }}>{checks.length}</span>}>
        {checks.length === 0 ? (
          <Card>
            <EmptyState icon={<Video size={20} />} title="No form checks yet"
              body="Record a lift and your trainer will review it with notes at each point." />
          </Card>
        ) : (
          <div className="space-y-3">
            {checks.map((check) => <CheckCard key={check.id} check={check} />)}
          </div>
        )}
      </Section>
    </>
  );
}

function CheckCard({ check }: { check: MeFormCheck }) {
  const video = useRef<HTMLVideoElement>(null);
  const reviewed = check.status === 'reviewed';

  const seek = (comment: FormCheckComment) => {
    const el = video.current;
    if (!el) return;
    el.currentTime = comment.at_seconds;
    void el.play().catch(() => { /* autoplay can be refused; the position is still set */ });
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-[14px] font-[800]" style={{ color: MC.ink }}>{check.exercise}</h3>
            <p className="mt-0.5 text-[11px]" style={{ color: MC.muted }}>{longDate(check.created_at)}</p>
          </div>
          <span className="shrink-0 rounded-full px-2 py-1 text-[10px] font-[750]"
            style={{
              background: reviewed ? 'rgba(16,185,129,0.14)' : 'rgba(245,158,11,0.14)',
              color: reviewed ? MC.success : MC.warning,
            }}>
            {reviewed ? 'Reviewed' : 'Waiting'}
          </span>
        </div>

        {check.note && (
          <p className="mt-2 text-[12.5px] leading-relaxed" style={{ color: MC.muted }}>{check.note}</p>
        )}

        {/* eslint-disable-next-line jsx-a11y/media-has-caption -- filmed on a phone; no caption track exists */}
        <video
          ref={video} src={check.video_url} controls playsInline preload="metadata"
          className="mt-3 w-full rounded-[12px] bg-black"
        />

        {check.comments.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] font-[780] uppercase tracking-[0.12em]" style={{ color: MC.muted }}>
              Trainer notes
            </p>
            <ul className="mt-1.5 space-y-1.5">
              {check.comments.map((comment) => (
                <li key={comment.id}>
                  <button type="button" onClick={() => seek(comment)}
                    className="flex w-full items-start gap-2 rounded-[11px] px-2.5 py-2 text-left"
                    style={{ background: 'var(--bg-subtle)' }}>
                    <span className="mt-[1px] inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-[800] tabular-nums"
                      style={{ background: 'rgba(59,130,246,0.14)', color: MC.primary }}>
                      <Play size={9} /> {clock(comment.at_seconds)}
                    </span>
                    <span className="text-[12.5px] leading-relaxed" style={{ color: MC.ink }}>{comment.body}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {reviewed && check.reviewed_at && (
          <p className="mt-2 text-[11px]" style={{ color: MC.muted }}>Reviewed {longDate(check.reviewed_at)}</p>
        )}
      </div>
    </Card>
  );
}
