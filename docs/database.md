# Database Design
## RSVR Technologies — Secure Authentication System

**Database:** MongoDB Atlas  
**ODM:** Mongoose  
**Collections:** Four, as specified in the project roadmap.

## 1. Data model overview

```text
Users 1 -------- * Sessions
Users 1 -------- * Passkeys
Users 1 -------- * OTPs / Auth Challenges
```

The `OTPs` collection stores both email OTP records and short-lived WebAuthn challenge records, distinguished by `purpose`. This preserves the four-collection scope while keeping challenge state persistent across backend restarts.

## 2. Users collection

Purpose: account profile and normalized identifiers.

Suggested fields:
| Field | Type | Rules |
|---|---|---|
| `_id` | ObjectId | Primary identifier |
| `surname` | String | Required, trimmed |
| `email` | String | Required, normalized lowercase |
| `phone` | String | Optional, normalized E.164 if supplied |
| `dob` | Date | Required, normalized date-only convention |
| `createdAt` | Date | Timestamp |
| `updatedAt` | Date | Timestamp |

Indexes:
- Unique index on normalized `email`.
- Unique partial index on `phone` when it exists and is non-empty.
- Optional index on `createdAt` for operational queries.

Rules:
- Never accept a user ID from the client as proof of ownership.
- Return only fields needed by the dashboard.
- Do not expose internal normalization or security metadata.

## 3. OTPs collection (OTP and WebAuthn challenges)

Purpose: persist temporary, one-time authentication challenges.

Suggested fields:
| Field | Type | Rules |
|---|---|---|
| `_id` | ObjectId | Primary identifier |
| `userId` | ObjectId | Reference to Users when known |
| `identifier` | String | Normalized email for OTP/login lookup |
| `purpose` | Enum | `EMAIL_LOGIN`, `WEBAUTHN_REGISTRATION`, `WEBAUTHN_LOGIN` |
| `codeHash` | String | Present for email OTP only; never plaintext |
| `challenge` | String | Present for WebAuthn ceremony only |
| `expiresAt` | Date | Required |
| `attempts` | Number | Default 0 |
| `maxAttempts` | Number | Configurable snapshot |
| `consumedAt` | Date/null | Null until consumed |
| `createdAt` | Date | Timestamp |

Indexes:
- TTL index on `expiresAt` for cleanup.
- Compound lookup index on `identifier`, `purpose`, `createdAt`.
- Index on `userId`, `purpose`, `createdAt`.

Rules:
- Email OTP code is six digits and expires after five minutes.
- Store only a secure hash of the code.
- A successful OTP is consumed once.
- Failed attempts increment atomically; lock/consume at configured maximum.
- Resend invalidates or supersedes previous unconsumed email OTP challenges.
- WebAuthn challenge is stored server-side, expires quickly (recommended five minutes), and is consumed once.
- Application code checks `expiresAt` even when a TTL index exists.
- Do not log challenge or code values.

## 4. Sessions collection

Purpose: enforce one active authenticated session per user.

Suggested fields:
| Field | Type | Rules |
|---|---|---|
| `_id` | ObjectId | Primary identifier |
| `userId` | ObjectId | Reference to Users |
| `tokenHash` | String | Hash of opaque random token; unique |
| `deviceId` | String | Non-secret client-generated/session-associated identifier if needed |
| `authenticationMethod` | Enum | `email_otp` or `passkey` |
| `createdAt` | Date | Required |
| `expiresAt` | Date | Required |
| `lastSeenAt` | Date | Optional |
| `revokedAt` | Date/null | Null while active |

Indexes:
- Unique index on `tokenHash`.
- Index on `userId`, `revokedAt`, `expiresAt`.
- Optional partial unique index enforcing one non-revoked session per user; because MongoDB partial indexes cannot express current-time expiry, expired records must be explicitly revoked/cleaned before a new session is issued.
- TTL index on `expiresAt` for cleanup.

Rules:
- Store only token hash.
- Session token must be cryptographically random and high entropy.
- A session is active only when not revoked and not expired.
- Every protected request checks the session record.
- Create/revoke operations must prevent concurrent logins from creating two active sessions.
- `deviceId` is metadata, not a trustworthy security boundary or hardware identity.

## 5. Passkeys collection

Purpose: store WebAuthn public credential data.

Suggested fields:
| Field | Type | Rules |
|---|---|---|
| `_id` | ObjectId | Primary identifier |
| `userId` | ObjectId | Reference to Users |
| `credentialId` | String/Binary | Unique credential identifier |
| `publicKey` | Binary/String | Public key only |
| `counter` | Number | Authenticator signature counter |
| `transports` | String[] | Optional supported transports |
| `createdAt` | Date | Timestamp |
| `lastUsedAt` | Date | Optional timestamp |

Indexes:
- Unique index on `credentialId`.
- Index on `userId`.

Rules:
- Never store the credential private key or biometric material.
- Verify credential belongs to the expected user.
- Update authenticator counter according to library guidance.
- Handle authenticators with counter behavior that does not monotonically increase according to WebAuthn library recommendations.

## 6. Relationships and deletion
- `Sessions`, `Passkeys`, and `OTPs` reference `Users`.
- If account deletion is introduced later, define explicit cascade/retention behavior first; account deletion is not part of current scope.
- Clean expired OTP/challenge/session records with TTL indexes, while enforcing validity in service logic.

## 7. Atomicity and concurrency
- Duplicate registration must be protected by database unique indexes, not only a prior “does it exist?” query.
- OTP consumption and attempt increments must be atomic.
- Session creation must be atomic per user. Prefer a MongoDB transaction when the Atlas deployment supports it; otherwise implement a carefully designed conditional update/lock strategy and test concurrent login attempts.
- Do not rely on in-process mutexes in a horizontally scaled deployment.

## 8. Privacy and backup
- Use least-privilege database credentials.
- Restrict Atlas network access where practical.
- Avoid logging personal data.
- Use provider backup/export capabilities where available and appropriate.
- Do not store any biometric template.
