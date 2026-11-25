'use strict';
const { generateOtpCode, hmacHex, safeEqualHex, randomToken } = require('../src/shared/crypto');
const { loadConfig } = require('../src/config');

describe('crypto helpers', () => {
  test('OTP is always exactly six digits', () => {
    for (let i = 0; i < 2000; i += 1) expect(generateOtpCode()).toMatch(/^\d{6}$/);
  });
  test('OTP values are not constant', () => {
    expect(new Set(Array.from({ length: 50 }, generateOtpCode)).size).toBeGreaterThan(30);
  });
  test('HMAC compare is exact and handles bad input', () => {
    const a = hmacHex('secret', 'x');
    expect(safeEqualHex(a, hmacHex('secret', 'x'))).toBe(true);
    expect(safeEqualHex(a, hmacHex('secret', 'y'))).toBe(false);
    expect(safeEqualHex(a, 'zz')).toBe(false);
    expect(safeEqualHex(undefined, a)).toBe(false);
  });
  test('session tokens are long and unique', () => {
    const t = randomToken(32);
    expect(t.length).toBeGreaterThanOrEqual(43);
    expect(randomToken(32)).not.toBe(t);
  });
});

describe('config validation', () => {
  const base = () => ({ ...process.env });
  test('accepts the test environment', () => {
    expect(loadConfig(base()).otp.ttlSeconds).toBe(300);
  });
  test('rejects equal secrets', () => {
    const env = base();
    env.OTP_HASH_SECRET = env.SESSION_TOKEN_PEPPER;
    expect(() => loadConfig(env)).toThrow(/different/);
  });
  test('rejects OTP lifetime other than five minutes', () => {
    expect(() => loadConfig({ ...base(), OTP_TTL_SECONDS: '600' })).toThrow(/300/);
  });
  test('rejects short secrets and missing variables', () => {
    expect(() => loadConfig({ ...base(), SESSION_TOKEN_PEPPER: 'short' })).toThrow();
    const env = base();
    delete env.MONGODB_URI;
    expect(() => loadConfig(env)).toThrow(/MONGODB_URI/);
  });
  test('production refuses localhost RP ID and http origins', () => {
    expect(() => loadConfig({ ...base(), NODE_ENV: 'production' })).toThrow(/https|localhost/);
  });
  test('production accepts a proper https setup and defaults SameSite=None', () => {
    const cfg = loadConfig({
      ...base(),
      NODE_ENV: 'production',
      FRONTEND_ORIGIN: 'https://app.example.com/',
      WEBAUTHN_ORIGIN: 'https://app.example.com',
      WEBAUTHN_RP_ID: 'app.example.com',
    });
    expect(cfg.frontendOrigin).toBe('https://app.example.com');
    expect(cfg.cookie).toMatchObject({ secure: true, sameSite: 'none' });
  });
  test('RP ID must match the origin host', () => {
    expect(() => loadConfig({ ...base(), WEBAUTHN_RP_ID: 'other.com' })).toThrow(/RP_ID/);
  });
});
