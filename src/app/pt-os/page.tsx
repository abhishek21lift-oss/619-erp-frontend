'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PtOsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/pt-os/dashboard'); }, [router]);
  return null;
}