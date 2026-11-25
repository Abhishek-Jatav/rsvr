'use strict';
const { config } = require('../../config');

const baseOptions = () => ({
  httpOnly: true,
  secure: config.cookie.secure,
  sameSite: config.cookie.sameSite,
  path: '/',
});

const setSessionCookie = (res, token, expiresAt) =>
  res.cookie(config.cookie.name, token, { ...baseOptions(), expires: expiresAt });

const clearSessionCookie = (res) => res.clearCookie(config.cookie.name, baseOptions());

module.exports = { setSessionCookie, clearSessionCookie };
