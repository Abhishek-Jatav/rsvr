
# RSVR Secure Authentication System

Email-code and passkey (WebAuthn) sign-in with **one active session per account**.
Built from the 12 specification documents in `docs/`.

- `backend/`  Node.js + Express + MongoDB (Mongoose). Hosted on Render.
- `frontend/` Next.js (App Router) + Tailwind CSS. Hosted on Netlify.
- `docs/`     The original specification documents (unchanged).

## Live links

- Frontend: https://rsvr-frontend.netlify.app
- Backend API: https://rsvr-backend.onrender.com/api
- Health check: https://rsvr-backend.onrender.com/api/health

## Features

- Register with email, surname, date of birth and an optional phone number.
- Sign in with a 6-digit email code (valid 5 minutes, single use, 5 attempts, 60 s resend wait, hourly cap).
- Sign in with a passkey (Face ID, fingerprint, PIN or security key). Only the public key is stored.
- Server-side sessions in an HttpOnly cookie. Only a hash of the token is stored. Logout revokes it.
- One active session per account, enforced by a unique index in MongoDB, so two logins at the same time cannot both succeed.
- Screens: Register, Login, Enter code, Passkey, Dashboard.

## Requirements

- Node.js 20 or newer (22 recommended)
- A MongoDB database (MongoDB Atlas free tier works)
- A Gmail account with an App Password (2-Step Verification must be on)

## Run locally

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5000/api/health. You should see `"database":"connected"`.

### 2. Frontend (new terminal)

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Open http://localhost:3000. Use `localhost`, not `127.0.0.1`, because passkeys need it.

## Environment values

The app reads only the plain variable names below. Local values go in the `.env` files.
Production values go in the Render and Netlify dashboards. Never commit `.env` files.

### Backend (`backend/.env` locally, Render dashboard in production)

| Variable                    | Local                                                    | Production                        |
| --------------------------- | -------------------------------------------------------- | --------------------------------- |
| NODE_ENV                    | development                                              | production                        |
| PORT                        | 5000                                                     | set by Render (leave unset)       |
| MONGODB_URI                 | your Atlas link                                          | your Atlas link                   |
| FRONTEND_ORIGIN             | http://localhost:3000                                    | https://rsvr-frontend.netlify.app |
| SESSION_COOKIE_NAME         | rsvr_session                                             | rsvr_session                      |
| SESSION_TTL_HOURS           | 24                                                       | 24                                |
| SESSION_TOKEN_PEPPER        | random secret, 32+ characters                            | different random secret           |
| OTP_HASH_SECRET             | random secret, 32+ characters, different from the pepper | different random secret           |
| OTP_TTL_SECONDS             | 300 (must stay 300)                                      | 300                               |
| OTP_MAX_ATTEMPTS            | 5                                                        | 5                                 |
| OTP_RESEND_COOLDOWN_SECONDS | 60                                                       | 60                                |
| OTP_HOURLY_LIMIT            | 5                                                        | 5                                 |
| EMAIL_USER                  | your Gmail address                                       | your Gmail address                |
| EMAIL_PASS                  | Gmail App Password (16 letters, no spaces)               | same                              |
| EMAIL_FROM                  | your Gmail address                                       | your Gmail address                |
| WEBAUTHN_RP_NAME            | RSVR Secure Authentication                               | RSVR Secure Authentication        |
| WEBAUTHN_RP_ID              | localhost                                                | rsvr-frontend.netlify.app         |
| WEBAUTHN_ORIGIN             | http://localhost:3000                                    | https://rsvr-frontend.netlify.app |
| LOG_LEVEL                   | debug                                                    | info                              |
| COOKIE_SAMESITE (optional)  | lax (default)                                            | none (default in production)      |

Rules the server checks at start-up (it prints exactly what is wrong and stops):

- The two secrets must be different and at least 32 characters.
- `OTP_TTL_SECONDS` must be exactly 300.
- In production, origins must start with `https://` and `WEBAUTHN_RP_ID` must not be `localhost`.
- `WEBAUTHN_RP_ID` is only the host name: no `https://`, no port, no slash.
- Origins have no slash at the end.

Create a secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Run it twice, once for each secret.

### Frontend (`frontend/.env.local` locally, Netlify dashboard in production)

| Variable                 | Local                     | Production                            |
| ------------------------ | ------------------------- | ------------------------------------- |
| NEXT_PUBLIC_API_BASE_URL | http://localhost:5000/api | https://rsvr-backend.onrender.com/api |

This value is built into the site, so after changing it on Netlify you must redeploy.

## Tests

Backend (from `backend/`):

```bash
npm test
```

Runs 26 unit tests. No database needed.

