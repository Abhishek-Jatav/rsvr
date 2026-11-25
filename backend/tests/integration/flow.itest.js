'use strict';
/**
 * End-to-end API tests against a real MongoDB, run with Node's built-in test runner
 * (Jest's sandbox is incompatible with the MongoDB driver). Run with:
 *   TEST_MONGODB_URI=mongodb://127.0.0.1:27017/rsvr_test npm run test:integration
 * WARNING: the target database is dropped at the start of the run - use a throwaway database.
 */
require('../setup-env');
process.env.OTP_HOURLY_LIMIT = '50'; // flows below request many codes for one account; the cap has its own test
const { describe, test, before: beforeAll, after: afterAll, beforeEach } = require('node:test');
const { expect } = require('expect');
const request = require('supertest');
const mongoose = require('mongoose');
const { SoftAuthenticator } = require('../helpers/softAuthenticator');

const TEST_URI = process.env.TEST_MONGODB_URI;

// Replace the Gmail mailer with an in-memory stub before the app loads it.
const mailerPath = require.resolve('../../src/modules/auth/mailer');
const mailer = {
  calls: [],
  failNext: false,
  async sendOtpEmail(...args) {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('smtp down');
    }
    this.calls.push(args);
  },
};
require.cache[mailerPath] = { id: mailerPath, filename: mailerPath, loaded: true, exports: mailer };

const ORIGIN = 'http://localhost:3000';
const COOKIE = 'rsvr_session';

