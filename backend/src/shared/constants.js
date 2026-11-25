'use strict';
module.exports = Object.freeze({
  PURPOSE: Object.freeze({
    EMAIL_LOGIN: 'EMAIL_LOGIN',
    WEBAUTHN_REGISTRATION: 'WEBAUTHN_REGISTRATION',
    WEBAUTHN_LOGIN: 'WEBAUTHN_LOGIN',
  }),
  AUTH_METHOD: Object.freeze({ EMAIL_OTP: 'email_otp', PASSKEY: 'passkey' }),
  WEBAUTHN_CHALLENGE_TTL_SECONDS: 300,
  OTP_LENGTH: 6,
  // OTP records are kept this long after expiry so the hourly send limit can count them.
  CHALLENGE_RETENTION_SECONDS: 3600,
  MAX_BODY_SIZE: '20kb',
});
