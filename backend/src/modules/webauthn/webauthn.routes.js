'use strict';
const router = require('express').Router();
const controller = require('./webauthn.controller');
const requireAuth = require('../../shared/middleware/requireAuth');
const { webauthnLimiter } = require('../../shared/middleware/rateLimiters');

router.post('/register-options', webauthnLimiter, requireAuth, controller.registerOptions);
router.post('/register-verify', webauthnLimiter, requireAuth, controller.registerVerify);
router.post('/login-options', webauthnLimiter, controller.loginOptions);
router.post('/login-verify', webauthnLimiter, controller.loginVerify);

module.exports = router;
