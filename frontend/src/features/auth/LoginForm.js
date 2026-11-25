'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Alert from '@/components/Alert';
import Button from '@/components/Button';
import TextField from '@/components/TextField';
import { api, ApiError } from '@/lib/api';
import { normalizeEmail, validateEmail } from '@/lib/validation';
import { getPendingEmail, setPendingEmail } from '@/lib/pendingEmail';
import { passkeysSupported } from '@/lib/webauthn';
import { useAuth } from './AuthProvider';

export default function LoginForm() {
  const router = useRouter();
  const { status } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [sending, setSending] = useState(false);
  const [recentCode, setRecentCode] = useState(false);
  const [canUsePasskey, setCanUsePasskey] = useState(false);

  useEffect(() => {
    setEmail(getPendingEmail());
    setCanUsePasskey(passkeysSupported());
  }, []);

  // Someone who is already signed in has nothing to do here.
  useEffect(() => {
    if (status === 'authenticated') router.replace('/dashboard');
  }, [status, router]);

  function checkEmail() {
    const problem = validateEmail(email);
    setFieldError(problem);
    if (problem) document.getElementById('login-email')?.focus();
    return !problem;
  }

  async function sendCode(e) {
    e.preventDefault();
    if (sending || !checkEmail()) return;
    setError('');
    setRecentCode(false);
    setSending(true);
    try {
      const clean = normalizeEmail(email);
      await api.sendOtp(clean);
      setPendingEmail(clean);
      router.push('/verify');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'RATE_LIMITED') setRecentCode(true);
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  function goPasskey() {
    if (!checkEmail()) return;
    setPendingEmail(normalizeEmail(email));
    router.push('/passkey');
  }

  return (
    <form onSubmit={sendCode} noValidate className="space-y-5">
      {error && (
        <Alert tone={recentCode ? 'warning' : 'error'}>
          {error}
          {recentCode && (
            <> If you already have a code, <Link href="/verify" className="font-semibold underline">enter it here</Link>.</>
          )}
        </Alert>
      )}
      <TextField
        id="login-email" label="Email address" type="email" inputMode="email" autoComplete="email webauthn" required
        value={email} onChange={(e) => { setEmail(e.target.value); setFieldError(''); }} error={fieldError} disabled={sending}
        hint="We need your email to send the sign-in code."
      />
      <Button type="submit" loading={sending} loadingText="Sending code…">Email me a code</Button>

      <div className="flex items-center gap-3 text-sm text-ink-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>

      {canUsePasskey ? (
        <Button variant="secondary" onClick={goPasskey} disabled={sending}>Sign in with a passkey</Button>
      ) : (
        <p className="text-center text-sm text-ink-muted">Passkeys are not available in this browser. Use an email code instead.</p>
      )}

      <p className="text-center text-sm text-ink-muted">
        New here? <Link href="/register" className="font-semibold text-brand underline">Create an account</Link>
      </p>
    </form>
  );
}
