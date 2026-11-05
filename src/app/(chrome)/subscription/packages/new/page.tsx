'use client';

// Creating a package, at its own URL.
//
// This was a floating sheet over the catalogue. A dedicated page gives the six
// fields room, keeps the list out of the tab order behind it, and follows the
// same create-page pattern as programmes and leads.
//
// Editing stays on the list as a dialog: it starts and ends on the card being
// changed. The fields and the API calls are shared — see PackageForm.

import { useRouter } from 'next/navigation';
import { ArrowLeft, Package } from 'lucide-react';
import Guard from '@/components/Guard';
import { Button, PageActions, PageContainer, PageHero } from '@/components/ui';
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
        />
        <PageActions>
          <Button
            variant="secondary"
            onClick={() => router.push('/subscription/packages')}
            iconLeft={<ArrowLeft size={14} aria-hidden />}
          >
            Back to packages
          </Button>
        </PageActions>

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
