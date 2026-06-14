import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/require-auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const today = new Date().toISOString().slice(0, 10);

    const allRows: any[] = await query(
      'SELECT id, member_id, member_name, check_in_time, verification_method, device_name, attendance_status FROM biometric_attendance WHERE date = $1 ORDER BY check_in_time DESC',
      [today],
    );

    const present = allRows.filter((r) => r.attendance_status === 'present').length;
    const late = allRows.filter((r) => r.attendance_status === 'late').length;
    const total = allRows.length;

    const feed = allRows.slice(0, 50).map((r) => ({
      id: r.id,
      memberName: r.member_name || r.member_id,
      checkInTime: r.check_in_time,
      verificationMethod: r.verification_method,
      deviceName: r.device_name,
    }));

    const memberIds = allRows.map((r: any) => r.member_id);
    const absent = memberIds.length > 0
      ? (await query(
          `SELECT COUNT(*)::int AS cnt FROM members WHERE deleted_at IS NULL AND id != ALL($1::text[])`,
          [memberIds],
        ))[0]?.cnt || 0
      : 0;

    return NextResponse.json({ present, absent, late, active: total, feed });
  } catch (err: any) {
    console.error('Today stats error:', err);
    return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
  }
}
