# UI/UX and Responsive Design Specification
## RSVR Technologies — Secure Authentication System

## 1. Design objective
Create a clean, trustworthy authentication experience with minimal friction. The visual system should feel consistent across registration, login, OTP, passkey, and dashboard screens. Responsiveness is a core requirement from the first component.

## 2. Screen inventory

### Registration
Fields:
- Email address (required for the current email OTP flow).
- Phone number (optional profile/contact field; phone OTP is not supported in this scope).
- Date of birth.
- Surname.
- Register button.

Behavior:
- Inline field validation.
- Clear duplicate-account feedback.
- Loading state while submitting.
- Success state with a clear next step.

### Login
- Registered email input.
- Continue/send OTP action.
- Passkey sign-in action when supported and credentials exist.
- Link to registration.
- Clear active-session conflict message.

### OTP verification
- Six-digit code entry.
- Resend action with countdown/disabled state.
- Expiry and incorrect-code messages.
- Support paste and normal keyboard entry.
- Use one semantic input or an accessible grouped control; do not make six inaccessible independent fields.

### Passkey authentication/enrollment
- Explain that the device may ask for Face ID, fingerprint, PIN, or another local unlock method.
- Start native browser/device ceremony through WebAuthn.
- Provide progress, cancellation, unsupported-browser, and failure states.
- Offer email OTP fallback.
- Never request a fingerprint image or Face ID scan inside the web form.

### Dashboard
- Profile summary: surname, email, phone if present, DOB.
- Authentication method used for current session.
- Session status.
- Logout action.
- Responsive cards/sections that stack on narrow screens.

## 3. Visual system
Use a restrained, consistent design:
- Neutral page background with a high-contrast content surface.
- One primary brand/accent color and semantic success/warning/error colors.
- Consistent spacing scale, border radius, elevation, and typography.
- Clear hierarchy: page title, short helper text, form labels, feedback.
- Avoid decorative effects that reduce readability or performance.
- Use a consistent button, input, card, and feedback component set.

Exact brand colors, logo, and typography were not supplied. Select accessible defaults and keep tokens centralized so they can be changed without rewriting components.

## 4. Responsive behavior
Use mobile-first CSS/Tailwind breakpoints. Treat these as practical layout targets, not device detection:
- **Mobile:** approximately 320–767 CSS px. Single-column forms; full-width primary actions; compact spacing; no fixed-width panels.
- **Tablet:** approximately 768–1023 CSS px. Centered content with moderate max width; dashboard may use two columns where content permits.
- **Desktop:** 1024 CSS px and above. Centered auth panel; dashboard can use wider layout while preserving readable line lengths.

Requirements:
- No horizontal scrolling at any target viewport.
- Use fluid widths with sensible `max-width`.
- Inputs/buttons fill available form width.
- Maintain readable text and adequate line height.
- Use touch-friendly controls (target around 44×44 CSS px where practical).
- Ensure OTP controls remain usable with virtual keyboards.
- Dashboard cards wrap/stack naturally.
- Avoid hover-only interactions.

## 5. Accessibility
- Semantic headings, forms, labels, buttons, and status messages.
- Programmatic label-to-input association.
- Visible keyboard focus.
- Logical tab order.
- Errors announced to assistive technology and associated with relevant fields.
- Sufficient text/background contrast (target WCAG AA).
- Do not use color as the only indicator.
- Respect reduced-motion preferences.
- Keep passkey prompts and fallback instructions understandable.

## 6. Interaction states
Every interactive feature should define:
- Default.
- Focus.
- Hover (where relevant).
- Disabled.
- Loading.
- Success.
- Error.
- Empty/unsupported.
- Expired or timed-out (for OTP and WebAuthn challenges).

Prevent repeated submissions while requests are pending. Preserve safe user-entered values after recoverable validation errors.

## 7. Content and microcopy principles
- Use plain, direct language.
- Explain why email is required for OTP sign-in.
- Do not say “SMS code sent” because SMS is not implemented.
- Describe passkeys as device-supported sign-in, not as biometric data collection.
- For active-session conflicts, explain that the account already has an active login and the user should use that session or log out there.
- Do not reveal whether an arbitrary email is registered in a way that enables account enumeration.

## 8. Design QA checklist
- [ ] Registration fits mobile, tablet, and desktop.
- [ ] Login and passkey actions remain clear at narrow widths.
- [ ] OTP entry supports paste, keyboard, and touch.
- [ ] Error messages do not cause layout overflow.
- [ ] Dashboard cards stack cleanly on mobile.
- [ ] No horizontal scrolling.
- [ ] Keyboard-only navigation works.
- [ ] Focus indicators are visible.
- [ ] Contrast and text sizing are readable.
- [ ] Loading and disabled states are visually distinct.
- [ ] Passkey unsupported/cancelled states provide fallback.
