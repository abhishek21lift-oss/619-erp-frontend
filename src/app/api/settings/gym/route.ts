import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

// Thin pass-through to the Express backend, same as every other route under
// src/app/api. It used to call requireAuth() first, verifying the JWT here
// before forwarding — which looked like defence in depth but was not:
// the request is forwarded with its cookie and Authorization header intact and
// the backend authenticates it anyway, so the local check could only ever
// reject requests the backend was going to reject a moment later.
//
// It was not free, either. Verifying a signature locally meant the frontend
// needed JWT_SECRET — the *same symmetric secret the backend signs with* —
// copied into the frontend's environment, so anyone with access to it
// could mint valid admin tokens. And if the variable was missing, this route
// answered 500 "Server misconfiguration" rather than degrading: the gym
// settings on the check-in page silently failed to load.
//
// Dropping the local check removes that secret from the frontend's
// requirements entirely, at the cost of one extra network hop for requests
// that were unauthenticated to begin with.
export async function GET(req: NextRequest) {
  return proxyToBackend(req, '/api/settings/gym');
}

export async function PUT(req: NextRequest) {
  return proxyToBackend(req, '/api/settings/gym');
}
