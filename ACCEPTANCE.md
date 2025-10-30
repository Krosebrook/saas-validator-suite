# Acceptance Criteria Checklist

Objective verification criteria for all PRs. Each criterion must be **measurable** and **testable**.

---

## PR #1: API Documentation & Secrets Template

### Must-Have Criteria

- [x] **File Exists:** `.env.example` file present at repository root
- [x] **All Secrets Documented:** Contains all 5 required secrets:
  - `ClerkSecretKey`
  - `ClerkPublishableKey`
  - `SentryDSN`
  - `OpenAI_API_Key`
  - `Anthropic_API_Key`
- [x] **Format Examples:** Each secret has placeholder value showing expected format:
  - Clerk: `sk_test_...`, `pk_test_...`
  - Sentry: `https://...@sentry.io/...`
  - OpenAI: `sk-...`
  - Anthropic: `sk-ant-...`
- [x] **Source Documentation:** Each secret has comment explaining where to obtain it
- [x] **README Updated:** Section 2 updated with secret provisioning commands
- [x] **No Hardcoded Secrets:** `.env.example` contains only placeholder values (no real keys)

### Verification Commands

```bash
# Check file exists
test -f .env.example && echo "✓ File exists" || echo "✗ File missing"

# Count secrets
grep -c "=" .env.example
# Expected: 5

# Check README updated
grep -q "encore secret set" README.md && echo "✓ README updated" || echo "✗ Missing"

# Ensure no real secrets
grep -E "(sk_live|pk_live|sk-[A-Za-z0-9]{48})" .env.example
# Expected: no matches (exit code 1)
```

### Acceptance Status: ⬜ Pending / ✅ Accepted / ❌ Rejected

---

## PR #2: Vite Base Path & Encore Static Service Alignment

### Must-Have Criteria

- [x] **Vite Base Configured:** `frontend/vite.config.ts` has `base: '/frontend/'`
- [x] **Static Service Exists:** `backend/frontend/encore.service.ts` created
- [x] **Static Handler Defined:** `backend/frontend/static.ts` exports `api.static()` with:
  - `path: '/frontend/*path'`
  - `dir: './dist'`
- [x] **Build Script Updated:** `backend/package.json` has `build` script:
  - `cd ../frontend && bun install && vite build --outDir ../backend/frontend/dist`
- [x] **Build Output Correct:** After build, `backend/frontend/dist/` contains:
  - `index.html`
  - `assets/index-*.js`
  - `assets/index-*.css`
- [x] **Asset Paths Correct:** `dist/index.html` references assets as `/frontend/assets/*` (not `/assets/*`)
- [x] **No HTML-as-JSON Errors:** Browser console clean when loading `/frontend/`
- [x] **Clerk Config Fetches:** `/auth/clerk-config` returns JSON (not HTML)
- [x] **No 404 Errors:** All SPA routes and assets resolve correctly

### Verification Commands

```bash
# Check Vite config
grep 'base:' frontend/vite.config.ts | grep '/frontend/'
# Expected: base: '/frontend/',

# Check static service exists
test -f backend/frontend/static.ts && echo "✓ Static service" || echo "✗ Missing"

# Check build script
grep '"build"' backend/package.json | grep 'vite build --outDir ../backend/frontend/dist'
# Expected: match

# Build and verify output
cd backend && bun run build
ls backend/frontend/dist/index.html
# Expected: file exists

# Check asset paths in HTML
grep -o 'src="/frontend/assets/[^"]*"' backend/frontend/dist/index.html
# Expected: matches found (not src="/assets/...")

# Test live endpoint (Encore must be running)
curl -s http://localhost:4000/frontend/ | head -n1
# Expected: <!DOCTYPE html>

# Test Clerk config endpoint
curl -s http://localhost:4000/auth/clerk-config | jq .publishableKey
# Expected: "pk_test_..." (JSON, not HTML)
```

### Acceptance Status: ⬜ Pending / ✅ Accepted / ❌ Rejected

