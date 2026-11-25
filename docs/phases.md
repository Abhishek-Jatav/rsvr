# Development Phases
## RSVR Technologies — Secure Authentication System

Work sequentially. Each phase has an output and a gate before moving forward.

## Phase 1 — Project setup
**Tasks**
- Create Next.js frontend and Express backend projects.
- Establish a clean repository structure.
- Configure JavaScript, Tailwind CSS, and shared conventions.
- Create MongoDB Atlas database and connect with Mongoose.
- Add validated environment configuration.
- Configure API base URL and frontend-backend communication.
- Configure exact-origin CORS and Git/GitHub.
- Add a basic health endpoint.

**Acceptance gate**
- Frontend starts locally.
- Backend starts locally.
- Backend connects to Atlas.
- Frontend can call the backend health endpoint.
- No secret is committed.
- Initial layout works at mobile, tablet, and desktop widths.

**Output:** Working project structure and database connection.

## Phase 2 — Registration
**Tasks**
- Build responsive registration screen.
- Collect email, optional phone, DOB, and surname.
- Make email mandatory for the current email OTP login path.
- Add client-side usability validation and backend validation.
- Normalize identifiers and enforce duplicate checks.
- Persist user data in `Users`.

**Acceptance gate**
- Valid registration creates a user.
- Invalid fields are rejected server-side.
- Duplicate email/phone is handled cleanly, including database unique-index races.
- UI is usable on mobile, tablet, and desktop.

**Output:** Working user registration.

## Phase 3 — Six-digit email OTP
**Tasks**
- Generate a cryptographically secure six-digit code.
- Hash it before database persistence.
- Send via Nodemailer and Gmail SMTP.
- Enforce five-minute expiry, maximum failed attempts, resend throttling, and one-time use.
- Add clear OTP, expired, incorrect, and resend UI states.
- Create the session only after successful verification and active-session checks.

**Acceptance gate**
- Correct code succeeds.
- Incorrect, expired, reused, and over-attempt codes fail.
- Resend throttling works and old code is invalidated/superseded.
- Email delivery works with configured SMTP.
- Active session conflict is handled.

**Output:** Working email OTP authentication.

## Phase 4 — WebAuthn/passkeys
**Tasks**
- Integrate `@simplewebauthn/browser` and `@simplewebauthn/server`.
- Implement registration options and verification.
- Persist public credential information in `Passkeys`.
- Persist short-lived challenges in `OTPs` with distinct WebAuthn purposes.
- Implement login options and assertion verification.
- Validate origin, RP ID, challenge, user association, and authenticator counter as appropriate.
- Provide graceful fallback to email OTP.

**Acceptance gate**
- A compatible device can enroll a passkey.
- Invalid or expired challenge responses are rejected.
- A valid passkey can authenticate.
- Unsupported devices receive a clear fallback.
- No biometric template/private key is stored by the application.

**Output:** Working passkey enrollment and login.

## Phase 5 — Single-device restriction
**Tasks**
- Create opaque high-entropy session identifiers.
- Store only session-token hashes.
- Associate sessions with user, creation, expiry, revocation, and authentication method.
- Enforce one active session per user atomically.
- Reject concurrent/second-device login while an active session exists.
- Revoke sessions on logout and invalidate expired/revoked sessions.
- Set and clear secure cookies.

**Acceptance gate**
- First login creates one active session.
- Second login is rejected while that session is valid.
- Logout revokes the session.
- Old cookie cannot access private routes.
- Concurrent login attempts cannot both create active sessions.

**Output:** One active authenticated device per user.

## Phase 6 — User dashboard
**Tasks**
- Build responsive dashboard.
- Display surname, registered email/phone, DOB, authentication method, and session status.
- Fetch user data from `/api/auth/me`.
- Add logout and loading/error states.
- Do not expose session secrets or internal identifiers.

**Acceptance gate**
- Authenticated user sees only their own profile.
- Unauthenticated user cannot access dashboard data.
- Logout returns user to login and invalidates server session.
- Dashboard reflows across mobile, tablet, and desktop.

**Output:** Functional user dashboard.

## Phase 7 — Responsive design, testing, and security
**Tasks**
- Review all five screens at mobile, tablet, and desktop sizes.
- Fix overflow, spacing, typography, and touch target issues.
- Test registration, duplicate checks, OTP paths, passkeys, second-device login, logout, and private routes.
- Review CORS, cookies, rate limits, input validation, logging, and secret handling.
- Test browser/device passkey compatibility and fallback behavior.
- Resolve critical/high severity defects.

**Acceptance gate**
- No horizontal scrolling at target viewport sizes.
- All critical functional and security test cases pass.
- Cookie/session behavior works in supported target browsers.
- Known limitations are documented.

**Output:** Fully tested, secure, responsive application.

## Phase 8 — Deployment and submission
**Tasks**
- Deploy Next.js frontend to Netlify.
- Deploy Express backend to Render.
- Configure Atlas, Gmail SMTP, CORS, cookie settings, WebAuthn origin, and RP ID.
- Configure production secrets in hosting dashboards.
- Verify production HTTPS and health checks.
- Test the live application end to end.
- Push source code to GitHub.
- Prepare project explanation and live demo link.
- Email code and explanation to `hr@rsvrtech.com`.

**Acceptance gate**
- Live registration, email OTP, passkey (where supported), session restriction, dashboard, and logout work.
- No secrets appear in repository or browser bundle.
- GitHub repository and demo link are ready.
- Submission email is prepared/sent by the project owner.

**Output:** Deployed project and completed internship assignment.
