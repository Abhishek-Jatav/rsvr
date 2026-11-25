'use strict';
const { z } = require('zod');
const { emailSchema, normalizePhone, parseDateOnly } = require('../../shared/validation');

const surnameSchema = z
  .string({ error: 'Surname is required.' })
  .trim()
  .min(1, 'Surname is required.')
  .max(100, 'Surname is too long.')
  .regex(/^[\p{L}\p{M}][\p{L}\p{M}\s'’.-]*$/u, 'Surname contains unsupported characters.');

const phoneSchema = z
  .preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().max(30).optional())
  .transform((value, ctx) => {
    if (value === undefined) return undefined;
    const normalized = normalizePhone(value);
    if (!normalized) {
      ctx.addIssue({ code: 'custom', message: 'Enter a phone number with country code, e.g. +911234567890.' });
      return z.NEVER;
    }
    return normalized;
  });

const dobSchema = z
  .string({ error: 'Date of birth is required.' })
  .transform((value, ctx) => {
    const date = parseDateOnly(value);
    if (!date) {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid date of birth (YYYY-MM-DD).' });
      return z.NEVER;
    }
    if (date.getTime() > Date.now()) {
      ctx.addIssue({ code: 'custom', message: 'Date of birth cannot be in the future.' });
      return z.NEVER;
    }
    if (date.getUTCFullYear() < 1900) {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid date of birth.' });
      return z.NEVER;
    }
    return date;
  });

const registerSchema = z.object({
  email: emailSchema,
  phone: phoneSchema,
  dob: dobSchema,
  surname: surnameSchema,
});

module.exports = { registerSchema };
