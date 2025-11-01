DROP TABLE IF EXISTS migration_checksums CASCADE;

DROP FUNCTION IF EXISTS refresh_idea_comparison_metrics();

DROP INDEX IF EXISTS idx_ideas_title_hash_owner;
DROP INDEX IF EXISTS idx_user_feedback_user_created;
DROP INDEX IF EXISTS idx_exports_user_created;
DROP INDEX IF EXISTS idx_ideas_owner_created;
DROP INDEX IF EXISTS idx_ideas_owner_updated;

DROP MATERIALIZED VIEW IF EXISTS idea_comparison_metrics CASCADE;
