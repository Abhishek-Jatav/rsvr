# System Architecture
## RSVR Technologies — Secure Authentication System

## 1. Architecture overview

Use a modular, layered web architecture:

- **Presentation:** Next.js/React UI, responsive Tailwind CSS styling, browser WebAuthn client.
- **API/application:** Express REST API. Routes map HTTP requests to controllers; controllers validate request shape and delegate to application services.
- **Domain:** Authentication, OTP, passkey, and session rules. Business rules must not depend on Express or Mongoose.
- **Infrastructure:** Mongoose repositories/models, Gmail SMTP/Nodemailer, WebAuthn server library, environment configuration, logging, and deployment adapters.

The frontend must never make authorization decisions. The backend is authoritative for OTP validity, passkey verification, session status, and single-device enforcement.

## 2. High-level request flow

```text
Browser
  |
  | HTTPS / REST / credentialed requests
  v
Next.js frontend (Netlify)
  |
  | CORS + secure session cookie
  v
Express API (Render)
  |          |             |
  v          v             v
Services   WebAuthn      Nodemailer
  |          |             |
  v          v             v
Mongoose   Passkey       Gmail SMTP
  |
  v
MongoDB Atlas
  - Users
  - OTPs (OTP and short-lived WebAuthn challenge records)
  - Sessions
  - Passkeys
```

## 3. Component responsibilities

### Frontend
- Render the five product screens and their loading/error/success states.
- Validate basic input for user experience; never treat client validation as security.
- Call REST endpoints through one API client.
- Include credentials on requests when cookie-based sessions are used.
- Invoke WebAuthn browser APIs through `@simplewebauthn/browser`.
- Adapt layout and controls to mobile, tablet, and desktop.
- Never store OTP secrets, session secrets, private keys, or biometric data.

### Backend
- Expose versionable REST endpoints under `/api`.
- Normalize and validate incoming data.
- Enforce uniqueness and registration rules.
- Generate OTPs using a cryptographically secure random generator; store only a secure hash.
- Deliver OTPs through Nodemailer/Gmail SMTP.
- Verify OTP expiry, attempt count, and single-use status.
- Create and revoke server-side sessions.
- Generate and verify WebAuthn registration/authentication options and responses.
- Authorize every protected request by validating the session against MongoDB.
- Apply rate limiting, CORS, security headers, and centralized error handling.

### Database
MongoDB Atlas is the durable source of truth for users, OTP/challenge state, sessions, and passkey public credentials. Use Mongoose schemas, indexes, and repository/service boundaries.

## 4. Authentication design

### Email OTP
1. Client requests an OTP for a registered email.
2. API applies rate limits and verifies account eligibility.
3. API generates a six-digit cryptographically secure code.
4. Store a keyed or salted hash, purpose, user/email reference, expiry, attempts, and consumed state. Never store plaintext OTP.
5. Send the plaintext code through Gmail SMTP.
6. On verification, compare safely, enforce expiry and attempt limits, and mark the challenge consumed atomically.
7. Check for an existing active session.
8. Create a random high-entropy session token; store only its hash in `Sessions`; set the raw token in a Secure, HttpOnly cookie.

### Passkey/WebAuthn
- Browser ceremony is initiated through `@simplewebauthn/browser`.
- Server generates registration/authentication options using `@simplewebauthn/server`.
- Server stores the generated challenge with a short expiry in `OTPs` using a WebAuthn-specific `purpose`.
- On verification, retrieve and consume the matching challenge, verify origin, RP ID, challenge, ceremony type, and authenticator response.
- Store credential ID, public key, counter, transports when available, and user association. Never store a biometric template or passkey private key.
- After a successful assertion, apply the same active-session policy and issue the same session cookie.

### Single active session
- Each user may have at most one non-revoked, non-expired session.
- Session creation must be atomic with respect to the user. Use a transaction where supported by the MongoDB deployment, or a conditional update/unique active-session strategy that prevents concurrent logins from both succeeding.
- A login attempt encountering an active session returns a stable conflict response, e.g. `ACTIVE_SESSION_EXISTS`. It must not silently revoke the existing session.
- Logout marks the session revoked and clears the cookie.
- Expired/revoked sessions are rejected even if the browser still sends their cookie.

## 5. Session cookie and cross-origin deployment

Recommended cookie properties:
- `HttpOnly`
- `Secure` in production
- `SameSite=None` when frontend and API are cross-site and credentialed CORS is configured
- Narrow `Path=/`; set a deliberate cookie name and expiry/max-age
- Do not set a broad cookie domain unless required and verified

Frontend API requests must use `credentials: "include"`. Express CORS must allow only the exact frontend origin and `credentials: true`; wildcard origins are incompatible with credentialed cookies.

**Deployment caveat:** `*.netlify.app` and `*.onrender.com` are different sites. Cross-site cookies can be blocked by browser privacy controls. Prefer `app.example.com` and `api.example.com` under the same registrable domain if the project can use a domain. If using provider hostnames, test Chrome, Firefox, Safari, and mobile browsers. Do not declare production session behavior complete until tested.

## 6. Suggested backend module boundaries

- `config`: validated environment configuration and database connection.
- `modules/users`: registration, profile retrieval, user repository.
- `modules/auth`: OTP request/verification, login orchestration, session authorization/logout.
- `modules/webauthn`: registration and authentication ceremonies.
- `modules/sessions`: token creation, lookup, expiry, revocation, single-session policy.
- `shared`: validation, errors, middleware, logging, constants.

Within each module, keep HTTP route/controller concerns separate from business services and Mongoose persistence.

## 7. Frontend module boundaries

- `app` or `pages`: route/screen composition, depending on chosen Next.js router.
- `components`: reusable inputs, buttons, OTP fields, layout, feedback.
- `features/auth`: registration, login, OTP, passkey UI and hooks.
- `features/dashboard`: profile/session display.
- `lib/api`: API client, request/response handling.
- `lib/webauthn`: browser ceremony integration.
- `styles`: Tailwind configuration and global styles.

## 8. Security controls
- HTTPS in production.
- Strict CORS allowlist.
- Helmet/security headers.
- Rate limiting by IP and account identifier.
- Server-side schema validation.
- Hash OTP and session token before persistence.
- Atomic single-use OTP/challenge consumption.
- Session checks on every protected route.
- Safe, non-enumerating authentication responses where practical.
- Avoid logging secrets or sensitive profile fields.
- Database least-privilege credentials and network restrictions where available.
- Production environment variables configured only in hosting dashboards.

## 9. Scalability and reliability
- Persist session and challenge state in MongoDB, not process memory, so Render restarts do not erase authentication state.
- Use TTL indexes for cleanup, but always check expiry in application logic because TTL deletion is asynchronous.
- Keep email sending behind a service boundary so a future provider can replace Gmail without changing authentication logic.
- Keep API stateless apart from persisted records.
- Use indexes for unique identifiers and common lookup paths.
- Add a health endpoint for deployment checks; it must not disclose secrets or internal configuration.

## 10. Architecture decisions
| Decision | Baseline |
|---|---|
| API style | REST |
| Frontend | Next.js, React, JavaScript, Tailwind CSS |
| Backend | Node.js, Express |
| Persistence | MongoDB Atlas + Mongoose |
| Email | Nodemailer + Gmail SMTP |
| Passkeys | `@simplewebauthn/browser` and `@simplewebauthn/server` |
| Session | Opaque random token; hash stored in MongoDB; HttpOnly cookie |
| Active devices | One valid session per user |
| Challenge persistence | `OTPs` collection with typed challenge records |
| Deployment | Netlify frontend, Render backend |
