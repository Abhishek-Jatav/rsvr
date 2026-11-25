'use strict';
const userService = require('./user.service');
const { registerSchema } = require('./user.schemas');
const { parseOrThrow } = require('../../shared/validation');
const { ok } = require('../../shared/response');

async function register(req, res) {
  const input = parseOrThrow(registerSchema, req.body);
  const result = await userService.register(input);
  return ok(res, result, 'Registration completed.', 201);
}

module.exports = { register };
