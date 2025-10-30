# Unified Diffs for All Fixes

Apply these diffs with `git apply` or manually. Each diff corresponds to a PR from `PR_PLAN.md`.

---

## PR #1: .env.example Template

### New File: .env.example

```diff
--- /dev/null
+++ .env.example
@@ -0,0 +1,22 @@
+# Clerk Authentication
+# Get these from: https://dashboard.clerk.com/apps/<app-id>/api-keys
+ClerkSecretKey=sk_test_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
+ClerkPublishableKey=pk_test_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
+
+# Sentry Monitoring
+# Get DSN from: https://sentry.io/settings/projects/<project>/keys/
+SentryDSN=https://XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX@o<org>.ingest.sentry.io/<project>
+
+# OpenAI API
+# Get from: https://platform.openai.com/api-keys
+OpenAI_API_Key=sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
+
+# Anthropic Claude API
+# Get from: https://console.anthropic.com/settings/keys
+Anthropic_API_Key=sk-ant-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
+
+# Instructions:
+# 1. Copy this file to .env (do not commit .env!)
+# 2. Replace placeholder values with actual keys
+# 3. In Leap.new: Open Settings → Set each secret value
+# 4. CLI: Run `encore secret set <SecretName>` for each secret
```

### Modified File: README.md

```diff
--- README.md
+++ README.md
@@ -29,12 +29,18 @@
    ```
 
 2. **Set up environment variables**:
-   Copy `.env.example` to `.env` and fill in your API keys:
-   - Clerk Secret Key
-   - OpenAI API Key
-   - Anthropic API Key
+   ```bash
+   # Option 1: Using Leap.new Settings UI
+   # Open Settings in sidebar → Add secrets
+   
+   # Option 2: Using Encore CLI
+   encore secret set ClerkSecretKey
+   encore secret set ClerkPublishableKey
+   encore secret set SentryDSN
+   encore secret set OpenAI_API_Key
+   encore secret set Anthropic_API_Key
+   ```
 
-3. **Configure Clerk**:
-   Update `frontend/config.ts` with your Clerk publishable key
+   See `.env.example` for details on where to obtain each key.
 
 4. **Run the application**:
