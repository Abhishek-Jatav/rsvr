'use strict';
const rateLimit = require('express-rate-limit');
const { config } = require('../../config');
const { fail } = require('../response');

function limiter(windowMinutes, max) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => config.isTest,
    handler: (req, res) => fail(res, 429, 'RATE_LIMITED', 'Too many requests. Please try again later.'),
  });
}

module.exports = {
  registerLimiter: limiter(60, 10),
  sendOtpLimiter: limiter(15, 10),
  verifyOtpLimiter: limiter(15, 20),
  webauthnLimiter: limiter(15, 30),
};