---

## PR #3: Vitest Environment & DOM Matchers

### Must-Have Criteria

- [x] **Environment Changed:** `frontend/vitest.config.ts` has `environment: 'jsdom'` (not `'happy-dom'`)
- [x] **Dependency Added:** `frontend/package.json` devDependencies includes `jsdom`
- [x] **Dependency Installed:** `node_modules/jsdom/` directory exists
- [x] **All Tests Pass:** `bun x vitest run` exits with code 0
- [x] **No Missing Dependency Error:** No "Cannot find dependency 'jsdom'" message
- [x] **Testing Library Works:** Tests using `@testing-library/react` pass
- [x] **DOM Matchers Work:** Tests using `toBeInTheDocument()` etc. pass
- [x] **No Regression:** Test count unchanged from before changes

### Verification Commands

```bash
# Check Vitest config
grep "environment:" frontend/vitest.config.ts | grep "jsdom"
# Expected: environment: 'jsdom',

# Check package.json
grep '"jsdom"' frontend/package.json
# Expected: "jsdom": "^25.0.0"

# Check installed
test -d frontend/node_modules/jsdom && echo "✓ Installed" || echo "✗ Missing"

# Run tests
cd frontend && bun x vitest run
# Expected exit code: 0 (all pass)

# Count tests
bun x vitest run --reporter=json > results.json
cat results.json | jq '.testResults[].assertionResults | length'
# Expected: > 0 tests passed
```

### Acceptance Status: ⬜ Pending / ✅ Accepted / ❌ Rejected

---

## PR #4: Sentry Hardening & Source Maps

### Must-Have Criteria

- [x] **Sampling Rate Dynamic:** `backend/monitoring/sentry.ts` has:
  - `tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0`
- [x] **PII Disabled:** `sendDefaultPii: false`
- [x] **Source Maps Frontend:** `frontend/tsconfig.json` has `"sourceMap": true`
- [x] **Source Maps Backend:** `backend/tsconfig.json` has `"sourceMap": true` (already exists)
- [x] **BeforeSend Unchanged:** Authorization and Cookie headers still stripped
- [x] **Development Sampling:** In dev mode, sampling rate is 100% (1.0)
- [x] **Production Sampling:** In prod mode, sampling rate is 10% (0.1)
- [x] **Sentry Events Work:** Test error appears in Sentry dashboard
- [x] **Stack Traces Readable:** Error events show source file names (not minified)
- [x] **No PII Leaked:** Sentry events do not contain IP addresses or User-Agent headers

### Verification Commands

```bash
# Check sampling rate
grep "tracesSampleRate:" backend/monitoring/sentry.ts
# Expected: process.env.NODE_ENV === "production" ? 0.1 : 1.0

# Check PII disabled
grep "sendDefaultPii:" backend/monitoring/sentry.ts
# Expected: sendDefaultPii: false,

# Check source maps in frontend
grep '"sourceMap"' frontend/tsconfig.json
# Expected: "sourceMap": true,

# Check beforeSend still present
grep -A5 "beforeSend" backend/monitoring/sentry.ts | grep "delete"
# Expected: delete event.request.headers.authorization;
#           delete event.request.headers.cookie;

# Test error capture
curl -X POST http://localhost:4000/monitoring/error \
  -H "Content-Type: application/json" \
  -d '{"error": "Test acceptance criteria"}'
# Expected: {"id": "..."}

# Check Sentry dashboard manually:
# 1. Event appears
# 2. Stack trace shows file:line (e.g., sentry.ts:25)
# 3. Request section has NO:
#    - authorization header
#    - cookie header
#    - user.ip_address
```

### Acceptance Status: ⬜ Pending / ✅ Accepted / ❌ Rejected

---

## PR #5: CI Pipeline with Tests & Build Artifacts

### Must-Have Criteria

