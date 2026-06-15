import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? '';

function forwardHeaders(req: NextRequest): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const cookie = req.headers.get('cookie');
  if (cookie) headers['cookie'] = cookie;
  const auth = req.headers.get('authorization');
  if (auth) headers['authorization'] = auth;
  return headers;
}

export async function GET(req: NextRequest) {
  try {
    const res = await fetch(`${BACKEND}/api/settings/gym`, {
      headers: forwardHeaders(req),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error('Proxy GET /api/settings/gym error:', err.message);
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.text();
    const res = await fetch(`${BACKEND}/api/settings/gym`, {
      method: 'PUT',
      headers: forwardHeaders(req),
      body,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error('Proxy PUT /api/settings/gym error:', err.message);
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}
