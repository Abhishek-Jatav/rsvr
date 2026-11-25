'use client';
import { useState } from 'react';
import Link from 'next/link';
import Alert from '@/components/Alert';
import Button from '@/components/Button';
import TextField from '@/components/TextField';
import { api, ApiError } from '@/lib/api';
import { normalizeEmail, todayIso, validateRegistration } from '@/lib/validation';
import { setPendingEmail } from '@/lib/pendingEmail';

const EMPTY = { email: '', phone: '', dob: '', surname: '' };

export default function RegisterForm() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  async function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setFormError('');
    const found = validateRegistration(values);
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(`reg-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      await api.register({
        email: normalizeEmail(values.email),
        phone: values.phone.trim() || undefined,
        dob: values.dob,
        surname: values.surname.trim(),
      });
      setPendingEmail(normalizeEmail(values.email));
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') {
        setErrors(err.fields);
        setFormError('Please fix the highlighted fields.');
      } else if (err instanceof ApiError && err.code === 'ACCOUNT_ALREADY_EXISTS') {
        setFormError('An account with this email or phone number already exists. Try signing in instead.');
      } else {
        setFormError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-5">
        <Alert tone="success">Your account is ready. Next, sign in with a code sent to your email.</Alert>
        <Link href="/login" className="btn btn-primary">Continue to sign in</Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {formError && <Alert tone="error">{formError}</Alert>}
      <TextField
        id="reg-email" label="Email address" type="email" inputMode="email" autoComplete="email" required
        value={values.email} onChange={set('email')} error={errors.email} disabled={submitting}
        hint="Required. We send your sign-in codes to this address."
      />
      <TextField
        id="reg-phone" label="Phone number" type="tel" inputMode="tel" autoComplete="tel" optional
        value={values.phone} onChange={set('phone')} error={errors.phone} disabled={submitting}
        hint="Saved to your profile only. Codes are sent by email, not SMS."
      />
      <TextField
        id="reg-dob" label="Date of birth" type="date" autoComplete="bday" required max={todayIso()} min="1900-01-01"
        value={values.dob} onChange={set('dob')} error={errors.dob} disabled={submitting}
      />
      <TextField
        id="reg-surname" label="Name" type="text" autoComplete="family-name" required maxLength={100}
        value={values.surname} onChange={set('surname')} error={errors.surname} disabled={submitting}
      />
      <Button type="submit" loading={submitting} loadingText="Creating account…">Create account</Button>
      <p className="text-center text-sm text-ink-muted">
        Already registered? <Link href="/login" className="font-semibold text-brand underline">Sign in</Link>
      </p>
    </form>
  );
}
