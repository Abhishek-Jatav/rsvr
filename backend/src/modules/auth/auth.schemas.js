'use strict';
const { z } = require('zod');
const { emailSchema } = require('../../shared/validation');

const sendOtpSchema = z.object({ email: emailSchema });

const verifyOtpSchema = z.object({
  email: emailSchema,
  code: z
    .string({ error: 'Enter the 6-digit code.' })
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit code.'),
});

module.exports = { sendOtpSchema, verifyOtpSchema };
