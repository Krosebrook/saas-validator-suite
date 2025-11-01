-- Materialized view for comparison dashboard (hot metrics)
CREATE MATERIALIZED VIEW idea_comparison_metrics AS
SELECT 
  i.id,
  i.title,
  i.owner_id,
  i.score,
  i.created_at,
  iv.overall as validation_score,
  iv.dims as validation_dims,
  s.overall_score,
  s.market_potential,
  s.competition_level,
  s.technical_feasibility,
  s.monetization_potential,
  sa.viability_score as startup_viability,
  sa.market_verdict,
  sa.competitive_verdict,
  COALESCE(array_length(i.tags, 1), 0) as tag_count,
  (SELECT COUNT(*) FROM exports WHERE idea_id = i.id AND status = 'completed') as export_count
FROM ideas i
LEFT JOIN idea_validation iv ON i.id = iv.idea_id
LEFT JOIN scores s ON i.id = s.idea_id
LEFT JOIN startup_analyses sa ON i.id = sa.idea_id
WHERE i.status = 'completed';

CREATE UNIQUE INDEX idx_idea_comparison_metrics_id ON idea_comparison_metrics(id);
CREATE INDEX idx_idea_comparison_metrics_owner ON idea_comparison_metrics(owner_id);
CREATE INDEX idx_idea_comparison_metrics_score ON idea_comparison_metrics(score DESC NULLS LAST);
CREATE INDEX idx_idea_comparison_metrics_validation ON idea_comparison_metrics(validation_score DESC NULLS LAST);

-- Composite indexes for query optimization
CREATE INDEX idx_ideas_owner_updated ON ideas(owner_id, updated_at DESC);
CREATE INDEX idx_ideas_owner_created ON ideas(owner_id, created_at DESC);
CREATE INDEX idx_exports_user_created ON exports(user_id, created_at DESC);
CREATE INDEX idx_user_feedback_user_created ON user_feedback(user_id, created_at DESC);

-- Index for de-duplication
CREATE INDEX idx_ideas_title_hash_owner ON ideas(title_hash, owner_id) WHERE title_hash IS NOT NULL;

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_idea_comparison_metrics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY idea_comparison_metrics;
END;
$$ LANGUAGE plpgsql;

-- Migration checksum table
CREATE TABLE migration_checksums (
  migration_name TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert checksums for existing migrations
INSERT INTO migration_checksums (migration_name, checksum) VALUES
  ('001_create_tables', ''),
  ('002_add_startup_analysis', ''),
  ('003_scraper_enrichment_schemas', ''),
  ('004_gamification_integrations', ''),
  ('005_materialized_views_indexes', '')
ON CONFLICT (migration_name) DO NOTHING;
