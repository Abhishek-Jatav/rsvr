# Deployment Guide
## RSVR Technologies — Secure Authentication System

## 1. Deployment topology

| Component | Provider | Configuration |
|---|---|---|
| Next.js frontend | Netlify | Production build and public API URL |
| Express backend | Render | Node service and backend secrets |
| Database | MongoDB Atlas | Database user, network access, connection URI |
| Email | Gmail SMTP | Nodemailer credentials |

Provider free-tier features, limits, and framework support can change. Confirm current provider settings during deployment.

## 2. Pre-deployment checklist
- Local frontend and backend work.
- MongoDB Atlas connection succeeds.
- Email OTP works with Gmail SMTP.
- Passkey flow works on localhost where supported.
- Single-session enforcement and logout pass.
- Responsive checks pass.
- All tests pass.
- `.env` files and secrets are excluded from Git.
- `.env.example` is current.
- Production domains/origins are known.

## 3. MongoDB Atlas
1. Create/select the project and cluster.
2. Create a dedicated database user with only required database permissions.
3. Configure network access for the backend deployment. Avoid unrestricted access unless temporarily required and understood.
4. Copy the connection URI into Render as `MONGODB_URI`.
5. Verify the deployed backend can connect.
6. Confirm indexes are created and verified.

## 4. Backend deployment — Render
1. Push backend source to GitHub.
2. Create a Render web service connected to the repository.
3. Select the backend root directory if using a monorepo.
4. Configure install/build and start commands to match the actual package scripts.
5. Add every required backend environment variable from `env.md`.
6. Set `PORT` handling to use the hosting-provided port.
7. Set `NODE_ENV=production`.
8. Set `FRONTEND_ORIGIN` to the exact Netlify/custom frontend origin.
9. Configure WebAuthn RP ID and origin for the production frontend hostname.
10. Deploy and inspect logs without exposing secrets.
11. Verify `/api/health`.

## 5. Frontend deployment — Netlify
1. Connect the GitHub repository.
2. Select the frontend base directory if using a monorepo.
3. Configure the Next.js build settings using Netlify's current Next.js support.
4. Set `NEXT_PUBLIC_API_BASE_URL` to the deployed backend API base URL.
5. Deploy.
6. Verify page routes and API connectivity.
7. Configure the production frontend origin in Render CORS.

## 6. Cookies and cross-origin authentication
The architecture uses an HttpOnly cookie. Set frontend requests to include credentials and backend CORS to allow the exact origin with credentials.

Default Netlify and Render hostnames may be cross-site. Cross-site cookies using `SameSite=None; Secure` can still be restricted by browser privacy settings. Prefer custom frontend and API subdomains under the same registrable domain when available. If using provider hostnames, test real login persistence in supported desktop and mobile browsers; a successful API response alone does not prove that the browser retained the cookie.

## 7. WebAuthn production configuration
- Production frontend must be served over HTTPS.
- `WEBAUTHN_ORIGIN` must exactly match the browser origin, including scheme and hostname (and port if nonstandard).
- `WEBAUTHN_RP_ID` is the relying-party hostname without scheme or path.
- Do not use a backend hostname as RP ID if the ceremony runs on the frontend hostname.
- Ensure the RP ID is valid for the frontend origin.
- Test registration and assertion on actual target browsers/devices.
- Passkeys registered for localhost are not production credentials; enroll again on the production origin.

## 8. Post-deployment verification
- [ ] Frontend loads over HTTPS.
- [ ] Backend health endpoint responds.
- [ ] Backend connects to Atlas.
- [ ] Registration persists a user.
- [ ] Email OTP arrives and verifies.
- [ ] OTP expires and resend limits work.
- [ ] Passkey registration works on a supported device.
- [ ] Passkey login works.
- [ ] Second active login is rejected.
- [ ] Dashboard loads only when authenticated.
- [ ] Logout revokes session and clears cookie.
- [ ] Cookie persists correctly in target browsers.
- [ ] Mobile, tablet, and desktop layouts work.
- [ ] No secrets appear in repository, frontend bundle, or logs.

## 9. Submission
Prepare:
- GitHub repository URL.
- Live frontend URL.
- Short architecture and feature explanation.
- Known limitations (notably no SMS OTP in this scope).
- Demo steps and test account instructions that do not disclose real secrets.
- Email the code and explanation to `hr@rsvrtech.com`.
