'use strict';
const { config } = require('../../config');
const { AppError } = require('../errors');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence for cookie auth: browsers always send Origin on cross-site
 * state-changing requests, so reject any that is not our frontend.
 */
function originGuard(req, res, next) {
  const origin = req.headers.origin;
  if (!SAFE_METHODS.has(req.method) && origin && origin !== config.frontendOrigin) {
    throw new AppError(403, 'FORBIDDEN_ORIGIN', 'This request is not allowed from this origin.');
  }
  next();
}

module.exports = originGuard;
