'use strict';
const crypto = require('crypto');
const { OTP_LENGTH } = require('./constants');

/** Uniform six-digit code from a CSPRNG (never Math.random). */
function generateOtpCode() {
  return String(crypto.randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');
}

const hmacHex = (secret, value) => crypto.createHmac('sha256', secret).update(value).digest('hex');

/** Constant-time comparison of two hex digests. */
function safeEqualHex(a, b) {
  const bufA = Buffer.from(String(a), 'hex');
  const bufB = Buffer.from(String(b), 'hex');
  return bufA.length === bufB.length && bufA.length > 0 && crypto.timingSafeEqual(bufA, bufB);
}

const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');

module.exports = { generateOtpCode, hmacHex, safeEqualHex, randomToken };
