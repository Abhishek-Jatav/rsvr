# Coding Standards
## RSVR Technologies — Secure Authentication System

## 1. General principles
- Use JavaScript consistently, as specified by the approved stack. Do not silently introduce TypeScript as a project requirement.
- Prefer simple, readable code over clever abstractions.
- Apply SOLID and Clean Architecture where they reduce coupling; do not create layers with no practical purpose.
- Keep functions focused and modules cohesive.
- Use mature, maintained libraries for security-sensitive protocols.
- Avoid unnecessary dependencies.

## 2. Naming and formatting
- Use `camelCase` for variables and functions.
- Use `PascalCase` for React components and classes.
- Use `UPPER_SNAKE_CASE` for constants.
- Use descriptive names; avoid unexplained abbreviations.
- Keep formatting consistent through a shared formatter/linter if configured.
- Use semicolons and quote style consistently within each project.
- Prefer early returns to deeply nested conditionals.
- Avoid magic numbers; centralize OTP expiry, attempt limits, and session durations.

## 3. Frontend standards
- Components should render UI and coordinate interactions; move complex behavior into feature hooks/services.
- Build reusable form controls and feedback components.
- Keep API calls out of presentation components where practical.
- Centralize API base URL and request behavior.
- Use controlled form state where it improves validation and UX.
- Show loading/error/success states for asynchronous actions.
- Do not store session tokens or OTP secrets in localStorage/sessionStorage.
- Use cookie credentials for the approved session design.
- Never put SMTP credentials, database URLs, WebAuthn secrets, or backend-only configuration in `NEXT_PUBLIC_*` variables.
- Use semantic HTML and accessible labels.
- Ensure all new UI is responsive at mobile, tablet, and desktop widths.

## 4. Backend standards
- Keep route definitions declarative and controllers thin.
- Put authentication rules in services/use cases.
- Validate request bodies, params, and query values before business logic.
- Use centralized error middleware and a consistent response envelope.
- Do not return stack traces or internal database errors to clients.
- Use async/await and ensure rejected promises reach error handling.
- Keep secrets and environment access in a configuration module.
- Use structured, privacy-aware logs.
- Apply rate limits to registration, OTP send/verify, and passkey initiation/verification.
- Use database indexes and atomic operations for uniqueness and single-session enforcement.

## 5. API and error conventions
Success responses should use a consistent shape, for example:
```json
{
  "success": true,
  "data": {},
  "message": "Request completed"
}
```
Error responses should use a stable machine-readable code and safe message:
```json
{
  "success": false,
  "error": {
    "code": "OTP_INVALID",
    "message": "The code is invalid or has expired."
  }
}
```
Do not expose secrets, stack traces, raw database errors, or unnecessary account-existence details.

## 6. Database standards
- Define Mongoose schemas centrally per module.
- Add indexes explicitly and verify them in the deployed database.
- Use normalized fields for uniqueness.
- Use timestamps where useful.
- Validate at both request and schema layers.
- Use explicit enums for status and purpose fields.
- Ensure sensitive fields are excluded from ordinary JSON serialization.
- Treat TTL indexes as cleanup, not authorization.

## 7. Security-sensitive implementation standards
- Use a cryptographic random source, not `Math.random()`, for OTPs and session tokens.
- Store only OTP hashes and session-token hashes.
- Compare hashes using an appropriate constant-time comparison where applicable.
- Consume OTP/challenge records atomically to prevent replay.
- Ensure concurrent login attempts cannot create two active sessions.
- Verify WebAuthn responses on the server with expected challenge, origin, and RP ID.
- Do not invent or hand-roll WebAuthn cryptography.
- Do not log OTP values, cookies, session tokens, or private credentials.

## 8. Testing standards
- Unit-test business rules (expiry, attempts, session eligibility).
- Integration-test API routes with a test database/configuration.
- End-to-end test the main user journeys.
- Include negative and boundary cases.
- Test responsive UI at representative viewport sizes.
- Keep tests deterministic; inject clocks/randomness or use controlled fixtures where appropriate.

## 9. Git standards
- Use focused commits with meaningful messages.
- Do not commit `.env` files, logs, `node_modules`, build output, or secrets.
- Keep `.env.example` synchronized with `env.md` and free of real credentials.
- Review the diff before committing.
