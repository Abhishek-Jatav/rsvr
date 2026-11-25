'use strict';
const { z } = require('zod');
const { emailSchema } = require('../../shared/validation');

// The ceremony payload itself is verified by @simplewebauthn/server; here we only check its shape.
const credentialResponse = z
  .looseObject({
    id: z.string().min(1).max(1024),
    rawId: z.string().min(1).max(1024),
    type: z.literal('public-key'),
    response: z.looseObject({}),
  });

const loginOptionsSchema = z.object({ email: emailSchema });
const loginVerifySchema = z.object({ email: emailSchema, response: credentialResponse });
const registerVerifySchema = credentialResponse;

module.exports = { loginOptionsSchema, loginVerifySchema, registerVerifySchema };