```

---

## PR #2: Vite Base Path & Encore Static Service

### Modified File: frontend/vite.config.ts

```diff
--- frontend/vite.config.ts
+++ frontend/vite.config.ts
@@ -5,6 +5,7 @@ import react from '@vitejs/plugin-react'
 
 export default defineConfig({
+  base: '/frontend/',
   resolve: {
     alias: {
       '@': path.resolve(__dirname),
```

### New File: backend/frontend/encore.service.ts

```diff
--- /dev/null
+++ backend/frontend/encore.service.ts
@@ -0,0 +1 @@
+{"name": "frontend"}
```

### New File: backend/frontend/static.ts

```diff
--- /dev/null
+++ backend/frontend/static.ts
@@ -0,0 +1,7 @@
+import { api } from "encore.dev/api";
+
+export const serveFrontend = api.static(
+  { path: "/frontend/*path", dir: "./dist" },
+);
+
+export {};
```

### Modified File: backend/package.json

```diff
--- backend/package.json
+++ backend/package.json
@@ -4,7 +4,7 @@
   "type": "module",
   "packageManager": "bun",
   "scripts": {
-    "test": "vitest"
+    "test": "vitest",
+    "build": "cd ../frontend && bun install && vite build --outDir ../backend/frontend/dist"
   },
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

---

## PR #3: Vitest Environment Fix

### Modified File: frontend/vitest.config.ts

```diff
--- frontend/vitest.config.ts
+++ frontend/vitest.config.ts
@@ -4,7 +4,7 @@ import path from 'path';
 export default defineConfig({
   test: {
     globals: true,
-    environment: 'happy-dom',
+    environment: 'jsdom',
     include: ['tests/**/*.test.tsx'],
     exclude: ['node_modules', 'dist', 'build'],
     restoreMocks: true,
```

### Modified File: frontend/package.json

```diff
--- frontend/package.json
+++ frontend/package.json
@@ -26,8 +26,7 @@
     "react-dom": "^19.1.0",
     "react-router-dom": "^7.6.3",
     "tailwind-merge": "^3.2.0",
-    "tailwindcss": "^4.1.11",
-    "vitest": "^3.0.9"
+    "tailwindcss": "^4.1.11"
   },
   "devDependencies": {
     "@tailwindcss/oxide": "^4.1.11",
@@ -37,6 +36,7 @@
     "@types/react-dom": "^19.1.6",
     "@vitejs/plugin-react": "^4.6.0",
     "lightningcss": "^1.29.2",
+    "jsdom": "^25.0.0",
     "tw-animate-css": "^1.3.4",
     "typescript": "^5.8.3",
     "vite": "^6.2.5",
```

---

## PR #4: Sentry Hardening & Source Maps

### Modified File: backend/monitoring/sentry.ts

```diff
--- backend/monitoring/sentry.ts
+++ backend/monitoring/sentry.ts
@@ -6,8 +6,8 @@ const sentryDsn = secret("SentryDSN");
 
 Sentry.init({
   dsn: sentryDsn(),
-  tracesSampleRate: 1.0,
-  sendDefaultPii: true,
+  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
+  sendDefaultPii: false,
   environment: process.env.NODE_ENV || "development",
   beforeSend(event) {
     if (event.request?.headers) {
```

### Modified File: frontend/tsconfig.json

```diff
--- frontend/tsconfig.json
+++ frontend/tsconfig.json
@@ -11,6 +11,7 @@
     "skipLibCheck": true,
     "strict": true,
     "noEmit": true,
+    "sourceMap": true,
     "esModuleInterop": true,
     "module": "esnext",
     "moduleResolution": "bundler",
```

---

## PR #5: GitHub Actions CI Pipeline

### New File: .github/workflows/ci.yml

```diff
--- /dev/null
+++ .github/workflows/ci.yml
@@ -0,0 +1,80 @@
+name: CI
+
+on:
+  push:
+    branches: [main]
+  pull_request:
+    branches: [main]
+
+jobs:
+  test-and-build:
+    runs-on: ubuntu-latest
+    
+    steps:
+      - name: Checkout code
+        uses: actions/checkout@v4
+
+      - name: Setup Bun
+        uses: oven-sh/setup-bun@v1
+        with:
+          bun-version: latest
+
+      - name: Install backend dependencies
+        working-directory: ./backend
+        run: |
+          bun install
+          bun pm trust
+
+      - name: Install frontend dependencies
+        working-directory: ./frontend
+        run: |
+          bun install
+          bun pm trust
+
+      - name: Run backend tests
+        working-directory: ./backend
+        run: bun test
+        env:
+          NODE_ENV: test
+
+      - name: Run frontend tests with coverage
+        working-directory: ./frontend
+        run: bun x vitest run --coverage
+        env:
+          NODE_ENV: test
+
+      - name: Build frontend
+        working-directory: ./backend
+        run: bun run build
+
+      - name: Verify build artifacts
+        run: |
+          if [ ! -f "backend/frontend/dist/index.html" ]; then
+            echo "Error: index.html not found in build output"
+            exit 1
+          fi
+          if [ ! -d "backend/frontend/dist/assets" ]; then
+            echo "Error: assets directory not found in build output"
+            exit 1
+          fi
+          echo "Build artifacts verified successfully"
+
+      - name: Upload build artifacts
+        uses: actions/upload-artifact@v4
+        with:
+          name: frontend-build
+          path: backend/frontend/dist/
+          retention-days: 7
+
+      - name: Upload coverage reports
+        uses: actions/upload-artifact@v4
+        if: always()
+        with:
+          name: coverage-reports
+          path: |
+            frontend/coverage/
+            backend/coverage/
+          retention-days: 30
+
+      - name: Test summary
+        run: echo "✅ All tests passed and build artifacts generated"
```

---

## PR #6: Rate Limiting Documentation

### Modified File: backend/security/ratelimit.ts

```diff
--- backend/security/ratelimit.ts
+++ backend/security/ratelimit.ts
@@ -15,6 +15,12 @@ interface RateLimitEntry {
   firstRequest: number;
 }
 
+/**
+ * In-Memory Rate Limiter
+ * 
+ * NOTE: This implementation uses in-memory storage and does NOT scale horizontally.
+ * For multi-instance deployments, migrate to Redis-backed storage.
+ * See docs/RATE_LIMITING.md for migration guide.
+ */
 export class RateLimiter {
   private requests = new Map<string, RateLimitEntry>();
   private config: RateLimitConfig;
```

### New File: docs/RATE_LIMITING.md

```diff
--- /dev/null
+++ docs/RATE_LIMITING.md
@@ -0,0 +1,120 @@
+# Rate Limiting: Scaling & Migration Guide
+
+## Current Implementation
+
+The application uses **in-memory** rate limiting via `Map<string, RateLimitEntry>` in `backend/security/ratelimit.ts`.
+
+### Limitations
+
+1. **Single-Instance Only:** Each backend instance maintains its own isolated state
+2. **No Shared State:** Horizontal scaling breaks rate limits (user can bypass by hitting different instances)
+3. **Memory Consumption:** Large user bases accumulate entries (cleaned every 60s)
+4. **No Persistence:** Limits reset on server restart
+
+### When to Migrate
+
+Migrate to Redis when:
+- Deploying more than 1 backend instance
+- Rate limits must survive restarts
+- User base exceeds 10,000 active users
+- Stricter enforcement required (security-critical APIs)
+
+---
+
+## Redis Migration Plan
+
+### 1. Choose Redis Provider
+
+**Recommended:** Upstash Redis (serverless, global replication)
+
+```bash
+# Install SDK
+bun add @upstash/redis
+```
+
+**Alternatives:**
+- AWS ElastiCache
+- Redis Cloud
+- Self-hosted Redis
+
+### 2. Update RateLimiter Implementation
+
+```typescript
+import { Redis } from '@upstash/redis';
+import { secret } from 'encore.dev/config';
+
+const redisUrl = secret("RedisURL");
+const redisToken = secret("RedisToken");
+
+export class RedisRateLimiter {
+  private redis: Redis;
+  private config: RateLimitConfig;
+
+  constructor(config: RateLimitConfig) {
+    this.redis = new Redis({
+      url: redisUrl(),
+      token: redisToken(),
+    });
+    this.config = config;
+  }
+
+  async checkLimit(userId: string, endpoint: string): Promise<{
+    allowed: boolean;
+    remaining: number;
+    resetTime: number;
+    limit: number;
+  }> {
+    const key = `ratelimit:${userId}:${endpoint}`;
+    const now = Date.now();
+    const windowStart = now - this.config.windowMs;
+
+    // Remove expired entries
+    await this.redis.zremrangebyscore(key, 0, windowStart);
+
+    // Count requests in current window
+    const count = await this.redis.zcard(key);
+    const allowed = count < this.config.maxRequests;
+
+    if (allowed) {
+      // Add current request with timestamp as score
+      await this.redis.zadd(key, { score: now, member: `${now}` });
+      // Set expiration on key (window + buffer)
+      await this.redis.expire(key, Math.ceil(this.config.windowMs / 1000) + 60);
+    }
+
+    const remaining = Math.max(0, this.config.maxRequests - count - (allowed ? 1 : 0));
+    const resetTime = now + this.config.windowMs;
+
+    return { allowed, remaining, resetTime, limit: this.config.maxRequests };
+  }
+
+  async reset(userId: string, endpoint?: string): Promise<void> {
+    if (endpoint) {
+      await this.redis.del(`ratelimit:${userId}:${endpoint}`);
+    } else {
+      // Delete all keys for user (requires SCAN)
+      const pattern = `ratelimit:${userId}:*`;
+      const keys = await this.redis.keys(pattern);
+      if (keys.length > 0) {
+        await this.redis.del(...keys);
+      }
+    }
+  }
+}
+```
+
+### 3. Performance Comparison
+
+| Metric | In-Memory | Redis (Upstash) |
+|--------|-----------|-----------------|
+| Latency | <1ms | 10-30ms (global) |
+| Throughput | ~100k req/s | ~10k req/s |
+| Scalability | Single instance | Unlimited instances |
+| Persistence | None | Durable |
+| Cost | Free | ~$10/mo base |
+
+### 4. Migration Checklist
+
+- [ ] Provision Redis instance (Upstash/ElastiCache)
+- [ ] Add `RedisURL` and `RedisToken` secrets
+- [ ] Replace `RateLimiter` with `RedisRateLimiter` in `security.ts`
+- [ ] Update tests to mock Redis client
+- [ ] Deploy canary instance with Redis
+- [ ] Monitor error rates and latency
+- [ ] Gradually roll out to all instances
+- [ ] Remove old in-memory implementation
+
+### 5. Rollback Plan
+
+If Redis migration causes issues:
+
+```bash
+git revert <migration-commit>
+# Redeploy previous version
+# In-memory limits resume immediately
+```
+
+---
+
+## Testing Redis Rate Limiter
+
+```typescript
+// backend/tests/redis-ratelimit.test.ts
+import { describe, it, expect, beforeEach } from 'vitest';
+import { RedisRateLimiter } from '../security/ratelimit';
+
+describe('RedisRateLimiter', () => {
+  let limiter: RedisRateLimiter;
+
+  beforeEach(() => {
+    limiter = new RedisRateLimiter({
+      windowMs: 60000,
+      maxRequests: 10,
+    });
+  });
+
+  it('allows requests under limit', async () => {
+    const result = await limiter.checkLimit('user1', '/api/test');
+    expect(result.allowed).toBe(true);
+    expect(result.remaining).toBe(9);
+  });
+
+  it('blocks requests over limit', async () => {
+    // Make 10 requests
+    for (let i = 0; i < 10; i++) {
+      await limiter.checkLimit('user1', '/api/test');
+    }
+    
+    // 11th request should be blocked
+    const result = await limiter.checkLimit('user1', '/api/test');
+    expect(result.allowed).toBe(false);
+    expect(result.remaining).toBe(0);
+  });
+
+  it('resets limits after window expires', async () => {
+    // Implementation depends on time-mocking strategy
+  });
+});
+```
+
+---
+
+## Questions?
+
+- Redis latency too high? → Use regional deployment or cache locally
+- Cost concerns? → Start with smallest tier, scale as needed
+- Need stricter limits? → Combine with IP-based blocking (Cloudflare)
+
+**End of Rate Limiting Guide**
```

---

## Application Instructions

### Option 1: Git Apply (Recommended)

```bash
# Save each diff section to separate files
cat > pr1-env.diff << 'EOF'
[paste PR #1 diff]
EOF

cat > pr2-vite.diff << 'EOF'
[paste PR #2 diff]
EOF

# Apply in sequence
git apply pr1-env.diff
git apply pr2-vite.diff
# ... repeat for all PRs

# Commit each PR
git add .env.example README.md
git commit -m "feat: add .env.example for secrets documentation"

git add frontend/vite.config.ts backend/frontend/
git commit -m "fix: align Vite base path with Encore static service"
```

### Option 2: Manual Application

1. Open each file in editor
2. Apply changes as shown in diff (- = remove, + = add)
3. Save files
4. Test changes
5. Commit

### Verification After Each PR

```bash
# PR #1
cat .env.example

# PR #2
cd backend && bun run build
ls backend/frontend/dist/

# PR #3
cd frontend && bun x vitest run

# PR #4
cat backend/monitoring/sentry.ts | grep tracesSampleRate

# PR #5
git push origin <branch>
# Check GitHub Actions

# PR #6
cat docs/RATE_LIMITING.md
```

---

**All diffs ready for application.** Proceed with PR workflow from `PR_PLAN.md`.
