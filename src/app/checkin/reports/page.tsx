// Biometric Reports has been merged into Attendance Reports & Dashboard.
// This redirect ensures any bookmarked links still work.
import { redirect } from 'next/navigation';

export default function BiometricReportsRedirect() {
  redirect('/attendance/reports');
}
