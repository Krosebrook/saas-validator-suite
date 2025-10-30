# Quick Start: Fix Implementation

**TL;DR for developers who want to apply fixes immediately**

---

## Prerequisites (5 min)

```bash
# 1. Ensure clean working directory
git status
# Should show: "nothing to commit, working tree clean"

# 2. Create feature branch
git checkout -b fix/audit-2025-10-30

# 3. Verify Bun installed
bun --version
# Should show: 1.x.x or later
```

---

## Apply All Fixes (30 min)

### Option 1: Manual File Edits (Recommended)

Open `DIFFS.md` and apply changes to each file shown.

**Faster:** Use your IDE's multi-cursor or find-replace features.

### Option 2: Git Apply (Advanced)

```bash
# Extract diffs from DIFFS.md (manual step)
# Then apply each:
git apply pr1-env.diff
git apply pr2-vite.diff
# ... etc.
```

---

## Critical File Changes

### 1. Add Vite Base Path (1 min)

**File:** `frontend/vite.config.ts`

```diff
 export default defineConfig({
+  base: '/frontend/',
   resolve: {
```

### 2. Create Static Service (2 min)

**File:** `backend/frontend/encore.service.ts` (NEW)
```json
{"name": "frontend"}
```

**File:** `backend/frontend/static.ts` (NEW)
```typescript
import { api } from "encore.dev/api";

export const serveFrontend = api.static(
  { path: "/frontend/*path", dir: "./dist" }
);

export {};
```

### 3. Fix Vitest Environment (1 min)

**File:** `frontend/vitest.config.ts`

```diff
   test: {
     globals: true,
-    environment: 'happy-dom',
+    environment: 'jsdom',
     include: ['tests/**/*.test.tsx'],
```

**File:** `frontend/package.json`

```diff
   "devDependencies": {
     // ...
+    "jsdom": "^25.0.0",
```

### 4. Harden Sentry (2 min)

**File:** `backend/monitoring/sentry.ts`

```diff
 Sentry.init({
   dsn: sentryDsn(),
-  tracesSampleRate: 1.0,
-  sendDefaultPii: true,
+  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
+  sendDefaultPii: false,
   environment: process.env.NODE_ENV || "development",
```

**File:** `frontend/tsconfig.json`

```diff
     "strict": true,
     "noEmit": true,
+    "sourceMap": true,
     "esModuleInterop": true,
```

### 5. Add .env.example (3 min)

**File:** `.env.example` (NEW)

```bash
# Clerk Authentication
ClerkSecretKey=sk_test_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
ClerkPublishableKey=pk_test_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Sentry Monitoring
SentryDSN=https://XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX@o<org>.ingest.sentry.io/<project>

# OpenAI API
OpenAI_API_Key=sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Anthropic Claude API
Anthropic_API_Key=sk-ant-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### 6. Add Build Script (1 min)

**File:** `backend/package.json`

```diff
   "scripts": {
     "test": "vitest",
+    "build": "cd ../frontend && bun install && vite build --outDir ../backend/frontend/dist"
   },
