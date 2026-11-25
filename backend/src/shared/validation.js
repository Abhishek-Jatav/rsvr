'use strict';
const { z } = require('zod');
const { AppError } = require('./errors');

const emailSchema = z
  .string({ error: 'Email is required.' })
  .trim()
  .toLowerCase()
  .max(254, 'Email is too long.')
  .pipe(z.email({ error: 'Enter a valid email address.' }));

/** Returns E.164 (+<country><number>) or null when the value cannot be normalised. */
function normalizePhone(raw) {
  let value = String(raw).trim().replace(/[\s().-]/g, '');
  if (value.startsWith('00')) value = `+${value.slice(2)}`;
  return /^\+[1-9]\d{7,14}$/.test(value) ? value : null;
}

/** Parses a strict YYYY-MM-DD string into a UTC-midnight Date, or null if not a real date. */
function parseDateOnly(raw) {
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const [y, m, d] = raw.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const valid = date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  return valid ? date : null;
}

const toDateOnlyString = (date) => date.toISOString().slice(0, 10);

/** Validate with a zod schema; throws AppError 400 VALIDATION_ERROR with per-field messages. */
function parseOrThrow(schema, input) {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const fields = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_';
    if (!fields[key]) fields[key] = issue.message;
  }
  throw new AppError(400, 'VALIDATION_ERROR', 'Please check the submitted information.', { fields });
}

module.exports = { emailSchema, normalizePhone, parseDateOnly, toDateOnlyString, parseOrThrow };
