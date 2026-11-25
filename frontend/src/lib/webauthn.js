/** Thin wrapper around @simplewebauthn/browser so components never touch the browser API directly. */
import { browserSupportsWebAuthn, startAuthentication, startRegistration } from '@simplewebauthn/browser';

export const passkeysSupported = () => typeof window !== 'undefined' && browserSupportsWebAuthn();

export const createPasskey = (optionsJSON) => startRegistration({ optionsJSON });
export const authenticateWithPasskey = (optionsJSON) => startAuthentication({ optionsJSON });

/** Turn a browser/WebAuthn failure into a calm, recoverable message. */
export function describePasskeyError(err) {
  const name = (err && (err.cause?.name || err.name)) || '';
  if (name === 'NotAllowedError' || name === 'AbortError') {
    return { kind: 'cancelled', message: 'The passkey prompt was cancelled or timed out. You can try again, or use an email code instead.' };
  }
  if (name === 'InvalidStateError') {
    return { kind: 'error', message: 'This device already has a passkey saved for your account.' };
  }
  if (name === 'NotSupportedError' || name === 'SecurityError') {
    return { kind: 'unsupported', message: 'This browser or device cannot use passkeys here. Please use an email code instead.' };
  }
  return null;
}
