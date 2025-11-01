# Migration Guide

## Overview

This project uses numbered SQL migration files with up/down scripts for schema changes.

## Migration Files

Migrations are located in `backend/db/migrations/`:

- `001_create_tables.up.sql` / `001_create_tables.down.sql` - Initial schema
- `002_add_startup_analysis.up.sql` / `002_add_startup_analysis.down.sql` - Startup analysis
- `003_scraper_enrichment_schemas.up.sql` / `003_scraper_enrichment_schemas.down.sql` - Scraper & enrichment
- `004_gamification_integrations.up.sql` / `004_gamification_integrations.down.sql` - Gamification & integrations
- `005_materialized_views_indexes.up.sql` / `005_materialized_views_indexes.down.sql` - Performance optimizations

## Applying Migrations

Migrations are automatically applied when running:
```bash
encore run
```

To manually apply migrations:
```bash
encore db migrate
```

## Rolling Back Migrations

### Dry Run
Before rolling back, perform a dry run to see what will happen:

```bash
encore db shell -- -c "SELECT * FROM migration_checksums ORDER BY applied_at DESC"
```

### Rollback Single Migration

To rollback the most recent migration:

```bash
encore db shell < backend/db/migrations/005_materialized_views_indexes.down.sql
```

Then remove the checksum:
```bash
encore db shell -- -c "DELETE FROM migration_checksums WHERE migration_name = '005_materialized_views_indexes'"
```

### Rollback Multiple Migrations

Rollback migrations in reverse order:

```bash
encore db shell < backend/db/migrations/005_materialized_views_indexes.down.sql
encore db shell < backend/db/migrations/004_gamification_integrations.down.sql
encore db shell < backend/db/migrations/003_scraper_enrichment_schemas.down.sql
```

Update checksums:
```bash
encore db shell -- -c "DELETE FROM migration_checksums WHERE migration_name IN ('003_scraper_enrichment_schemas', '004_gamification_integrations', '005_materialized_views_indexes')"
```

## Migration Checksums

Each migration has a checksum stored in `migration_checksums` table to verify integrity.

View current checksums:
```bash
encore db shell -- -c "SELECT * FROM migration_checksums"
```

## Creating New Migrations

1. Create numbered migration files:
```bash
touch backend/db/migrations/006_my_feature.up.sql
touch backend/db/migrations/006_my_feature.down.sql
```

2. Write up script in `006_my_feature.up.sql`:
```sql
ALTER TABLE ideas ADD COLUMN new_field TEXT;
CREATE INDEX idx_ideas_new_field ON ideas(new_field);
```

3. Write corresponding down script in `006_my_feature.down.sql`:
```sql
DROP INDEX IF EXISTS idx_ideas_new_field;
ALTER TABLE ideas DROP COLUMN IF EXISTS new_field;
```

4. Add checksum entry:
```sql
INSERT INTO migration_checksums (migration_name, checksum) VALUES
  ('006_my_feature', '') ON CONFLICT (migration_name) DO NOTHING;
```

5. Test both directions:
```bash
encore db shell < backend/db/migrations/006_my_feature.up.sql
encore db shell < backend/db/migrations/006_my_feature.down.sql
encore db shell < backend/db/migrations/006_my_feature.up.sql
```

## Best Practices

1. **Always create both up and down scripts**
2. **Test rollback before deploying** - Run up, then down, then up again
3. **Use IF EXISTS/IF NOT EXISTS** - Makes scripts idempotent
4. **Lock tables carefully** - Avoid locking during peak hours
5. **Backup before major changes** - Always have a backup before schema changes
6. **Document breaking changes** - Note API changes in migration comments

## Emergency Rollback Procedure

If a migration causes production issues:

1. **Stop the application** (if necessary)
2. **Take database snapshot** (if supported by provider)
3. **Run rollback script**:
   ```bash
   encore db shell < backend/db/migrations/XXX_problematic.down.sql
   ```
4. **Verify data integrity**:
   ```bash
   encore db shell -- -c "SELECT COUNT(*) FROM critical_table"
   ```
5. **Update checksum table**:
   ```bash
   encore db shell -- -c "DELETE FROM migration_checksums WHERE migration_name = 'XXX_problematic'"
   ```
6. **Deploy previous version** (if code changes were included)
7. **Investigate issue** before re-attempting

## Migration Validation Checklist

Before deploying a migration to production:

- [ ] Both up and down scripts created
- [ ] Scripts tested locally (up → down → up)
- [ ] No breaking changes to existing APIs
- [ ] Indexes added for new query patterns
- [ ] Data migration preserves integrity
- [ ] Rollback tested successfully
- [ ] Performance impact assessed (use EXPLAIN)
- [ ] Backup plan documented
- [ ] Team notified of deployment window
