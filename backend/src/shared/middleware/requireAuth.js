'use strict';
const sessionService = require('../../modules/sessions/session.service');
const { config } = require('../../config');
const { AppError } = require('../errors');
const { clearSessionCookie } = require('../../modules/sessions/session.cookie');

/** Validates the session against MongoDB on every protected request. */
async function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies[config.cookie.name];
  const auth = await sessionService.authenticate(token);
  if (!auth) {
    if (token) clearSessionCookie(res); // stale/revoked cookie
    throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
  }
  req.auth = auth;
  next();
}

module.exports = requireAuth;
