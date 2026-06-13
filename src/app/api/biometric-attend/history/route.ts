import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const memberId = req.nextUrl.searchParams.get('member_id');
    const range = req.nextUrl.searchParams.get('range') || 'daily';
    const date = req.nextUrl.searchParams.get('date') || new Date().toISOString().slice(0, 10);

    let sql: string;
    let params: any[];

    if (memberId) {
      sql = 'SELECT * FROM biometric_attendance WHERE member_id = $1 ORDER BY date DESC, check_in_time DESC';
      params = [memberId];
    } else if (range === 'monthly') {
      const month = date.slice(0, 7);
      sql = "SELECT * FROM biometric_attendance WHERE to_char(date, 'YYYY-MM') = $1 ORDER BY date DESC, check_in_time DESC";
      params = [month];
    } else if (range === 'weekly') {
      const d = new Date(date);
      const start = new Date(d);
      start.setDate(d.getDate() - d.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      sql = 'SELECT * FROM biometric_attendance WHERE date >= $1 AND date <= $2 ORDER BY date DESC, check_in_time DESC';
      params = [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)];
    } else {
      sql = 'SELECT * FROM biometric_attendance WHERE date = $1 ORDER BY check_in_time DESC';
      params = [date];
    }

    const records = await query(sql, params);
    return NextResponse.json({ records, total: records.length });
  } catch (err: any) {
    console.error('History error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
