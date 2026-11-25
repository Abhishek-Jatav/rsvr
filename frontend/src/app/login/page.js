import PageShell from '@/components/PageShell';
import LoginForm from '@/features/auth/LoginForm';

export const metadata = { title: 'Sign in · RSVR Secure Auth' };

export default function LoginPage() {
  return (
    <PageShell title="Sign in" intro="Enter your registered email. We will send you a six-digit code, or you can use a passkey.">
      <LoginForm />
    </PageShell>
  );
}
