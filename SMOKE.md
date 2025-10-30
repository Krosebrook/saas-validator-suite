# Smoke Testing Guide

Manual verification steps to confirm all fixes work end-to-end after applying diffs.

---

## Prerequisites

- [ ] All PRs merged or diffs applied
- [ ] Secrets configured (see `.env.example`)
- [ ] Clean working directory (`git status`)

---

## Test 1: Rebuild SPA into Backend

**Objective:** Verify Vite builds SPA with correct base path into backend directory

```bash
# Clean previous builds
rm -rf backend/frontend/dist

# Build frontend
cd backend
bun install
bun run build

# Expected output:
# ✓ built in XXXms
# dist/index.html                   X.XX kB │ gzip: X.XX kB
# dist/assets/index-XXXXXX.js       XXX.XX kB │ gzip: XX.XX kB
# dist/assets/index-XXXXXX.css      X.XX kB │ gzip: X.XX kB

# Verify output structure
ls -la backend/frontend/dist/
# Should show:
# - index.html
# - assets/
#   - index-*.js
#   - index-*.css

# Check base path in index.html
cat backend/frontend/dist/index.html | grep -o 'src="[^"]*"'
# Should show: src="/frontend/assets/index-XXXXXX.js"
# NOT: src="/assets/index-XXXXXX.js"
```

**✅ Pass Criteria:**
- Build completes without errors
- `backend/frontend/dist/` exists
- Asset paths use `/frontend/` prefix

**❌ Fail Actions:**
- Check `frontend/vite.config.ts` has `base: '/frontend/'`
- Check `backend/package.json` build script points to correct outDir
- Run `bun install` again in frontend/

---

## Test 2: Local Encore Startup

**Objective:** Start Encore backend with static service serving SPA

```bash
# From repository root
encore run

# Expected output:
# Encore development server running!
# 
# API Base URL:      http://localhost:4000
# Dashboard:         http://localhost:9400
# 
# Backend Services:
# - ai              http://localhost:4000/ai
# - auth            http://localhost:4000/auth
# - compliance      http://localhost:4000/compliance
# - db              http://localhost:4000/db
# - frontend        http://localhost:4000/frontend  ← NEW
# - ideas           http://localhost:4000/ideas
# - monitoring      http://localhost:4000/monitoring
# - notifications   http://localhost:4000/notifications
# - scoring         http://localhost:4000/scoring
# - security        http://localhost:4000/security
# - users           http://localhost:4000/user
```

**✅ Pass Criteria:**
- Encore starts without errors
- `frontend` service listed in output
- No import/module errors

**❌ Fail Actions:**
- Check `backend/frontend/encore.service.ts` exists
- Check `backend/frontend/static.ts` exists
- Run `bun install` in backend/
- Check `encore.app` file is valid JSON

---

## Test 3: Provision Secrets

**Objective:** Set all required secrets via Encore CLI or Settings UI

```bash
# Option 1: Encore CLI
encore secret set ClerkSecretKey
# Paste your sk_test_... key when prompted

encore secret set ClerkPublishableKey
# Paste your pk_test_... key

encore secret set SentryDSN
# Paste your https://...@sentry.io/... DSN

encore secret set OpenAI_API_Key
# Paste your sk-... key

encore secret set Anthropic_API_Key
# Paste your sk-ant-... key

# Option 2: Leap.new Settings UI
# Open Settings in sidebar → Add each secret

# Verify secrets set
encore secret list
# Should show:
# - ClerkSecretKey
# - ClerkPublishableKey
# - SentryDSN
# - OpenAI_API_Key
# - Anthropic_API_Key
```

**✅ Pass Criteria:**
- All 5 secrets set
- `encore secret list` shows all names
- No "secret not found" errors on startup

**❌ Fail Actions:**
- Check secret names match exactly (case-sensitive)
- Re-run `encore secret set` commands
- Check `.env.example` for correct names

---

## Test 4: Frontend SPA Loads

**Objective:** Verify SPA loads from `/frontend/` without HTML-as-JSON errors

```bash
# Ensure Encore is running (from Test 2)
# Open browser DevTools (F12) → Console tab

# Navigate to:
open http://localhost:4000/frontend/

# Expected console output:
# (no errors)

# Check Network tab:
# - /frontend/                 → 200 (index.html)
# - /frontend/assets/index-*.js → 200 (JavaScript)
# - /frontend/assets/index-*.css → 200 (CSS)

# Should NOT see:
# - 404 errors for /assets/* (missing /frontend/ prefix)
# - "Unexpected token '<'" errors
# - HTML content when expecting JSON
```

**✅ Pass Criteria:**
- Page renders React app (not blank white screen)
- No 404 errors in Network tab
- All assets load from `/frontend/assets/*`