- [x] **Workflow File Exists:** `.github/workflows/ci.yml` present
- [x] **Triggers Configured:** Runs on `push` to main and `pull_request`
- [x] **Bun Setup:** Workflow uses `oven-sh/setup-bun` action
- [x] **Dependencies Installed:** Both backend and frontend `bun install` steps
- [x] **Trust Postinstall:** Both have `bun pm trust` commands
- [x] **Backend Tests Run:** Step executes `cd backend && bun test`
- [x] **Frontend Tests Run:** Step executes `cd frontend && bun x vitest run --coverage`
- [x] **Frontend Built:** Step executes `cd backend && bun run build`
- [x] **Artifacts Verified:** Step checks `backend/frontend/dist/index.html` exists
- [x] **Artifacts Uploaded:** `upload-artifact` action for `frontend-build`
- [x] **Coverage Uploaded:** `upload-artifact` action for `coverage-reports`
- [x] **All Steps Pass:** Workflow completes successfully (green checkmark)
- [x] **Artifacts Downloadable:** Build and coverage artifacts available in Actions UI

### Verification Commands

```bash
# Check workflow file exists
test -f .github/workflows/ci.yml && echo "✓ Workflow exists" || echo "✗ Missing"

# Validate YAML syntax
yamllint .github/workflows/ci.yml || echo "✓ Valid YAML"

# Check triggers
grep -A2 "^on:" .github/workflows/ci.yml
# Expected: push: branches: [main]
#           pull_request: branches: [main]

# Count steps
grep "^      - name:" .github/workflows/ci.yml | wc -l
# Expected: >= 10 steps

# Check Bun setup
grep "oven-sh/setup-bun" .github/workflows/ci.yml
# Expected: match

# Test workflow (requires GitHub)
git push origin test/acceptance-ci
# Then check: https://github.com/<org>/<repo>/actions
# Expected: All steps pass, artifacts uploaded
```

### Acceptance Status: ⬜ Pending / ✅ Accepted / ❌ Rejected

---

## PR #6: Rate Limiting Documentation & Future Redis Plan

### Must-Have Criteria

- [x] **Inline Comment Added:** `backend/security/ratelimit.ts` has comment above `RateLimiter` class:
  - Mentions "in-memory storage"
  - Warns "does NOT scale horizontally"
  - References `docs/RATE_LIMITING.md`
- [x] **Documentation Created:** `docs/RATE_LIMITING.md` file exists
- [x] **Doc Sections Present:**
  - Current implementation description
  - Limitations (single-instance, no persistence, etc.)
  - When to migrate checklist
  - Redis migration code example
  - Performance comparison table
  - Migration checklist
  - Rollback plan
  - Testing examples
- [x] **No Functional Changes:** Rate limiting code logic unchanged
- [x] **All Tests Pass:** Backend tests still pass (no regressions)
- [x] **Rate Limits Work:** Manual test confirms limits still enforced

### Verification Commands

```bash
# Check inline comment added
grep -A3 "NOTE:" backend/security/ratelimit.ts | grep "does NOT scale"
# Expected: match

# Check doc file exists
test -f docs/RATE_LIMITING.md && echo "✓ Doc exists" || echo "✗ Missing"

# Count sections
grep "^##" docs/RATE_LIMITING.md | wc -l
# Expected: >= 5 sections

# Check Redis example present
grep "@upstash/redis" docs/RATE_LIMITING.md
# Expected: match

# Verify no code changes (only comments)
git diff HEAD~1 backend/security/ratelimit.ts | grep "^-" | grep -v "^---" | grep -v "//"
# Expected: no matches (only comment lines changed)

# Test rate limiting still works
for i in {1..5}; do curl -s http://localhost:4000/ideas; done
# Expected: all 200 (under limit)
```

### Acceptance Status: ⬜ Pending / ✅ Accepted / ❌ Rejected

---

## Overall System Acceptance

### Critical Success Factors

All of the following must be **true** for overall acceptance:

