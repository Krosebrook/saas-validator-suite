# Ship Growth & Validation Platform

A comprehensive SaaS validation platform with automated scraping, enrichment, 8-dimension validation, gamification, and integrations.

## Features

### Core Platform
- ✅ **Multi-Source Scraping** - RSS, API, and HTML scrapers with rate limiting and backoff
- ✅ **Enrichment Pipeline** - Readability, language detection, keyphrases, entities, sentiment, pgvector embeddings
- ✅ **8-Dimension Validation** - Configurable scoring framework with rationale generation
- ✅ **PDF Export** - One-pager generation for investor pitches
- ✅ **Comparison Dashboard** - Side-by-side idea comparison with materialized views
- ✅ **Gamification** - Leaderboards, streaks, achievements, and points
- ✅ **Integration Bus** - Webhooks for Zapier, n8n, and Slack with HMAC signatures
- ✅ **Notion Sync** - Bi-directional sync with Notion databases
- ✅ **Bulk Import** - Streaming CSV/JSONL import with de-duplication
- ✅ **Weekly Digests** - Automated email summaries via cron

### Quality & Infrastructure
- ✅ **Error Boundaries** - React error boundaries with Sentry integration
- ✅ **Structured Logging** - Pino-style JSON logs with PII redaction
- ✅ **OpenAPI Spec** - Auto-generated API documentation with Swagger UI
- ✅ **Query Optimization** - Composite indexes, materialized views, N+1 detection
- ✅ **Rate Limiting** - Redis-based distributed rate limiting with plan quotas
- ✅ **TypeScript Strict** - Full strict mode with noUncheckedIndexedAccess
- ✅ **Core Web Vitals** - Real-time tracking of CLS, LCP, INP, TTFB, FID
- ✅ **Migration System** - Rollback-ready migrations with checksums
- ✅ **CI/CD Pipeline** - Automated testing, linting, and deployment

## Architecture

### Backend (Encore.ts)
```
backend/
├── scraper/        # Multi-source adapters (RSS/API/HTML)
├── enrichment/     # NLP pipeline with pgvector
├── validation/     # 8-dimension scoring
├── compose/        # PDF/one-pager generation
├── compare/        # Comparison with materialized views
├── gamify/         # Leaderboards and streaks
├── integrations/   # Webhooks (Zapier, n8n, Slack)
├── syncs/          # Notion sync
├── imports/        # Bulk CSV/JSONL import
├── digests/        # Weekly email digests
├── platform/       # Logging & rate limiting
├── perf/           # Core Web Vitals tracking
└── db/            
    └── migrations/ # Numbered up/down SQL scripts
```

### Frontend (React + TypeScript)
```
frontend/
├── components/
│   ├── ErrorBoundary.tsx     # Error handling with Sentry
│   ├── ui/                   # shadcn/ui components
├── pages/
│   ├── Compare.tsx           # Comparison dashboard
│   ├── Dashboard.tsx         # Main dashboard
│   ├── Ideas.tsx             # Idea list
│   └── IdeaDetail.tsx        # Idea detail view
└── hooks/
    └── useWebVitals.ts       # Core Web Vitals tracking
```

## Quick Start

### Prerequisites
- Bun (latest)
- PostgreSQL with pgvector
- Redis (optional)

### Installation

1. Clone and install:
```bash
git clone <repo>
cd <repo>
```

2. Configure secrets in Leap Settings sidebar:
```
CLERK_SECRET_KEY=<your-clerk-secret>
SENTRY_DSN=<your-sentry-dsn> (optional)
```

3. Run the application:
```bash
encore run
```

Encore automatically:
- Installs dependencies
- Runs migrations
- Starts backend and frontend
- Hot-reloads on changes

### Seeding Data

```bash
encore db shell -- -c "
INSERT INTO sources (name, type, config, enabled) VALUES 
  ('TechCrunch', 'rss', '{\"url\": \"https://techcrunch.com/feed/\"}', true);
"
```

## Usage

### Scraping Ideas
```bash
curl -X POST http://localhost:4000/scraper/run
```

### Enriching Items
```bash
curl -X POST http://localhost:4000/enrichment/run
```

### Validating Ideas
```bash
curl -X POST http://localhost:4000/validation/score \
  -H "Content-Type: application/json" \
  -d '{
    "ideaId": 1,
    "dimensions": {
      "problem_severity": 80,
      "customer_urgency": 75,
      "frequency": 90,
      "willingness_to_pay": 70,
      "tam_reachability": 60,
      "competitive_intensity": 50,
      "execution_feasibility": 85,
      "regulatory_risk": 90
    }
  }'
```

### Generating PDF
```bash
curl -X POST http://localhost:4000/compose/onepager/1
```

### Comparing Ideas
```bash
curl -X POST http://localhost:4000/compare/ideas \
  -H "Content-Type: application/json" \
  -d '{"ideaIds": [1, 2, 3]}'
```

## Testing

Run all tests:
```bash
bun test
```

Run specific service tests:
```bash
bun test backend/tests/scraper.test.ts
```

## Documentation

- [**RUNBOOK.md**](docs/RUNBOOK.md) - Local development, seeds, troubleshooting
- [**MIGRATIONS.md**](docs/MIGRATIONS.md) - Migration procedures and rollback
- [**DEPLOYMENT.md**](docs/DEPLOYMENT.md) - Deployment guide for staging/production
- [**OpenAPI**](openapi/README.md) - API documentation and client generation

## Tech Stack

**Backend:**
- Encore.ts (TypeScript backend framework)
- PostgreSQL + pgvector (database with embeddings)
- Redis via Encore Cache (rate limiting)
- Pino (structured logging)
- Sentry (error tracking)

**Frontend:**
- React 18
- TypeScript (strict mode)
- TanStack Query
- Tailwind CSS v4
- shadcn/ui
- Clerk (authentication)
- web-vitals (performance monitoring)

**Infrastructure:**
- Bun (runtime and package manager)
- Vitest (testing)
- GitHub Actions (CI/CD)
- Encore Cloud (deployment)

## CI/CD

GitHub Actions workflow runs:
1. ✅ Install dependencies (frozen lockfile)
2. ✅ TypeScript type checking
3. ✅ Linting
4. ✅ Unit & integration tests
5. ✅ Build
6. ✅ OpenAPI lint (Spectral)
7. ✅ Migration dry-run
8. ✅ Package artifacts

## Security

- ✅ No secrets in code (Encore secret store)
- ✅ HMAC webhook signatures
- ✅ PII redaction in logs
- ✅ RLS (Row-Level Security) for tenant data
- ✅ Rate limiting per plan tier
- ✅ Input validation with Zod
- ✅ SQL injection prevention (parameterized queries)

## Performance

- ✅ Materialized views for hot queries
- ✅ Composite indexes on (owner_id, updated_at)
- ✅ Connection pooling via PgBouncer
- ✅ N+1 query detection
- ✅ Streaming import/export
- ✅ Redis caching for rate limits
- ✅ pgvector for similarity search

## License

MIT

## Support

- Documentation: See `/docs`
- Issues: GitHub Issues
- API Docs: `/openapi` directory
