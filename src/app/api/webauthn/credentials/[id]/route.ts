import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';
import { requireRole } from '@/lib/require-auth';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Only admins and managers can delete WebAuthn credentials
  const auth = await requireRole(req, 'admin', 'manager');
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    await execute('DELETE FROM webauthn_credentials WHERE credential_id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete credential error:', err);
    return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
  }
}
