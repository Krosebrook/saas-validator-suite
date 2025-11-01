-- Sources table for scraper configuration
CREATE TABLE sources (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('rss', 'api', 'html')),
  config JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  last_fetch_at TIMESTAMPTZ,
  etag TEXT,
  last_modified TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sources_enabled ON sources(enabled);
CREATE INDEX idx_sources_type ON sources(type);

-- Raw items from scrapers (before normalization)
CREATE TABLE raw_items (
  id BIGSERIAL PRIMARY KEY,
  source_id BIGINT REFERENCES sources(id) ON DELETE CASCADE,
  ext_id TEXT NOT NULL,
  url TEXT NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  raw JSONB NOT NULL,
  hash TEXT NOT NULL UNIQUE,
  normalized BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_raw_items_source_id ON raw_items(source_id);
CREATE INDEX idx_raw_items_hash ON raw_items(hash);
CREATE INDEX idx_raw_items_normalized ON raw_items(normalized);
CREATE UNIQUE INDEX idx_raw_items_source_ext ON raw_items(source_id, ext_id);

-- Enrichment jobs tracking
CREATE TABLE enrich_jobs (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT REFERENCES raw_items(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'done', 'failed')) DEFAULT 'queued',
  attempts INT DEFAULT 0,
  result JSONB,
  errors JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_enrich_jobs_status ON enrich_jobs(status);
CREATE INDEX idx_enrich_jobs_item_id ON enrich_jobs(item_id);

-- Enhance ideas table with enrichment fields
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS score NUMERIC(5,2);
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS signals JSONB DEFAULT '{}';
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS owner_id BIGINT REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS title_hash TEXT;

CREATE INDEX idx_ideas_owner_id ON ideas(owner_id);
CREATE INDEX idx_ideas_title_hash ON ideas(title_hash);
CREATE INDEX idx_ideas_tags ON ideas USING GIN(tags);

-- Validation dimensions configuration
CREATE TABLE validation_dimensions (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  weight INT DEFAULT 12 CHECK (weight >= 0 AND weight <= 100),
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default 8 dimensions
INSERT INTO validation_dimensions (key, label, weight, description) VALUES
  ('problem_severity', 'Problem Severity', 12, 'How severe is the problem being solved?'),
  ('customer_urgency', 'Customer Urgency', 12, 'How urgent is the need for a solution?'),
  ('frequency', 'Frequency', 13, 'How frequently does the problem occur?'),
  ('willingness_to_pay', 'Willingness to Pay', 13, 'How willing are customers to pay for a solution?'),
  ('tam_reachability', 'TAM/Reachability', 13, 'Total addressable market and ease of reaching customers'),
  ('competitive_intensity', 'Competitive Intensity', 12, 'Level of competition in the market'),
  ('execution_feasibility', 'Execution Feasibility', 13, 'Feasibility of executing the idea'),
  ('regulatory_risk', 'Regulatory Risk', 12, 'Regulatory and compliance risks');

-- Idea validation results
CREATE TABLE idea_validation (
  idea_id BIGINT PRIMARY KEY REFERENCES ideas(id) ON DELETE CASCADE,
  dims JSONB NOT NULL DEFAULT '{}',
  overall NUMERIC(5,2) NOT NULL,
  rationale TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_idea_validation_overall ON idea_validation(overall DESC);

-- Exports and one-pagers
CREATE TABLE exports (
  id BIGSERIAL PRIMARY KEY,
  idea_id BIGINT REFERENCES ideas(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('pdf', 'onepager', 'csv', 'json')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  artifact_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_exports_idea_id ON exports(idea_id);
CREATE INDEX idx_exports_user_id ON exports(user_id);
CREATE INDEX idx_exports_status ON exports(status);
