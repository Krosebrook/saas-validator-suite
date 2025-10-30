# PR Implementation Plan

**6 Pull Requests** to fix all diagnosed issues. Apply in sequence to avoid merge conflicts.

---

## PR #1: API Documentation & Secrets Template

**Title:** Add .env.example for secret configuration  
**Branch:** `feat/env-template`  
**Priority:** High (blocks local development)

### Scope
- Create `.env.example` with all Encore secrets documented
- Update `README.md` to reference secrets setup
- Add inline comments explaining each secret's purpose

### Files Changed
- `.env.example` (new file)
- `README.md` (update steps 2-3)

### Acceptance Criteria
- [ ] `.env.example` exists at repository root
- [ ] All secrets from code are documented:
  - `ClerkSecretKey`
  - `ClerkPublishableKey`
  - `SentryDSN`
  - `OpenAI_API_Key`
  - `Anthropic_API_Key`
- [ ] Each secret has a comment explaining:
  - Where to obtain it (e.g., Clerk Dashboard → API Keys)
  - Format/prefix (e.g., `sk_test_...`, `pk_test_...`)
- [ ] README updated with command:
  ```bash
  # Set secrets via Encore CLI or Settings UI
  encore secret set ClerkSecretKey
  encore secret set ClerkPublishableKey
  encore secret set SentryDSN
  ```

### Verification
```bash
cat .env.example
# Should show all secrets with comments
```

---

## PR #2: Vite Base Path & Encore Static Service Alignment

**Title:** Fix SPA routing by aligning Vite base with Encore static path  
**Branch:** `fix/vite-encore-routing`  
**Priority:** Critical (fixes HTML-as-JSON error)

### Scope
- Add `base: '/frontend/'` to Vite config (Strategy A)
- Create `backend/frontend/encore.service.ts` to serve static files
- Update build process to output to `backend/frontend/dist`

### Files Changed
- `frontend/vite.config.ts` (add `base`)
- `backend/frontend/encore.service.ts` (new file)
- `backend/package.json` (update build script)

### Acceptance Criteria
- [ ] `frontend/vite.config.ts` has `base: '/frontend/'`
- [ ] Static service serves files from `/frontend/*` path
- [ ] Build script: `vite build --outDir ../backend/frontend/dist`
- [ ] After build, `backend/frontend/dist/` contains:
  - `index.html`
  - `assets/index-*.js`
  - `assets/index-*.css`
- [ ] Browser loads SPA from `https://<host>/frontend/`
- [ ] Assets load from `https://<host>/frontend/assets/*` (no 404s)
- [ ] No console errors: "Unexpected token '<'"
- [ ] Clerk config fetches successfully (JSON response)

### Verification
```bash
# Build frontend
cd backend && bun run build

# Check output
ls backend/frontend/dist/
# Should show: index.html, assets/

# Run locally
encore run
# Navigate to: http://localhost:4000/frontend/
# Check DevTools Network tab:
# - /frontend/ → 200 (index.html)
# - /frontend/assets/index-*.js → 200
# - /auth/clerk-config → 200 (JSON)
```

### Rollback Plan
```bash
git checkout HEAD~1 -- frontend/vite.config.ts
git rm backend/frontend/encore.service.ts
```

---

## PR #3: Vitest Environment & DOM Matchers

**Title:** Fix Vitest environment for Testing Library compatibility  
**Branch:** `fix/vitest-jsdom`  
**Priority:** High (unblocks tests)

### Scope
- Change Vitest environment from `happy-dom` to `jsdom`
- Add `jsdom` to frontend devDependencies
- Verify `@testing-library/jest-dom` works correctly

### Files Changed
- `frontend/vitest.config.ts` (change environment)
- `frontend/package.json` (add jsdom)

### Acceptance Criteria
- [ ] `frontend/vitest.config.ts` has `environment: 'jsdom'`
- [ ] `frontend/package.json` devDependencies includes `"jsdom": "^25.0.0"`
- [ ] All existing tests pass: `bun x vitest run`
- [ ] No error: "MISSING DEPENDENCY Cannot find dependency 'jsdom'"
- [ ] Testing Library matchers work (e.g., `toBeInTheDocument()`)

### Verification
```bash
cd frontend
bun install
bun x vitest run

# Should output:
# ✓ tests/components/ScoreCard.test.tsx
# ✓ tests/components/ActionableInsights.test.tsx
# Test Files  2 passed (2)
#      Tests  X passed (X)
```

### Rollback Plan
```bash
git checkout HEAD~1 -- frontend/vitest.config.ts frontend/package.json
bun install
```

---

## PR #4: Sentry Hardening & Source Maps

**Title:** Secure Sentry config and enable source maps  
**Branch:** `sec/sentry-hardening`  
**Priority:** High (security & cost)

### Scope
- Reduce `tracesSampleRate` to 10% in production
- Disable `sendDefaultPii` to prevent IP/header leaks
- Enable source maps in frontend tsconfig
- Document Sentry sourcemap upload (optional step)

### Files Changed
- `backend/monitoring/sentry.ts` (update config)
- `frontend/tsconfig.json` (add sourceMap)

### Acceptance Criteria
- [ ] `backend/monitoring/sentry.ts` has:
  - `tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0`
  - `sendDefaultPii: false`
- [ ] `frontend/tsconfig.json` has `"sourceMap": true`
- [ ] Sentry still captures exceptions in development
- [ ] Production sampling is 10% (verify via Sentry dashboard)
- [ ] No PII in Sentry event payloads (check `request.headers` in events)
- [ ] Authorization/Cookie headers still stripped (existing `beforeSend`)

