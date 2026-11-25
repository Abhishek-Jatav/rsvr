import PageShell from '@/components/PageShell';
import RegisterForm from '@/features/auth/RegisterForm';

export const metadata = { title: 'Create account · RSVR Secure Auth' };

export default function RegisterPage() {
  return (
    <PageShell title="Create your account" intro="Tell us a little about yourself. You will sign in with a one-time code sent to your email.">
      <RegisterForm />
    </PageShell>
  );
}
