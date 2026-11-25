# Testing Strategy and Test Plan
## RSVR Technologies — Secure Authentication System

## 1. Testing objectives
Verify that the application meets the functional, security, responsive, and deployment requirements. The backend is the authority for all security-sensitive outcomes.

## 2. Test levels
- **Unit:** OTP generation/expiry/attempt rules, session eligibility, validation, and service logic.
- **Integration:** Express endpoints with a test database and controlled email/WebAuthn dependencies.
- **End-to-end:** Complete registration, OTP login, passkey flow, dashboard, second-login rejection, and logout.
- **Responsive/UI:** Representative mobile, tablet, and desktop viewport checks.
- **Deployment smoke:** Production API, database, email, cookie, and WebAuthn configuration.

## 3. Functional test cases

### Registration
| ID | Scenario | Expected result |
|---|---|---|
| REG-01 | Submit valid required details | User created |
| REG-02 | Missing email | Validation error |
| REG-03 | Invalid email | Validation error |
| REG-04 | Missing surname | Validation error |
| REG-05 | Invalid DOB | Validation error |
| REG-06 | Duplicate email | Conflict; no duplicate user |
| REG-07 | Duplicate phone when supplied | Conflict; no duplicate phone |
| REG-08 | Malicious/oversized input | Rejected safely |

### Email OTP
| ID | Scenario | Expected result |
|---|---|---|
| OTP-01 | Request OTP for eligible account | Email sent; expiry is five minutes |
| OTP-02 | Submit correct code | Authentication succeeds if no active session |
| OTP-03 | Submit incorrect code | Rejected; attempt count increments |
| OTP-04 | Submit expired code | Rejected |
| OTP-05 | Reuse successful code | Rejected |
| OTP-06 | Exceed maximum attempts | Challenge locked/consumed |
| OTP-07 | Resend before cooldown | Rate-limited |
| OTP-08 | Resend after cooldown | New code sent; previous code invalid |
| OTP-09 | SMTP unavailable | Safe service error; no session created |
| OTP-10 | Unknown email | Non-enumerating response behavior |

### WebAuthn/passkeys
| ID | Scenario | Expected result |
|---|---|---|
| WA-01 | Authenticated user requests registration options | Options and challenge created |
| WA-02 | Valid registration response | Credential public data stored |
| WA-03 | Wrong origin/RP ID/challenge | Verification rejected |
| WA-04 | Expired challenge | Verification rejected |
| WA-05 | Replay registration response | Rejected |
| WA-06 | Valid assertion | Authentication succeeds if session eligible |
| WA-07 | Unknown credential | Rejected safely |
| WA-08 | Unsupported browser/device | Clear fallback to email OTP |
| WA-09 | User cancels native prompt | Recoverable message shown |
| WA-10 | Credential counter anomaly | Handled according to WebAuthn library guidance |

### Sessions and dashboard
| ID | Scenario | Expected result |
|---|---|---|
| SES-01 | First successful login | One active session created |
| SES-02 | Login from second browser/device while active | `409 ACTIVE_SESSION_EXISTS` |
| SES-03 | Concurrent login attempts | At most one session created |
| SES-04 | Request dashboard without cookie | 401 |
| SES-05 | Request dashboard with invalid token | 401 |
| SES-06 | Request dashboard with expired session | 401 |
| SES-07 | Logout | Session revoked and cookie cleared |
| SES-08 | Reuse old cookie after logout | 401 |
| SES-09 | User requests another user's data | No access |
| SES-10 | Expired session cleanup delayed | Expired session still rejected by application |

## 4. Security test checklist
- [ ] HTTPS used in production.
- [ ] CORS rejects unapproved origins.
- [ ] Credentialed CORS never uses wildcard origin.
- [ ] OTP is hashed at rest.
- [ ] Session token is hashed at rest.
- [ ] OTP and WebAuthn challenges are single-use.
- [ ] Attempt and resend limits work server-side.
- [ ] All protected routes require valid sessions.
- [ ] Session creation is concurrency-safe.
- [ ] Input validation is server-side.
- [ ] Sensitive fields are excluded from API responses.
- [ ] Logs contain no OTP, cookie, token, or secret values.
- [ ] No secrets are exposed in Git or frontend assets.
- [ ] WebAuthn origin/RP ID/challenge verification is enforced.
- [ ] Error messages do not expose stack traces or database internals.

## 5. Responsive and accessibility test matrix
Test at representative widths, including:
- Small mobile: 320–375 px.
- Large mobile: 390–430 px.
- Tablet: 768–1023 px.
- Desktop: 1024–1440 px and wider.

For every screen:
- [ ] No horizontal scrolling.
- [ ] Form fields fit and remain readable.
- [ ] Buttons are touch-friendly.
- [ ] OTP entry works with virtual keyboard and paste.
- [ ] Error messages wrap without clipping.
- [ ] Dashboard sections reflow.
- [ ] Keyboard navigation and visible focus work.
- [ ] Labels and validation messages are accessible.

## 6. Production smoke test
Run after every production deployment:
1. Open live frontend.
2. Register a test account.
3. Receive and verify email OTP.
4. Load dashboard.
5. Attempt second login from another browser; verify conflict.
6. Log out; verify old session is rejected.
7. Enroll and test a passkey on a supported device.
8. Repeat responsive checks on mobile and desktop.
9. Check backend logs for errors without exposing secrets.

## 7. Exit criteria
- All critical test cases pass.
- No open critical/high security defect.
- No broken primary user journey.
- No responsive overflow on supported target widths.
- Production cookie/session behavior is verified.
- Known provider/browser limitations are documented.
