# Product Requirements Document (PRD)
## RSVR Technologies — Secure Authentication System

**Status:** Baseline specification  
**Product type:** Responsive web application  
**Primary objective:** Deliver a secure authentication application in which a user can register, authenticate by email OTP or a supported passkey, and maintain no more than one active authenticated session at a time.

## 1. Product summary

The application provides a registration flow, email-based one-time password (OTP) authentication, WebAuthn/passkey enrollment and sign-in, a single-active-session policy, and a basic account dashboard. The interface must work on mobile, tablet, and desktop from the beginning of development.

The application is an internship assignment for RSVR Technologies. The implementation should prioritize correctness, security, understandable code, and a polished working demonstration over unnecessary features.

## 2. Goals and success criteria

### Goals
- Allow a user to create an account with the requested profile information.
- Verify account access using a six-digit email OTP.
- Allow users to enroll and use compatible WebAuthn passkeys.
- Enforce one active authenticated session per account.
- Show the signed-in user's account and session information.
- Provide logout and invalidate the active session.
- Deploy the frontend to Netlify and backend to Render, with MongoDB Atlas as the database.
- Provide a responsive experience across mobile, tablet, and desktop.

### Acceptance criteria
1. Valid registration creates one user record; duplicate email or phone identifiers are rejected.
2. Invalid input is rejected by both client and server validation.
3. A generated email OTP is delivered, expires after five minutes, and cannot be reused after successful verification.
4. Incorrect OTP attempts are limited; resend is rate-limited and invalidates or supersedes prior codes.
5. A valid passkey registration is verified on the backend and its public credential data is stored.
6. A valid passkey assertion can authenticate the account on a compatible device/browser.
7. A user cannot establish a second active authenticated session while the first session remains valid.
8. Logout revokes the server-side session; subsequent requests using its cookie/token are rejected.
9. Private dashboard data is available only to an authenticated user.
10. All five principal screens are usable at supported mobile, tablet, and desktop widths without horizontal scrolling.
11. The deployed application passes the core end-to-end test cases and uses production environment secrets rather than committed credentials.

## 3. Users and primary journeys

### User
A person creating and accessing an account using an email address, optional phone number, date of birth, and surname.

### Journey A — Registration
1. Open registration.
2. Enter email and/or phone number, date of birth, and surname.
3. Submit the form.
4. Receive clear success or validation feedback.
5. Continue to login.

**Product clarification:** The supplied roadmap includes email or phone registration, but specifies Gmail SMTP only and explicitly excludes an SMS provider. Therefore email OTP is the only implemented delivery channel in this scope. A phone number may be collected and validated as a profile/contact field, but phone-only OTP delivery and phone-based verification must not be represented as working functionality. The UI must clearly communicate that email is required for OTP login unless an SMS provider is later approved.

### Journey B — Email OTP login
1. Enter the registered email address.
2. Request a six-digit OTP.
3. Enter the OTP received by email.
4. Backend verifies the code, expiry, attempt limit, and session eligibility.
5. On success, create the one active session and open the dashboard.

### Journey C — Passkey enrollment and login
1. An authenticated user starts passkey enrollment.
2. Browser/device displays its native passkey ceremony.
3. Backend verifies the registration response and stores the public credential.
4. On a later visit, user selects passkey login.
5. Backend verifies the assertion and applies the same single-session rule before creating a session.

Passkeys use WebAuthn and platform or roaming authenticators. Face ID, fingerprint, PIN, or another local unlock method is chosen and verified by the device/browser. The application does not receive or store biometric images, fingerprints, or Face ID data.

### Journey D — Dashboard and logout
1. Authenticated user opens dashboard.
2. Dashboard displays surname, registered email/phone where present, DOB, authentication method, and session status.
3. User logs out.
4. Backend revokes the session and clears the browser's session cookie.

## 4. Scope

### In scope
- Registration with email, optional phone, DOB, and surname.
- Server-side validation and duplicate checks.
- Email OTP generation, delivery, verification, five-minute expiry, resend, and attempt limiting.
- WebAuthn/passkey registration and authentication.
- Public-key credential storage.
- Single active session per user.
- Basic dashboard and logout.
- Responsive UI for mobile, tablet, and desktop.
- REST API, MongoDB Atlas, Gmail SMTP/Nodemailer.
- Git/GitHub, Netlify frontend, Render backend.
- Functional, security, responsive, and deployment testing.
- Project explanation and HR submission.

