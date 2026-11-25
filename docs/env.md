# Environment Variables and Secrets
## RSVR Technologies — Secure Authentication System

This document defines configuration names and handling. It contains placeholders only; never place real credentials in this file or commit real `.env` files.

## 1. Backend environment

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | Yes | `development` or `production` |
| `PORT` | Yes | Express listening port; use hosting-provided port on Render |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `FRONTEND_ORIGIN` | Yes | Exact frontend origin allowed by CORS |
| `SESSION_COOKIE_NAME` | Yes | Name of the HttpOnly session cookie |
| `SESSION_TTL_HOURS` | Yes | Maximum session lifetime |
| `SESSION_TOKEN_PEPPER` | Yes | High-entropy secret used when hashing session tokens |
| `OTP_HASH_SECRET` | Yes | High-entropy secret used to hash OTP values |
| `OTP_TTL_SECONDS` | Yes | Set to `300` |
| `OTP_MAX_ATTEMPTS` | Yes | Initial default `5` |
| `OTP_RESEND_COOLDOWN_SECONDS` | Yes | Initial default `60` |
| `OTP_HOURLY_LIMIT` | Yes | Maximum OTP sends per account/time window |
| `EMAIL_USER` | Yes | Gmail account used by Nodemailer |
| `EMAIL_PASS` | Yes | Gmail app password or SMTP credential; secret |
| `EMAIL_FROM` | Yes | Verified sender identity |
| `WEBAUTHN_RP_NAME` | Yes | Human-readable relying-party name |
| `WEBAUTHN_RP_ID` | Yes | Hostname used as WebAuthn RP ID |
| `WEBAUTHN_ORIGIN` | Yes | Exact frontend origin, including scheme |
| `LOG_LEVEL` | No | Logging verbosity |

`SESSION_TOKEN_PEPPER` and `OTP_HASH_SECRET` must be long, randomly generated secrets and must be different from each other. Do not reuse the Gmail password or MongoDB password.

## 2. Frontend environment

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Yes | Public HTTPS base URL of the Express API, e.g. `https://api.example.com/api` |

Only values intended to be public may use the `NEXT_PUBLIC_` prefix. Never place `MONGODB_URI`, `EMAIL_PASS`, OTP/session secrets, or other private values in frontend environment variables.

## 3. Local development template

Backend `.env.example`:
```dotenv
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
FRONTEND_ORIGIN=http://localhost:3000
SESSION_COOKIE_NAME=rsvr_session
SESSION_TTL_HOURS=24
SESSION_TOKEN_PEPPER=replace-with-a-long-random-secret
OTP_HASH_SECRET=replace-with-a-different-long-random-secret
OTP_TTL_SECONDS=300
OTP_MAX_ATTEMPTS=5
OTP_RESEND_COOLDOWN_SECONDS=60
OTP_HOURLY_LIMIT=5
EMAIL_USER=your-sender@gmail.com
EMAIL_PASS=your-gmail-app-password
EMAIL_FROM=your-sender@gmail.com
WEBAUTHN_RP_NAME=RSVR Secure Authentication
WEBAUTHN_RP_ID=localhost
WEBAUTHN_ORIGIN=http://localhost:3000
LOG_LEVEL=debug
```

Frontend `.env.local.example`:
```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
```

## 4. Production configuration
Configure secrets in Render's environment settings and public frontend API URL in Netlify's environment settings. Set:
- `NODE_ENV=production`
- HTTPS API and frontend origins.
- `FRONTEND_ORIGIN` to the exact deployed frontend origin.
- `WEBAUTHN_ORIGIN` to the exact frontend origin.
- `WEBAUTHN_RP_ID` to the frontend hostname (hostname only; no scheme or path).
- Secure cookie enabled.
- Correct cookie SameSite behavior for the deployed domain arrangement.

Never copy local `localhost` WebAuthn values into production.

## 5. Gmail SMTP notes
- Use Gmail SMTP through Nodemailer.
- Where Google account security requires it, use an app password rather than the normal account password.
- Do not disable account security to make SMTP work.
- Verify sender identity and test delivery, spam placement, quotas, and failure handling.
- Gmail SMTP delivers email only; it does not send SMS.

## 6. Secret handling checklist
- [ ] `.env` and `.env.local` are ignored by Git.
- [ ] `.env.example` contains placeholders only.
- [ ] No secret is used in client-side code.
- [ ] Production secrets exist only in provider secret settings.
- [ ] Secrets are unique, high entropy, and rotated if exposed.
- [ ] Logs and error responses do not expose secret values.
