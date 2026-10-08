// The VPS card renders the backend `host` collector: CPU, memory, disk, load,
// swap, uptime and steal, with byte sizes and ratios formatted for a human.
import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Card } from '@/components/platform/Card';
import { metaFor } from '@/components/platform/command-center-utils';
import type { CommandCenterCard, HostTelemetry } from '@/lib/api';

const GiB = 1024 ** 3;

const data: HostTelemetry = {
  cpu: { cores: 4, busy_ratio: 0.42, steal_ratio: 0.03 },
  memory: { total_bytes: 8 * GiB, available_bytes: 2 * GiB, used_bytes: 6 * GiB, used_ratio: 0.75 },
  swap: { total_bytes: 0, used_bytes: 0, used_ratio: null },
  load: { one: 1.25, five: 0.8, fifteen: 0.5, running_threads: 2, total_threads: 410 },
  load_per_core: 0.3125,
  uptime_seconds: 3 * 86400 + 5 * 3600,
  disk: { path: '/', total_bytes: 100 * GiB, free_bytes: 40 * GiB, used_bytes: 60 * GiB, used_ratio: 0.6 },
};

const card: CommandCenterCard = {
  name: 'host', status: 'healthy', data, latency_ms: 3, reason: null, checked_at: new Date().toISOString(),
} as CommandCenterCard;

describe('VPS (host) card', () => {
  it('has its own title instead of the raw collector name', () => {
    expect(metaFor('host').title).toBe('VPS');
  });

  it('renders the host readings, not the "no renderer yet" fallback', () => {
    render(<Card card={card} index={0} history={[]} />);
    // Expand the card if it is collapsed by default.
    const toggle = screen.queryAllByRole('button')[0];
    if (toggle && !screen.queryByText('Memory used')) fireEvent.click(toggle);

    expect(screen.queryByText(/no renderer yet/i)).toBeNull();
    expect(screen.getByText('Memory used')).toBeTruthy();
    expect(screen.getByText('75%')).toBeTruthy();
    expect(screen.getByText('6.0 GB / 8.0 GB')).toBeTruthy();
    expect(screen.getByText('60 GB / 100 GB')).toBeTruthy();
    expect(screen.getByText('1.25 / 0.80 / 0.50')).toBeTruthy();
    expect(screen.getByText('3d 5h')).toBeTruthy();
    expect(screen.getByText('None')).toBeTruthy(); // no swap
  });
});
