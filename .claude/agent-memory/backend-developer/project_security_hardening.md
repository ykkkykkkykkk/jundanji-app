---
name: security-hardening-2026-03
description: Security hardening work completed — auth middleware on all user-action endpoints, admin JWT, OAuth state CSRF protection
type: project
---

Completed security hardening across multiple sessions on 2026-03-15.

**Why:** Multiple critical security gaps — unauthenticated point-earning endpoints, userId spoofing via request body, exposed debug endpoint in production, hardcoded admin password, open CORS.

**How to apply:**
- Admin auth uses JWT with separate `ADMIN_JWT_SECRET`, verified in `requireAdmin` middleware via `x-admin-token` header
- User auth uses JWT Bearer token via `authMiddleware` from `server/middleware/auth.js`, sets `req.user.userId`
- All user-action POST endpoints require authMiddleware and extract userId from `req.user.userId` instead of `req.body`:
  - share.js: POST /share, POST /points/use, GET /point-history, GET /share-history
  - security.js: POST /security/device, POST /scratch/start
  - quiz, qr, gift-orders routes
- OAuth CSRF: social.js uses HMAC-SHA256 signed state cookie (STATE_COOKIE), verified in callbacks
- Frontend API functions changed signature: first param is `token` (JWT) for authenticated endpoints
- ScratchCard component receives `token` prop for startScratchSession calls
- Guest user is userId === 1, allowed to use share without scratchToken
- DELETE /api/users/me: anonymizes user data (nickname, email, password_hash, provider_id, phone), sets status='deleted', points=0, deletes device_fingerprints and bookmarks
