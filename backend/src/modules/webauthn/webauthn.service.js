'use strict';
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

const challengeRepository = require('../challenges/challenge.repository');
const passkeyRepository = require('./passkey.repository');
const userRepository = require('../users/user.repository');
const sessionService = require('../sessions/session.service');
const { toPublicUser } = require('../users/user.service');
const { config } = require('../../config');
const { AppError, isDuplicateKeyError } = require('../../shared/errors');
const { PURPOSE, AUTH_METHOD, WEBAUTHN_CHALLENGE_TTL_SECONDS } = require('../../shared/constants');
const logger = require('../../shared/logger');

const { rpName, rpId, origin } = config.webauthn;

const verificationFailed = () =>
  new AppError(400, 'WEBAUTHN_VERIFICATION_FAILED', 'We could not verify your passkey. Please try again.');
const challengeExpired = () =>
  new AppError(410, 'CHALLENGE_EXPIRED', 'The passkey request timed out. Please start again.');

async function storeChallenge({ user, purpose, challenge }) {
  const now = new Date();
  const filter = { purpose, userId: user._id };
  await challengeRepository.supersede(filter, now); // only the newest ceremony stays valid
  await challengeRepository.create({
    userId: user._id,
    identifier: user.email,
    purpose,
    challenge,
    expiresAt: new Date(now.getTime() + WEBAUTHN_CHALLENGE_TTL_SECONDS * 1000),
  });
}

/** Atomically take the newest open challenge or throw the right error. */
async function takeChallenge(filter) {
  const now = new Date();
  const record = await challengeRepository.consumeLatestOpen(filter, now);
  if (record) return record;
  if (await challengeRepository.hasExpiredOpen(filter, now)) throw challengeExpired();
  throw verificationFailed(); // none, already used (replay), or wrong ceremony
}

async function getRegistrationOptions(user) {
  const existing = await passkeyRepository.findByUser(user._id);
  const options = await generateRegistrationOptions({
    rpName,
    rpID: rpId,
    userName: user.email,
    userDisplayName: user.surname,
    userID: new TextEncoder().encode(String(user._id)),
    attestationType: 'none',
    excludeCredentials: existing.map((p) => ({ id: p.credentialId, transports: p.transports })),
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'required' },
  });
  await storeChallenge({ user, purpose: PURPOSE.WEBAUTHN_REGISTRATION, challenge: options.challenge });
  return options;
}

async function verifyRegistration(user, response) {
  const record = await takeChallenge({ userId: user._id, purpose: PURPOSE.WEBAUTHN_REGISTRATION });

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: record.challenge,
      expectedOrigin: origin,
      expectedRPID: rpId,
      requireUserVerification: true,
    });
  } catch (err) {
    logger.warn('passkey registration verification failed', { reason: err && err.name });
    throw verificationFailed();
  }
  if (!verification.verified || !verification.registrationInfo) throw verificationFailed();

  const { credential } = verification.registrationInfo;
  try {
    await passkeyRepository.create({
      userId: user._id,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: credential.counter,
      transports: response.response.transports || credential.transports || [],
    });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw new AppError(409, 'CREDENTIAL_ALREADY_REGISTERED', 'This passkey is already registered.');
    }
    throw err;
  }
  return { registered: true };
}

async function getLoginOptions(email) {
  const user = await userRepository.findByEmail(email);
  const passkeys = user ? await passkeyRepository.findByUser(user._id) : [];
  // Same answer for "no such account" and "no passkey" so this does not reveal which emails exist.
  if (!user || passkeys.length === 0) {
    throw new AppError(404, 'PASSKEY_NOT_AVAILABLE', 'No passkey is available for this account. Use an email code instead.');
  }
  const options = await generateAuthenticationOptions({
    rpID: rpId,
    allowCredentials: passkeys.map((p) => ({ id: p.credentialId, transports: p.transports })),
    userVerification: 'required',
  });
  await storeChallenge({ user, purpose: PURPOSE.WEBAUTHN_LOGIN, challenge: options.challenge });
  return options;
}

async function verifyLogin(email, response) {
  const user = await userRepository.findByEmail(email);
  if (!user) throw verificationFailed();

  const passkey = await passkeyRepository.findByCredentialId(response.id);
  if (!passkey || !passkey.userId.equals(user._id)) throw verificationFailed(); // unknown or someone else's

  const record = await takeChallenge({ userId: user._id, purpose: PURPOSE.WEBAUTHN_LOGIN });

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: record.challenge,
      expectedOrigin: origin,
      expectedRPID: rpId,
      requireUserVerification: true,
      credential: {
        id: passkey.credentialId,
        publicKey: new Uint8Array(passkey.publicKey),
        counter: passkey.counter,
        transports: passkey.transports,
      },
    });
  } catch (err) {
    // Includes a signature counter that did not increase (possible cloned authenticator).
    logger.warn('passkey assertion verification failed', { reason: err && err.name });
    throw verificationFailed();
  }
  if (!verification.verified) throw verificationFailed();

  const session = await sessionService.createSession(user._id, AUTH_METHOD.PASSKEY); // may throw 409
  await passkeyRepository.updateUsage(passkey._id, verification.authenticationInfo.newCounter, new Date());
  return { user: toPublicUser(user), ...session };
}

module.exports = { getRegistrationOptions, verifyRegistration, getLoginOptions, verifyLogin };
