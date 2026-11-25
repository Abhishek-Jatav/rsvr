# RSVR Secure Authentication System

Email-OTP and passkey (WebAuthn) sign-in with **one active session per account**.
Built from the 12 documents in `docs/` (PRD, architecture, API, database, rules, phases, and so on).

- `backend/`  Node.js + Express + MongoDB (Mongoose). Deploy to Render.
- `frontend/` Next.js (App Router) + Tailwind CSS. Deploy to Netlify.
- `docs/`     The original specification documents (unchanged).

## What it does
- Register with email, surname, date of birth and an optional phone number.
- Sign in with a 6-digit email code (valid 5 minutes, single use, max 5 attempts, 60 s resend cooldown, hourly cap).
- Sign in with a passkey (Face ID, fingerprint, PIN, security key). Only the public key is stored.
- Server-side sessions in an HttpOnly cookie. Only a hash of the token is stored. Logout revokes it.
- **One active session per account**, enforced by a partial unique index in MongoDB, so two simultaneous logins cannot both succeed.
- Screens: Register, Login, Verify code, Passkey (enrol or sign in), Dashboard.

## Run it locally
You need Node 20+ (22 recommended), a MongoDB database (Atlas free tier or local) and a Gmail account with an **App Password** (2-Step Verification must be on).

```bash
# 1. API
cd backend
cp .env.example .env        # then fill in the values (see below)
npm install
npm run dev                 # http://localhost:5000/api/health

# 2. Frontend (new terminal)
cd frontend
cp .env.local.example .env.local
npm install
npm run dev                 # http://localhost:3000
```
Passkeys work on `http://localhost` for development. Use `localhost` (not `127.0.0.1`) in your browser.

### Generate the two secrets (must be different, 32+ characters)
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```
Run it twice: once for `SESSION_TOKEN_PEPPER`, once for `OTP_HASH_SECRET`.

## Tests
```bash
cd backend
npm test                                   # 26 unit tests (no database needed)
TEST_MONGODB_URI=mongodb://127.0.0.1:27017/rsvr_test npm run test:integration   # 36 API tests
```
The integration tests use a real MongoDB and **wipe that database**, so point them at a throwaway one.
They cover registration, OTP rules, the single-session rule (including 8 parallel logins), logout, CORS/CSRF
guard, and full passkey enrolment and login using a software authenticator.

## Deploy
**API on Render** (Node web service, root directory `backend`, build `npm install`, start `npm start`, health check `/api/health`).
A `render.yaml` blueprint is included. Add the environment variables from `backend/.env.example`. In production:
- `NODE_ENV=production`
- `FRONTEND_ORIGIN=https://<your-site>.netlify.app` (exact origin, no trailing slash)
- `WEBAUTHN_ORIGIN` = the same frontend origin, and `WEBAUTHN_RP_ID` = its hostname (for example `your-site.netlify.app`)
- In MongoDB Atlas, allow Render's outbound IPs (or `0.0.0.0/0` with a strong password for a demo).

**Frontend on Netlify** (base directory `frontend`). Set `NEXT_PUBLIC_API_BASE_URL=https://<your-api>.onrender.com/api`.

Because the site and API are on different domains, the cookie is sent as `Secure; SameSite=None` in production.
Some browsers block third-party cookies; if sign-in works but the dashboard says you are signed out, put both
on one parent domain (for example `app.example.com` and `api.example.com`) and set `COOKIE_SAMESITE=lax`.

The free Render plan sleeps when idle, so the first request can take up to a minute. The app allows for this.

## Extra optional settings (not in `docs/env.md`)
- `COOKIE_SAMESITE` = `lax` | `strict` | `none`. Default: `lax` in development, `none` in production.

## Design decisions worth knowing
- **Unknown emails** get the same "code sent" reply as real ones (no account enumeration). Registering and the
  passkey "not available" reply (required by the API spec) can still reveal whether an email exists.
- **Resend cooldown** is tracked per account, so it only applies to emails that exist.
- **Locked out by a forgotten session?** There is no takeover or admin reset in the spec. If a user closes a
  browser without logging out, they wait for the session to expire (`SESSION_TTL_HOURS`) or log out from that browser.
- `GET /api/auth/me` also returns `passkeyCount` so the dashboard can show enrolment state.
- Passkeys require user verification (biometric or PIN), because a passkey is the only factor in that flow.
- OTP records are kept one hour after expiry so the hourly cap can be counted; then MongoDB deletes them.
- Brand colours were not supplied; accessible defaults live in `frontend/tailwind.config.js`.

## Not done / out of scope (per the docs)
SMS codes, passwords, social login, admin panel, account recovery, multi-device sessions, and a CI pipeline.
