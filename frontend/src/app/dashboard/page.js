'use client';
import PageShell from '@/components/PageShell';
import Dashboard from '@/features/dashboard/Dashboard';

export default function DashboardPage() {
  return (
    <PageShell title="Your account" intro="Only you can see this page while you are signed in." wide>
      <Dashboard />
    </PageShell>
  );
}
