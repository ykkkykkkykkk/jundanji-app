---
name: project_state_v43
description: Architecture state and known issues as of 2026-03-15 (v4.3) — replaces project_state_v42
type: project
---

Current version: v4.3.0 (package.json + server/package.json both set to 4.3.0).
TASK.md last updated 2026-03-15 (v4.3 commit c0ea9ee).

## Previously-noted bugs: RESOLVED
- withdrawal route: server/routes/withdrawal.js EXISTS, registered in server/app.js (line 124), API functions in src/api/index.js (lines 445-463), withdrawals table in server/db.js (line 193). The critical bug noted in project_state_v42 is now fixed.

## Unstaged changes (as of 2026-03-15)
Three files modified but not staged:
1. `.claude/settings.local.json` — 11 line change (MCP/settings update, safe to commit or ignore)
2. `package.json` — added `@rollup/wasm-node: ^4.59.0` to dependencies
3. `package-lock.json` — lockfile update corresponding to above

One untracked file:
- `.claude/agent-memory/product-planner/COMPREHENSIVE_REVIEW.md` — product planner agent output, not part of app code

The package.json change adds @rollup/wasm-node which is a Wasm-based Rollup build tool. This likely was added to fix a Windows build issue (Rollup native binaries can fail on Windows — Wasm fallback resolves this).

## Known issues
- `server/nul` file exists (320 bytes, contains Windows ping command output in Korean). This is a stray file from a Windows `> nul` redirect that accidentally created a file named "nul" on the server directory. Not harmful but should be deleted or gitignored.
- Dual exchange systems still present: server/routes/exchange.js (older, auth-required) + server/routes/gift.js (current, no auth on list endpoint). Both registered in app.js.

## Architecture: dual DB adapter
- TURSO_DATABASE_URL env var → db-turso.js (@libsql/client)
- No env var → db-local.js (better-sqlite3, data.db)
- db-compat.js also exists (purpose unknown, not referenced in db.js imports)

## Build status
- dist/ exists with all lazy-loaded page chunks + vendor-react + vendor-qrcode chunks
- Build log: 141 modules, SUCCESS
- PWA: sw.js, manifest.json, icons in dist/

## Vercel configuration
- SPA rewrite: /((?!api/|admin).*) → /index.html
- /admin → /admin.html
- /api/(.*) → /api/index.js (single serverless function)
- Cron: /api/cron/cleanup daily at 00:00 UTC
- Function maxDuration: 10s, memory: 256MB

## Guest scratch flow
- 80% threshold triggers onGuestReveal
- guest_scratched localStorage flag blocks 2nd scratch (showGuestBlock modal)
- App-level modals: showGuestReveal + showGuestBlock inline in App.jsx

**Why:** Multiple guest scratch debugging commits suggest this was a difficult flow to stabilize. Be careful with changes to ScratchCard threshold or App.jsx modal logic.
**How to apply:** Test guest scratch flow (no login) both 1st and 2nd attempt when touching ScratchCard or App.jsx.
