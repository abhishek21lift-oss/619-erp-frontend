'use client';

// Authoring a custom exercise, at its own URL.
//
// This was a modal over the library. The form is long enough to scroll on a
// laptop and much longer than a phone screen, and a sheet that tall fights the
// page behind it for the scroll. Giving it a route also means a half-written
// exercise survives a reload, can be linked to, and Back does the obvious
// thing instead of silently discarding the draft.
//
// The builder links here with `returnTo` when an exercise is missing from the
// library, plus the name that was typed. Saving returns to that screen with
// `?new=<id>`, which the add-exercises screen attaches to the day.
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Guard from '@/components/Guard';
import { ExerciseEditor } from '@/components/pt-os/exercise-library/ExerciseEditor';
import { api } from '@/lib/api';
import type { ExerciseMeta, LibraryExercise } from '@/lib/api';

export default function NewExercisePage() {
  return (
    <Guard>
      {/* useSearchParams needs a boundary when this page is prerendered. */}
      <Suspense fallback={null}>
        <NewExerciseContent />
      </Suspense>
    </Guard>
  );
}

/** Only in-app destinations; a query string can be edited by hand. */
function safeReturnTo(raw: string | null): string | null {
  return raw && raw.startsWith('/pt-os/') ? raw : null;
}

function withNewExercise(href: string, id: string): string {
  const url = new URL(href, 'http://local');
  url.searchParams.set('new', id);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

function NewExerciseContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const returnTo = safeReturnTo(sp.get('returnTo'));
  const initialName = sp.get('name')?.trim().slice(0, 120) ?? '';
  // Editing a built-in opens this page with `template=<id>`. The copy is
  // written only when the trainer saves, so abandoning the form leaves no
  // orphan `(Copy)` row in the library.
  const templateId = sp.get('template')?.trim() ?? '';
  const [meta, setMeta] = useState<ExerciseMeta | null>(null);
  const [template, setTemplate] = useState<LibraryExercise | null>(null);
  const [templateState, setTemplateState] = useState<'loading' | 'ready'>(templateId ? 'loading' : 'ready');
  // onSaved and onClose fire back-to-back after a save; the close handler is
  // the one that navigates, so it must know an id was just created.
  const savedId = useRef<string | null>(null);

  useEffect(() => {
    // The dropdowns degrade to free text without this, so a failure here is
    // not worth blocking authoring over.
    api.exercises.meta().then(setMeta).catch(() => {});
  }, []);

  useEffect(() => {
    if (!templateId) return;
    let alive = true;
    api.exercises.get(templateId)
      .then((ex) => {
        if (!alive) return;
        setTemplate(ex);
        setTemplateState('ready');
      })
      .catch(() => {
        // A deleted or invisible template is not a dead end: fall back to a
        // blank create form rather than refusing to author.
        if (alive) setTemplateState('ready');
      });
    return () => { alive = false; };
  }, [templateId]);

  const back = useCallback(() => {
    if (returnTo && savedId.current) router.push(withNewExercise(returnTo, savedId.current));
    else router.push(returnTo ?? '/pt-os/exercise-library');
  }, [router, returnTo]);

  const onSaved = useCallback((ex: LibraryExercise) => {
    // Land on the library with the new exercise in it rather than on an empty
    // form the trainer would have to dismiss.
    savedId.current = ex.id;
  }, []);

  if (templateState === 'loading') {
    return (
      <main className="mx-auto w-full max-w-3xl space-y-3.5 pt-1" aria-busy="true">
        <div className="h-[168px] animate-pulse rounded-[26px] bg-slate-200/70 dark:bg-white/[0.06]" />
        <div className="h-[220px] animate-pulse rounded-[22px] bg-slate-200/50 dark:bg-white/[0.04]" />
        <p className="sr-only">Loading the exercise to copy…</p>
      </main>
    );
  }

  return (
    <ExerciseEditor
      exercise={null}
      template={template}
      meta={meta}
      initialName={initialName}
      onClose={back}
      onSaved={onSaved}
    />
  );
}