### Out of scope
- SMS OTP until an SMS provider is explicitly selected and configured.
- Password authentication, social login, roles/permissions, admin console, account recovery, multi-device sessions, device-management UI, push notifications, analytics, billing, and native mobile applications.
- Collecting or storing biometric templates.
- Paid services or subscriptions as a requirement.

## 5. Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | Register with required profile fields and email | Must |
| FR-02 | Validate and normalize input on the server | Must |
| FR-03 | Enforce unique email and unique phone when supplied | Must |
| FR-04 | Generate cryptographically secure six-digit email OTP | Must |
| FR-05 | OTP expires after five minutes | Must |
| FR-06 | Limit failed attempts and OTP resend frequency | Must |
| FR-07 | Verify OTP once and create an authenticated session | Must |
| FR-08 | Register and verify WebAuthn passkeys | Must |
| FR-09 | Authenticate using a stored passkey | Must |
| FR-10 | Enforce one active session per user | Must |
| FR-11 | Provide authenticated user details through `/api/auth/me` | Must |
| FR-12 | Revoke session on logout | Must |
| FR-13 | Display dashboard account and authentication information | Must |
| FR-14 | Responsive mobile, tablet, and desktop layouts | Must |
| FR-15 | Deploy and verify the production application | Must |

## 6. Non-functional requirements

- **Security:** HTTPS in production; HttpOnly, Secure session cookie; server-side authorization; hashed OTPs and session tokens; rate limits; input validation; safe error messages; secrets outside source control.
- **Privacy:** Collect only listed profile data. Do not collect biometric data. Avoid logging OTPs, session tokens, credential private material, or unnecessary DOB/contact details.
- **Usability:** Clear loading, success, error, expiry, and retry states; keyboard access; visible focus; labels and accessible validation messages.
- **Responsiveness:** No horizontal overflow at mobile, tablet, or desktop breakpoints. Forms and OTP controls must remain touch-friendly.
- **Maintainability:** Modular frontend/backend structure, separation of routes/controllers/services/data access, consistent error handling, and documented environment configuration.
- **Reliability:** OTP and challenge expiry enforced by the server, not only by the client. Session validity is checked server-side on every protected request.

## 7. Screens
1. Registration.
2. Login (email entry and passkey option).
3. OTP verification.
4. Passkey/biometric authentication and enrollment states.
5. User dashboard.

## 8. Assumptions and decisions
- Email is mandatory for the current OTP login flow. Phone is optional profile data unless business requirements later change.
- OTP lifetime is exactly five minutes.
- OTP attempt and resend limits are configurable through environment-backed settings; initial defaults are five verification attempts and one resend per 60 seconds, with an additional hourly cap.
- Session policy is one active session per user, not one session per browser tab.
- A second login is rejected while a valid session exists. This is the clearest interpretation of “prevent another device from accessing the account.” No automatic session takeover is included.
- WebAuthn credentials are account-bound and may be used on devices that can access/sync the passkey, but only one authenticated application session is allowed at a time.
- A passkey can only be enrolled by an authenticated account.
- The four roadmap collections are retained. The `OTPs` collection also stores short-lived WebAuthn ceremony challenges, distinguished by a `purpose` field, so challenge state remains server-side without introducing a fifth collection.
- Netlify/Render free-tier availability and behavior can change. Deployment must be verified against current provider constraints.
- Production WebAuthn requires a stable HTTPS origin and correct RP ID. Use the actual deployed frontend hostname; do not use localhost values in production.

## 9. Risks and constraints
- Gmail SMTP may impose sending limits or account security restrictions; use an app password where supported and never expose it in client code.
- Free hosting may sleep, restart, or have resource limits. The app must tolerate restarts and use persistent MongoDB storage for session/challenge state.
- Cross-site cookies between default Netlify and Render hostnames can be affected by browser third-party-cookie restrictions. Prefer custom frontend/backend subdomains under the same registrable domain where available. If unavailable, test the chosen secure cookie configuration in target browsers before considering the deployment complete.
- Passkey availability depends on browser, operating system, device authenticator, origin, and user configuration. Provide graceful fallback to email OTP.
- Phone-only registration cannot complete the specified OTP login without an SMS provider; do not imply otherwise.

## 10. Definition of done
All Must requirements are implemented, reviewed, tested, responsive, deployed, and demonstrated. No secrets are committed. The GitHub repository, live URL, project explanation, and HR submission are ready.
