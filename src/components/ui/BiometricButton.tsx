'use client';
import { useState, useCallback } from 'react';
import { Fingerprint, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { useWebAuthn, webAuthnError } from '@/hooks/useWebAuthn';

interface BiometricButtonProps {
  /** Called with the short-lived actionToken on successful biometric verification */
  onVerified: (actionToken: string) => void | Promise<void>;
  label?: string;
  /** Extra CSS classes for the button */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md';
  disabled?: boolean;
}

type Phase = 'idle' | 'prompting' | 'success' | 'error';

export function BiometricButton({
  onVerified,
  label = 'Verify with Biometric',
  className = '',
  size = 'md',
  disabled = false,
}: BiometricButtonProps) {
  const { verifyAction } = useWebAuthn();
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleClick = useCallback(async () => {
    if (phase === 'prompting') return;
    setPhase('prompting');
    setErrorMsg('');
    try {
      const token = await verifyAction();
      if (token) {
        setPhase('success');
        await onVerified(token);
        setTimeout(() => setPhase('idle'), 2000);
      } else {
        setPhase('error');
        setErrorMsg('Biometric verification failed. Please try again.');
        setTimeout(() => setPhase('idle'), 3000);
      }
    } catch (err) {
      setPhase('error');
      setErrorMsg(webAuthnError(err));
      setTimeout(() => setPhase('idle'), 3000);
    }
  }, [phase, verifyAction, onVerified]);

  const isSm  = size === 'sm';
  const px    = isSm ? '10px 14px' : '12px 20px';
  const gap   = isSm ? 6 : 8;
  const fs    = isSm ? 12 : 13;
  const iconSize = isSm ? 14 : 16;

  const colorMap: Record<Phase, { bg: string; border: string; text: string; shadow: string }> = {
    idle:      { bg: 'rgba(139,92,246,0.10)', border: 'rgba(139,92,246,0.35)', text: '#A78BFA', shadow: 'none' },
    prompting: { bg: 'rgba(139,92,246,0.16)', border: 'rgba(139,92,246,0.5)',  text: '#C4B5FD', shadow: '0 0 12px rgba(139,92,246,0.25)' },
    success:   { bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.4)',   text: '#4ADE80', shadow: '0 0 12px rgba(34,197,94,0.2)' },
    error:     { bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.35)',  text: '#F87171', shadow: '0 0 12px rgba(239,68,68,0.2)' },
  };

  const c = colorMap[phase];

  const Icon = phase === 'prompting' ? Loader2
             : phase === 'success'   ? ShieldCheck
             : phase === 'error'     ? AlertCircle
             : Fingerprint;

  const phaseLabel = phase === 'prompting' ? 'Touch your sensor…'
                   : phase === 'success'   ? 'Verified!'
                   : phase === 'error'     ? (errorMsg || 'Failed — try again')
                   : label;

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || phase === 'prompting'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap,
          padding: px,
          background: c.bg,
          border: `1px solid ${c.border}`,
          borderRadius: 10,
          color: c.text,
          fontSize: fs,
          fontWeight: 600,
          cursor: disabled || phase === 'prompting' ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: c.shadow,
          opacity: disabled ? 0.5 : 1,
          whiteSpace: 'nowrap',
        }}
        className={className}
        aria-label={phaseLabel}
      >
        <Icon
          size={iconSize}
          style={{ flexShrink: 0, animation: phase === 'prompting' ? 'spin 1s linear infinite' : 'none' }}
        />
        {phaseLabel}
      </button>
    </div>
  );
}
