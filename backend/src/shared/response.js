'use strict';
const ok = (res, data = {}, message = 'Request completed', status = 200) =>
  res.status(status).json({ success: true, data, message });

const fail = (res, status, code, message, extra = {}) =>
  res.status(status).json({ success: false, error: { code, message, ...extra } });

module.exports = { ok, fail };
