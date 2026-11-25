import PageShell from '@/components/PageShell';
import PasskeyPanel from '@/features/auth/PasskeyPanel';

export const metadata = { title: 'Passkey · RSVR Secure Auth' };

export default function PasskeyPage() {
  return (
    <PageShell title="Passkey">
      <PasskeyPanel />
    </PageShell>
  );
}
