# Encore + Vite: Static Serving Integration Guide

**Quick reference for serving Vite SPAs from Encore.ts backend**

---

## Overview

This guide explains how to serve a Vite-built React SPA from an Encore.ts backend using the static service pattern. This approach was chosen for the SaaS Validator Suite to avoid routing conflicts and provide clear separation between API and static assets.

---

## Architecture

```
┌─────────────────────────────────────────┐
│         Encore Backend (Port 4000)       │
├─────────────────────────────────────────┤
│                                          │
│  API Routes:                             │
│  ├─ /auth/*        → Clerk auth          │
│  ├─ /ideas/*       → Ideas CRUD          │
│  ├─ /ai/*          → AI analysis         │
│  └─ ...                                  │
│                                          │
│  Static Service:                         │
│  └─ /frontend/*    → Vite SPA            │
│      ├─ /frontend/ → index.html          │
│      └─ /frontend/assets/* → JS/CSS      │
│                                          │
└─────────────────────────────────────────┘
```

---

## Implementation Steps

### 1. Configure Vite Base Path

Tell Vite to emit assets with `/frontend/` prefix instead of root `/`.

**File:** `frontend/vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/frontend/',  // ← ADD THIS
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
      '~backend/client': path.resolve(__dirname, './client'),
      '~backend': path.resolve(__dirname, '../backend'),
    },
  },
  plugins: [tailwindcss(), react()],
  mode: "development",
  build: {
    minify: false,
    outDir: '../backend/frontend/dist',  // ← Build into backend/
  }
})
```

**Key Points:**
- `base: '/frontend/'` – All asset paths will use this prefix
- `outDir: '../backend/frontend/dist'` – Build output location

---

### 2. Create Encore Static Service

Define a service in the backend to serve the built SPA.

**File:** `backend/frontend/encore.service.ts`

```json
{"name": "frontend"}
```

**File:** `backend/frontend/static.ts`

```typescript
import { api } from "encore.dev/api";

// Serve all files under /frontend/* from the ./dist directory
export const serveFrontend = api.static(
  { path: "/frontend/*path", dir: "./dist" }
);

// Required export for Encore service
export {};
```

**Key Points:**
- `path: "/frontend/*path"` – Catch-all route for SPA
- `dir: "./dist"` – Relative to `backend/frontend/` directory
- Must export something for Encore to recognize as a service

---

### 3. Update Build Script

Add a build command to compile the frontend from the backend directory.

**File:** `backend/package.json`

```json
{
  "scripts": {
    "test": "vitest",
    "build": "cd ../frontend && bun install && vite build --outDir ../backend/frontend/dist"
  }
}
```

**Usage:**
```bash
cd backend
bun run build
```

This will:
1. Install frontend dependencies
2. Run Vite build
3. Output to `backend/frontend/dist/`

---

### 4. Verify Build Output

After building, check the output structure:

```bash
ls -R backend/frontend/dist/

# Expected output:
backend/frontend/dist/:
index.html
assets/

backend/frontend/dist/assets/:
index-abc123.js
index-abc123.css
```

**Inspect index.html:**
```bash
cat backend/frontend/dist/index.html
```

**Should contain:**
```html
<!DOCTYPE html>
<html>
  <head>
    <!-- Assets use /frontend/ prefix -->
    <link rel="stylesheet" href="/frontend/assets/index-abc123.css">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/frontend/assets/index-abc123.js"></script>
  </body>
</html>
```

**Should NOT contain:**
```html
<!-- WRONG: Missing /frontend/ prefix -->
<script src="/assets/index-abc123.js"></script>
```

---

## Testing the Integration

### Local Development

```bash
# Terminal 1: Run Encore backend
encore run

# Expected output includes:
# - frontend        http://localhost:4000/frontend

# Terminal 2: Test endpoints
curl http://localhost:4000/frontend/
# Should return: <!DOCTYPE html>...

curl -I http://localhost:4000/frontend/assets/index-abc123.js
# Should return: 200 OK, Content-Type: application/javascript
```

### Browser Verification

1. **Open DevTools** (F12) → Network tab
2. **Navigate to:** `http://localhost:4000/frontend/`
3. **Check requests:**
   - `/frontend/` → 200 (index.html)
   - `/frontend/assets/index-*.js` → 200 (JavaScript)
   - `/frontend/assets/index-*.css` → 200 (CSS)

**✅ Success:** All assets load with 200 status  
**❌ Failure:** 404 errors, or HTML returned for JS/CSS

---

## Common Issues & Solutions

### Issue 1: Assets Return 404

**Symptom:**
```
GET /assets/index-abc123.js → 404 Not Found
```

**Cause:** Vite `base` not configured (assets use `/assets/` instead of `/frontend/assets/`)

**Fix:**
```typescript
// frontend/vite.config.ts
export default defineConfig({
  base: '/frontend/',  // ← Add this
  // ...
})
```

Then rebuild:
```bash
cd backend && bun run build
```

---

### Issue 2: HTML Served for API Endpoints

**Symptom:**
```
Error: Unexpected token '<', "<!DOCTYPE ..." is not valid JSON
```

**Cause:** Static service catch-all is matching API routes

