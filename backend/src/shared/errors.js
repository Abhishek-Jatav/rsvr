'use strict';
class AppError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.extra = extra; // safe, client-visible extras (e.g. retryAfterSeconds, fields)
  }
}

const isDuplicateKeyError = (err) => Boolean(err) && (err.code === 11000 || err.code === 11001);

module.exports = { AppError, isDuplicateKeyError };
