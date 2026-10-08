// AI operations in the Command Center.
//
// What these pin down is not layout but CLAIMS. The deck is an operator's
// answer to "is AI working, and is it doing what we configured" — so the
// failures that matter are the quiet ones: a configured model shown as the
// active one, an unverified model shown as available, a missing number shown
// as 0, key health inferred from a key existing, or a credential reaching the
// DOM because a payload carried one field more than expected.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import type {
  AiTelemetry, CommandCenterCard, CommandCenterSnapshot, FreeLlmApiTelemetry, AiModelInventory,
} from '@/lib/api';
import { ApiError } from '@/lib/http';
import { AiOperations, catalogState, describeAiTest } from '@/components/platform/mission-control/AiOperations';
import { Card } from '@/components/platform/Card';

const runCommand = vi.fn();
const aiModels = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    superAdmin: {
      runCommandCenterCommand: (...a: unknown[]) => runCommand(...a),
      commandCenterAiModels: (...a: unknown[]) => aiModels(...a),
    },
  },
}));

const NOW = new Date().toISOString();

function aiData(over: Partial<AiTelemetry> = {}): AiTelemetry {
  return {
    routing: {
      primary: 'gemini-2.5-flash', secondary: 'llama-3.3-70b', fallback: 'auto',
      sources: { primary: 'env', secondary: 'default', fallback: 'override' },
      override: { primary: null, secondary: null, fallback: 'auto' },
      from_env: { primary: 'gemini-2.5-flash', secondary: null, fallback: null },
      updated_at: null,
    },
    active_model: 'llama-3.3-70b-versatile',
    active_model_at: NOW,
    active_used_fallback: true,
    last_request_at: NOW,
    today: {
      requests: 42, avg_latency_ms: 900, max_latency_ms: 3100, p95_latency_ms: 2400,
      tokens: 12000, fallbacks: 3, fallback_rate: 0.071, models_used: 2, cost_inr: 1.5, cost_is_floor: true,
    },
    last_hour: { requests: 5, avg_latency_ms: 800, max_latency_ms: 1200, fallbacks: 0, fallback_rate: 0 },
    served_models_24h: [{ model: 'llama-3.3-70b-versatile', requests: 30, last_at: NOW }],
    gateway: { kind: 'freellmapi', endpoint: 'http://freellmapi:3001/v1', status: 'healthy', reason: null },
    observed: {
      scope: 'process', since: NOW, calls_15m: 4, failures_15m: 1, consecutive_failures: 0,
      latency_ms: { avg: 800, p95: 1100, max: 1200, samples: 3 },
      last_success: { at: NOW, requested_model: 'gemini-2.5-flash', served_model: 'llama-3.3-70b-versatile', provider: 'groq', latency_ms: 700 },
      last_failure: { at: NOW, requested_model: 'gemini-2.5-flash', error_class: 'rate_limited', http_status: 429, error: 'Too many requests' },
    },
    reconciliation: { state: 'consistent', findings: [], verified: { catalog: true, traffic: true, gateway: true } },
    usage_readable: true,
    ...over,
  };
}

