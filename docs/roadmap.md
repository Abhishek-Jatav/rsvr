# Project Roadmap and Delivery Tracker
## RSVR Technologies — Secure Authentication System

## 1. Objective
Deliver a fully functional, secure, responsive authentication application with email OTP, WebAuthn/passkeys, one active session per user, a dashboard, and live deployment.

## 2. Approved technology stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React.js, JavaScript |
| Styling | HTML5, CSS3, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas |
| ODM | Mongoose |
| Email | Gmail SMTP, Nodemailer |
| WebAuthn browser | `@simplewebauthn/browser` |
| WebAuthn server | `@simplewebauthn/server` |
| API | REST |
| Version control | Git, GitHub |
| Frontend hosting | Netlify |
| Backend hosting | Render |

Use free tools/free tiers where practical. Do not assume provider free-tier limits or availability are permanent.

## 3. Delivery phases and estimate

| Phase | Work | Estimate |
|---|---|---:|
| 1 | Project setup | 1 day |
| 2 | Registration | 1 day |
| 3 | Email OTP authentication | 2 days |
| 4 | WebAuthn/passkeys | 2–3 days |
| 5 | Single-device restriction | 1–2 days |
| 6 | Dashboard | 1 day |
| 7 | Responsive design, testing, security | 1–2 days |
| 8 | Deployment and submission | 1 day |
| **Total** | | **10–13 days** |

Estimates are planning targets, not guarantees. WebAuthn, cross-site cookie behavior, and deployment troubleshooting may require additional time.

## 4. Completion tracker

### Registration
- [ ] Email registration
- [ ] Optional phone field and normalization
- [ ] DOB and surname
- [ ] Form validation
- [ ] Duplicate account checking

### Authentication
- [ ] Six-digit OTP generation
- [ ] Gmail SMTP email delivery
- [ ] OTP verification
- [ ] Five-minute expiration
- [ ] Resend cooldown and rate limits
- [ ] WebAuthn passkey registration
- [ ] Compatible device authenticator support
- [ ] Passkey login
- [ ] Email OTP fallback

### Device/session restriction
- [ ] One active session per account
- [ ] Session validation on protected routes
- [ ] Logout and server-side session invalidation
- [ ] Concurrent login protection

### Screens and responsiveness
- [ ] Registration page
- [ ] Login page
- [ ] OTP page
- [ ] Passkey authentication/enrollment states
- [ ] User dashboard
- [ ] Mobile responsive layout
- [ ] Tablet responsive layout
- [ ] Desktop responsive layout
- [ ] No horizontal scrolling
- [ ] Keyboard and touch accessibility

### Testing and delivery
- [ ] Functional and security testing
- [ ] Responsive testing
- [ ] GitHub source code
- [ ] Netlify frontend deployment
- [ ] Render backend deployment
- [ ] MongoDB Atlas production connection
- [ ] Gmail SMTP production configuration
- [ ] WebAuthn production origin/RP ID
- [ ] Live application testing
- [ ] Project explanation and HR submission

## 5. Scope clarifications
- The roadmap lists email or phone registration, but only Gmail SMTP is approved. The current implementation therefore supports email OTP; phone is optional profile data and phone OTP is deferred until an SMS provider is approved.
- WebAuthn/passkeys may invoke Face ID, fingerprint, PIN, or another local device unlock. The application does not collect biometric data.
- “One device” is enforced as one active authenticated session per account. A second login is rejected until the active session is logged out or expires/revoked.
- Four collections are retained. `OTPs` also persists short-lived WebAuthn challenges by purpose.
- Cross-site cookies between default Netlify and Render domains require real-browser verification. Same-site custom subdomains are preferred where available.

## 6. Development rules
1. Follow the approved scope; avoid unnecessary features.
2. Build one phase at a time.
3. Understand and test code rather than blindly copying it.
4. Test every feature before moving forward.
5. Make responsive design mandatory from the beginning.
6. Prefer free tools and services.
7. Keep code clean, secure, modular, and maintainable.
8. Complete local testing before deployment.
9. Never commit secrets.
10. Document limitations honestly.

## 7. Final definition of success
The application satisfies all Must requirements in the PRD, works across mobile/tablet/desktop, passes functional and security tests, enforces one active session, supports email OTP and compatible passkeys, is deployed to Netlify and Render with MongoDB Atlas, and is ready for GitHub and HR submission.
