'use strict';
const { AppError } = require('../errors');
const { fail } = require('../response');
const logger = require('../logger');

const notFound = (req, res) => fail(res, 404, 'NOT_FOUND', 'Resource not found.');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return fail(res, err.status, err.code, err.message, err.extra);
  }
  if (err && err.type === 'entity.too.large') return fail(res, 413, 'PAYLOAD_TOO_LARGE', 'The request is too large.');
  if (err && err.type === 'entity.parse.failed') {
    return fail(res, 400, 'VALIDATION_ERROR', 'Please check the submitted information.');
  }
  // Unexpected: log the error name only (no bodies, no stack to the client).
  logger.error('unhandled error', { name: err && err.name, path: req.path });
  return fail(res, 500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
}

module.exports = { notFound, errorHandler };
