// Speaking an exercise name instead of typing it.
//
// ── What this is really testing ────────────────────────────────────────────
//
// Not the Web Speech API — that is the browser's. What matters here is that
// voice goes through the SAME path typing does: one `search` state, one
// debounce, one request. A second query path that happened to work would pass
// a naive "did the field fill in" assertion and then drift from typed search
// the first time either changed, so the request assertions below are the
// point, not the field contents.
//
// The recognizer is replaced with a fake that exposes its own handlers, which
// is the only way to drive interim/final results and the five failure codes
// deterministically. jsdom ships no SpeechRecognition at all, so its absence
// is also the unsupported-browser case for free.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ExercisePickerPanel } from '@/components/pt-os/workout-log/ExercisePicker';

vi.mock('@/lib/toast', () => ({ useToast: () => ({ toast: { error: vi.fn(), success: vi.fn() } }) }));

const listMock = vi.fn();
vi.mock('@/lib/api', () => ({
  api: {
    exercises: {
      meta: async () => ({ muscles_by_region: {}, equipment: [] }),
      recent: async () => ({ exercises: [] }),
      list: (...a: unknown[]) => listMock(...a),
      markUsed: async () => ({}),
    },
  },
}));

const ex = (id: string, name: string) => ({
  id, name, primary_muscle: 'chest', equipment_name: 'barbell',
  mechanic: 'compound', is_favorite: false, is_custom: false,
});
const BENCH = ex('x1', 'Barbell Bench Press');
const SQUAT = ex('x2', 'Back Squat');

/** The last recognizer the component constructed. */
let fake: FakeRecognition | null = null;

class FakeRecognition {
  lang = '';
  continuous = false;
  interimResults = false;
  maxAlternatives = 0;
  started = false;
  stopped = false;
  aborted = false;
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  onstart: (() => void) | null = null;

  constructor() { fake = this; }
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() { return true; }

  start() { this.started = true; act(() => { this.onstart?.(); }); }
  stop() { this.stopped = true; act(() => { this.onend?.(); }); }
  abort() { this.aborted = true; }

  /** Drive a result the way the real API does: a growing result list. */
  say(text: string, isFinal = true) {
    const results = [{ 0: { transcript: text }, isFinal, length: 1 }];
    act(() => {
      this.onresult?.({ resultIndex: 0, results: Object.assign(results, { length: 1 }) });
    });
  }

  fail(code: string) {
    act(() => {
      this.onerror?.({ error: code });
      this.onend?.();
    });
  }
}

function installRecognizer() {
  (window as unknown as Record<string, unknown>).SpeechRecognition = FakeRecognition;
}
function removeRecognizer() {
  delete (window as unknown as Record<string, unknown>).SpeechRecognition;
  delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
}

const settle = () => waitFor(() => expect(listMock).toHaveBeenCalled(), { timeout: 1500 });

function setup(props: Partial<React.ComponentProps<typeof ExercisePickerPanel>> = {}) {
  return render(
    <ExercisePickerPanel
      live multiple voiceSearch
      onClose={vi.fn()}
      onSelect={vi.fn()}
      onSelectMany={vi.fn()}
      {...props}
    />,
  );
}

const mic = () => screen.getByRole('button', { name: /search by voice/i });
const micStop = () => screen.getByRole('button', { name: /stop listening/i });
/** Every `q` the component has asked the API for, in order. */
const queries = () => listMock.mock.calls.map((c) => (c[0] as { q?: string }).q);

beforeEach(() => {
  fake = null;
  listMock.mockReset();
  listMock.mockResolvedValue({ exercises: [BENCH, SQUAT] });
  installRecognizer();
});
afterEach(() => { removeRecognizer(); });

describe('the mic is offered only where it can work', () => {
  it('appears when the caller opts in and the browser supports it', async () => {
    setup();
    await settle();
    expect(mic()).toBeInTheDocument();
  });

  it('is absent unless the caller opts in', async () => {
    // The three dialog callers add one exercise mid-task and must be
    // untouched — a mic in four places is four permission prompts.
    setup({ voiceSearch: false });
    await settle();
    expect(screen.queryByRole('button', { name: /search by voice/i })).toBeNull();
  });

  it('is absent in a browser with no recognizer', async () => {
    // Firefox, older WebKit. A button that can only ever explain why it does
    // not work is worse than no button.
    removeRecognizer();
    setup();
    await settle();
    expect(screen.queryByRole('button', { name: /search by voice/i })).toBeNull();
  });
});

