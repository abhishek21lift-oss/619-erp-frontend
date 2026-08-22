'use client';

// Speak a search term instead of typing it.
//
// ── Why a hook and not a component ─────────────────────────────────────────
//
// The only thing this owns is a browser API with an awkward lifecycle: it is
// vendor-prefixed on the browser most people use, it throws if you start it
// twice, it stops on its own after one utterance, and it reports five
// different failures through one `error` string. None of that is anybody's
// layout problem, so it lives here and the caller renders whatever button it
// likes around `listening` / `status`.
//
// ── One language, and why it is en-IN ──────────────────────────────────────
//
// The Web Speech API takes exactly one BCP-47 tag per session — there is no
// "listen for either" mode to ask for. en-IN is the Indian-English model:
// it handles Indian-accented English and the Hindi-English code-mixing a
// trainer actually speaks ("chest press lagana hai") far better than en-US,
// which mis-hears both. A language picker on a search box would be a setting
// nobody wants to open mid-session, so this is the one honest default rather
// than a choice pushed onto the user.
//
// ── Interim results are on ─────────────────────────────────────────────────
//
// The field fills in as the words land rather than after a pause, which is
// what makes it read as live. The caller is expected to debounce whatever it
// does with the transcript; every consumer here already debounces its own
// search, so interim results cost no extra requests.

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * `idle` covers "supported, not running" — the button's resting state.
 * `unsupported` is terminal: nothing here will ever work in this browser.
 */
export type VoiceStatus = 'unsupported' | 'idle' | 'listening' | 'denied' | 'error';

// The DOM lib ships SpeechRecognitionResult/ResultList but not the recognizer
// itself, so the surface this file touches is declared here rather than
// pulling a dependency in for four members.
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
interface SpeechRecognitionResultEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * What each failure means to the person holding the phone.
 *
 * `aborted` is deliberately absent: it is what fires when the caller stops
 * the recognizer, i.e. the user pressing the button again, which is not an
 * error and must not paint one.
 */
function messageFor(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone blocked. Allow mic access in your browser settings, then try again.';
    case 'no-speech':
      return 'Did not catch that. Tap the mic and speak again.';
    case 'audio-capture':
      return 'No microphone found. Check that one is connected.';
    case 'network':
      return 'Speech recognition needs a connection. Check your network.';
    case 'language-not-supported':
      return 'This browser cannot recognise speech in that language.';
    default:
      return 'Voice search did not work. Try again, or type instead.';
  }
}

export interface UseVoiceSearchOptions {
  /**
   * Fires for every result, interim ones included, so the caller can fill a
   * field live. `isFinal` marks the recognizer's own last word on an
   * utterance — useful for firing something once, not for display.
   */
  onResult: (transcript: string, isFinal: boolean) => void;
  /** BCP-47 tag. See the note above before changing this. */
  lang?: string;
}

export interface UseVoiceSearchReturn {
  /** False when the browser has no recognizer at all (Firefox, older WebKit). */
  supported: boolean;
  listening: boolean;
  status: VoiceStatus;
  /** Human-readable, already mapped from the API's error code. '' when fine. */
  error: string;
  /** Start if idle, stop if listening. What the mic button calls. */
  toggle: () => void;
  stop: () => void;
}

export function useVoiceSearch({ onResult, lang = 'en-IN' }: UseVoiceSearchOptions): UseVoiceSearchReturn {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState<VoiceStatus>('unsupported');
  const [error, setError] = useState('');

  const recRef = useRef<SpeechRecognitionLike | null>(null);

  // The recognizer outlives any single render, so its handlers must not close
  // over a stale callback. Same ref pattern the exercise picker already uses
  // for its document keydown listener: attach once, delegate to the latest.
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  // Support is a client fact — deciding it during render would disagree with
  // the server's HTML and hydrate wrong.
  useEffect(() => {
    const ok = getCtor() !== null;
    setSupported(ok);
    setStatus(ok ? 'idle' : 'unsupported');
  }, []);

  const stop = useCallback(() => {
    // stop(), not abort(): the user pressing the button again means "that's
    // what I said", so the recognizer should finalise what it has rather than
    // throw the last word away.
    try { recRef.current?.stop(); } catch { /* already stopped */ }
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) { setStatus('unsupported'); return; }
    // Starting a running recognizer throws InvalidStateError.
    if (recRef.current) return;

    setError('');

    let rec: SpeechRecognitionLike;
    try { rec = new Ctor(); } catch {
      setStatus('error');
      setError(messageFor('unknown'));
      return;
    }

    rec.lang = lang;
    // One utterance, then it stops itself — this is a search box, not
    // dictation. Interim results so the field fills in as they speak.
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => { setListening(true); setStatus('listening'); };

    rec.onresult = (e) => {
      let text = '';
      let isFinal = false;
      // Concatenate from 0 rather than resultIndex: with interimResults on,
      // a multi-segment utterance reports only the changed tail, and reading
      // just that would drop the words already spoken.
      for (let i = 0; i < e.results.length; i += 1) {
        const r = e.results[i];
        text += r[0]?.transcript ?? '';
        if (r.isFinal) isFinal = true;
      }
      const trimmed = text.trim();
      if (trimmed) onResultRef.current(trimmed, isFinal);
    };

    rec.onerror = (e) => {
      // The user pressing stop surfaces here as 'aborted'. Not a failure.
      if (e.error === 'aborted') return;
      const denied = e.error === 'not-allowed' || e.error === 'service-not-allowed';
      setStatus(denied ? 'denied' : 'error');
      setError(messageFor(e.error));
      setListening(false);
    };

    rec.onend = () => {
      recRef.current = null;
      setListening(false);
      // Only back to idle if nothing is being reported — an error must
      // survive the end event that always follows it.
      setStatus((s) => (s === 'listening' ? 'idle' : s));
    };

    try {
      rec.start();
      recRef.current = rec;
    } catch {
      recRef.current = null;
      setStatus('error');
      setError(messageFor('unknown'));
      setListening(false);
    }
  }, [lang]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  // abort(), not stop(), on unmount: the screen is gone, so a final result
  // would be delivered to a callback nobody is listening to, and on some
  // builds keeps the mic indicator lit.
  useEffect(() => () => {
    try { recRef.current?.abort(); } catch { /* nothing to abort */ }
    recRef.current = null;
  }, []);

  return { supported, listening, status, error, toggle, stop };
}
