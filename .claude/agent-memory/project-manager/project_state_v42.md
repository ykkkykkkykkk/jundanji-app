---
name: project_state_v42
description: Current architecture state, critical bugs, and gaps as of 2026-03-15 (v4.2)
type: project
---

Current version: v4.2 (as of 2026-03-15). TASK.md last updated 2026-03-10.

## Critical Bug: withdrawal route missing
TASK.md documents v3.5 as complete (server/routes/withdrawal.js, app.js registration, src/api/index.js functions). However:
- server/routes/withdrawal.js does NOT EXIST on disk
- withdrawal router is NOT registered in server/app.js
- requestWithdrawal / getWithdrawalHistory / getBanks are NOT in src/api/index.js
- withdrawals table is NOT in server/db.js schema

**Why:** These features appear to have been reverted or never committed. The MyPage UI may also lack withdrawal form.

**How to apply:** Treat withdrawal as an unimplemented feature despite TASK.md claiming it complete. Do not assume it works.

## Architecture: dual exchange systems
Two overlapping gift/exchange systems exist:
1. `server/routes/gift.js` + `POST /api/gift-orders` — GiftShopPage uses this (current)
2. `server/routes/exchange.js` + `POST /api/exchange/request` — older system, still registered in app.js, writes to both gift_orders AND exchange_requests tables

Both are registered. exchange.js requires auth middleware (JWT token), gift.js does not require auth. This is a potential consistency issue.

## Build status
Last build (build_log.txt): 141 modules transformed, SUCCESS. No errors in build_err.txt.

## PWA: recently added (last commit 8af83ca)
- vite-plugin-pwa in devDependencies
- src/sw.js: Workbox precaching + push notification handler
- InstallBanner component in App.jsx (session-dismissed, shows after beforeinstallprompt)

## Guest scratch flow (recent work)
Recent commits focused on guest (non-logged-in) scratch card experience:
- guest_scratched localStorage flag gates 2nd scratch attempt
- First scratch: ScratchCard renders, onGuestReveal fires at 80% threshold
- Second attempt: showGuestBlock modal fires immediately (no scratch card)
- App-level state: showGuestReveal + showGuestBlock modals inline in App.jsx

## DB schema gap: no withdrawals table
The withdrawals table mentioned in v3.0 TASK.md section does NOT exist in server/db.js schemaSQL or migrations array. Admin PointsPage likely shows empty or errors for withdrawal management.

## Admin app pages (7 total)
dashboard, flyers, users, points (withdrawals), business, categories, inquiries — all registered and imported in src/admin/App.jsx.

## Key file locations
- Hash router: src/App.jsx (currentPage state, no react-router)
- All API calls: src/api/index.js (ESM)
- Route registration: server/app.js (CommonJS)
- DB schema + migrations: server/db.js
- Dual DB adapter: server/db-turso.js / server/db-local.js
- Vercel config: vercel.json (SPA rewrite + /admin rewrite + cron cleanup daily)
