# Project Rules and Engineering Decisions
## RSVR Technologies — Secure Authentication System

These rules are binding for implementation and review.

## 1. Scope rules
1. Follow the approved roadmap and the twelve project documents.
2. Build one phase at a time; do not start the next phase until the current phase's acceptance checks pass.
3. Do not add unrelated features, paid services, or unnecessary infrastructure.
4. The required responsive behavior applies to every screen and every phase, not only final polish.
5. Email OTP is the supported delivery method. Phone OTP is not available without an SMS provider.
6. Passkeys are WebAuthn credentials. The app never accesses or stores biometric templates.
7. One active authenticated session per user is mandatory.

## 2. Security rules
- Never commit `.env`, SMTP passwords/app passwords, MongoDB credentials, session tokens, OTPs, or private keys.
- Use environment variables and hosting secret settings.
- Never store OTP plaintext. Store a secure hash and compare safely.
- Never store raw session tokens in MongoDB; store a hash.
- Use cryptographically secure randomness for OTPs, session tokens, and challenges.
- Enforce OTP expiry, attempt limits, and single-use behavior on the backend.
- Enforce session authorization on every protected API request.
- Verify WebAuthn challenge, origin, RP ID, and ceremony response on the backend.
- Never trust a user ID supplied by the browser for access to the current user's data.
- Validate every request on the backend, even if frontend validation exists.
- Use exact CORS origins. Never use `*` with credentialed cookies.
- Use HTTPS in production and secure cookie settings.
- Do not reveal whether an email exists where doing so would create account-enumeration risk.
- Do not log authentication secrets or unnecessary personal information.

## 3. Architecture rules
- Keep routes/controllers thin.
- Put business rules in services/use-case modules.
- Keep database operations behind repositories or clearly separated model access.
- Keep configuration centralized and validated at startup.
- Reuse shared validation, error handling, API response conventions, and UI components.
- Avoid circular dependencies and cross-module access to internal implementation details.
- Do not put business logic in React components or Mongoose schema hooks unless there is a clear reason.
- Use asynchronous error handling consistently.

## 4. Data rules
- Normalize email to lowercase and trim whitespace before uniqueness checks.
- Normalize phone numbers to a consistent international representation if collected.
- Store DOB as a date-only value or a consistently normalized UTC date; avoid timezone shifts in display.
- Use unique indexes for normalized email and non-empty phone values.
- Use explicit expiry timestamps for OTP/challenge and session records.
- TTL indexes are cleanup aids only; application code must independently enforce expiry.
- Never expose password-like hashes, OTP hashes, session hashes, WebAuthn public keys, or internal database IDs unnecessarily through public APIs.

## 5. UX and accessibility rules
- Every input has a visible label and a clear error message.
- Provide loading, success, error, empty, expired, and retry states where relevant.
- Do not rely on color alone to communicate status.
- Ensure keyboard navigation, visible focus, semantic buttons, and accessible form errors.
- OTP entry must support keyboard input, paste, and mobile-friendly input.
- Disable duplicate submissions while a request is pending.
- Do not imply SMS delivery or biometric data collection.
- Explain active-session conflicts in plain language without exposing another device's sensitive details.

## 6. Responsive rules
- Design mobile-first.
- Test at small mobile, large mobile, tablet, laptop, and wide desktop widths.
- No horizontal scrolling at supported viewport sizes.
- Inputs and buttons must be comfortably tappable.
- Dashboard content must reflow rather than overflow.
- Do not use fixed widths that break small screens.
- Test real browser resizing and at least one physical mobile device when possible.

## 7. Git and delivery rules
- Use meaningful branch and commit names.
- Keep commits focused.
- Do not commit generated build output, dependencies, logs, or secrets.
- Keep README setup instructions and environment variable documentation synchronized with `env.md`.
- Test locally before deployment.
- Verify the deployed frontend, API, database connection, email flow, passkeys, cookies, and logout before submission.

## 8. Definition of phase completion
A phase is complete only when:
1. Its stated output exists.
2. Acceptance checks pass.
3. Relevant error paths are tested.
4. No known blocker is hidden or deferred without documentation.
5. Responsive behavior is checked for any UI introduced.
6. Changes are committed to Git.
