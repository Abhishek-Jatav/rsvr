'use strict';
const { registerSchema } = require('../src/modules/users/user.schemas');
const { normalizePhone, parseDateOnly } = require('../src/shared/validation');
const { sendOtpSchema, verifyOtpSchema } = require('../src/modules/auth/auth.schemas');

const valid = { email: ' User@Example.COM ', phone: '+91 12345-67890', dob: '1998-04-20', surname: 'Sharma' };

describe('registration validation (REG-01..05, REG-08)', () => {
  test('accepts valid input and normalises it', () => {
    const out = registerSchema.parse(valid);
    expect(out.email).toBe('user@example.com');
    expect(out.phone).toBe('+911234567890');
    expect(out.dob.toISOString()).toBe('1998-04-20T00:00:00.000Z');
  });
  test('phone is optional, empty string treated as absent', () => {
    expect(registerSchema.parse({ ...valid, phone: '' }).phone).toBeUndefined();
    const { phone, ...rest } = valid;
    expect(registerSchema.parse(rest).phone).toBeUndefined();
  });
  test.each([
    ['missing email', { ...valid, email: undefined }],
    ['invalid email', { ...valid, email: 'not-an-email' }],
    ['missing surname', { ...valid, surname: '  ' }],
    ['surname with symbols', { ...valid, surname: '<script>' }],
    ['oversized surname', { ...valid, surname: 'a'.repeat(101) }],
    ['bad dob format', { ...valid, dob: '20-04-1998' }],
    ['impossible dob', { ...valid, dob: '1998-02-31' }],
    ['future dob', { ...valid, dob: '2999-01-01' }],
    ['phone without country code', { ...valid, phone: '9876543210' }],
    ['NoSQL operator object as email', { ...valid, email: { $gt: '' } }],
  ])('rejects %s', (_name, input) => {
    expect(registerSchema.safeParse(input).success).toBe(false);
  });
});

describe('helpers', () => {
  test('normalizePhone', () => {
    expect(normalizePhone('0044 20 7946 0958')).toBe('+442079460958');
    expect(normalizePhone('12345')).toBeNull();
  });
  test('parseDateOnly rejects rolled-over dates', () => {
    expect(parseDateOnly('2024-02-29')).not.toBeNull();
    expect(parseDateOnly('2023-02-29')).toBeNull();
  });
  test('otp schemas', () => {
    expect(sendOtpSchema.safeParse({ email: 'a@b.co' }).success).toBe(true);
    expect(verifyOtpSchema.safeParse({ email: 'a@b.co', code: '12345' }).success).toBe(false);
    expect(verifyOtpSchema.safeParse({ email: 'a@b.co', code: '123456' }).success).toBe(true);
    expect(verifyOtpSchema.safeParse({ email: 'a@b.co', code: 123456 }).success).toBe(false);
  });
});