function gwData(over: Partial<FreeLlmApiTelemetry> = {}): FreeLlmApiTelemetry {
  return {
    gateway: { kind: 'freellmapi', endpoint: 'http://freellmapi:3001/v1', checked_at: NOW },
    service: {
      reachable: true, live: true, version: '1.4.0', uptime_s: 7200,
      checks: { db: 'ok', encryption_key: 'ok' }, latency_ms: 12, http_status: 200, error_class: null, error: null,
    },
    readiness: { ready: true, ready_upstreams: 2, reason: null, http_status: 200 },
    providers: {
      source: 'GET /v1/providers', exposed: true, reason: null,
      total: 2, healthy: 1, rate_limited: 1, invalid: 0, unknown: 0,
      items: [
        { id: 'google', name: 'Google AI Studio', status: 'healthy', enabled_keys: 2, resume_at: null, last_error: null, requests_remaining_pct: null, models_total: 4, models_available: 4 },
        { id: 'groq', name: 'Groq', status: 'rate_limited', enabled_keys: 1, resume_at: NOW, last_error: '429 from upstream', requests_remaining_pct: 0, models_total: 3, models_available: 0 },
      ],
    },
    models: {
      source: 'GET /v1/models', exposed: true, reason: null,
      total: 7, available: 4, unavailable: 3,
      routers: [{ id: 'auto', available: true }],
      by_provider: [{ provider: 'google', total: 4, available: 4 }, { provider: 'groq', total: 3, available: 0 }],
      configured: [
        { tier: 'primary', id: 'gemini-2.5-flash', router: false, in_catalog: true, available: true, unavailable_reason: null },
        { tier: 'secondary', id: 'llama-3.3-70b', router: false, in_catalog: true, available: false, unavailable_reason: 'cooldown' },
        { tier: 'fallback', id: 'auto', router: true, in_catalog: true, available: true, unavailable_reason: null },
      ],
    },
    keys: {
      source: 'GET /v1/providers', total: 3, healthy: null,
      healthy_unavailable_reason: 'Key health unavailable from provider. FreeLLMAPI exposes per-key status only to its dashboard session.',
      per_key: null,
      by_provider: [],
    },
    traffic: {
      scope: 'process', since: NOW, window_ms: 900000, calls: 4, failures: 1, failure_rate: 0.25,
      consecutive_failures: 0, latency_ms: null, last_success: null, last_failure: null, providers: [],
    },
    ...over,
  };
}

function card(name: string, status: CommandCenterCard['status'], data: unknown, reason: string | null = null): CommandCenterCard {
  return { name, status, data: data as CommandCenterCard['data'], latency_ms: 10, reason, checked_at: NOW };
}

function snap(cards: Record<string, CommandCenterCard>): CommandCenterSnapshot {
  return {
    status: 'healthy',
    observability: { total: 2, probed: 2, unavailable: 0, not_configured: 0, timed_out: 0, stale: 0, coverage: 1 },
    degraded_reasons: [], collected_at: NOW, duration_ms: 20, cards,
  };
}

const healthy = () => snap({ ai: card('ai', 'healthy', aiData()), freellmapi: card('freellmapi', 'healthy', gwData()) });

beforeEach(() => { runCommand.mockReset(); aiModels.mockReset(); });

describe('catalogState — a configured model is available only when the catalog says so', () => {
  it('cannot verify without a readable catalog', () => {
    expect(catalogState({ id: 'm', router: false, in_catalog: null, available: null, unavailable_reason: null }))
      .toEqual({ label: 'Not verified', status: 'unavailable' });
  });
  it('flags a model the catalog does not list', () => {
    expect(catalogState({ id: 'm', router: false, in_catalog: false, available: null, unavailable_reason: null }).label).toBe('Not in catalog');
  });
  it('says why a listed model is unavailable', () => {
    expect(catalogState({ id: 'm', router: false, in_catalog: true, available: false, unavailable_reason: 'cooldown' }))
      .toEqual({ label: 'Unavailable · cooldown', status: 'warning' });
  });
  it('does not promote "listed" to "available" when availability is unreported', () => {
    expect(catalogState({ id: 'm', router: false, in_catalog: true, available: null, unavailable_reason: null }).status).toBe('unavailable');
  });
  it('treats an unset tier as not set', () => {
    expect(catalogState(undefined).label).toBe('Not set');
  });
});

describe('describeAiTest', () => {
  it('names requested and served models when they differ', () => {
    expect(describeAiTest({
      ok: true, latency_ms: 640, requested_model: 'auto', requested_tier: 'primary', model: 'gemini-2.5-flash',
      provider: 'google', used_fallback: false, gateway: { endpoint: null, openrouter: false },
    })).toBe('Answered by gemini-2.5-flash (asked for auto) via google in 640 ms');
  });
  it('uses the server summary on failure', () => {
    expect(describeAiTest({
      ok: false, latency_ms: 10, requested_model: 'x', requested_tier: 'primary',
      gateway: { endpoint: null, openrouter: false }, summary: 'AI test failed: the gateway is not serving',
    })).toBe('AI test failed: the gateway is not serving');
  });
});