describe('speaking a name searches for it', () => {
  it('fills the field and queries the library through the normal path', async () => {
    setup();
    await settle();
    listMock.mockClear();

    fireEvent.click(mic());
    fake!.say('Barbell Bench Press');

    expect(screen.getByLabelText('Search exercises')).toHaveValue('Barbell Bench Press');
    // The whole point: the spoken term reaches the SAME request typing uses.
    await waitFor(() => expect(queries()).toContain('Barbell Bench Press'));
    expect(await screen.findByText('Barbell Bench Press')).toBeInTheDocument();
  });

  it('configures the recognizer for Indian English and one utterance', () => {
    // en-IN, not en-US: it is the model that handles Indian-accented English
    // and Hindi-English code-mixing, which is what a trainer actually speaks.
    setup();
    fireEvent.click(mic());
    expect(fake!.lang).toBe('en-IN');
    expect(fake!.continuous).toBe(false);
    expect(fake!.interimResults).toBe(true);
  });

  it('updates the field live from interim results', async () => {
    // What makes it read as listening rather than as a form submit.
    setup();
    await settle();
    fireEvent.click(mic());

    fake!.say('barbell', false);
    expect(screen.getByLabelText('Search exercises')).toHaveValue('barbell');
    fake!.say('barbell bench', false);
    expect(screen.getByLabelText('Search exercises')).toHaveValue('barbell bench');
  });

  it('debounces, so a spoken phrase is one request and not one per word', async () => {
    // Interim results arrive per-word. Without the existing debounce this
    // would be four requests for one sentence.
    setup();
    await settle();
    listMock.mockClear();

    fireEvent.click(mic());
    fake!.say('barbell', false);
    fake!.say('barbell bench', false);
    fake!.say('barbell bench press', true);

    await waitFor(() => expect(listMock).toHaveBeenCalled());
    expect(listMock).toHaveBeenCalledTimes(1);
    expect(queries()).toEqual(['barbell bench press']);
  });

  it('searches again on a second dictation', async () => {
    // Repeated use is the normal case — a trainer lays out a whole day this
    // way, so the recognizer must be reusable after it ends itself.
    setup();
    await settle();

    fireEvent.click(mic());
    fake!.say('Barbell Bench Press');
    await waitFor(() => expect(queries()).toContain('Barbell Bench Press'));

    // The recognizer stops itself after one utterance.
    act(() => { fake!.onend?.(); });
    fireEvent.click(mic());
    fake!.say('Back Squat');

    expect(screen.getByLabelText('Search exercises')).toHaveValue('Back Squat');
    await waitFor(() => expect(queries()).toContain('Back Squat'));
  });
});

describe('the listening state', () => {
  it('is announced and reflected on the button', async () => {
    setup();
    await settle();
    expect(mic()).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(mic());
    expect(micStop()).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(/listening/i);
  });

  it('stops when the mic is tapped again', async () => {
    setup();
    await settle();
    fireEvent.click(mic());
    fireEvent.click(micStop());

    expect(fake!.stopped).toBe(true);
    expect(mic()).toHaveAttribute('aria-pressed', 'false');
  });

  it('releases the mic when the panel goes away', async () => {
    // A closed dialog must not leave the recording indicator lit.
    const view = setup();
    await settle();
    fireEvent.click(mic());
    view.unmount();
    expect(fake!.aborted).toBe(true);
  });
});

describe('when it does not work', () => {
  it('explains a blocked microphone and stays available to retry', async () => {
    // The fix is in the user's own browser settings, so unlike an unsupported
    // browser the button must remain — they may grant it and try again.
    setup();
    await settle();
    fireEvent.click(mic());
    fake!.fail('not-allowed');

    expect(screen.getByRole('status')).toHaveTextContent(/microphone blocked/i);
    expect(mic()).toBeInTheDocument();
    expect(mic()).toHaveAttribute('aria-pressed', 'false');
  });

  it('says so when it heard nothing', async () => {
    setup();
    await settle();
    fireEvent.click(mic());
    fake!.fail('no-speech');
    expect(screen.getByRole('status')).toHaveTextContent(/did not catch that/i);
  });

  it('reports a missing microphone and a network failure distinctly', async () => {
    // Five API error codes collapse into one string field; a trainer needs to
    // know whether to plug something in or check their signal.
    const view = setup();
    await settle();
    fireEvent.click(mic());
    fake!.fail('audio-capture');
    expect(screen.getByRole('status')).toHaveTextContent(/no microphone found/i);
    view.unmount();

    setup();
    fireEvent.click(mic());
    fake!.fail('network');
    expect(screen.getByRole('status')).toHaveTextContent(/needs a connection/i);
  });

  it('treats the user stopping it as a non-event', async () => {
    // Pressing stop surfaces as an 'aborted' error. Painting that as a
    // failure would make the normal way to finish look broken.
    setup();
    await settle();
    fireEvent.click(mic());
    act(() => { fake!.onerror?.({ error: 'aborted' }); });

    expect(screen.getByRole('status')).not.toHaveTextContent(/did not work|blocked|not catch/i);
  });

  it('clears a previous failure on the next attempt', async () => {
    setup();
    await settle();
    fireEvent.click(mic());
    fake!.fail('no-speech');
    expect(screen.getByRole('status')).toHaveTextContent(/did not catch that/i);

    fireEvent.click(mic());
    expect(screen.getByRole('status')).not.toHaveTextContent(/did not catch that/i);
  });
});

describe('typing is untouched', () => {
  it('still searches, with the mic present and never started', async () => {
    setup();
    await settle();
    listMock.mockClear();

    fireEvent.change(screen.getByLabelText('Search exercises'), { target: { value: 'squat' } });

    await waitFor(() => expect(queries()).toContain('squat'));
    // Rendering a mic must not arm it.
    expect(fake).toBeNull();
  });

  it('lets a typed term overwrite a spoken one', async () => {
    // One field, one source of truth — whichever spoke last wins.
    setup();
    await settle();
    fireEvent.click(mic());
    fake!.say('Barbell Bench Press');
    expect(screen.getByLabelText('Search exercises')).toHaveValue('Barbell Bench Press');

    fireEvent.change(screen.getByLabelText('Search exercises'), { target: { value: 'deadlift' } });
    expect(screen.getByLabelText('Search exercises')).toHaveValue('deadlift');
    await waitFor(() => expect(queries()).toContain('deadlift'));
  });
});
