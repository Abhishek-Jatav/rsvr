'use strict';
const authService = require('./auth.service');
const { sendOtpSchema, verifyOtpSchema } = require('./auth.schemas');
const { parseOrThrow } = require('../../shared/validation');
const { ok } = require('../../shared/response');
const { setSessionCookie, clearSessionCookie } = require('../sessions/session.cookie');

async function sendOtp(req, res) {
  const { email } = parseOrThrow(sendOtpSchema, req.body);
  const data = await authService.requestOtp(email);
  return ok(res, data, 'If the account is eligible, a verification code has been sent.');
}

async function verifyOtp(req, res) {
  const { email, code } = parseOrThrow(verifyOtpSchema, req.body);
  const { user, token, expiresAt } = await authService.verifyOtp(email, code);
  setSessionCookie(res, token, expiresAt);
  return ok(res, { user: { surname: user.surname, email: user.email } }, 'Authentication successful.');
}

async function me(req, res) {
  return ok(res, await authService.getCurrentUser(req.auth), 'Request completed');
}

async function logout(req, res) {
  await authService.logout(req.auth.session);
  clearSessionCookie(res);
  return ok(res, {}, 'Logged out.');
}

module.exports = { sendOtp, verifyOtp, me, logout };
