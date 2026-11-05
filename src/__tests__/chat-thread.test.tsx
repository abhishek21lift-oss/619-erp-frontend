// The shared conversation surface, used by both the trainer's inbox and the
// member's messages page.
//
// The behaviour worth pinning is the peer identity: an incoming message shows
// who wrote it, and the page decides that by passing `peer`. Nothing here calls
// the API — the page supplies `reload` and `send`.
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChatThread from '@/components/chat/ChatThread';
import type { ChatMessage } from '@/lib/api';

const message = (over: Partial<ChatMessage>): ChatMessage => ({
  id: 'm1',
  sender: 'member',
  body: 'Hello',
  read_at: null,
  created_at: new Date().toISOString(),
  ...over,
});

const noop = async () => message({});

describe('ChatThread peer identity', () => {
  it('draws the peer beside their incoming messages', () => {
    render(
      <ChatThread
        me="studio"
        initial={[message({ id: 'a', sender: 'member', body: 'Hello coach' })]}
        reload={async () => []}
        send={noop}
        empty={<p>none</p>}
        peer={{ name: 'Ravi Kumar' }}
      />,
    );
    // ClientAvatar's initials fallback; the name itself is in the page header,
    // so inside the thread the mark is the only place it can come from.
    expect(screen.getByText('RK')).toBeTruthy();
  });

  it('draws no peer mark when the page does not name one', () => {
    render(
      <ChatThread
        me="member"
        initial={[message({ id: 'b', sender: 'studio', body: 'Hi there' })]}
        reload={async () => []}
        send={noop}
        empty={<p>none</p>}
      />,
    );
    expect(screen.queryByText('RK')).toBeNull();
    expect(screen.getByText('Hi there')).toBeTruthy();
  });
});