```bash
TEST_MONGODB_URI="mongodb+srv://user:password@cluster.mongodb.net/rsvr_test" npm run test:integration
```

Runs 36 full API tests against a real MongoDB. **This wipes that database**, so use a throwaway one
(for example a database named `rsvr_test`). On Windows PowerShell, set the variable first:
`$env:TEST_MONGODB_URI="..."`. If your password has symbols such as `@` or `#`, encode them (`@` becomes `%40`).

Frontend (from `frontend/`):

```bash
npm run build
```

It should list the routes `/`, `/login`, `/register`, `/verify`, `/passkey` and `/dashboard` with no errors.

## Deploy

Deploy the backend first, then the frontend.

### Backend on Render

| Field             | Value       |
| ----------------- | ----------- |
| Root Directory    | backend     |
| Build Command     | npm install |
| Start Command     | npm start   |
| Health Check Path | /api/health |

Add the production variables from the table above. A `render.yaml` blueprint is included.
In MongoDB Atlas, open Network Access and allow Render to connect (for a demo you can use `0.0.0.0/0` with a strong database password).

### Frontend on Netlify

| Field                | Value                                                            |
| -------------------- | ---------------------------------------------------------------- |
| Base directory       | frontend                                                         |
| Build command        | npm run build                                                    |
| Publish directory    | .next                                                            |
| Environment variable | NEXT_PUBLIC_API_BASE_URL = https://rsvr-backend.onrender.com/api |

### After deploying, test

1. Open the health link and check for `"database":"connected"`.
2. Register, then sign in with an email code.
3. Add a passkey, log out, and sign in with the passkey.
4. Try signing in from a second browser while the first is logged in. You should see the "already has an active login" message.

## Important: email codes on the Render free plan

The app sends codes through Gmail SMTP. Render free web services block outbound SMTP ports 25, 465 and 587
(since 26 September 2025), so on the free plan the code email cannot be sent. The site then shows
"We could not send the code right now", and the Render logs show `otp email delivery failed` with `ETIMEDOUT` or `ESOCKET`.

Ways to fix it:

1. Upgrade the Render service to a paid instance type (ports 465 and 587 work there).
2. Use an email service with an HTTPS API (for example Brevo) instead of SMTP. This needs a small code change
   in `backend/src/modules/auth/mailer.js`. It is not included in this version.

Passkey sign-in does not need email, but a user must first sign in once with an email code to add a passkey.

## Troubleshooting

| Problem                                                                          | What to check                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Backend stops with "Invalid environment configuration"                           | Read the listed settings and fix them in `.env` or in Render.                                                                                                                                                          |
| `"database":"disconnected"`                                                    | Atlas password, the database name in the link, and Network Access.                                                                                                                                                       |
| No email arrives locally                                                         | Spam folder, and that `EMAIL_PASS` is the App Password, not your Gmail password.                                                                                                                                       |
| Code request fails only on Render                                                | The free-plan SMTP block described above.                                                                                                                                                                                |
| Signed in, but the dashboard says signed out                                     | Both sites must be https in production. Check `FRONTEND_ORIGIN`. Some browsers block third-party cookies, so for the most reliable setup put the site and API under one parent domain and set `COOKIE_SAMESITE=lax`. |
| "This request is not allowed from this origin"                                   | `FRONTEND_ORIGIN` on Render must exactly match the Netlify link.                                                                                                                                                       |
| Passkey button missing or failing                                                | Use `localhost` locally and https in production. `WEBAUTHN_RP_ID` and `WEBAUTHN_ORIGIN` must match the site you are using.                                                                                         |
| First request is very slow                                                       | The free Render plan sleeps when idle and can take up to a minute to wake.                                                                                                                                               |
| Warning "the `new` option for findOneAndUpdate() is deprecated" in test output | Harmless. It is a Mongoose notice and does not affect results.                                                                                                                                                           |

## Design notes

- Unknown emails get the same "code sent" reply as real ones. Registration and the passkey "not available" reply (required by the API spec) can still show whether an email exists.
- The resend wait is tracked per account, so it only applies to emails that exist.
- If a user closes a browser without logging out, they must wait for the session to expire (`SESSION_TTL_HOURS`) or log out from that browser. The specification has no reset option.
- `GET /api/auth/me` also returns `passkeyCount` so the dashboard can show passkey status.
- Passkeys require user verification (biometric or PIN) because they are the only factor in that flow.
- Email-code records are kept for one hour after expiry so the hourly cap can be counted, then MongoDB deletes them.
- Brand colours were not supplied. Defaults live in `frontend/tailwind.config.js`.

## Out of scope (per the specification)

SMS codes, passwords, social login, admin panel, account recovery, multiple devices at once, and CI pipelines.
