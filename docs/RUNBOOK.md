# Runbook

## Local Development

### Prerequisites
- Bun installed (latest version)
- PostgreSQL with pgvector extension
- Redis (optional, for rate limiting)

### Environment Setup

1. Install dependencies:
```bash
cd backend && bun install
cd ../frontend && bun install
```

2. Set up secrets (use Leap Settings in sidebar):
- `CLERK_SECRET_KEY` - Clerk authentication
- `SENTRY_DSN` - Sentry error tracking (optional)
- Database connection string (auto-configured by Encore)

### Running Locally

Encore automatically runs the application with:
```bash
encore run
```

This will:
- Start the backend API server
- Start the frontend dev server
- Run database migrations
- Watch for file changes

### Database Seeds

To seed the database with test data:

```bash
encore db shell -- -c "
INSERT INTO sources (name, type, config, enabled) VALUES 
  ('TechCrunch RSS', 'rss', '{\"url\": \"https://techcrunch.com/feed/\"}', true),
  ('Product Hunt API', 'api', '{\"url\": \"https://api.producthunt.com/v2/posts\", \"idField\": \"id\", \"titleField\": \"name\"}', true);

INSERT INTO validation_dimensions (key, label, weight) VALUES
  ('problem_severity', 'Problem Severity', 12),
  ('customer_urgency', 'Customer Urgency', 12),
  ('frequency', 'Frequency', 13),
  ('willingness_to_pay', 'Willingness to Pay', 13),
  ('tam_reachability', 'TAM/Reachability', 13),
  ('competitive_intensity', 'Competitive Intensity', 12),
  ('execution_feasibility', 'Execution Feasibility', 13),
  ('regulatory_risk', 'Regulatory Risk', 12)
ON CONFLICT (key) DO NOTHING;
"
```

### Common Commands

- **Run scraper**: Call `POST /scraper/run`
- **Enrich items**: Call `POST /enrichment/run`
- **Validate idea**: Call `POST /validation/score` with ideaId and dimensions
- **Generate PDF**: Call `POST /compose/onepager/:ideaId`
- **Compare ideas**: Call `POST /compare/ideas` with ideaIds array

### Troubleshooting

#### Scraper not finding items
- Check source configuration in database
- Verify URL is accessible
- Check logs for rate limiting or parsing errors

#### Enrichment stuck
- Check `enrich_jobs` table for failed jobs
- Review error messages in `errors` column
- Re-run failed jobs with `POST /enrichment/run?itemId=X`

#### Rate limit errors
- Check Redis connectivity
- Verify user plan tier
- Adjust limits in `backend/platform/ratelimit.ts`

#### Migration issues
- Check `migration_checksums` table
- Review migration logs
- See MIGRATIONS.md for rollback procedures

## Monitoring

### Logs
- All logs are JSON-formatted with Pino-style structure
- Structured fields: `ts`, `level`, `reqId`, `userId`, `method`, `path`, `status`, `latencyMs`
- PII is automatically redacted

### Sentry
- Errors are automatically sent to Sentry
- Configure DSN in Settings
- View traces and performance in Sentry dashboard

### Database Performance
- Query materialized views regularly: `SELECT refresh_idea_comparison_metrics()`
- Monitor slow queries in logs
- Check index usage with `EXPLAIN ANALYZE`

## Testing

Run all tests:
```bash
bun test
```

Run specific test file:
```bash
bun test backend/tests/scraper.test.ts
```

## Production Considerations

- Set Sentry DSN for error tracking
- Configure email provider for digests
- Set up Notion/Slack integrations
- Enable rate limiting with Redis
- Configure PgBouncer for connection pooling
- Set appropriate CORS origins