describe('the AI operations deck', () => {
  it('shows the configured primary and the active (served) model as different things', () => {
    render(<AiOperations snap={healthy()} onRefresh={() => {}} />);
    const routing = screen.getByText('Routing').closest('section')!;
    expect(within(routing).getByText('gemini-2.5-flash')).toBeTruthy();
    expect(within(routing).getByText('Active model (served last)')).toBeTruthy();
    expect(within(routing).getAllByText('llama-3.3-70b-versatile').length).toBeGreaterThan(0);
    // Where each tier's model came from.
    expect(within(routing).getByText('environment variable')).toBeTruthy();
    expect(within(routing).getByText('Control Centre override')).toBeTruthy();
    // Catalog verdict per tier.
    expect(within(routing).getAllByText('Unavailable · cooldown').length).toBeGreaterThan(0);
  });

  it('renders mismatch findings with their sources', () => {
    const s = snap({
      ai: card('ai', 'warning', aiData({
        reconciliation: {
          state: 'mismatch',
          findings: [{ code: 'configured_model_missing', severity: 'warning', message: 'Configured primary model "x" is not in FreeLLMAPI\'s catalog', source: 'routing vs GET /v1/models' }],
          verified: { catalog: true, traffic: true, gateway: true },
        },
      }), 'Configuration mismatch: …'),
      freellmapi: card('freellmapi', 'healthy', gwData()),
    });
    render(<AiOperations snap={s} onRefresh={() => {}} />);
    expect(screen.getAllByText('Config mismatch').length).toBeGreaterThan(0);
    expect(screen.getByText(/is not in FreeLLMAPI's catalog/)).toBeTruthy();
    expect(screen.getByText('routing vs GET /v1/models')).toBeTruthy();
  });

  it('explains "not verified" rather than implying consistency', () => {
    const s = snap({
      ai: card('ai', 'healthy', aiData({ reconciliation: { state: 'not_verified', findings: [], verified: { catalog: false, traffic: false, gateway: false } } })),
    });
    render(<AiOperations snap={s} onRefresh={() => {}} />);
    expect(screen.getByText(/nothing confirms it either/)).toBeTruthy();
  });

  it('lists every provider the gateway exposes, with state and model counts', () => {
    render(<AiOperations snap={healthy()} onRefresh={() => {}} />);
    const gw = screen.getByText('Gateway, providers and keys').closest('section')!;
    expect(within(gw).getByText('Google AI Studio')).toBeTruthy();
    expect(within(gw).getByText('Groq')).toBeTruthy();
    expect(within(gw).getByText('Cooling down')).toBeTruthy();
    expect(within(gw).getByText('4/4')).toBeTruthy();
    expect(within(gw).getByText('0/3')).toBeTruthy();
  });

  it('reports key COUNTS and says per-key health is unavailable, never inferring it', () => {
    render(<AiOperations snap={healthy()} onRefresh={() => {}} />);
    expect(screen.getByText(/3 enabled keys across providers\. Key health unavailable from provider/)).toBeTruthy();
    expect(screen.queryByText(/healthy keys?:?\s*\d/i)).toBeNull();
  });

  it('shows missing numbers as a dash, never as zero', () => {
    const s = snap({
      ai: card('ai', 'healthy', aiData({
        today: { requests: 0, avg_latency_ms: null, max_latency_ms: null, p95_latency_ms: null, tokens: 0, fallbacks: 0, fallback_rate: null, models_used: 0, cost_inr: 0, cost_is_floor: false },
        last_hour: { requests: 0, fallback_rate: null },
        active_model: null, active_model_at: null, last_request_at: null,
      })),
    });
    render(<AiOperations snap={s} onRefresh={() => {}} />);
    const traffic = screen.getByText('Traffic').closest('section')!;
    const latency = within(traffic).getByText('Latency today, avg').parentElement!;
    expect(latency.textContent).toContain('—');
    expect(latency.textContent).not.toMatch(/0 ms/);
    expect(screen.getByText('Nothing served yet')).toBeTruthy();
  });

  it('says why the gateway section is empty when AI does not go through FreeLLMAPI', () => {
    const s = snap({
      ai: card('ai', 'healthy', aiData({ gateway: { kind: 'openrouter', endpoint: 'https://openrouter.ai/api/v1', status: 'unavailable', reason: null } })),
      freellmapi: { ...card('freellmapi', 'unavailable', null, 'AI_BASE_URL points at OpenRouter; FreeLLMAPI is not in the request path'), expected: true },
    });
    render(<AiOperations snap={s} onRefresh={() => {}} />);
    const gw = screen.getByText('Gateway, providers and keys').closest('section')!;
    expect(within(gw).getByText(/points at OpenRouter/)).toBeTruthy();
  });

  it('degrades to sentences when the AI card has no reading', () => {
    render(<AiOperations snap={snap({ ai: card('ai', 'timeout', null, 'collector timed out') })} onRefresh={() => {}} />);
    expect(screen.getByText(/Routing is unavailable/)).toBeTruthy();
    expect(screen.getByText(/Traffic is unavailable/)).toBeTruthy();
    expect(screen.getByText(/does not report the AI gateway/)).toBeTruthy();
  });

  it('never renders a credential, even if a payload carries one', () => {
    const leaky = gwData();
    // Fields the client must not render even if a future backend sent them.
    (leaky.providers!.items![0] as unknown as Record<string, unknown>).api_key = 'sk-or-v1-SECRETSECRETSECRET';
    (leaky as unknown as Record<string, unknown>).authorization = 'Bearer sk-live-SECRETSECRET';
    const { container } = render(<AiOperations snap={snap({ ai: card('ai', 'healthy', aiData()), freellmapi: card('freellmapi', 'healthy', leaky) })} onRefresh={() => {}} />);
    expect(container.innerHTML).not.toMatch(/SECRET/);
    expect(container.innerHTML).not.toMatch(/Bearer/);
  });
});

describe('the AI commands', () => {
  it('runs ai.test through the allow-listed command and reports requested vs served', async () => {
    const onRefresh = vi.fn();
    runCommand.mockResolvedValue({
      data: {
        command: 'ai.test', queue: null, outcome: 'ok', duration_ms: 700,
        output: {
          ok: true, latency_ms: 690, requested_model: 'auto', requested_tier: 'primary', model: 'gemini-2.5-flash',
          served_tier: 'primary', provider: 'google', provider_source: 'X-Routed-Via header', used_fallback: false,
          gateway_fallback_attempts: 0, gateway: { endpoint: 'http://freellmapi:3001/v1', openrouter: false }, reply: 'ready',
        },
      },
    });
    render(<AiOperations snap={healthy()} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByRole('button', { name: /Test AI/ }));
    await waitFor(() => expect(screen.getByText(/Answered by gemini-2.5-flash \(asked for auto\) via google/)).toBeTruthy());
    expect(runCommand).toHaveBeenCalledWith('ai.test');
    expect(screen.getByText(/X-Routed-Via header/)).toBeTruthy();
    expect(onRefresh).toHaveBeenCalled();
  });

  it('shows the safe per-attempt diagnosis when ai.test fails', async () => {
    runCommand.mockRejectedValue(new ApiError('AI test failed: 2 models tried, all failed (rate_limited)', 500, 'COMMAND_FAILED', {
      error: { code: 'COMMAND_FAILED', message: 'AI test failed' },
      data: {
        output: {
          ok: false, latency_ms: 50, requested_model: 'm1', requested_tier: 'primary',
          gateway: { endpoint: null, openrouter: false, status: 'warning' },
          attempts: [
            { model: 'm1', tier: 'primary', error_class: 'rate_limited', http_status: 429, error: 'Too many requests' },
            { model: 'm2', tier: 'secondary', error_class: 'rate_limited', http_status: 429, error: 'Too many requests' },
          ],
          summary: 'AI test failed: 2 models tried, all failed (rate_limited)',
        },
      },
    }));
    render(<AiOperations snap={healthy()} onRefresh={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Test AI/ }));
    await waitFor(() => expect(screen.getByText('AI test failed: 2 models tried, all failed (rate_limited)')).toBeTruthy());
    expect(screen.getByText(/secondary · m2 · rate_limited 429/)).toBeTruthy();
  });

  it('reports a cooldown as a cooldown, not as a failure of AI', async () => {
    runCommand.mockRejectedValue(new ApiError('Ran recently; wait 8s', 429, 'COOLDOWN'));
    render(<AiOperations snap={healthy()} onRefresh={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Check gateway/ }));
    await waitFor(() => expect(screen.getByText('Ran recently; wait 8s')).toBeTruthy());
  });
});

