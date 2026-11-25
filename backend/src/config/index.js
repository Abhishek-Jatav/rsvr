'use strict';
/**
 * Central, validated environment configuration (see docs/env.md).
 * The process exits at startup if anything required is missing or unsafe.
 */
require('dotenv').config({ quiet: true });
const { z } = require('zod');

const positiveInt = z.coerce.number().int().positive();

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: positiveInt,
  MONGODB_URI: z.string().min(10),
  FRONTEND_ORIGIN: z.url(),
  SESSION_COOKIE_NAME: z.string().min(1),
  SESSION_TTL_HOURS: positiveInt,
  SESSION_TOKEN_PEPPER: z.string().min(32, 'must be at least 32 characters'),
  OTP_HASH_SECRET: z.string().min(32, 'must be at least 32 characters'),
  OTP_TTL_SECONDS: z.coerce.number().int().refine((n) => n === 300, 'must be exactly 300 (five minutes)'),
  OTP_MAX_ATTEMPTS: positiveInt,
  OTP_RESEND_COOLDOWN_SECONDS: positiveInt,
  OTP_HOURLY_LIMIT: positiveInt,
  EMAIL_USER: z.string().min(3),
  EMAIL_PASS: z.string().min(1),
  EMAIL_FROM: z.string().min(3),
  WEBAUTHN_RP_NAME: z.string().min(1),
  WEBAUTHN_RP_ID: z.string().min(1),
  WEBAUTHN_ORIGIN: z.url(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  // Optional extras (not in docs/env.md; see README "Extra optional settings")
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).optional(),
});

function originOnly(value) {
  const url = new URL(value);
  return url.origin; // strips path and trailing slash
}

function loadConfig(env = process.env) {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  const e = parsed.data;
  const errors = [];
  const isProd = e.NODE_ENV === 'production';

  if (e.SESSION_TOKEN_PEPPER === e.OTP_HASH_SECRET) {
    errors.push('SESSION_TOKEN_PEPPER and OTP_HASH_SECRET must be different');
  }
  const frontendOrigin = originOnly(e.FRONTEND_ORIGIN);
  const webauthnOrigin = originOnly(e.WEBAUTHN_ORIGIN);
  const originHost = new URL(webauthnOrigin).hostname;
  if (/[:/]/.test(e.WEBAUTHN_RP_ID)) errors.push('WEBAUTHN_RP_ID must be a hostname only (no scheme, port or path)');
  if (originHost !== e.WEBAUTHN_RP_ID && !originHost.endsWith(`.${e.WEBAUTHN_RP_ID}`)) {
    errors.push('WEBAUTHN_RP_ID must equal, or be a parent domain of, the WEBAUTHN_ORIGIN hostname');
  }
  if (isProd) {
    if (!frontendOrigin.startsWith('https://')) errors.push('FRONTEND_ORIGIN must be https in production');
    if (!webauthnOrigin.startsWith('https://')) errors.push('WEBAUTHN_ORIGIN must be https in production');
    if (e.WEBAUTHN_RP_ID === 'localhost') errors.push('WEBAUTHN_RP_ID must not be localhost in production');
  }
  if (errors.length) throw new Error(`Invalid environment configuration:\n${errors.map((m) => `  - ${m}`).join('\n')}`);

  return Object.freeze({
    env: e.NODE_ENV,
    isProd,
    isTest: e.NODE_ENV === 'test',
    port: e.PORT,
    mongodbUri: e.MONGODB_URI,
    frontendOrigin,
    cookie: {
      name: e.SESSION_COOKIE_NAME,
      secure: isProd,
      // Cross-site (Netlify -> Render) needs SameSite=None; local dev is same-site.
      sameSite: e.COOKIE_SAMESITE || (isProd ? 'none' : 'lax'),
    },
    session: { ttlMs: e.SESSION_TTL_HOURS * 60 * 60 * 1000, tokenPepper: e.SESSION_TOKEN_PEPPER },
    otp: {
      hashSecret: e.OTP_HASH_SECRET,
      ttlSeconds: e.OTP_TTL_SECONDS,
      maxAttempts: e.OTP_MAX_ATTEMPTS,
      resendCooldownSeconds: e.OTP_RESEND_COOLDOWN_SECONDS,
      hourlyLimit: e.OTP_HOURLY_LIMIT,
    },
    email: { user: e.EMAIL_USER, pass: e.EMAIL_PASS, from: e.EMAIL_FROM },
    webauthn: { rpName: e.WEBAUTHN_RP_NAME, rpId: e.WEBAUTHN_RP_ID, origin: webauthnOrigin },
    logLevel: e.LOG_LEVEL,
  });
}

let config;
try {
  config = loadConfig();
} catch (err) {
  // Fail fast with a readable message instead of a stack trace.
  console.error(`\n${err.message}\n\nFix backend/.env (see .env.example) and start again.\n`);
  process.exit(1);
}

module.exports = { loadConfig, config };
