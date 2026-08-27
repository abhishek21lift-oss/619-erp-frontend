/**
 * Add a batch of exercises one at a time, keeping the order they were picked.
 *
 * ── Why not Promise.all ────────────────────────────────────────────────────
 *
 * The server appends each new row to the end of the day, so a row's position
 * is decided by the order its request ARRIVES, not by anything in the payload.
 * Firing the batch concurrently hands the day's running order to the network:
 * a trainer who picked Squat, Bench, Row would get them back in whatever
 * sequence the requests happened to land, and would then have to drag them
 * into the order they already chose.
 *
 * That is slower by a round trip per exercise, and it is the right trade — the
 * alternative is fast and wrong.
 *
 * ── Why a partial failure keeps what landed ────────────────────────────────
 *
 * The rows that succeeded exist server-side. Discarding them locally to make
 * the batch look atomic would show a day that disagrees with the database
 * until the next refresh, which is worse than an honest partial result. The
 * count comes back so the caller can say what happened rather than leaving
 * silence to be read as success.
 *
 * Extracted from WorkoutBuilder so the ordering guarantee is a named, tested
 * unit instead of a loop inside a component that is expensive to render.
 */
export async function addSequentially<T>(
  picked: readonly { id: string; name: string }[],
  add: (exerciseId: string) => Promise<T>,
): Promise<{ created: T[]; failed: number }> {
  const created: T[] = [];
  let failed = 0;

  for (const exercise of picked) {
    try {
      created.push(await add(exercise.id));
    } catch {
      // Counted, not thrown: one rejected movement must not abandon the rest
      // of a batch the trainer has already chosen.
      failed += 1;
    }
  }

  return { created, failed };
}
