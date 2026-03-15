---
name: security-hardening-2026-03
description: Security hardening work completed - auth middleware patterns, admin token sharing, CORS restrictions
type: project
---

Completed security hardening across 8 tasks on 2026-03-15.

**Why:** Multiple critical security gaps - unauthenticated point-earning endpoints, exposed debug endpoint in production, hardcoded admin password, open CORS.

**How to apply:**
- Admin auth uses `x-admin-token` header with in-memory `activeTokens` Set (exported from admin.js as `module.exports.activeTokens`)
- User auth uses JWT Bearer token via `authMiddleware` from `server/middleware/auth.js`, sets `req.user.userId`
- Point-earning POST endpoints (share, quiz/attempt, qr/verify, gift-orders) now require authMiddleware and extract userId from `req.user.userId` instead of `req.body`
- Frontend API functions for these endpoints changed signature: first param is now `token` (JWT) instead of `userId`
- Guest user is userId === 1, allowed to use share without scratchToken
- Exchange admin routes (GET /requests, POST /complete/:id) now require admin token