### Verification
```bash
# Check config
cat backend/monitoring/sentry.ts | grep -A2 "tracesSampleRate"
# Should show: process.env.NODE_ENV === "production" ? 0.1 : 1.0

cat backend/monitoring/sentry.ts | grep "sendDefaultPii"
# Should show: sendDefaultPii: false

# Trigger test error
curl -X POST http://localhost:4000/monitoring/error \
  -H "Content-Type: application/json" \
  -d '{"error": "Test error for verification"}'

# Check Sentry dashboard:
# - Event should appear
# - Stack trace should have file names (not just minified names)
# - No IP address or User-Agent in event payload
```

### Rollback Plan
```bash
git checkout HEAD~1 -- backend/monitoring/sentry.ts frontend/tsconfig.json
```

---

## PR #5: CI Pipeline with Tests & Build Artifacts

**Title:** Add GitHub Actions CI for automated testing and builds  
**Branch:** `ci/github-actions`  
**Priority:** Medium (improves DX, prevents regressions)

### Scope
- Create `.github/workflows/ci.yml`
- Set up Bun for backend and frontend
- Run all tests (backend + frontend with coverage)
- Build frontend into `backend/frontend/dist`
- Upload build artifacts

### Files Changed
- `.github/workflows/ci.yml` (new file)

### Acceptance Criteria
- [ ] CI runs on push to `main` and all PRs
- [ ] Workflow steps:
  1. Checkout code
  2. Setup Bun
  3. Install backend dependencies (`cd backend && bun install`)
  4. Install frontend dependencies (`cd frontend && bun install`)
  5. Run backend tests (`cd backend && bun test`)
  6. Run frontend tests with coverage (`cd frontend && bun x vitest run --coverage`)
  7. Build frontend (`cd backend && bun run build`)
  8. Upload `backend/frontend/dist/` as artifact
- [ ] All tests pass in CI
- [ ] Coverage report uploaded (optional: Codecov integration)
- [ ] Build artifact available for download

### Verification
```bash
# Push to a test branch
git checkout -b test/ci-verification
git push origin test/ci-verification

# Check GitHub Actions tab:
# - Workflow triggered
# - All steps green
# - Artifacts available for download
```

### Rollback Plan
```bash
git rm .github/workflows/ci.yml
```

---

## PR #6: Rate Limiting Documentation & Future Redis Plan

**Title:** Document rate limiting scaling limitations and Redis migration path  
**Branch:** `docs/rate-limit-scaling`  
**Priority:** Low (documentation-only, non-breaking)

### Scope
- Add inline comments to `backend/security/ratelimit.ts` explaining in-memory limitations
- Create `docs/RATE_LIMITING.md` with Redis migration guide
- No code changes (per prompt instructions)

### Files Changed
- `backend/security/ratelimit.ts` (add comments only)
- `docs/RATE_LIMITING.md` (new file)
- `REPORT.md` (reference in Issue #8)

### Acceptance Criteria
- [ ] `backend/security/ratelimit.ts` has comment:
  ```typescript
  // NOTE: In-memory rate limiting does not scale horizontally.
  // For multi-instance deployments, migrate to Redis-backed storage.
  // See docs/RATE_LIMITING.md for migration guide.
  ```
- [ ] `docs/RATE_LIMITING.md` contains:
  - Current limitations (single-instance only)
  - Redis migration code example (using `@upstash/redis`)
  - Performance comparison (in-memory vs Redis)
  - Deployment considerations (connection pooling, failover)
- [ ] No functional changes to rate limiting
- [ ] All existing rate limiters still work

### Verification
```bash
# Check comments added
cat backend/security/ratelimit.ts | grep -A3 "NOTE:"

# Check documentation exists
cat docs/RATE_LIMITING.md

# Verify tests still pass
cd backend && bun test
```

### Rollback Plan
```bash
git checkout HEAD~1 -- backend/security/ratelimit.ts
git rm docs/RATE_LIMITING.md
```

---

## Dependency Graph

```
PR #1 (env template)
  ↓
PR #2 (Vite/Encore routing) ← PR #3 (Vitest) ← PR #5 (CI)
  ↓                              ↓
PR #4 (Sentry)                   PR #6 (rate limit docs)
```

**Suggested Merge Order:**
1. PR #1 (unblocks local setup)
2. PR #2 (fixes critical routing bug)
3. PR #3 (unblocks tests)
4. PR #4 (security improvements)
5. PR #5 (enables automated testing)
6. PR #6 (documentation polish)

---

## PR Template

Use this template for all PRs:

```markdown
## Description
[Brief description of changes]

## Related Issue
Fixes issue #X from REPORT.md

## Changes
- [ ] File 1: Description
- [ ] File 2: Description

## Testing
- [ ] Manual testing steps
- [ ] Automated tests pass
- [ ] No regressions

## Acceptance Criteria
[Copy from PR_PLAN.md]

## Screenshots (if applicable)
[Before/After screenshots]

## Rollback Plan
[Command to revert changes]
```

---

## Post-Merge Checklist

After all PRs merged:

- [ ] Run full smoke test suite (see `SMOKE.md`)
- [ ] Verify all acceptance criteria (see `ACCEPTANCE.md`)
- [ ] Monitor Sentry for new errors (24 hours)
- [ ] Check CI dashboard (all green)
- [ ] Update project documentation with new setup steps
- [ ] Archive `REPORT.md` and `PR_PLAN.md` in `docs/audits/2025-10-30/`

---

**PR Plan Complete.** Ready for implementation. See `DIFFS.md` for git-ready unified diffs.