describe('the model inventory', () => {
  const inventory = (over: Partial<AiModelInventory> = {}): AiModelInventory => ({
    gateway: { kind: 'freellmapi', endpoint: 'http://freellmapi:3001/v1', status: 'healthy', reason: null },
    checked_at: NOW, source: 'GET /v1/models', exposed: true, reason: null, usage_readable: true,
    configured: [{ tier: 'primary', id: 'gemini-2.5-flash', router: false }],
    models: [
      { id: 'gemini-2.5-flash', provider: 'google', available: true, unavailable_reason: null, configured_tiers: ['primary'], last_used_at: NOW, requests_30d: 12 },
      { id: 'llama-3.3-70b', provider: 'groq', available: false, unavailable_reason: 'cooldown', configured_tiers: [], last_used_at: null, requests_30d: 0 },
    ],
    routers: [{ id: 'auto', provider: 'freellmapi', available: true, unavailable_reason: null, configured_tiers: [], last_used_at: null, requests_30d: 0 }],
    served_not_in_catalog: [{ id: 'old-model', last_used_at: NOW, requests_30d: 2 }],
    ...over,
  });

  it('is read only on request, then filters configured / available / unavailable', async () => {
    aiModels.mockResolvedValue({ data: inventory() });
    render(<AiOperations snap={healthy()} onRefresh={() => {}} />);
    expect(aiModels).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Load inventory/ }));
    await waitFor(() => expect(screen.getByText(/1 of 2 models available/)).toBeTruthy());

    const inv = screen.getByText('Model inventory').closest('section')!;
    // Default filter: configured only.
    expect(within(inv).getByText('gemini-2.5-flash')).toBeTruthy();
    expect(within(inv).queryByText('llama-3.3-70b')).toBeNull();

    fireEvent.click(within(inv).getByRole('button', { name: 'Unavailable' }));
    expect(within(inv).getByText('llama-3.3-70b')).toBeTruthy();
    expect(within(inv).getByText('cooldown')).toBeTruthy();
    expect(within(inv).queryByText('gemini-2.5-flash')).toBeNull();

    expect(within(inv).getByText(/Served in the last 30 days but not in the catalog: old-model/)).toBeTruthy();
  });

  it('says why when the catalog cannot be read', async () => {
    aiModels.mockResolvedValue({ data: inventory({ models: null, routers: null, exposed: false, reason: "GET /v1/models rejected the ERP's API key (HTTP 401)" }) });
    render(<AiOperations snap={healthy()} onRefresh={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Load inventory/ }));
    await waitFor(() => expect(screen.getByText(/rejected the ERP's API key/)).toBeTruthy());
  });
});

describe('the Health matrix drill-down cards', () => {
  it('the AI card keeps "active" and "configured primary" apart', () => {
    render(<Card card={card('ai', 'warning', aiData())} index={0} history={[]} />);
    expect(screen.getByText('Active model').nextSibling?.textContent).toBe('llama-3.3-70b-versatile');
    expect(screen.getByText('Configured primary').nextSibling?.textContent).toBe('gemini-2.5-flash');
    expect(screen.getByText('Today cost (floor)')).toBeTruthy();
  });

  it('the gateway card renders counts and never claims key health', () => {
    render(<Card card={card('freellmapi', 'warning', gwData())} index={0} history={[]} />);
    expect(screen.getByText('Providers healthy').nextSibling?.textContent).toBe('1 / 2');
    expect(screen.getByText('Models available').nextSibling?.textContent).toBe('4 / 7');
    expect(screen.getByText('Healthy keys').nextSibling?.textContent).toBe('Not exposed');
  });
});
