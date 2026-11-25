/**
 * The single API client. Every request sends the session cookie (credentials: 'include').
 * Success responses come back as `data`; failures throw an ApiError with a stable `code`.
 */
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api').replace(/\/+$/, '');
const REQUEST_TIMEOUT_MS = 60000; // free hosting can take a while to wake up

export class ApiError extends Error {
  constructor({ status = 0, code = 'UNKNOWN', message = 'Something went wrong.', fields, retryAfterSeconds }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields || {};
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function apiFetch(path, { method = 'GET', body } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    throw new ApiError({
      code: err && err.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR',
      message:
        err && err.name === 'AbortError'
          ? 'The server took too long to respond. It may be waking up, so please try again.'
          : 'We could not reach the server. Check your connection and try again.',
    });
  } finally {
    clearTimeout(timer);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (payload && payload.error) || {};
    throw new ApiError({
      status: response.status,
      code: error.code || 'UNKNOWN',
      message: error.message || 'Something went wrong. Please try again.',
      fields: error.fields,
      retryAfterSeconds: error.retryAfterSeconds,
    });
  }
  // Envelope responses carry `data`; WebAuthn option endpoints return the options object itself.
  return payload && payload.success === true ? payload.data : payload;
}

export const api = {
  register: (input) => apiFetch('/auth/register', { method: 'POST', body: input }),
  sendOtp: (email) => apiFetch('/auth/send-otp', { method: 'POST', body: { email } }),
  verifyOtp: (email, code) => apiFetch('/auth/verify-otp', { method: 'POST', body: { email, code } }),
  me: () => apiFetch('/auth/me'),
  logout: () => apiFetch('/auth/logout', { method: 'POST' }),
  passkeyRegisterOptions: () => apiFetch('/webauthn/register-options', { method: 'POST', body: {} }),
  passkeyRegisterVerify: (response) => apiFetch('/webauthn/register-verify', { method: 'POST', body: response }),
  passkeyLoginOptions: (email) => apiFetch('/webauthn/login-options', { method: 'POST', body: { email } }),
  passkeyLoginVerify: (email, response) => apiFetch('/webauthn/login-verify', { method: 'POST', body: { email, response } }),
};
