'use client';

/**
 * Dictation via the Web Speech API, which is a browser feature and not a
 * service we run.
 *
 * It is genuinely absent on Firefox and on some Android browsers, so
 * `supported` is checked by feature detection at mount and the caller hides
 * the microphone rather than offering a button that does nothing. It is also
 * permission-gated: the first tap raises the browser's own microphone prompt,
 * and a denial arrives as an error event, not an exception.
 *
 * `interimResults` is on so the text appears while you are still speaking —
 * without it the input sits empty for the whole sentence and the feature feels
 * broken even when it is working.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechRecognitionAlternativeLike { transcript: string }
interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
  isFinal: boolean;
  length: number;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [i: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
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

export function useVoiceInput(onTranscript: (text: string, final: boolean) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  // The callback changes identity on every render of the panel; holding it in
  // a ref keeps the recognition object from being torn down and rebuilt
  // mid-sentence.
  const cbRef = useRef(onTranscript);
  cbRef.current = onTranscript;

  useEffect(() => {
    setSupported(getCtor() !== null);
    return () => { recRef.current?.abort(); recRef.current = null; };
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    recRef.current?.abort();
    setError(null);

    const rec = new Ctor();
    rec.lang = typeof navigator !== 'undefined' ? navigator.language || 'en-IN' : 'en-IN';
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = (e) => {
      let text = '';
      let final = false;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
        if (e.results[i].isFinal) final = true;
      }
      cbRef.current(text, final);
    };
    rec.onerror = (e) => {
      setError(
        e.error === 'not-allowed'
          ? 'Microphone access was blocked.'
          : e.error === 'no-speech'
            ? "I didn't catch that."
            : 'Voice input failed.',
      );
      setListening(false);
    };
    rec.onend = () => setListening(false);

    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      // start() throws if called twice before onend; not worth surfacing.
      setListening(false);
    }
  }, []);

  return { supported, listening, error, start, stop, toggle: () => (listening ? stop() : start()) };
}
