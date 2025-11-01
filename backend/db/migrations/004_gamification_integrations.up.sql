-- Enhanced user metrics for gamification
CREATE TABLE user_metrics (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  points INT DEFAULT 0,
  streak_days INT DEFAULT 0,
  last_activity DATE,
  total_imports INT DEFAULT 0,
  total_enrichments INT DEFAULT 0,
  total_validations INT DEFAULT 0,
  total_exports INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leaderboards snapshot table
CREATE TABLE leaderboards (
  id BIGSERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  points INT NOT NULL,
  rank INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leaderboards_snapshot ON leaderboards(snapshot_date, rank);
CREATE INDEX idx_leaderboards_user ON leaderboards(user_id, snapshot_date);

-- Achievements
CREATE TABLE achievements (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_achievements_user_key ON achievements(user_id, key);

-- Notion sync connections
CREATE TABLE notion_conns (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  database_id TEXT NOT NULL,
  last_sync TIMESTAMPTZ,
  sync_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notion sync log
CREATE TABLE notion_sync_log (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  direction TEXT CHECK (direction IN ('push', 'pull')),
  ideas_synced INT DEFAULT 0,
  errors JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notion_sync_log_user ON notion_sync_log(user_id);

-- Integration webhooks
CREATE TABLE integration_webhooks (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('zapier', 'n8n', 'slack', 'custom')),
  webhook_url TEXT NOT NULL,
  secret TEXT,
  events TEXT[] DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  last_triggered TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_integration_webhooks_user ON integration_webhooks(user_id);
CREATE INDEX idx_integration_webhooks_provider ON integration_webhooks(provider);

-- Webhook delivery log
CREATE TABLE webhook_deliveries (
  id BIGSERIAL PRIMARY KEY,
  webhook_id BIGINT REFERENCES integration_webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT CHECK (status IN ('pending', 'success', 'failed')),
  attempts INT DEFAULT 0,
  response_code INT,
  response_body TEXT,
  next_retry TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_next_retry ON webhook_deliveries(next_retry) WHERE status = 'pending';

-- Bulk imports
CREATE TABLE imports (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  format TEXT CHECK (format IN ('csv', 'jsonl')),
  status TEXT CHECK (status IN ('uploading', 'validating', 'processing', 'completed', 'failed')) DEFAULT 'uploading',
  total_rows INT DEFAULT 0,
  processed_rows INT DEFAULT 0,
  success_count INT DEFAULT 0,
  error_count INT DEFAULT 0,
  errors JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_imports_user ON imports(user_id);
CREATE INDEX idx_imports_status ON imports(status);

-- Weekly digests configuration
CREATE TABLE digests (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  schedule TEXT DEFAULT 'weekly',
  last_run TIMESTAMPTZ,
  config JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_digests_user ON digests(user_id);

-- Digest runs
CREATE TABLE digest_runs (
  id BIGSERIAL PRIMARY KEY,
  digest_id BIGINT REFERENCES digests(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'processing', 'sent', 'failed')) DEFAULT 'pending',
  logs TEXT,
  sent_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_digest_runs_digest ON digest_runs(digest_id);
CREATE INDEX idx_digest_runs_status ON digest_runs(status);