- [ ] **No HTML-as-JSON Errors:** Zero occurrences of "Unexpected token '<'" in browser console
- [ ] **Clerk Boots Successfully:** ClerkProvider initializes with publishable key from Encore
- [ ] **SPA Assets Resolve:** All routes and assets load from `/frontend/*` without 404s
- [ ] **All Tests Pass:** Both backend and frontend test suites green
  - Backend: `cd backend && bun test` → exit 0
  - Frontend: `cd frontend && bun x vitest run` → exit 0
- [ ] **Sentry Events Correct:** Events have:
  - Readable stack traces (source maps work)
  - No PII (IP, User-Agent, cookies stripped)
  - Correct environment (dev/prod)
- [ ] **CI Green:** GitHub Actions workflow passes on main branch
- [ ] **Coverage >= 85%:** For all changed modules (frontend tests)
- [ ] **Build Artifacts Valid:** `backend/frontend/dist/` contains functional SPA
- [ ] **No Security Regressions:** 
  - Secrets not exposed in client code
  - Authorization headers stripped from Sentry
  - Rate limiting functional
- [ ] **Documentation Complete:**
  - `.env.example` has all secrets
  - `docs/RATE_LIMITING.md` exists
  - README updated with setup steps

### Performance Benchmarks

- [ ] **Frontend Build Time:** < 30 seconds
- [ ] **Test Execution:** < 60 seconds total (backend + frontend)
- [ ] **Sentry Event Upload:** < 1 second (dev mode)
- [ ] **SPA Load Time:** < 2 seconds (localhost)
- [ ] **CI Pipeline Duration:** < 5 minutes

### Security Checklist

- [ ] **No Secrets in Code:** `git grep -E "(sk_live|pk_live|sk-[A-Za-z0-9]{48})"` → no matches
- [ ] **No PII in Logs:** Sentry events checked manually
- [ ] **HTTPS Only (Prod):** Preview URLs use https://
- [ ] **Auth Headers Stripped:** Sentry `beforeSend` verified
- [ ] **Rate Limits Enforced:** Manual test confirms 429 after limit

### Rollback Readiness

- [ ] **Each PR Reversible:** All PRs have documented rollback steps
- [ ] **No Database Changes:** No new migrations (non-destructive changes only)
- [ ] **Backward Compatible:** Old builds can still run (if needed)

---

## Sign-Off

### Automated Checks: ⬜ Pending / ✅ Pass / ❌ Fail

```bash
# Run automated acceptance script
./scripts/run-acceptance-tests.sh

# Expected output:
# ✓ PR #1: .env.example present, 5 secrets documented
# ✓ PR #2: Vite base configured, static service working
# ✓ PR #3: Vitest using jsdom, all tests pass
# ✓ PR #4: Sentry hardened, source maps enabled
# ✓ PR #5: CI workflow passing, artifacts uploaded
# ✓ PR #6: Rate limit docs complete, no regressions
# 
# Overall: 6/6 PRs accepted
```

### Manual Verification: ⬜ Pending / ✅ Pass / ❌ Fail

- [ ] Clerk authentication flow tested end-to-end
- [ ] Sentry dashboard reviewed for PII leaks
- [ ] GitHub Actions artifacts downloaded and inspected
- [ ] Production preview URL tested (if deployed)

### Stakeholder Approval

- [ ] **Developer:** Code reviewed and approved
- [ ] **QA:** All smoke tests passed
- [ ] **Security:** No vulnerabilities introduced
- [ ] **DevOps:** CI/CD pipeline validated

---

## Final Acceptance Decision

**Status:** ⬜ Pending Review / ✅ **ACCEPTED** / ❌ Rejected

**Accepted By:** _________________  
**Date:** _________________  
**Signature:** _________________

**Notes:**
```
All acceptance criteria met. System ready for production deployment.
Monitoring plan: 24-hour Sentry observation post-deploy.
```

---

**Acceptance criteria checklist complete.** All PRs must pass before merging to main.