```

### 7. Move Vitest to devDeps (1 min)

**File:** `backend/package.json`

```diff
   "dependencies": {
     "@clerk/backend": "^1.27.0",
     "@sentry/node": "^10.22.0",
-    "encore.dev": "^1.50.6",
-    "vitest": "^3.0.9"
+    "encore.dev": "^1.50.6"
   },
   "devDependencies": {
     "vitest": "^3.0.9"
```

**File:** `frontend/package.json`

```diff
     "react-router-dom": "^7.6.3",
     "tailwind-merge": "^3.2.0",
-    "tailwindcss": "^4.1.11",
-    "vitest": "^3.0.9"
+    "tailwindcss": "^4.1.11"
   },
   "devDependencies": {
```

---

## Install Dependencies (2 min)

```bash
# Frontend
cd frontend
bun install

# Backend
cd ../backend
bun install
```

---

## Build & Test (5 min)

```bash
# Build frontend into backend
cd backend
bun run build

# Verify output
ls backend/frontend/dist/
# Should show: index.html, assets/

# Run tests
cd backend && bun test
cd ../frontend && bun x vitest run

# Should show: All tests passed ✓
```

---

## Run & Verify (5 min)

```bash
# Start Encore
encore run

# In browser, open:
http://localhost:4000/frontend/

# Check DevTools Console:
# ✅ No errors
# ✅ No "Unexpected token '<'"
# ✅ Clerk loads successfully

# Check Network tab:
# ✅ /frontend/ → 200
# ✅ /frontend/assets/*.js → 200
# ✅ /frontend/assets/*.css → 200
```

---

## Commit (2 min)

```bash
git add .
git commit -m "fix: apply 2025-10-30 audit fixes

- Add Vite base path for /frontend/* routing
- Create Encore static service
- Fix Vitest environment (jsdom)
- Harden Sentry config (10% sampling, no PII)
- Add .env.example template
- Move vitest to devDependencies
- Enable source maps

Fixes #1-#9 from REPORT.md"

git push origin fix/audit-2025-10-30
```

---

## Create PR (3 min)

### Option 1: Single PR (All Changes)

```bash
# Open GitHub, create PR from fix/audit-2025-10-30 → main

# PR Title:
fix: apply comprehensive audit fixes (2025-10-30)

# PR Description:
Applies all 9 fixes from 2025-10-30 audit:

- ✅ Fix HTML-as-JSON error (Vite base path)
- ✅ Fix Vitest environment (jsdom)
- ✅ Harden Sentry (sampling, PII)
- ✅ Add .env.example template
- ✅ Enable source maps
- ✅ Add build script
- ✅ Move vitest to devDeps

See REPORT.md for full details.

**Testing:**
- [ ] All smoke tests passed (SMOKE.md)
- [ ] All acceptance criteria met (ACCEPTANCE.md)
- [ ] SPA loads at /frontend/
- [ ] Clerk auth works
- [ ] Tests pass (backend + frontend)
```

### Option 2: 6 Separate PRs (As Planned)

Follow `PR_PLAN.md` for detailed PR breakdown.

**Pros:** Easier to review, revert individual changes  
**Cons:** More overhead, longer timeline

**Recommendation:** Single PR for speed, unless team prefers granular review.

---

## Post-Merge Checklist (10 min)

```bash
# After PR merged to main:

# 1. Pull latest
git checkout main
git pull origin main

# 2. Set secrets (Leap.new Settings or Encore CLI)
encore secret set ClerkSecretKey
encore secret set ClerkPublishableKey
encore secret set SentryDSN
encore secret set OpenAI_API_Key
encore secret set Anthropic_API_Key

# 3. Deploy (if using Encore Cloud)
git push origin main
# Auto-deploys via Encore

# 4. Monitor Sentry (24 hours)
# Check: https://sentry.io/organizations/<org>/issues/
# Verify: Error rate stable, sampling at 10%

# 5. Verify CI
# Check: https://github.com/<org>/<repo>/actions
# Ensure: All checks pass ✓
```

---

## Troubleshooting

### Build Fails

```bash
# Clean and rebuild
rm -rf backend/frontend/dist
cd backend && bun run build

# Check for errors in:
# - Vite build output
# - TypeScript compilation
```

### Tests Fail

```bash
# Frontend tests
cd frontend
rm -rf node_modules
bun install
bun x vitest run

# Backend tests
cd backend
rm -rf node_modules
bun install
bun test
```

### Encore Won't Start

```bash
# Check for syntax errors
encore check

# Verify service files
test -f backend/frontend/encore.service.ts
test -f backend/frontend/static.ts

# Restart from clean state
encore run
```

### Assets 404 in Browser

```bash
# Verify Vite base configured
grep 'base:' frontend/vite.config.ts
# Should show: base: '/frontend/',

# Rebuild
cd backend && bun run build

# Check output
cat backend/frontend/dist/index.html | grep '/frontend/'
# Should show: /frontend/assets/...
```

---

## Rollback (if needed)

```bash
# If merged to main:
git revert <commit-sha>
git push origin main

# If on feature branch:
git checkout main
git branch -D fix/audit-2025-10-30
```

---

## Time Breakdown

| Step | Time |
|------|------|
| Prerequisites | 5 min |
| Apply file changes | 15 min |
| Install deps | 2 min |
| Build & test | 5 min |
| Run & verify | 5 min |
| Commit & PR | 5 min |
| Post-merge setup | 10 min |
| **Total** | **45-50 min** |

---

## Success Criteria (Quick Check)

Run these commands to verify success:

```bash
# 1. Files exist
test -f .env.example && echo "✓ .env.example"
test -f backend/frontend/static.ts && echo "✓ static.ts"
test -d backend/frontend/dist && echo "✓ dist/"

# 2. Config correct
grep 'base:.*frontend' frontend/vite.config.ts && echo "✓ Vite base"
grep 'jsdom' frontend/vitest.config.ts && echo "✓ Vitest env"
grep 'sendDefaultPii.*false' backend/monitoring/sentry.ts && echo "✓ Sentry"

# 3. Tests pass
cd frontend && bun x vitest run && echo "✓ Frontend tests"
cd ../backend && bun test && echo "✓ Backend tests"

# 4. Build works
cd backend && bun run build && echo "✓ Build"

# 5. Server starts
encore run &
sleep 5
curl -s http://localhost:4000/frontend/ | grep -q "<!DOCTYPE" && echo "✓ SPA loads"
```

**If all checks pass:** ✅ Implementation successful!

---

## Need More Details?

- **Full diagnosis:** `REPORT.md`
- **Step-by-step PRs:** `PR_PLAN.md`
- **All diffs:** `DIFFS.md`
- **Testing procedures:** `SMOKE.md`
- **Sign-off checklist:** `ACCEPTANCE.md`

---

**Quick start complete!** You should have all fixes applied in under 1 hour.