**❌ Fail Actions:**
- Check `frontend/vite.config.ts` has `base: '/frontend/'`
- Rebuild SPA (Test 1)
- Check `backend/frontend/static.ts` path is `/frontend/*path`
- Clear browser cache (Ctrl+Shift+Delete)

---

## Test 5: Clerk Initialization

**Objective:** Verify Clerk fetches publishable key from backend (no HTML-as-JSON)

```bash
# Browser still open to http://localhost:4000/frontend/
# Check Console tab

# Expected sequence:
# 1. "Loading authentication..." spinner appears
# 2. Network request: /auth/clerk-config → 200 (JSON)
# 3. Clerk initializes (no errors)
# 4. App renders (Dashboard or Sign In button)

# Check Network tab for /auth/clerk-config:
# - Status: 200
# - Type: xhr (fetch)
# - Response: {"publishableKey": "pk_test_..."}

# Should NOT see:
# - "Error fetching Clerk configuration"
# - "Unexpected token '<'"
# - Response Type: document (HTML)
```

**✅ Pass Criteria:**
- `/auth/clerk-config` returns JSON with `publishableKey`
- Clerk Provider initializes
- No authentication errors in console
- Sign In UI appears (if not authenticated)

**❌ Fail Actions:**
- Check `ClerkSecretKey` and `ClerkPublishableKey` secrets set (Test 3)
- Check `backend/auth/auth.ts` exports `getClerkConfig`
- Check browser is requesting `/auth/clerk-config` (not a different path)
- Check response Content-Type is `application/json`

---

## Test 6: Frontend Tests with jsdom

**Objective:** Run all frontend tests using jsdom environment

```bash
cd frontend

# Run tests
bun x vitest run

# Expected output:
# ✓ tests/components/ScoreCard.test.tsx (X tests)
# ✓ tests/components/ActionableInsights.test.tsx (X tests)
# 
# Test Files  2 passed (2)
#      Tests  X passed (X)
#   Start at  HH:MM:SS
#   Duration  XXXXms

# Should NOT see:
# - "MISSING DEPENDENCY Cannot find dependency 'jsdom'"
# - "ReferenceError: document is not defined"
# - Failed tests due to DOM APIs
```

**✅ Pass Criteria:**
- All tests pass
- No jsdom dependency errors
- `@testing-library/jest-dom` matchers work (e.g., `toBeInTheDocument`)

**❌ Fail Actions:**
- Check `frontend/vitest.config.ts` has `environment: 'jsdom'`
- Check `frontend/package.json` devDependencies includes `jsdom`
- Run `bun install` in frontend/
- Delete `node_modules` and reinstall

---

## Test 7: Sentry Event Capture

**Objective:** Verify Sentry captures exceptions with correct sampling and no PII

```bash
# Trigger test error
curl -X POST http://localhost:4000/monitoring/error \
  -H "Content-Type: application/json" \
  -d '{"error": "Smoke test error", "context": {"test": "smoke"}}'

# Expected response:
# {"id": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"}

# Check Sentry dashboard:
# 1. Go to https://sentry.io/organizations/<org>/issues/
# 2. Find event with message "Smoke test error"
# 3. Click event → Details

# Verify Event Payload:
# - Environment: "development" (or "production")
# - Stack trace shows file names (not just minified code)
# - Request section:
#   - Authorization header: MISSING (stripped by beforeSend)
#   - Cookie header: MISSING (stripped)
#   - IP address: MISSING (sendDefaultPii: false)
#   - User-Agent: MISSING (sendDefaultPii: false)

# Check sampling rate in code:
cat backend/monitoring/sentry.ts | grep tracesSampleRate
# Should show:
# tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0
```

**✅ Pass Criteria:**
- Event appears in Sentry dashboard
- Stack trace is readable (source maps work)
- No Authorization/Cookie headers in payload
- No IP address or User-Agent (PII stripped)
- Sampling rate is environment-dependent

**❌ Fail Actions:**
- Check `SentryDSN` secret is set (Test 3)
- Check `backend/monitoring/sentry.ts` config matches diffs
- Check `frontend/tsconfig.json` and `backend/tsconfig.json` have `"sourceMap": true`
- Rebuild frontend with source maps enabled

---

## Test 8: CI Pipeline Execution

**Objective:** Verify GitHub Actions runs all tests and builds

