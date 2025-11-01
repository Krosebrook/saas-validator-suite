# Deployment Guide

## Overview

This application is deployed using Encore's built-in deployment system with automatic builds and migrations.

## Environments

### Development
- Local development environment
- Auto-reload on file changes
- Uses ephemeral database (optional)

### Staging
- Pre-production testing environment
- Mirrors production configuration
- Used for final validation

### Production
- Live environment
- Requires manual approval for migrations
- Monitored with Sentry and logs

## Deployment Process

### Automatic Deployment

Encore automatically deploys on:
- Git push to `main` branch (production)
- Git push to `develop` branch (staging)

### Manual Deployment

To deploy manually:

```bash
git push encore main
```

## Pre-Deployment Checklist

- [ ] All tests passing (`bun test`)
- [ ] TypeScript compilation clean (`tsc --noEmit`)
- [ ] Migrations tested with rollback
- [ ] Environment variables configured
- [ ] Secrets set in Encore dashboard
- [ ] Rate limits configured for plan tiers
- [ ] Sentry DSN configured
- [ ] Database backups enabled

## Migration Strategy

### Staging
1. Deploy to staging
2. Run migrations automatically
3. Verify functionality
4. Test rollback procedure

### Production
1. Create database backup
2. Deploy code (migrations on hold)
3. Review migration plan:
   ```bash
   encore db migrate --dry-run
   ```
4. Apply migrations:
   ```bash
   encore db migrate
   ```
5. Monitor logs and errors
6. Verify critical paths
7. Keep rollback scripts ready

## Configuration

### Environment Variables

Configure in Encore dashboard or Settings:

**Required:**
- `DATABASE_URL` - PostgreSQL connection (auto-configured)
- `CLERK_SECRET_KEY` - Authentication

**Optional:**
- `SENTRY_DSN` - Error tracking
- `REDIS_URL` - Rate limiting (auto-configured by Encore)
- `EMAIL_API_KEY` - Digest emails (Resend/SES)
- `NOTION_CLIENT_SECRET` - Notion integration
- `SLACK_BOT_TOKEN` - Slack integration

### Secrets Management

All secrets are stored in Encore's secret management system:

```bash
encore secret set CLERK_SECRET_KEY
encore secret set SENTRY_DSN
```

Never commit secrets to the repository.

## Monitoring

### Logs

View logs in real-time:
```bash
encore logs --env=production
```

Filter by service:
```bash
encore logs --service=scraper --env=production
```

### Error Tracking

- Sentry dashboard: Monitor errors and performance
- Set up alerts for critical errors
- Review error trends weekly

### Performance

- Monitor Core Web Vitals in `perf` service logs
- Check materialized view refresh times
- Review slow query logs (queries > 1s)
- Monitor rate limit hit rates

### Database

- Connection pool usage
- Query performance (EXPLAIN ANALYZE)
- Index usage statistics
- Table bloat metrics

## Rollback Procedures

### Code Rollback

```bash
git revert HEAD
git push encore main
```

### Database Rollback

See MIGRATIONS.md for detailed rollback procedures.

Quick rollback:
```bash
encore db shell < backend/db/migrations/XXX_migration.down.sql
```

## Scaling

### Horizontal Scaling

Encore automatically scales based on load:
- API instances scale up/down
- Database connection pooling via PgBouncer
- Redis cache for rate limiting

### Vertical Scaling

Adjust instance sizes in Encore dashboard:
- Small: Development/staging
- Medium: Production (< 1000 users)
- Large: Production (> 1000 users)

### Database Scaling

- Enable read replicas for heavy read workloads
- Use materialized views for complex queries
- Partition large tables (> 10M rows)
- Consider sharding for multi-tenant scale

## Health Checks

Encore provides built-in health checks at:
- `/_encore/health` - Overall health
- `/_encore/healthz` - Kubernetes-compatible

Custom health checks can monitor:
- Database connectivity
- Redis availability
- External API dependencies
- Queue depths

## Disaster Recovery

### Backups

- Automatic daily backups (retained 30 days)
- Point-in-time recovery (7 days)
- Manual snapshots before major changes

### Recovery Procedures

1. **Database corruption:**
   - Restore from latest backup
   - Apply migrations from backup point
   - Verify data integrity

2. **Application failure:**
   - Check logs for errors
   - Rollback recent deployment
   - Scale up resources if needed

3. **Data loss:**
   - Restore from backup
   - Replay event logs (if available)
   - Notify affected users

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs:

1. **Install** - `bun install --frozen-lockfile`
2. **Lint** - ESLint and type checking
3. **Test** - Unit and integration tests
4. **Build** - Production build
5. **OpenAPI** - Generate and lint spec
6. **Migrate** - Dry-run migrations
7. **Package** - Create deployment artifact

All steps must pass before deployment.

## Post-Deployment

1. **Verify deployment:**
   - Check health endpoint
   - Test critical user flows
   - Review error rates in Sentry

2. **Monitor for 30 minutes:**
   - Watch logs for errors
   - Check performance metrics
   - Monitor user feedback

3. **Document:**
   - Update changelog
   - Note any issues encountered
   - Share deployment summary with team

## Troubleshooting

### Deployment Failed

Check build logs:
```bash
encore logs --build --env=production
```

Common issues:
- TypeScript errors
- Missing dependencies
- Migration conflicts

### Service Not Starting

1. Check service logs
2. Verify environment variables
3. Test database connectivity
4. Review recent code changes

### High Error Rate

1. Check Sentry for error patterns
2. Review recent deployments
3. Check external service status
4. Consider rollback if critical
