/**
 * Face Check-In Page (Server Component)
 *
 * dynamic() with ssr:false must live in a Client Component (Turbopack rule).
 * CheckInClient handles that — this file stays a clean Server Component.
 */
import Guard from '@/components/Guard';
import CheckInClient from './CheckInClient';

export default function CheckInPage() {
  return <Guard><CheckInClient /></Guard>;
}