```bash
# Create test branch
git checkout -b test/smoke-ci-verification
git push origin test/smoke-ci-verification

# Open GitHub Actions:
# https://github.com/<org>/<repo>/actions

# Wait for workflow to complete (2-5 minutes)

# Expected workflow steps (all ✓):
# 1. Checkout code
# 2. Setup Bun
# 3. Install backend dependencies
# 4. Install frontend dependencies
# 5. Run backend tests
# 6. Run frontend tests with coverage
# 7. Build frontend
# 8. Verify build artifacts
# 9. Upload build artifacts
# 10. Upload coverage reports
# 11. Test summary

# Download artifacts:
# - frontend-build.zip (should contain index.html, assets/)
# - coverage-reports.zip (should contain coverage/ dirs)
```

**✅ Pass Criteria:**
- All workflow steps pass (green checkmarks)
- Build artifacts available for download
- Coverage reports uploaded
- No dependency installation errors

**❌ Fail Actions:**
- Check `.github/workflows/ci.yml` exists
- Check workflow syntax is valid YAML
- Check `bun pm trust` commands are present
- Review failed step logs in GitHub Actions UI

---

## Test 9: Rate Limit Functionality

**Objective:** Verify rate limiting still works (no regressions from docs-only changes)

```bash
# Test standard rate limit (100 req/min)
for i in {1..105}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -H "Authorization: Bearer $(encore auth login --print-token)" \
    http://localhost:4000/ideas
done

# Expected output:
# 200 (100 times)
# 429 (5 times)  ← Rate limit exceeded

# Check stats endpoint
curl http://localhost:4000/security/rate-limits/stats

# Expected response:
# {
#   "totalEntries": X,
#   "activeUsers": X,
#   "topUsers": [...]
# }
```

**✅ Pass Criteria:**
- First 100 requests return 200
- Requests 101-105 return 429 (rate limited)
- Stats endpoint returns valid JSON

**❌ Fail Actions:**
- Check `backend/security/ratelimit.ts` only has comment changes
- Check no functional code was modified
- Restart Encore (`encore run`)

---

## Test 10: Full User Flow

**Objective:** End-to-end test of idea creation → AI analysis

```bash
# 1. Sign in via Clerk
# - Navigate to http://localhost:4000/frontend/
# - Click "Sign In"
# - Complete Clerk auth flow
# - Redirected to Dashboard

# 2. Create idea
# - Click "New Idea" button
# - Fill form:
#   - Title: "Smoke Test Idea"
#   - Description: "Testing end-to-end flow"
# - Click "Create"

# 3. Trigger AI analysis
# - Click on created idea
# - Click "Analyze Idea"
# - Select analysis type: "Quick Analysis"
# - Click "Run Analysis"

# 4. Check results
# - Wait for analysis to complete (10-30 seconds)
# - Verify score appears
# - Check insights displayed

# 5. Check Sentry
# - Go to Sentry dashboard
# - Verify no new errors during flow
# - Check performance transaction for AI analysis

# 6. Check rate limits
# - Try to run 11+ analyses in 1 minute
# - Should see rate limit error after 10th
```

**✅ Pass Criteria:**
- All steps complete without errors
- Idea created in database
- AI analysis returns results
- No JavaScript console errors
- Sentry captures performance data
- Rate limiting enforces limits

**❌ Fail Actions:**
- Check browser console for errors
- Check Network tab for failed requests
- Check Encore logs for backend errors
- Verify all secrets are set (Test 3)

---

## Final Verification Checklist

After all smoke tests pass:

- [ ] No "Unexpected token '<'" errors (Test 4, 5)
- [ ] Clerk initializes with publishable key from Encore (Test 5)
- [ ] SPA routes and assets resolve under `/frontend/` (Test 4)
- [ ] Vitest runs green with jsdom (Test 6)
- [ ] Sentry events have mapped stack traces (Test 7)
- [ ] Sentry sampling is environment-dependent (Test 7)
- [ ] Sentry strips PII (no IPs, headers) (Test 7)
- [ ] CI passes on test branch (Test 8)
- [ ] Coverage reports generated (Test 8)
- [ ] Build artifacts available (Test 8)
- [ ] Rate limiting functional (Test 9)
- [ ] Full user flow works (Test 10)

---

## Rollback on Smoke Test Failure

If any test fails after fixes applied:

```bash
# Identify failed PR
# Example: Test 5 failed (Clerk config) → PR #2 issue

# Rollback specific PR
git revert <pr-2-commit-sha>

# Or rollback all changes
git reset --hard <commit-before-fixes>

# Reapply fixes one by one, testing after each
git cherry-pick <pr-1-commit>  # Test
git cherry-pick <pr-2-commit>  # Test  ← If this fails, debug here
```

---

## Test Complete

If all tests pass:
1. Document results in `ACCEPTANCE.md`
2. Merge all PRs to main
3. Monitor production for 24 hours
4. Archive audit reports in `docs/audits/2025-10-30/`

**Smoke testing guide complete.** Proceed to `ACCEPTANCE.md` for objective criteria.
