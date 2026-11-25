import PageShell from '@/components/PageShell';
import OtpForm from '@/features/auth/OtpForm';

export const metadata = { title: 'Enter your code · RSVR Secure Auth' };

export default function VerifyPage() {
  return (
    <PageShell title="Enter your code">
      <OtpForm />
    </PageShell>
  );
}
