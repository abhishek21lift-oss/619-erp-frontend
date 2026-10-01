// Server-side hint for the landing gate at `/`.
//
// `/` is the public landing page for a visitor and the studio dashboard for a
// signed-in user, and which one it is gets decided in the browser once the
// session check (/api/auth/me) settles. Until then everyone saw a loading
// splash — including in the server-rendered HTML, so a crawler reading `/`
// without running JavaScript found a logo and the word "Loading" instead of
// the page it is indexing.
//
// A request with no `token` cookie (the access-token cookie the API sets on
// sign-in, path `/`) is very probably a visitor, so the server renders the
// landing page into the HTML and the splash goes over it until the session
// check answers. It is only ever a hint: a person whose access cookie has
// expired may still be signed in through the refresh cookie (path /api/auth,
// so not sent here). They see the same splash they always did, and then the
// dashboard. Nothing about access is decided from this — Guard and the API
// do that, exactly as before.
import { cookies } from 'next/headers';

export const ACCESS_COOKIE = 'token';

export async function isAnonymousRequest(): Promise<boolean> {
  return !(await cookies()).has(ACCESS_COOKIE);
}
