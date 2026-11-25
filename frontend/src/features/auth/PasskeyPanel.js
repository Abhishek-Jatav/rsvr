'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Alert from '@/components/Alert';
import Button from '@/components/Button';
import { api, ApiError } from '@/lib/api';
import { clearPendingEmail, getPendingEmail } from '@/lib/pendingEmail';
import { authenticateWithPasskey, createPasskey, describePasskeyError, passkeysSupported } from '@/lib/webauthn';
import { useAuth } from './AuthProvider';

/**
 * One screen, two modes:
 *  - signed in  -> enrol a passkey for this account
 *  - signed out -> sign in with a passkey for the email entered on the login screen
 */
export default function PasskeyPanel() {
  const router = useRouter();
  const { status, user, passkeyCount, refresh } = useAuth();
  const [supported, setSupported] = useState(null);
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | working | success
  const [notice, setNotice] = useState({ tone: '', text: '', code: '' });

  useEffect(() => { setSupported(passkeysSupported()); setEmail(getPendingEmail()); }, []);

  const enrolling = status === 'authenticated';

  useEffect(() => {
    if (status === 'unauthenticated' && !getPendingEmail()) router.replace('/login');
  }, [status, router]);

  async function enrol() {
    setPhase('working');
    setNotice({ tone: '', text: '', code: '' });
    try {
      const options = await api.passkeyRegisterOptions();
      const response = await createPasskey(options);
      await api.passkeyRegisterVerify(response);
      await refresh();
      setPhase('success');
    } catch (err) {
      fail(err);
    }
  }

  async function signIn() {
    setPhase('working');
    setNotice({ tone: '', text: '', code: '' });
    try {
      const options = await api.passkeyLoginOptions(email);
      const response = await authenticateWithPasskey(options);
      await api.passkeyLoginVerify(email, response);
      clearPendingEmail();
      await refresh();
      router.replace('/dashboard');
    } catch (err) {
      fail(err);
    }
  }

  function fail(err) {
    setPhase('idle');
    if (err instanceof ApiError) {
      const tone = err.code === 'ACTIVE_SESSION_EXISTS' || err.code === 'PASSKEY_NOT_AVAILABLE' ? 'warning' : 'error';
      setNotice({ tone, text: err.message, code: err.code });
      return;
    }
    const friendly = describePasskeyError(err);
    setNotice({
      tone: friendly && friendly.kind === 'cancelled' ? 'warning' : 'error',
      text: friendly ? friendly.message : 'Something went wrong with the passkey. Please try again or use an email code.',
      code: friendly ? friendly.kind : 'ERROR',
    });
  }

  if (supported === null || status === 'loading') return <p role="status" className="text-ink-muted">Loading…</p>;

  if (!supported) {
    return (
      <div className="space-y-5">
        <Alert tone="warning">
          This browser or device does not support passkeys. You can still sign in with an email code.
        </Alert>
        <Link href={enrolling ? '/dashboard' : '/login'} className="btn btn-primary">
          {enrolling ? 'Back to your account' : 'Use an email code'}
        </Link>
      </div>
    );
  }

  const explainer = (
    <p className="text-base leading-relaxed text-ink-muted">
      Your device may ask for Face ID, a fingerprint, a PIN or another unlock method. That check happens on your device.
      This site never receives your biometric data. It only saves a public key.
    </p>
  );

  if (phase === 'success') {
    return (
      <div className="space-y-5">
        <Alert tone="success">Passkey saved. Next time you can sign in with it.</Alert>
        <Link href="/dashboard" className="btn btn-primary">Back to your account</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-lg font-semibold">
        {enrolling ? 'Add a passkey to your account' : 'Sign in with your passkey'}
      </p>
      {explainer}
      {enrolling && (
        <p className="text-sm text-ink-muted">
          Signed in as <strong className="break-all text-ink">{user.email}</strong>. Passkeys saved: {passkeyCount}.
        </p>
      )}
      {!enrolling && email && (
        <p className="text-sm text-ink-muted">
          Signing in as <strong className="break-all text-ink">{email}</strong>.
        </p>
      )}

      {notice.text && (
        <Alert tone={notice.tone}>
          {notice.text}
        </Alert>
      )}

      {phase === 'working' && (
        <Alert tone="info">Waiting for your device. Follow the prompt on your screen. You can cancel it at any time.</Alert>
      )}

      <Button onClick={enrolling ? enrol : signIn} loading={phase === 'working'} loadingText="Waiting for your device…">
        {notice.text && notice.code !== 'PASSKEY_NOT_AVAILABLE' ? 'Try again' : enrolling ? 'Create a passkey' : 'Use my passkey'}
      </Button>

      <Link href={enrolling ? '/dashboard' : '/login'} className="btn btn-secondary">
        {enrolling ? 'Not now' : 'Use an email code instead'}
      </Link>
    </div>
  );
}
