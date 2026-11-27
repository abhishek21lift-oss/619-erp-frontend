'use client';

/**
 * Where the next reply will go.
 *
 * Two buttons, not a select: there are two options, both are always visible,
 * and the trainer should be able to see which one is armed without opening
 * anything. WhatsApp is disabled — not hidden — when the studio's instance is
 * down, with the link that fixes it beside it: a control that vanishes reads
 * as a feature the studio does not have.
 */

import Link from 'next/link';
import type { ChatChannel } from '@/lib/api';

export default function ChannelPicker({ value, onChange, whatsappAvailable, connectHref = '/engagement/whatsapp' }: {
  value: ChatChannel;
  onChange: (channel: ChatChannel) => void;
  whatsappAvailable: boolean;
  connectHref?: string;
}) {
  const option = (channel: ChatChannel, label: string) => {
    const active = value === channel;
    const disabled = channel === 'whatsapp' && !whatsappAvailable;
    return (
      <button
        key={channel}
        type="button"
        aria-pressed={active}
        disabled={disabled}
        onClick={() => onChange(channel)}
        className="rounded-full px-2.5 py-1 text-[11px] font-[700] transition-colors disabled:cursor-not-allowed disabled:opacity-45"
        style={{
          background: active ? 'var(--bg-card)' : 'transparent',
          color: active ? 'var(--text-primary)' : 'var(--text-muted)',
          border: `1px solid ${active ? 'var(--border)' : 'transparent'}`,
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-3 pt-2" role="group" aria-label="Send via">
      {option('in_app', 'In app')}
      {option('whatsapp', 'WhatsApp')}
      {!whatsappAvailable && (
        <Link
          href={connectHref}
          className="text-[11px] font-[650] underline-offset-2 hover:underline"
          style={{ color: 'var(--text-muted)' }}
        >
          Connect WhatsApp
        </Link>
      )}
    </div>
  );
}
