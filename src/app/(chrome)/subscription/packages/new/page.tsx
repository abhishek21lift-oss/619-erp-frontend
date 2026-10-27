'use client';

// Creating a package, at its own URL.
//
// This was a floating sheet over the catalogue. A dedicated page gives the six
// fields room, keeps the list out of the tab order behind it, and follows the
// same create-page pattern as programmes and leads.
//
// Editing stays on the list as a dialog: it starts and ends on the card being
// changed. The fields and the API calls are shared — see PackageForm.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Package } from 'lucide-react';
import Guard from '@/components/Guard';
import { PageContainer, PageHero } from '@/components/ui';
import { PackageForm } from '@/components/packages/PackageForm';

export default function NewPackagePage() {
  const router = useRouter();

  return (
    <Guard role="trainer">
      <PageContainer>
        <PageHero
          icon={<Package size={20} />}
          title="Create Package"
          subtitle="Name, sessions, duration and price. The price is what every enrolment against it charges."
          actions={
            <Link
              href="/subscription/packages"
              className="inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-[12px] font-semibold transition active:scale-95"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff' }}
            >
              <ArrowLeft size={14} aria-hidden /> Back to packages
            </Link>
          }
        />

        <div
          className="mx-auto w-full max-w-[600px] rounded-[20px] p-5 sm:p-6"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}
        >
          <PackageForm
            editing={null}
            onCancel={() => router.push('/subscription/packages')}
            onSaved={() => router.push('/subscription/packages')}
          />
        </div>
      </PageContainer>
    </Guard>
  );
}
