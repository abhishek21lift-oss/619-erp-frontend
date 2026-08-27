'use client';

/**
 * "Draft follow-ups" on the leads list — a scoped trigger for the
 * `lead_followup` ai-action, reusing ActionConfirmView (the same
 * plan/confirm/result screen AiCommandCenter uses) without pulling in the
 * whole global assistant, which stays unmounted elsewhere in the app.
 *
 * Same shape as AiCommandCenter's own proposeAction/confirmAction: opening
 * the dialog asks the server for a plan (read-only, nothing sent), and only
 * the operator's explicit confirm on that exact plan calls execute.
 */

import { useCallback, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import ActionConfirmView from '@/components/ai/ActionConfirmView';
import { api } from '@/lib/api';
import type { AiActionPlan, AiActionResult } from '@/lib/api';

const ACTION_ID = 'lead_followup';

export default function LeadFollowupAction() {
  const [open, setOpen] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [plan, setPlan] = useState<AiActionPlan | null>(null);
  const [result, setResult] = useState<AiActionResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const propose = useCallback(async () => {
    setOpen(true);
    setPlanning(true);
    setError(null);
    setResult(null);
    try {
      const r = await api.ai.actionPlan(ACTION_ID);
      setPlan(r.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not prepare the follow-up drafts.');
    } finally {
      setPlanning(false);
    }
  }, []);

  const confirm = useCallback(async () => {
    if (!plan || running) return;
    setRunning(true);
    setError(null);
    try {
      const r = await api.ai.actionExecute(ACTION_ID, plan.plan_id);
      setResult(r.data);
      setPlan(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'That could not be sent.';
      setError(msg);
      // Same recovery as AiCommandCenter: the list moved underneath them —
      // re-propose so they approve what is true now, not what was true a
      // minute ago.
      if (/changed since/i.test(msg)) {
        try {
          const fresh = await api.ai.actionPlan(ACTION_ID);
          setPlan(fresh.data);
        } catch { setPlan(null); }
      }
    } finally {
      setRunning(false);
    }
  }, [plan, running]);

  const close = () => {
    setOpen(false);
    setPlan(null);
    setResult(null);
    setError(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void propose()}
        className="inline-flex h-[44px] items-center justify-center gap-2 rounded-[14px] px-4 text-[13px] font-[700] transition-transform active:scale-95"
        style={{ background: 'rgba(0,103,224,0.10)', color: '#0067e0', border: '1px solid rgba(0,103,224,0.22)' }}
      >
        <Sparkles size={15} /> Draft follow-ups
      </button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
        <DialogContent className="max-w-md p-0 sm:max-w-lg">
          <DialogHeader
            className="flex-row items-center gap-3.5 px-5 pb-4 pt-5 sm:px-6"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]"
              style={{ background: 'linear-gradient(135deg, #0067e0, #003f87)', boxShadow: '0 6px 20px rgba(0,103,224,0.32)' }}
            >
              <Sparkles size={19} className="text-white" />
            </div>
            <div className="min-w-0 pr-8">
              <DialogTitle className="text-[17px] font-[820] tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
                {plan?.title || 'Lead follow-ups'}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-[12px] font-[500]" style={{ color: 'var(--text-muted)' }}>
                AI drafts the message for each lead — nothing sends until you confirm.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="px-5 py-4 sm:px-6">
            {planning ? (
              <div className="flex items-center gap-2 py-6" style={{ color: 'var(--text-muted)' }}>
                <Loader2 size={14} className="animate-spin" />
                <span className="text-[12px] font-[620]">Drafting follow-ups…</span>
              </div>
            ) : error && !plan && !result ? (
              // ActionConfirmView has nowhere to show an error when there was
              // never a plan to attach it to (AiCommandCenter falls back to
              // its shortcuts grid for this case; this dialog has no such
              // fallback screen, so the error gets its own small state here).
              <div className="py-2">
                <p className="rounded-[12px] px-3 py-2.5 text-[12px] font-[620]"
                  style={{ background: 'rgba(239,68,68,0.10)', color: '#b91c1c' }}>
                  {error}
                </p>
                <button type="button" onClick={() => void propose()}
                  className="mt-3 h-[38px] w-full rounded-[12px] text-[12.5px] font-[720]"
                  style={{ background: 'rgba(15,23,42,0.06)', color: 'var(--text-primary)' }}>
                  Try again
                </button>
              </div>
            ) : (
              <ActionConfirmView
                plan={plan}
                result={result}
                running={running}
                error={error}
                onConfirm={confirm}
                onCancel={close}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
