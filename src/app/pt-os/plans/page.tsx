import { redirect } from 'next/navigation';

export default function PtPlansRedirect() {
  redirect('/subscription/packages');
}
