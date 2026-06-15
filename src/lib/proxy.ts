import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? '';

function buildHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {};
  const cookie = req.headers.get('cookie');
  if (cookie) headers['cookie'] = cookie;
  const auth = req.headers.get('authorization');
  if (auth) headers['authorization'] = auth;
  const ct = req.headers.get('content-type');
  if (ct) headers['content-type'] = ct;
  return headers;
}

/**
 * Forward a Next.js API request to the Express backend and return the response.
 * Preserves auth cookies, query params, and request body.
 */
export async function proxyToBackend(
  req: NextRequest,
  backendPath: string,
): Promise<NextResponse> {
  try {
    const url = new URL(`${BACKEND}${backendPath}`);
    req.nextUrl.searchParams.forEach((val, key) => url.searchParams.set(key, val));

    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const body = hasBody ? await req.text() : undefined;

    const res = await fetch(url.toString(), {
      method: req.method,
      headers: buildHeaders(req),
      body: body || undefined,
    });

    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
      const text = await res.text();
      return new NextResponse(text, {
        status: res.status,
        headers: { 'content-type': contentType },
      });
    }

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error(`[proxy] ${req.method} ${backendPath} failed:`, err.message);
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}
