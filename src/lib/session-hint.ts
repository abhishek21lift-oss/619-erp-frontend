// Server-side hint for the landing gate at `/`.
//
// `/` is the public landing page for a visitor and the studio dashboard for a
// signed-in user, and which one it is gets decided in the browser once the
// session check (/api/auth/me) settles. Until then everyone saw a loading
// splash — including in the server-rendered HTML, so a crawler reading `/`
// without running JavaScript found a logo and the word "Loading" instead of
// the page it is indexing.
//
// A request with no access-token cookie (the API sets one per door on sign-in,
// path `/`) is very probably a visitor, so the server renders the landing page
// into the HTML and the splash goes over it until the session check answers.
// It is only ever a hint: a person whose access cookie has expired may still
// be signed in through the refresh cookie (path /api/auth, so not sent here).
// They see the same splash they always did, and then the dashboard. Nothing
// about access is decided from this — Guard and the API do that, exactly as
// before.
import { cookies } from 'next/headers';
import { ACCESS_COOKIE_NAMES } from './portals';

export const ACCESS_COOKIE = 'token';

export async function isAnonymousRequest(): Promise<boolean> {
  // Any door's access cookie means "probably signed in", which is all this
  // hint claims. `/` is a trainer page, but a member session still belongs to
  // a real person, and showing them the marketing page would be a worse guess
  // than the splash.
  const jar = await cookies();
  return !ACCESS_COOKIE_NAMES.some((name) => jar.has(name));
}
