'use strict';
const sessionRepository = require('./session.repository');
const userRepository = require('../users/user.repository');
const { config } = require('../../config');
const { AppError, isDuplicateKeyError } = require('../../shared/errors');
const { hmacHex, randomToken } = require('../../shared/crypto');

const hashToken = (token) => hmacHex(config.session.tokenPepper, token);

const ACTIVE_SESSION_MESSAGE =
  'This account already has an active login. Use that session, or log out there first, then try again.';

async function hasActiveSession(userId) {
  return Boolean(await sessionRepository.findActiveByUser(userId, new Date()));
}

/**
 * Creates the one allowed session for a user. The partial unique index on
 * { userId } where isActive=true makes the check-and-insert atomic: of two
 * concurrent logins, exactly one insert succeeds and the other gets a conflict.
 */
async function createSession(userId, authenticationMethod) {
  const now = new Date();
  await sessionRepository.closeExpiredForUser(userId, now);

  const token = randomToken(32);
  const expiresAt = new Date(now.getTime() + config.session.ttlMs);
  try {
    await sessionRepository.insert({
      userId,
      tokenHash: hashToken(token),
      authenticationMethod,
      expiresAt,
      isActive: true,
    });
  } catch (err) {
    if (isDuplicateKeyError(err) && err.keyPattern && err.keyPattern.userId) {
      throw new AppError(409, 'ACTIVE_SESSION_EXISTS', ACTIVE_SESSION_MESSAGE);
    }
    throw err;
  }
  return { token, expiresAt };
}

/** Resolve a raw cookie token to { session, user } or null. Checked on every protected request. */
async function authenticate(token) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 200) return null;
  const now = new Date();
  const session = await sessionRepository.findActiveByTokenHash(hashToken(token), now);
  if (!session) return null;
  const user = await userRepository.findById(session.userId);
  if (!user) return null;
  return { session, user };
}

const revoke = (sessionId) => sessionRepository.revoke(sessionId, new Date());

module.exports = { createSession, authenticate, revoke, hasActiveSession, hashToken, ACTIVE_SESSION_MESSAGE };
