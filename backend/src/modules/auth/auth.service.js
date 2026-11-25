'use strict';
const challengeRepository = require('../challenges/challenge.repository');
const userRepository = require('../users/user.repository');
const passkeyRepository = require('../webauthn/passkey.repository');
const sessionService = require('../sessions/session.service');
const mailer = require('./mailer');
const { toPublicUser } = require('../users/user.service');
const { config } = require('../../config');
const { AppError } = require('../../shared/errors');
const { PURPOSE, AUTH_METHOD } = require('../../shared/constants');
const { generateOtpCode, hmacHex, safeEqualHex } = require('../../shared/crypto');
const logger = require('../../shared/logger');

const hashCode = (email, code) => hmacHex(config.otp.hashSecret, `${email}:${code}`);

const OTP_INVALID = () => new AppError(400, 'OTP_INVALID', 'The code is invalid or has expired.');

/**
 * Send a login code. Unknown emails get the same success response as known
 * ones (no account enumeration); nothing is sent for them.
 */
async function requestOtp(email) {
  const response = {
    expiresInSeconds: config.otp.ttlSeconds,
    resendAfterSeconds: config.otp.resendCooldownSeconds,
  };
  const user = await userRepository.findByEmail(email);
  if (!user) return response;

  const now = new Date();
  const filter = { identifier: email, purpose: PURPOSE.EMAIL_LOGIN };

  const latest = await challengeRepository.latest(filter);
  if (latest) {
    const waitedSeconds = (now.getTime() - latest.createdAt.getTime()) / 1000;
    if (waitedSeconds < config.otp.resendCooldownSeconds) {
      const retryAfterSeconds = Math.ceil(config.otp.resendCooldownSeconds - waitedSeconds);
      throw new AppError(429, 'RATE_LIMITED', `Please wait ${retryAfterSeconds}s before requesting another code.`, {
        retryAfterSeconds,
      });
    }
  }
  const sentLastHour = await challengeRepository.countCreatedSince(filter, new Date(now.getTime() - 3600 * 1000));
  if (sentLastHour >= config.otp.hourlyLimit) {
    throw new AppError(429, 'RATE_LIMITED', 'Too many codes requested. Please try again later.');
  }

  // A new code supersedes any earlier unused one.
  await challengeRepository.supersede(filter, now);

  const code = generateOtpCode();
  const record = await challengeRepository.create({
    userId: user._id,
    identifier: email,
    purpose: PURPOSE.EMAIL_LOGIN,
    codeHash: hashCode(email, code),
    expiresAt: new Date(now.getTime() + config.otp.ttlSeconds * 1000),
    maxAttempts: config.otp.maxAttempts,
  });

  try {
    await mailer.sendOtpEmail(email, code, config.otp.ttlSeconds);
  } catch (err) {
    await challengeRepository.deleteById(record._id); // no usable code if nothing was delivered
    logger.error('otp email delivery failed', { reason: err && err.code });
    throw new AppError(503, 'EMAIL_DELIVERY_UNAVAILABLE', 'We could not send the code right now. Please try again shortly.');
  }
  return response;
}

async function verifyOtp(email, code) {
  const now = new Date();
  const filter = { identifier: email, purpose: PURPOSE.EMAIL_LOGIN };

  const record = await challengeRepository.latest(filter);
  if (!record) throw OTP_INVALID();
  if (record.attempts >= record.maxAttempts) {
    throw new AppError(429, 'OTP_ATTEMPTS_EXCEEDED', 'Too many incorrect attempts. Please request a new code.');
  }
  if (record.consumedAt) throw OTP_INVALID();
  if (record.expiresAt.getTime() <= now.getTime()) {
    throw new AppError(410, 'OTP_EXPIRED', 'This code has expired. Please request a new one.');
  }

  // Count the attempt atomically before comparing, so parallel guesses cannot exceed the limit.
  const counted = await challengeRepository.incrementAttempts(record._id, now);
  if (!counted) throw OTP_INVALID();

  if (!safeEqualHex(counted.codeHash, hashCode(email, code))) {
    if (counted.attempts >= counted.maxAttempts) await challengeRepository.consumeById(counted._id, now);
    throw OTP_INVALID();
  }

  const user = await userRepository.findByEmail(email);
  if (!user) throw OTP_INVALID();

  // Refuse before spending the code if the account is already signed in elsewhere.
  if (await sessionService.hasActiveSession(user._id)) {
    throw new AppError(409, 'ACTIVE_SESSION_EXISTS', sessionService.ACTIVE_SESSION_MESSAGE);
  }
  const consumed = await challengeRepository.consumeById(counted._id, now); // single use
  if (!consumed) throw OTP_INVALID();

  const session = await sessionService.createSession(user._id, AUTH_METHOD.EMAIL_OTP);
  return { user: toPublicUser(user), ...session };
}

async function getCurrentUser({ user, session }) {
  return {
    user: toPublicUser(user),
    session: { status: 'active', authenticationMethod: session.authenticationMethod },
    passkeyCount: await passkeyRepository.countByUser(user._id),
  };
}

const logout = (session) => sessionService.revoke(session._id);

module.exports = { requestOtp, verifyOtp, getCurrentUser, logout, hashCode };
