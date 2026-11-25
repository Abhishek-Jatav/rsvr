# REST API Specification
## RSVR Technologies — Secure Authentication System

**Base path:** `/api`  
**Content type:** `application/json`  
**Authentication:** Opaque server-issued session cookie for protected routes.  
**Transport:** HTTPS in production.

## 1. Conventions
- The backend is authoritative for validation and authorization.
- Use a consistent success/error response envelope.
- Use appropriate HTTP status codes.
- Never return OTPs, OTP hashes, session tokens, session hashes, or private credential material.
- Rate-limit authentication endpoints.
- Use credentialed CORS with an explicit frontend origin.
- The current scope supports email OTP only. Phone OTP endpoints are not included.

### Success envelope
```json
{
  "success": true,
  "data": {},
  "message": "Request completed"
}
```

### Error envelope
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please check the submitted information."
  }
}
```

## 2. Endpoint summary

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` | No | Create account |
| POST | `/auth/send-otp` | No | Send email OTP |
| POST | `/auth/verify-otp` | No | Verify OTP and create session |
| POST | `/auth/logout` | Yes | Revoke current session |
| GET | `/auth/me` | Yes | Return current user's profile/session |
| POST | `/webauthn/register-options` | Yes | Generate passkey registration options |
| POST | `/webauthn/register-verify` | Yes | Verify and save passkey |
| POST | `/webauthn/login-options` | No | Generate passkey login options |
| POST | `/webauthn/login-verify` | No | Verify passkey assertion and create session |
| GET | `/health` | No | Health/readiness check |

## 3. Endpoint details

### POST `/auth/register`
Request:
```json
{
  "email": "user@example.com",
  "phone": "+911234567890",
  "dob": "1998-04-20",
  "surname": "Sharma"
}
```
`email` and `surname` are required for the current flow. `phone` is optional. DOB must be a valid date and meet any business validation configured for the assignment.

Success: `201 Created`
```json
{
  "success": true,
  "data": { "userId": "..." },
  "message": "Registration completed."
}
```
Possible errors: `400 VALIDATION_ERROR`, `409 ACCOUNT_ALREADY_EXISTS`, `429 RATE_LIMITED`.

### POST `/auth/send-otp`
Request:
```json
{ "email": "user@example.com" }
```
Behavior:
- Normalize email.
- Apply account/IP rate limits.
- Generate a cryptographically secure six-digit code.
- Store only a hash with five-minute expiry, attempt count, purpose, and consumed state.
- Send through Gmail SMTP.
- Supersede or invalidate any prior active email-login OTP for the same user.

Success: `200 OK`
```json
{
  "success": true,
  "data": { "expiresInSeconds": 300, "resendAfterSeconds": 60 },
  "message": "If the account is eligible, a verification code has been sent."
}
```
Possible errors: `400 VALIDATION_ERROR`, `429 RATE_LIMITED`, `503 EMAIL_DELIVERY_UNAVAILABLE`.
Use a non-enumerating response where practical.

### POST `/auth/verify-otp`
Request:
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```
Behavior:
- Find the latest valid challenge for email-login purpose.
- Enforce expiry and attempt limit.
- Compare the submitted code to the stored hash.
- Atomically mark successful challenge consumed.
- Reject if a valid active session already exists.
- Create session and set HttpOnly cookie.

Success: `200 OK`; session cookie is set in response headers.
```json
{
  "success": true,
  "data": { "user": { "surname": "Sharma", "email": "user@example.com" } },
  "message": "Authentication successful."
}
```
Possible errors: `400 OTP_INVALID`, `410 OTP_EXPIRED`, `429 OTP_ATTEMPTS_EXCEEDED`, `409 ACTIVE_SESSION_EXISTS`.

### POST `/auth/logout`
Requires valid session cookie.
Behavior: revoke current session server-side and clear cookie.
Success: `200 OK`.
Possible errors: `401 UNAUTHENTICATED`.

### GET `/auth/me`
Requires valid session cookie.
Returns only the current user's allowed profile fields and current session metadata.
Example:
```json
{
  "success": true,
  "data": {
    "user": {
      "surname": "Sharma",
      "email": "user@example.com",
      "phone": "+911234567890",
      "dob": "1998-04-20"
    },
    "session": {
      "status": "active",
      "authenticationMethod": "email_otp"
    }
  }
}
```
Possible errors: `401 UNAUTHENTICATED`.

### POST `/webauthn/register-options`
Requires authenticated session.
Behavior: create registration options for the current user; persist challenge in `OTPs` with purpose `WEBAUTHN_REGISTRATION`, expiry, and one-time state.
Request may include a user-friendly device label only if implemented; it is not required by this scope.
Success: `200 OK` with options object returned by the SimpleWebAuthn server library.
Possible errors: `401 UNAUTHENTICATED`, `429 RATE_LIMITED`.

### POST `/webauthn/register-verify`
Requires authenticated session.
Request: browser registration response object from `@simplewebauthn/browser`.
Behavior: load and consume matching challenge; verify expected challenge, origin, RP ID, and response; store credential ID, public key, counter, and supported transports in `Passkeys`.
Success: `201 Created`.
Possible errors: `400 WEBAUTHN_VERIFICATION_FAILED`, `410 CHALLENGE_EXPIRED`, `409 CREDENTIAL_ALREADY_REGISTERED`.

### POST `/webauthn/login-options`
Request:
```json
{ "email": "user@example.com" }
```
Behavior: locate account's eligible passkeys and generate authentication options; persist challenge with purpose `WEBAUTHN_LOGIN`.
Success: `200 OK` with authentication options.
Possible errors: `400 VALIDATION_ERROR`, `404 PASSKEY_NOT_AVAILABLE`, `429 RATE_LIMITED`.

### POST `/webauthn/login-verify`
Request: `{ "email": "user@example.com", "response": {} }`, where `response` is the browser assertion response.
Behavior: verify stored challenge, credential ownership, origin, RP ID, signature, and authenticator counter as required; then enforce single-session policy and create session cookie.
Success: `200 OK`.
Possible errors: `400 WEBAUTHN_VERIFICATION_FAILED`, `410 CHALLENGE_EXPIRED`, `409 ACTIVE_SESSION_EXISTS`.

### GET `/health`
Returns basic service status only. Do not return environment variables, database credentials, or detailed infrastructure internals.

## 4. HTTP status and error code guide

| Status | Use |
|---|---|
| 200 | Successful read/action |
| 201 | Resource created |
| 400 | Invalid request or failed verification |
| 401 | Missing/invalid session |
| 403 | Authenticated but not permitted |
| 404 | Resource/credential unavailable |
| 409 | Duplicate account, credential, or active session conflict |
| 410 | OTP/challenge expired |
| 429 | Rate limit or attempt limit |
| 500 | Unexpected server failure |
| 503 | Temporary dependency failure such as email delivery |

## 5. Session and CORS behavior
- Set the session cookie only after successful OTP/passkey verification and active-session eligibility.
- Protected routes validate cookie token hash against an active session record.
- Logout revokes the server record and expires the cookie.
- Frontend requests include credentials.
- CORS allows only the configured frontend origin and credentials.
- Cookie behavior must be verified on the actual deployed domains and target browsers.

## 6. API security requirements
- Validate all inputs and enforce request size limits.
- Rate-limit registration, OTP send/verify, and WebAuthn options/verification.
- Do not reveal sensitive account existence information.
- Consume OTP and WebAuthn challenge records once, atomically.
- Avoid logging request bodies for authentication routes.
- Never return database internals or stack traces.
