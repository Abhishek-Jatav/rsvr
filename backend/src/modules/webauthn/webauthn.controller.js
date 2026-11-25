'use strict';
const service = require('./webauthn.service');
const { loginOptionsSchema, loginVerifySchema, registerVerifySchema } = require('./webauthn.schemas');
const { parseOrThrow } = require('../../shared/validation');
const { ok } = require('../../shared/response');
const { setSessionCookie } = require('../sessions/session.cookie');

async function registerOptions(req, res) {
  const options = await service.getRegistrationOptions(req.auth.user);
  return res.status(200).json(options); // library options object, as specified in docs/api.md
}

async function registerVerify(req, res) {
  const response = parseOrThrow(registerVerifySchema, req.body);
  const data = await service.verifyRegistration(req.auth.user, response);
  return ok(res, data, 'Passkey registered.', 201);
}

async function loginOptions(req, res) {
  const { email } = parseOrThrow(loginOptionsSchema, req.body);
  const options = await service.getLoginOptions(email);
  return res.status(200).json(options);
}

async function loginVerify(req, res) {
  const { email, response } = parseOrThrow(loginVerifySchema, req.body);
  const { user, token, expiresAt } = await service.verifyLogin(email, response);
  setSessionCookie(res, token, expiresAt);
  return ok(res, { user: { surname: user.surname, email: user.email } }, 'Authentication successful.');
}

module.exports = { registerOptions, registerVerify, loginOptions, loginVerify };
