# Complete Audit & Diagnosis Report

**Generated:** 2025-10-30  
**Project:** SaaS Validator Suite (Encore.ts + Vite/React)  
**Environment:** Leap.new (proj_d370vmc82vjsm36vu8rg)

---

## Executive Summary

This audit identified **6 critical issues** causing frontend errors, failed tests, security vulnerabilities, and missing CI infrastructure. All issues have root causes documented with file paths and diffs ready for implementation.

**Critical Symptoms Detected:**
1. ✗ Console error: `Unexpected token '<', "<!DOCTYPE"...` – HTML served as JSON
2. ✗ Vitest error: `MISSING DEPENDENCY Cannot find dependency 'jsdom'`
3. ✗ Sentry tracesSampleRate: 1.0 in production (100% sampling)
4. ✗ Sentry sendDefaultPii: true (leaks user IPs/metadata)
5. ✗ Missing source maps for error tracking
6. ✗ No CI/CD pipeline for automated testing/builds
7. ✗ In-memory rate limiting (won't scale horizontally)

---

## Issue #1: Clerk Configuration HTML-as-JSON Error

### Root Cause
The frontend fetches Clerk config from `/auth/clerk-config` via `backend.auth.getClerkConfig()`. **Encore does NOT serve a static SPA by default**—there is no static service defined. When the browser requests assets or routes, it hits Encore backend endpoints that may return 404 HTML pages instead of JSON, causing:

```
Error fetching Clerk configuration: Unexpected token '<', "<!DOCTYPE ..." is not valid JSON
```

**Files Affected:**
- `frontend/components/ClerkWrapper.tsx:17` – calls `fetchClerkConfig()`
- `frontend/config.ts:13` – executes `backend.auth.getClerkConfig()`
- No static service in `backend/` for serving SPA

### Evidence
```typescript
// frontend/config.ts:11-18
export async function fetchClerkConfig(): Promise<string> {
  try {
    const config = await backend.auth.getClerkConfig();
    clerkPublishableKey = config.publishableKey;
    return config.publishableKey;
  } catch (error) {
    console.error('Error fetching Clerk configuration:', error);
    throw error;
  }
}
```

**Problem:** No verification that the response is JSON. If Encore returns an HTML 404 page (e.g., route mismatch), `JSON.parse()` in the generated client fails.

### Solution Strategy Decision: **Strategy A (Least Invasive)**
**Keep Vite SPA under `/frontend/*` path:**
1. Add `base: '/frontend/'` to Vite config
2. Create `backend/frontend/encore.service.ts` to serve static files from `/frontend/*`
3. Ensure all frontend assets/routes resolve under this prefix

**Why Strategy A:**
- Avoids conflicts with existing backend API routes at root (`/auth/*`, `/ideas/*`, etc.)
- Requires minimal changes to routing logic
- Clear separation between API and static assets

**Rollback:** Remove static service, delete `base` from Vite config

---

## Issue #2: Vitest Environment Mismatch

### Root Cause
`frontend/vitest.config.ts:7` specifies `environment: 'happy-dom'`, but:
1. Frontend tests import `@testing-library/jest-dom` (`frontend/tests/setup.tsx:1`)
2. `@testing-library/react` requires DOM APIs (click events, render, etc.)
3. `happy-dom` may not fully support all DOM matchers; **jsdom** is the standard for Testing Library

**Files Affected:**
- `frontend/vitest.config.ts:7` – `environment: 'happy-dom'`
- `frontend/tests/setup.tsx:1` – `import '@testing-library/jest-dom'`
- `frontend/package.json` – missing `jsdom` in devDependencies

### Evidence
```typescript
// frontend/vitest.config.ts:4-12
export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom', // ← WRONG for Testing Library
    include: ['tests/**/*.test.tsx'],
    exclude: ['node_modules', 'dist', 'build'],
    restoreMocks: true,
    setupFiles: ['./tests/setup.tsx'],
  },
```

**Expected Error (from prompt):**
```
MISSING DEPENDENCY Cannot find dependency 'jsdom'
```

### Solution
1. Change `environment: 'happy-dom'` → `environment: 'jsdom'`
2. Add `jsdom` to `frontend/package.json` devDependencies
3. Verify `@testing-library/jest-dom` is properly imported in setup

**Rollback:** Revert to `happy-dom` (not recommended—breaks Testing Library)

---

## Issue #3: Vite Base Path Missing

### Root Cause
`frontend/vite.config.ts` has **no `base` property**. Vite defaults to `base: '/'`, meaning:
- Emitted assets use absolute paths: `/assets/index-abc123.js`
- If Encore serves SPA at `/frontend/*`, assets 404 because they request `/<asset>` not `/frontend/<asset>`

**Files Affected:**
- `frontend/vite.config.ts` – missing `base: '/frontend/'`

### Evidence
```typescript
// frontend/vite.config.ts (current)
export default defineConfig({
  resolve: { /* ... */ },
  plugins: [tailwindcss(), react()],
  mode: "development",
  build: { minify: false }
  // ← NO BASE PROPERTY
})
```

### Solution (Strategy A)
Add `base: '/frontend/'` to Vite config:

```diff
+++ frontend/vite.config.ts
@@ -6,6 +6,7 @@
 export default defineConfig({
+  base: '/frontend/',
   resolve: {
```

**Rollback:** Remove `base` property

---

## Issue #4: Missing .env.example for Secrets

### Root Cause
No `.env.example` file exists to document required secrets. Users must guess secret names for Encore configuration.

**Expected Secrets (from code):**
- `ClerkSecretKey` (backend/auth/auth.ts:6)
- `ClerkPublishableKey` (backend/auth/auth.ts:7)
- `SentryDSN` (backend/monitoring/sentry.ts:5)
- OpenAI/Anthropic keys (referenced in README)

### Evidence
```typescript
// backend/auth/auth.ts:6-8
const clerkSecretKey = secret("ClerkSecretKey");
const clerkPublishableKey = secret("ClerkPublishableKey");
const clerkClient = createClerkClient({ secretKey: clerkSecretKey() });
```

**Glob search for `.env*`:** Returned errors (no files found)

### Solution
Create `.env.example` with all required secrets:

```bash
# Clerk Authentication
ClerkSecretKey=sk_test_...
ClerkPublishableKey=pk_test_...

# Sentry Monitoring
SentryDSN=https://...@sentry.io/...

# AI Providers
OpenAI_API_Key=sk-...
Anthropic_API_Key=sk-ant-...
```

**Rollback:** Delete `.env.example`

---

## Issue #5: Sentry Configuration Security Issues

### Root Cause
`backend/monitoring/sentry.ts:9-10` has **production-unsafe** configuration:

```typescript
Sentry.init({
  dsn: sentryDsn(),
  tracesSampleRate: 1.0,      // ← 100% sampling in prod = $$$ cost
  sendDefaultPii: true,       // ← Leaks IPs, user-agents, cookies
  environment: process.env.NODE_ENV || "development",
```

**Issues:**
1. **tracesSampleRate: 1.0** – Captures 100% of transactions (expensive in production)
2. **sendDefaultPii: true** – Automatically includes user IPs, headers, cookies (GDPR/privacy risk)
3. **No source maps** – Stack traces show minified code locations

### Evidence
- `backend/monitoring/sentry.ts:9` – `tracesSampleRate: 1.0`
- `backend/monitoring/sentry.ts:10` – `sendDefaultPii: true`
- `backend/tsconfig.json:23` – `sourceMap: true` ✓ (already enabled)
- `frontend/tsconfig.json` – **NO sourceMap property** (missing)

### Solution
1. Lower sampling to 0.1 (10%) in production
2. Disable PII by default
3. Enable source maps in frontend tsconfig

```diff
+++ backend/monitoring/sentry.ts
@@ -7,8 +7,8 @@
 Sentry.init({
   dsn: sentryDsn(),
-  tracesSampleRate: 1.0,
-  sendDefaultPii: true,
+  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
+  sendDefaultPii: false,
   environment: process.env.NODE_ENV || "development",
```

**Rollback:** Restore `1.0` and `true` values (not recommended)

---

## Issue #6: Vitest Dependency Location

### Root Cause
`vitest` appears in **both** `dependencies` and `devDependencies` in `backend/package.json` and `frontend/package.json`:

**Backend:**
```json
{
  "dependencies": {
    "vitest": "^3.0.9"  // ← WRONG
  },
  "devDependencies": {
    "vitest": "^3.0.9"  // ← CORRECT
  }
}
```

**Frontend:**
```json
{
  "dependencies": {
    "vitest": "^3.0.9"  // ← WRONG
  },
  "devDependencies": {
    "vitest": "^3.0.9"  // ✓ Already correct
  }
}
```

### Solution
Move `vitest` to devDependencies only in both packages.

**Rollback:** Add back to dependencies (bloats production builds)

---

## Issue #7: Missing CI/CD Pipeline

### Root Cause
No `.github/workflows/` directory or CI configuration exists. Tests, builds, and deployments are manual.

### Evidence
```bash
$ ls .github/
# Empty directory
```

### Solution
Create `.github/workflows/ci.yml` with:
1. Bun setup (handles `postinstall` trust automatically)
2. Backend tests (`cd backend && bun test`)
3. Frontend tests with coverage (`cd frontend && bun x vitest run --coverage`)
4. Build verification (frontend → `backend/frontend/dist`)
5. Artifact upload for deployment

**Rollback:** Delete `.github/workflows/ci.yml`

---

## Issue #8: In-Memory Rate Limiting (Scaling Risk)

### Root Cause
`backend/security/ratelimit.ts:19` uses `Map<string, RateLimitEntry>` for in-memory storage:

```typescript
export class RateLimiter {
  private requests = new Map<string, RateLimitEntry>(); // ← In-memory only
```

**Problem:** Won't scale horizontally (each instance has isolated state)

### Evidence
- `backend/security/ratelimit.ts:19` – `Map` usage
- No Redis/external storage integration

### Solution
**Documentation-only fix** (per prompt instructions):
1. Document limitation in `REPORT.md`
2. Propose Redis migration plan in PR #6
3. No code changes unless explicitly requested

**Future Redis Plan:**
```typescript
import { Redis } from '@upstash/redis';
const redis = new Redis({ url: '...', token: '...' });

async checkLimit(userId: string, endpoint: string) {
  const key = `ratelimit:${userId}:${endpoint}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, this.config.windowMs / 1000);
  // ...
}
```

---

## Encore + Vite: Static Serving Checklist

### ✓ Pre-Flight Checks
- [ ] **Build SPA into backend/**: `cd backend && bun install && bun run build`
- [ ] **Vite base matches Encore path:** `base: '/frontend/'` in vite.config.ts
- [ ] **Static service exists:** `backend/frontend/encore.service.ts` with `path: '/frontend/*'`
- [ ] **Assets resolve:** Check DevTools Network tab for `/frontend/assets/*` (not `/assets/*`)

### ✓ Clerk Boot Sequence
- [ ] **SPA loads** → `ClerkWrapper` renders → `fetchClerkConfig()` calls `/auth/clerk-config`
- [ ] **Response is JSON** (not HTML 404)
- [ ] **publishableKey extracted** → `ClerkProvider` initializes
- [ ] **No console errors** with "Unexpected token '<'"

### ✓ Test Execution
- [ ] **jsdom installed:** `bun install jsdom --dev`
- [ ] **Vitest config:** `environment: 'jsdom'`
- [ ] **Tests pass:** `bun x vitest run`

### ✓ Sentry Verification
- [ ] **Source maps enabled:** `"sourceMap": true` in both tsconfigs
- [ ] **Sampling reduced:** `tracesSampleRate: 0.1` in prod
- [ ] **PII disabled:** `sendDefaultPii: false`
- [ ] **Events in Sentry UI** show mapped stack traces

---

## File Path Reference

| Issue | Files Affected | Line Numbers |
|-------|---------------|--------------|
| Clerk HTML-as-JSON | `frontend/components/ClerkWrapper.tsx` | 17 |
| | `frontend/config.ts` | 11-18 |
| | `frontend/vite.config.ts` | (missing base) |
| | `backend/` | (no static service) |
| Vitest Environment | `frontend/vitest.config.ts` | 7 |
| | `frontend/tests/setup.tsx` | 1 |
| | `frontend/package.json` | (missing jsdom) |
| Vite Base Path | `frontend/vite.config.ts` | 6-18 |
| Secrets Documentation | `.env.example` | (missing file) |
| Sentry Config | `backend/monitoring/sentry.ts` | 9-10 |
| | `frontend/tsconfig.json` | (missing sourceMap) |
| | `backend/tsconfig.json` | 23 ✓ |
| Vitest Deps | `backend/package.json` | 9-16 |
| | `frontend/package.json` | 9-44 |
| CI/CD | `.github/workflows/` | (empty) |
| Rate Limiting | `backend/security/ratelimit.ts` | 19 |

---

## Rollback Instructions

If any fix breaks the application:

1. **Static Service:** `git rm backend/frontend/encore.service.ts`
2. **Vite Base:** Remove `base: '/frontend/'` from `frontend/vite.config.ts`
3. **Vitest Environment:** Change back to `environment: 'happy-dom'`
4. **Sentry Config:** Restore `tracesSampleRate: 1.0, sendDefaultPii: true`
5. **CI Workflow:** `git rm .github/workflows/ci.yml`

**Full Revert:**
```bash
git revert <commit-sha>
```

---

## Next Steps

Proceed to implement fixes via **6 PRs** documented in `PR_PLAN.md`. Each PR has:
- Scope: Isolated changes
- Acceptance Criteria: Objective verification
- Diffs: Ready for `git apply`

**Verification Sequence:**
1. Apply diffs → Run `SMOKE.md` tests → Check `ACCEPTANCE.md` criteria
2. If any check fails → Rollback that PR → Debug → Re-apply
3. All checks pass → Merge to main → Monitor Sentry/CI

---

**Report Complete.** See `PR_PLAN.md` for implementation roadmap.
