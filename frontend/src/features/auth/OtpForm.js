'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Alert from '@/components/Alert';
import Button from '@/components/Button';
import TextField from '@/components/TextField';
import { api, ApiError } from '@/lib/api';
import { clearPendingEmail, getPendingEmail } from '@/lib/pendingEmail';
import { useAuth } from './AuthProvider';

const RESEND_SECONDS = 60; // server enforces the real limit
const CODE_LIFETIME_SECONDS = 300;

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function useCountdown(initial) {
  const [left, setLeft] = useState(initial);
  useEffect(() => {
    if (left <= 0) return undefined;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return [left, setLeft];
}

export default function OtpForm() {
  const router = useRouter();
  const { refresh, status } = useAuth();
  const [email, setEmail] = useState(null);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState({ tone: '', text: '', code: '' });
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendLeft, setResendLeft] = useCountdown(RESEND_SECONDS);
  const [expiryLeft, setExpiryLeft] = useCountdown(CODE_LIFETIME_SECONDS);

  useEffect(() => {
    const pending = getPendingEmail();
    if (!pending) router.replace('/login');
    else setEmail(pending);
  }, [router]);

  useEffect(() => {
    if (status === 'authenticated') router.replace('/dashboard');
  }, [status, router]);

  const onCodeChange = (e) => {
    setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); // digits only; paste works too
    if (message.text) setMessage({ tone: '', text: '', code: '' });
  };

  async function onSubmit(e) {
    e.preventDefault();
    if (verifying) return;
    if (code.length !== 6) {
      setMessage({ tone: 'error', text: 'Enter the 6-digit code from your email.', code: 'INCOMPLETE' });
      document.getElementById('otp-code')?.focus();
      return;
    }
    setVerifying(true);
    setMessage({ tone: '', text: '', code: '' });
    try {
      await api.verifyOtp(email, code);
      clearPendingEmail();
      await refresh();
      router.replace('/dashboard');
    } catch (err) {
      const tone = err instanceof ApiError && err.code === 'ACTIVE_SESSION_EXISTS' ? 'warning' : 'error';
      setMessage({ tone, text: err.message, code: err.code });
      if (err instanceof ApiError && err.code === 'OTP_INVALID') setCode('');
    } finally {
      setVerifying(false);
    }
  }

  const resend = useCallback(async () => {
    if (resending || resendLeft > 0) return;
    setResending(true);
    setMessage({ tone: '', text: '', code: '' });
    try {
      await api.sendOtp(email);
      setCode('');
      setResendLeft(RESEND_SECONDS);
      setExpiryLeft(CODE_LIFETIME_SECONDS);
      setMessage({ tone: 'success', text: 'A new code is on its way. Earlier codes no longer work.', code: 'RESENT' });
    } catch (err) {
      if (err instanceof ApiError && err.retryAfterSeconds) setResendLeft(err.retryAfterSeconds);
      setMessage({ tone: 'error', text: err.message, code: err.code });
    } finally {
      setResending(false);
    }
  }, [email, resending, resendLeft, setResendLeft, setExpiryLeft]);

  if (!email) return <p role="status" className="text-ink-muted">Loading…</p>;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <p className="text-base leading-relaxed text-ink-muted">
        If an account exists for <strong className="break-all text-ink">{email}</strong>, we have sent a 6-digit code to it.
        The code works once.
      </p>

      {message.text && (
        <Alert tone={message.tone}>
          {message.text}
          {message.code === 'ACTIVE_SESSION_EXISTS' && (
            <> <Link href="/login" className="font-semibold underline">Back to sign in</Link></>
          )}
        </Alert>
      )}

      <TextField
        id="otp-code" label="6-digit code" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="one-time-code"
        maxLength={6} required autoFocus value={code} onChange={onCodeChange} disabled={verifying}
        hint={expiryLeft > 0 ? `Code expires in ${mmss(expiryLeft)}.` : 'This code has expired. Request a new one below.'}
      />

      <Button type="submit" loading={verifying} loadingText="Checking…">
        Verify and sign in
      </Button>

      <Button variant="secondary" onClick={resend} loading={resending} loadingText="Sending…" disabled={resendLeft > 0}>
        {resendLeft > 0 ? `Send a new code in ${resendLeft}s` : 'Send a new code'}
      </Button>

      <p className="text-center text-sm text-ink-muted">
        Wrong email? <Link href="/login" className="font-semibold text-brand underline">Go back</Link>
      </p>
    </form>
  );
}
