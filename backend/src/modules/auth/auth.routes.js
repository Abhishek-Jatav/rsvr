'use strict';
const router = require('express').Router();
const controller = require('./auth.controller');
const userController = require('../users/user.controller');
const requireAuth = require('../../shared/middleware/requireAuth');
const { registerLimiter, sendOtpLimiter, verifyOtpLimiter } = require('../../shared/middleware/rateLimiters');

router.post('/register', registerLimiter, userController.register);
router.post('/send-otp', sendOtpLimiter, controller.sendOtp);
router.post('/verify-otp', verifyOtpLimiter, controller.verifyOtp);
router.post('/logout', requireAuth, controller.logout);
router.get('/me', requireAuth, controller.me);

module.exports = router;
