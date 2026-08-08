'use client';

import { TrendingUp } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import ClientPicker from '@/components/pt-os/shared/ClientPicker';

// Sidebar landing point for the client-scoped Progress Report — training
// volume, strength, adherence and PR timeline. A client's report lives at
// /pt-os/clients/[id]/training/analytics, which is a path segment and not a
// query parameter, so hrefFor builds it — same shape as the Workout Log
// landing page.
//
// This route used to point straight at /pt-os/reports, which is PT revenue
// and trainer-commission data, not a client's own progress. That page still
// exists — it moved to Insights, where the rest of the studio's financial
// reports live — and this one now shows what "Progress Report" actually says
// it shows.
export default function ProgressReportLandingPage() {
  return (
    <Guard>
      <AppShell>
        <ClientPicker
          title="Progress Report"
          subtitle="Pick a client to see their training progress"
          icon={<TrendingUp size={20} color="#fff" />}
          basePath="/pt-os/progress-report"
          hrefFor={(id) => `/pt-os/clients/${id}/training/analytics`}
        />
      </AppShell>
    </Guard>
  );
}
