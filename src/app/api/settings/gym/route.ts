import { NextRequest, NextResponse } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/require-auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const settings = await queryOne<any>('SELECT geofence_lat, geofence_lng, geofence_radius, enable_face_id, enable_touch_id, enable_gps, duplicate_window_minutes, auto_checkout, auto_checkout_minutes FROM gym_settings WHERE id = 1');
    if (!settings) {
      return NextResponse.json({
        geofence_lat: 19.0760, geofence_lng: 72.8777, geofence_radius: 100,
        enable_face_id: true, enable_touch_id: true, enable_gps: true,
        duplicate_window_minutes: 60, auto_checkout: false, auto_checkout_minutes: 120,
      });
    }
    return NextResponse.json(settings);
  } catch (err: any) {
    console.error('Get gym settings error:', err);
    return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  // Only admins and managers can change gym security settings
  const auth = await requireRole(req, 'admin', 'manager');
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { geofence_lat, geofence_lng, geofence_radius, enable_face_id, enable_touch_id, enable_gps, duplicate_window_minutes, auto_checkout, auto_checkout_minutes } = body;

    await execute(
      `UPDATE gym_settings SET
        geofence_lat = $1, geofence_lng = $2, geofence_radius = $3,
        enable_face_id = $4, enable_touch_id = $5, enable_gps = $6,
        duplicate_window_minutes = $7, auto_checkout = $8, auto_checkout_minutes = $9
       WHERE id = 1`,
      [
        geofence_lat ?? 19.0760, geofence_lng ?? 72.8777, geofence_radius ?? 100,
        enable_face_id ?? true, enable_touch_id ?? true, enable_gps ?? true,
        duplicate_window_minutes ?? 60, auto_checkout ?? false, auto_checkout_minutes ?? 120,
      ],
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Update gym settings error:', err);
    return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
  }
}
