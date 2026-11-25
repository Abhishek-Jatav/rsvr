'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Alert from '@/components/Alert';
import Button from '@/components/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import { formatDateOnly } from '@/lib/validation';

const METHOD_LABEL = { email_otp: 'Email code', passkey: 'Passkey' };

function Card({ title, children }) {
  const headingId = `card-${title.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <section aria-labelledby={headingId} className="min-w-0 rounded-lg border border-line p-4 sm:p-5">
      <h2 id={headingId} className="text-base font-semibold">{title}</h2>
      <dl className="mt-3 space-y-3">{children}</dl>
    </section>
  );
}

function Row({ label, children }) {
  return (
    <div>
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="break-words text-base font-medium">{children}</dd>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { status, user, session, passkeyCount, error, logout, refresh } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  async function onLogout() {
    setLoggingOut(true);
    setLogoutError('');
    try {
      await logout();
      router.replace('/login');
    } catch (err) {
      setLogoutError(err.message);
      setLoggingOut(false);
    }
  }

  if (status === 'loading') return <p role="status" className="text-ink-muted">Loading your account…</p>;

  if (status === 'unauthenticated') {
    return error ? (
      <div className="space-y-4">
        <Alert tone="error">{error}</Alert>
        <Button variant="secondary" onClick={refresh}>Try again</Button>
      </div>
    ) : (
      <p role="status" className="text-ink-muted">Redirecting to sign in…</p>
    );
  }

  return (
    <div className="space-y-5">
      {logoutError && <Alert tone="error">{logoutError}</Alert>}
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Profile">
          <Row label="Surname">{user.surname}</Row>
          <Row label="Email">{user.email}</Row>
          <Row label="Phone">{user.phone || 'Not provided'}</Row>
          <Row label="Date of birth">{formatDateOnly(user.dob)}</Row>
        </Card>
        <Card title="This session">
          <Row label="Status">
            <span className="inline-flex items-center gap-2 rounded-full border border-success-line bg-success-soft px-3 py-0.5 text-sm font-semibold text-success">
              <span aria-hidden="true">●</span> Active
            </span>
          </Row>
          <Row label="Signed in with">{METHOD_LABEL[session.authenticationMethod] || session.authenticationMethod}</Row>
          <Row label="Passkeys saved">{passkeyCount}</Row>
        </Card>
      </div>
      <p className="text-sm text-ink-muted">
        Only one session can be active per account. Log out here before signing in on another device.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/passkey" className="btn btn-secondary sm:w-auto">
          {passkeyCount > 0 ? 'Add another passkey' : 'Add a passkey'}
        </Link>
        <Button onClick={onLogout} loading={loggingOut} loadingText="Logging out…" className="sm:w-auto">Log out</Button>
      </div>
    </div>
  );
}
