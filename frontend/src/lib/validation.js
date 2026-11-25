/** Client-side checks for a quicker UX only. The server re-validates everything. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const normalizeEmail = (value) => value.trim().toLowerCase();

export function validateEmail(value) {
  const email = normalizeEmail(value);
  if (!email) return 'Email is required.';
  if (email.length > 254 || !EMAIL_RE.test(email)) return 'Enter a valid email address.';
  return '';
}

export function validateRegistration({ email, phone, dob, surname }) {
  const errors = {};
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;

  if (!surname.trim()) errors.surname = 'Surname is required.';
  else if (surname.trim().length > 100) errors.surname = 'Surname is too long.';

  if (!dob) errors.dob = 'Date of birth is required.';
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || Number.isNaN(Date.parse(dob))) errors.dob = 'Enter a valid date of birth.';
  else if (dob > todayIso()) errors.dob = 'Date of birth cannot be in the future.';
  else if (dob < '1900-01-01') errors.dob = 'Enter a valid date of birth.';

  const cleanedPhone = phone.trim().replace(/[\s().-]/g, '');
  if (cleanedPhone) {
    const intl = cleanedPhone.startsWith('00') ? `+${cleanedPhone.slice(2)}` : cleanedPhone;
    if (!/^\+[1-9]\d{7,14}$/.test(intl)) errors.phone = 'Enter a phone number with country code, e.g. +911234567890.';
  }
  return errors;
}

export function todayIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Format a YYYY-MM-DD string without letting time zones shift the day. */
export function formatDateOnly(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
}
