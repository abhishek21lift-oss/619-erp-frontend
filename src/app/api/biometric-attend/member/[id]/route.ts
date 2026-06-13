import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: memberId } = await params;
    const range = req.nextUrl.searchParams.get('range') || 'all';
    const date = req.nextUrl.searchParams.get('date');

    let sql: string;
    let sqlParams: any[];

    if (date) {
      sql = 'SELECT * FROM biometric_attendance WHERE member_id = $1 AND date = $2 ORDER BY check_in_time DESC';
      sqlParams = [memberId, date];
    } else if (range === 'monthly') {
      const month = (date || new Date().toISOString().slice(0, 7)).slice(0, 7);
      sql = "SELECT * FROM biometric_attendance WHERE member_id = $1 AND to_char(date, 'YYYY-MM') = $2 ORDER BY date DESC";
      sqlParams = [memberId, month];
    } else {
      sql = 'SELECT * FROM biometric_attendance WHERE member_id = $1 ORDER BY date DESC, check_in_time DESC LIMIT 100';
      sqlParams = [memberId];
    }

    const records = await query(sql, sqlParams);
    return NextResponse.json({ records });
  } catch (err: any) {
    console.error('Member history error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