**Fix:** Ensure static path is specific:
```typescript
// ✅ CORRECT: Specific path
{ path: "/frontend/*path", dir: "./dist" }

// ❌ WRONG: Too broad (matches everything)
{ path: "/*path", dir: "./dist" }
```

---

### Issue 3: SPA Routing (404 on Refresh)

**Symptom:** Refreshing `/frontend/dashboard` returns 404

**Cause:** Encore doesn't know to serve `index.html` for non-root paths

**Fix:** Use `api.static()` which handles SPA routing automatically:
```typescript
export const serveFrontend = api.static(
  { path: "/frontend/*path", dir: "./dist" }
  // Encore automatically serves index.html for missing files
);
```

---

### Issue 4: Assets Cached After Rebuild

**Symptom:** Changes not visible after rebuild

**Fix:**
```bash
# Clear browser cache
# Chrome: Ctrl+Shift+Delete → Clear cached images and files

# Or disable cache in DevTools:
# Network tab → Disable cache checkbox (keep DevTools open)
```

---

## Production Deployment

### Build Command

```bash
cd backend
bun run build
```

**Output:** `backend/frontend/dist/` ready for deployment

### Deployment Checklist

- [ ] `backend/frontend/dist/` exists
- [ ] `index.html` present
- [ ] `assets/` directory contains JS/CSS
- [ ] Asset paths use `/frontend/` prefix
- [ ] No hardcoded localhost URLs in code
- [ ] Environment variables set (Clerk, Sentry, etc.)

### Encore Deployment

```bash
# Deploy to Encore Cloud
git push origin main

# Encore automatically:
# 1. Detects frontend service
# 2. Serves static files from /frontend/*
# 3. Routes API requests to backend services
```

---

## Advanced Configuration

### Custom Index.html

If you need a custom template:

**File:** `frontend/index.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SaaS Validator Suite</title>
    
    <!-- Vite will inject assets here with /frontend/ prefix -->
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>
```

Vite automatically:
- Resolves `/main.tsx` relative to `frontend/`
- Adds hash to filenames (`index-abc123.js`)
- Injects links/scripts into `<head>` and `<body>`

---

### Multiple SPAs

To serve multiple SPAs (e.g., admin panel):

```typescript
// backend/admin/static.ts
export const serveAdmin = api.static(
  { path: "/admin/*path", dir: "./dist" }
);

// backend/frontend/static.ts
export const serveFrontend = api.static(
  { path: "/frontend/*path", dir: "./dist" }
);
```

Then build each separately:
```bash
# Frontend
cd frontend && vite build --outDir ../backend/frontend/dist

# Admin
cd admin && vite build --outDir ../backend/admin/dist --base /admin/
```

---

## Alternative: Serve SPA at Root

If you prefer serving SPA at `/` instead of `/frontend/`:

### Option A: API Prefix

**Pros:** Cleaner URLs for SPA  
**Cons:** Must prefix all API routes

```typescript
// Move all APIs under /api/*
export const createIdea = api(
  { method: "POST", path: "/api/ideas", expose: true },
  // ...
);

// Serve SPA at root
export const serveFrontend = api.static(
  { path: "/*path", dir: "./dist" }
);
```

**Vite config:**
```typescript
export default defineConfig({
  base: '/',  // Default
  // ...
})
```

### Option B: Route Priority

**Not recommended** – Complex routing logic, hard to debug

---

## Comparison: Strategies

| Aspect | Strategy A (this guide) | Strategy B (root SPA) |
|--------|------------------------|----------------------|
| SPA URL | `/frontend/` | `/` |
| API URLs | `/auth`, `/ideas` | `/api/auth`, `/api/ideas` |
| Vite base | `/frontend/` | `/` |
| Conflicts | None | Must prefix all APIs |
| Rollback | Easy | Requires API changes |
| **Recommended** | ✅ **Yes** | ⚠️ If needed |

---

## Troubleshooting Checklist

Run through this checklist if integration fails:

- [ ] `frontend/vite.config.ts` has `base: '/frontend/'`
- [ ] `backend/frontend/encore.service.ts` exists with `{"name": "frontend"}`
- [ ] `backend/frontend/static.ts` exports `api.static({ path: "/frontend/*path", dir: "./dist" })`
- [ ] `backend/package.json` has build script
- [ ] `backend/frontend/dist/` exists and contains `index.html`
- [ ] `index.html` references assets with `/frontend/` prefix
- [ ] Encore shows `frontend` service in startup logs
- [ ] Browser DevTools Network tab shows 200 for all assets
- [ ] No 404 errors in browser console
- [ ] No "Unexpected token '<'" errors

If all checked and still broken:
1. Delete `backend/frontend/dist/` and rebuild
2. Clear browser cache completely
3. Restart Encore (`encore run`)
4. Check for typos in file paths

---

## References

- **Encore Static Assets:** https://encore.dev/docs/develop/static-assets
- **Vite Public Base Path:** https://vitejs.dev/guide/build.html#public-base-path
- **SPA Routing:** https://encore.dev/docs/how-to/spa-routing

---

**Integration guide complete.** For issues specific to this project, see `REPORT.md`.
