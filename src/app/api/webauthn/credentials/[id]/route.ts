import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await execute('DELETE FROM webauthn_credentials WHERE credential_id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete credential error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