describe('RSVR API (integration)', { skip: !TEST_URI && 'set TEST_MONGODB_URI to run' }, () => {
  let app;
  let Challenge;
  let Session;
  let sessionService;

  const post = (path) => request(app).post(path).set('Origin', ORIGIN);
  const cookieFrom = (res) => {
    const raw = (res.headers['set-cookie'] || []).find((c) => c.startsWith(`${COOKIE}=`));
    return raw ? raw.split(';')[0] : null;
  };
  const lastCode = () => mailer.calls.at(-1)[1];
  const sentCount = () => mailer.calls.length;
  const skipCooldown = (email) =>
    // createdAt is immutable in Mongoose, so go through the raw driver collection.
    Challenge.collection.updateMany({ identifier: email }, { $set: { createdAt: new Date(Date.now() - 120000) } });

  async function loginWithOtp(email) {
    await skipCooldown(email);
    const sent = await post('/api/auth/send-otp').send({ email });
    expect(sent.status).toBe(200);
    return post('/api/auth/verify-otp').send({ email, code: lastCode() });
  }

  beforeAll(async () => {
    await mongoose.connect(TEST_URI);
    await mongoose.connection.dropDatabase();
    const models = [
      require('../../src/modules/users/user.model'),
      require('../../src/modules/challenges/challenge.model'),
      require('../../src/modules/sessions/session.model'),
      require('../../src/modules/webauthn/passkey.model'),
    ];
    await Promise.all(models.map((m) => m.init()));
    Challenge = models[1];
    Session = models[2];
    sessionService = require('../../src/modules/sessions/session.service');
    app = require('../../src/app').createApp();
  });
  afterAll(() => mongoose.disconnect());
  beforeEach(() => { mailer.failNext = false; });

  describe('registration', () => {
    const body = { email: 'Asha@Example.com', phone: '+91 98765 43210', dob: '1998-04-20', surname: 'Sharma' };

    test('REG-01 valid details create a user', async () => {
      const res = await post('/api/auth/register').send(body);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(await mongoose.model('User').countDocuments()).toBe(1);
    });
    test('REG-06/07 duplicate email or phone is a conflict', async () => {
      const dupEmail = await post('/api/auth/register').send({ ...body, phone: '+919999999999' });
      expect(dupEmail.status).toBe(409);
      expect(dupEmail.body.error.code).toBe('ACCOUNT_ALREADY_EXISTS');
      const dupPhone = await post('/api/auth/register').send({ ...body, email: 'other@example.com' });
      expect(dupPhone.status).toBe(409);
      expect(await mongoose.model('User').countDocuments()).toBe(1);
    });
    test('concurrent duplicate registrations create only one user', async () => {
      const results = await Promise.all(
        Array.from({ length: 6 }, () => post('/api/auth/register').send({ ...body, email: 'race@example.com', phone: undefined }))
      );
      expect(results.filter((r) => r.status === 201)).toHaveLength(1);
      expect(await mongoose.model('User').countDocuments({ email: 'race@example.com' })).toBe(1);
    });
    test('users without phone do not collide with each other', async () => {
      const a = await post('/api/auth/register').send({ ...body, email: 'nophone1@example.com', phone: undefined });
      const b = await post('/api/auth/register').send({ ...body, email: 'nophone2@example.com', phone: undefined });
      expect([a.status, b.status]).toEqual([201, 201]);
    });
    test('REG-02..05 invalid input returns field errors', async () => {
      const res = await post('/api/auth/register').send({ surname: '', dob: '2999-01-01' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(Object.keys(res.body.error.fields)).toEqual(expect.arrayContaining(['email', 'surname', 'dob']));
    });
    test('REG-08 oversized body is rejected safely', async () => {
      const res = await post('/api/auth/register').send({ ...body, surname: 'x'.repeat(40000) });
      expect(res.status).toBe(413);
    });
  });

  describe('email OTP and single session', () => {
    const email = 'asha@example.com';
    let cookie;

    test('OTP-10 unknown email gets the same response and nothing is sent', async () => {
      const before = sentCount();
      const res = await post('/api/auth/send-otp').send({ email: 'ghost@example.com' });
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ expiresInSeconds: 300, resendAfterSeconds: 60 });
      expect(sentCount()).toBe(before);
    });
    test('OTP-01 sends a code that is stored only as a hash, expiring in 5 minutes', async () => {
      const res = await post('/api/auth/send-otp').send({ email });
      expect(res.status).toBe(200);
      const code = lastCode();
      expect(code).toMatch(/^\d{6}$/);
      const rec = await Challenge.findOne({ identifier: email, purpose: 'EMAIL_LOGIN' }).sort({ createdAt: -1 });
      expect(rec.codeHash).toBeDefined();
      expect(JSON.stringify(rec.toObject())).not.toContain(code);
      expect(Math.round((rec.expiresAt - rec.createdAt) / 1000)).toBe(300);
    });
    test('OTP-07 resend before cooldown is rate limited', async () => {
      const before = sentCount();
      const res = await post('/api/auth/send-otp').send({ email });
      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('RATE_LIMITED');
      expect(sentCount()).toBe(before);
    });
    test('OTP-08 resend after cooldown supersedes the previous code', async () => {
      await skipCooldown(email);
      await post('/api/auth/send-otp').send({ email });
      const records = await Challenge.find({ identifier: email, purpose: 'EMAIL_LOGIN' }).sort({ createdAt: 1 });
      expect(records).toHaveLength(2);
      expect(records[0].consumedAt).not.toBeNull(); // old code is dead
      expect(records[1].consumedAt).toBeNull(); // only the newest is usable
    });
    test('OTP-03 wrong code is rejected and attempts increment', async () => {
      const wrong = lastCode() === '000000' ? '000001' : '000000';
      const res = await post('/api/auth/verify-otp').send({ email, code: wrong });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('OTP_INVALID');
      const rec = await Challenge.findOne({ identifier: email }).sort({ createdAt: -1 });
      expect(rec.attempts).toBe(1);
    });
    test('OTP-02 correct code signs in and sets an HttpOnly cookie', async () => {
      const res = await post('/api/auth/verify-otp').send({ email, code: lastCode() });
      expect(res.status).toBe(200);
      const raw = res.headers['set-cookie'].find((c) => c.startsWith(COOKIE));
      expect(raw).toMatch(/HttpOnly/i);
      expect(raw).toMatch(/SameSite=Lax/i);
      cookie = cookieFrom(res);
      expect(res.body.data.user).toEqual({ surname: 'Sharma', email });
      // session token is stored hashed, never raw
      const token = cookie.split('=')[1];
      const session = await Session.findOne({ isActive: true });
      expect(session.tokenHash).not.toBe(token);
      expect(session.tokenHash).toBe(sessionService.hashToken(token));
    });
    test('OTP-05 reusing a successful code fails', async () => {
      const res = await post('/api/auth/verify-otp').send({ email, code: lastCode() });
      expect(res.status).toBe(400);
    });
    test('dashboard data: /me returns only allowed fields', async () => {
      const res = await request(app).get('/api/auth/me').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.data.user).toEqual({ surname: 'Sharma', email, phone: '+919876543210', dob: '1998-04-20' });
      expect(res.body.data.session).toEqual({ status: 'active', authenticationMethod: 'email_otp' });
      expect(JSON.stringify(res.body)).not.toMatch(/tokenHash|codeHash|_id/);
    });
    test('SES-04/05 no cookie or invalid token -> 401', async () => {
      expect((await request(app).get('/api/auth/me')).status).toBe(401);
      expect((await request(app).get('/api/auth/me').set('Cookie', `${COOKIE}=${'a'.repeat(43)}`)).status).toBe(401);
    });
    test('SES-02 second login while a session is active -> 409', async () => {
      const res = await loginWithOtp(email);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ACTIVE_SESSION_EXISTS');
      expect(cookieFrom(res)).toBeNull();
      expect(await Session.countDocuments({ isActive: true })).toBe(1);
    });
    test('SES-07/08 logout revokes server-side; old cookie is rejected', async () => {
      const out = await request(app).post('/api/auth/logout').set('Origin', ORIGIN).set('Cookie', cookie);
      expect(out.status).toBe(200);
      expect(out.headers['set-cookie'].join(';')).toMatch(/rsvr_session=;/);
      expect((await request(app).get('/api/auth/me').set('Cookie', cookie)).status).toBe(401);
      expect((await request(app).post('/api/auth/logout').set('Origin', ORIGIN).set('Cookie', cookie)).status).toBe(401);
    });
    test('login works again after logout', async () => {
      const res = await loginWithOtp(email);
      expect(res.status).toBe(200);
      cookie = cookieFrom(res);
    });
    test('SES-06/10 an expired session is rejected even if not yet cleaned up', async () => {
      await Session.updateMany({ isActive: true }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
      expect((await request(app).get('/api/auth/me').set('Cookie', cookie)).status).toBe(401);
      // and an expired-but-flagged-active session does not block the next login
      const res = await loginWithOtp(email);
      expect(res.status).toBe(200);
      await request(app).post('/api/auth/logout').set('Origin', ORIGIN).set('Cookie', cookieFrom(res));
    });
    test('OTP-04 expired code -> 410', async () => {
      await skipCooldown(email);
      await post('/api/auth/send-otp').send({ email });
      await Challenge.updateMany({ identifier: email, consumedAt: null }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
      const res = await post('/api/auth/verify-otp').send({ email, code: lastCode() });
      expect(res.status).toBe(410);
      expect(res.body.error.code).toBe('OTP_EXPIRED');
    });
    test('OTP-06 too many wrong attempts locks the code, even for the right one', async () => {
      await skipCooldown(email);
      await post('/api/auth/send-otp').send({ email });
      const good = lastCode();
      const bad = good === '123456' ? '654321' : '123456';
      for (let i = 0; i < 5; i += 1) {
        expect((await post('/api/auth/verify-otp').send({ email, code: bad })).status).toBe(400);
      }
      const res = await post('/api/auth/verify-otp').send({ email, code: good });
      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('OTP_ATTEMPTS_EXCEEDED');
    });
    test('OTP-09 SMTP failure -> 503 and no usable code remains', async () => {
      await skipCooldown(email);
      mailer.failNext = true;
      const before = await Challenge.countDocuments({ identifier: email });
      const res = await post('/api/auth/send-otp').send({ email });
      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('EMAIL_DELIVERY_UNAVAILABLE');
      expect(await Challenge.countDocuments({ identifier: email })).toBe(before);
    });
    test('OTP hourly cap: too many codes in an hour -> 429', async () => {
      const reg = await post('/api/auth/register').send({ email: 'cap@example.com', dob: '2000-01-01', surname: 'Cap' });
      expect(reg.status).toBe(201);
      const now = new Date();
      await Challenge.collection.insertMany(
        Array.from({ length: 50 }, (_, i) => ({
          identifier: 'cap@example.com', purpose: 'EMAIL_LOGIN', codeHash: 'x', attempts: 0, maxAttempts: 5,
          expiresAt: new Date(now.getTime() + 300000), consumedAt: now, createdAt: new Date(now.getTime() - 90000 - i),
        }))
      );
      const before = sentCount();
      const res = await post('/api/auth/send-otp').send({ email: 'cap@example.com' });
      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('RATE_LIMITED');
      expect(sentCount()).toBe(before);
    });
    test('SES-03 concurrent session creation yields exactly one active session', async () => {
      const user = await mongoose.model('User').findOne({ email: 'nophone1@example.com' });
      const results = await Promise.allSettled(
        Array.from({ length: 8 }, () => sessionService.createSession(user._id, 'email_otp'))
      );
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      results.filter((r) => r.status === 'rejected').forEach((r) => expect(r.reason.code).toBe('ACTIVE_SESSION_EXISTS'));
      expect(await Session.countDocuments({ userId: user._id, isActive: true })).toBe(1);
    });
  });

  describe('security controls', () => {
    test('requests from another origin cannot change state', async () => {
      const res = await request(app).post('/api/auth/send-otp').set('Origin', 'https://evil.example').send({ email: 'asha@example.com' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ORIGIN');
    });
    test('CORS allows only the exact frontend origin with credentials', async () => {
      const ok = await request(app).get('/api/health').set('Origin', ORIGIN);
      expect(ok.headers['access-control-allow-origin']).toBe(ORIGIN);
      expect(ok.headers['access-control-allow-credentials']).toBe('true');
      const bad = await request(app).get('/api/health').set('Origin', 'https://evil.example');
      expect(bad.headers['access-control-allow-origin']).not.toBe('https://evil.example');
      expect(bad.headers['access-control-allow-origin']).not.toBe('*');
    });
    test('health is minimal; errors never leak internals', async () => {
      const health = await request(app).get('/api/health');
      expect(health.body.data).toEqual({ status: 'ok', database: 'connected' });
      const missing = await request(app).get('/api/nope');
      expect(missing.status).toBe(404);
      const badJson = await request(app).post('/api/auth/send-otp').set('Origin', ORIGIN).set('Content-Type', 'application/json').send('{bad');
      expect(badJson.status).toBe(400);
      expect(JSON.stringify(badJson.body)).not.toMatch(/stack|SyntaxError|node_modules/);
    });
  });

  describe('passkeys (WebAuthn, software authenticator)', () => {
    const email = 'asha@example.com';
    const device = new SoftAuthenticator();
    let cookie;

    test('WA-01 requires an authenticated session', async () => {
      expect((await post('/api/webauthn/register-options').send({})).status).toBe(401);
      expect((await post('/api/webauthn/register-verify').send({})).status).toBe(401);
    });
    test('WA-07/08 login options without any passkey -> 404 fallback signal', async () => {
      const res = await post('/api/webauthn/login-options').send({ email });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PASSKEY_NOT_AVAILABLE');
      expect((await post('/api/webauthn/login-options').send({ email: 'ghost@example.com' })).body.error.code).toBe('PASSKEY_NOT_AVAILABLE');
    });
    test('WA-01/02 enrolment stores only public credential data', async () => {
      await Session.updateMany({}, { $set: { isActive: false, revokedAt: new Date() } });
      cookie = cookieFrom(await loginWithOtp(email));
      expect(cookie).toBeTruthy();

      const optsRes = await post('/api/webauthn/register-options').set('Cookie', cookie).send({});
      expect(optsRes.status).toBe(200);
      expect(optsRes.body.rp.id).toBe('localhost');
      expect(optsRes.body.authenticatorSelection.userVerification).toBe('required');

      const verify = await post('/api/webauthn/register-verify').set('Cookie', cookie).send(device.register(optsRes.body));
      expect(verify.status).toBe(201);
      const saved = await mongoose.model('Passkey').findOne({ credentialId: device.id });
      expect(saved.publicKey.length).toBeGreaterThan(20);
      expect(Object.keys(saved.toObject())).not.toContain('privateKey');

      const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
      expect(me.body.data.passkeyCount).toBe(1);
    });
    test('WA-05 replaying the registration response is rejected', async () => {
      const optsRes = await post('/api/webauthn/register-options').set('Cookie', cookie).send({});
      const response = new SoftAuthenticator().register(optsRes.body);
      expect((await post('/api/webauthn/register-verify').set('Cookie', cookie).send(response)).status).toBe(201);
      const replay = await post('/api/webauthn/register-verify').set('Cookie', cookie).send(response);
      expect(replay.status).toBe(400);
      expect(replay.body.error.code).toBe('WEBAUTHN_VERIFICATION_FAILED');
    });
    test('WA-03 wrong origin during registration is rejected', async () => {
      const optsRes = await post('/api/webauthn/register-options').set('Cookie', cookie).send({});
      const res = await post('/api/webauthn/register-verify').set('Cookie', cookie)
        .send(new SoftAuthenticator().register(optsRes.body, { origin: 'https://evil.example' }));
      expect(res.status).toBe(400);
    });
    test('WA-04 expired challenge -> 410', async () => {
      const optsRes = await post('/api/webauthn/register-options').set('Cookie', cookie).send({});
      await Challenge.updateMany({ purpose: 'WEBAUTHN_REGISTRATION', consumedAt: null }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
      const res = await post('/api/webauthn/register-verify').set('Cookie', cookie).send(new SoftAuthenticator().register(optsRes.body));
      expect(res.status).toBe(410);
      expect(res.body.error.code).toBe('CHALLENGE_EXPIRED');
    });
    test('WA-06 valid assertion signs in with method "passkey"; single-session rule still applies', async () => {
      // first: a session already exists (OTP) -> passkey login is refused
      const opts1 = await post('/api/webauthn/login-options').send({ email });
      expect(opts1.status).toBe(200);
      const blocked = await post('/api/webauthn/login-verify').send({ email, response: device.authenticate(opts1.body) });
      expect(blocked.status).toBe(409);
      expect(blocked.body.error.code).toBe('ACTIVE_SESSION_EXISTS');

      await request(app).post('/api/auth/logout').set('Origin', ORIGIN).set('Cookie', cookie);
      const opts2 = await post('/api/webauthn/login-options').send({ email });
      const res = await post('/api/webauthn/login-verify').send({ email, response: device.authenticate(opts2.body) });
      expect(res.status).toBe(200);
      cookie = cookieFrom(res);
      const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
      expect(me.body.data.session.authenticationMethod).toBe('passkey');
    });
    test('WA-05/10 a replayed assertion and a non-increasing counter are rejected', async () => {
      await request(app).post('/api/auth/logout').set('Origin', ORIGIN).set('Cookie', cookie);
      const opts = await post('/api/webauthn/login-options').send({ email });
      const stale = device.authenticate(opts.body, { counter: 1 }); // counter already used
      const res = await post('/api/webauthn/login-verify').send({ email, response: stale });
      expect(res.status).toBe(400);
      const replay = await post('/api/webauthn/login-verify').send({ email, response: stale });
      expect(replay.status).toBe(400);
    });
    test('WA-03/07 wrong origin and a credential of another account are rejected', async () => {
      const opts = await post('/api/webauthn/login-options').send({ email });
      const evil = await post('/api/webauthn/login-verify').send({ email, response: device.authenticate(opts.body, { origin: 'https://evil.example' }) });
      expect(evil.status).toBe(400);
      const opts2 = await post('/api/webauthn/login-options').send({ email });
      const other = await post('/api/webauthn/login-verify').send({ email: 'nophone2@example.com', response: device.authenticate(opts2.body) });
      expect(other.status).toBe(400);
    });
  });
});
