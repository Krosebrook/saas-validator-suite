-- Users table
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free',
  credits_remaining BIGINT DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ideas table
CREATE TABLE ideas (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL, -- reddit, twitter, producthunt, etc
  source_url TEXT,
  raw_data JSONB,
  enrichment_data JSONB,
  status TEXT DEFAULT 'pending', -- pending, analyzing, completed, failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scores table
CREATE TABLE scores (
  id BIGSERIAL PRIMARY KEY,
  idea_id BIGINT REFERENCES ideas(id) ON DELETE CASCADE,
  track_type TEXT NOT NULL, -- saas, content, ecom
  overall_score DOUBLE PRECISION,
  market_potential DOUBLE PRECISION,
  competition_level DOUBLE PRECISION,
  technical_feasibility DOUBLE PRECISION,
  monetization_potential DOUBLE PRECISION,
  compliance_score DOUBLE PRECISION,
  ai_analysis TEXT,
  benchmarks JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cost estimates table
CREATE TABLE cost_estimates (
  id BIGSERIAL PRIMARY KEY,
  idea_id BIGINT REFERENCES ideas(id) ON DELETE CASCADE,
  infrastructure_cost DOUBLE PRECISION,
  development_cost DOUBLE PRECISION,
  operational_cost DOUBLE PRECISION,
  projected_revenue DOUBLE PRECISION,
  roi_estimate DOUBLE PRECISION,
  break_even_months BIGINT,
  cost_breakdown JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User feedback table
CREATE TABLE user_feedback (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  idea_id BIGINT REFERENCES ideas(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL, -- thumbs_up, thumbs_down, note
  feedback_value TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance scans table
CREATE TABLE compliance_scans (
  id BIGSERIAL PRIMARY KEY,
  idea_id BIGINT REFERENCES ideas(id) ON DELETE CASCADE,
  gdpr_compliant BOOLEAN,
  hipaa_compliant BOOLEAN,
  pci_compliant BOOLEAN,
  compliance_notes TEXT,
  risk_level TEXT, -- low, medium, high
  recommendations JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics events table
CREATE TABLE analytics_events (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gamification table
CREATE TABLE user_gamification (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  total_ideas_analyzed BIGINT DEFAULT 0,
  current_streak BIGINT DEFAULT 0,
  longest_streak BIGINT DEFAULT 0,
  total_score BIGINT DEFAULT 0,
  level_id BIGINT DEFAULT 1,
  badges JSONB DEFAULT '[]',
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Export jobs table
CREATE TABLE export_jobs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL, -- json, csv, pdf, notion
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  file_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_ideas_user_id ON ideas(user_id);
CREATE INDEX idx_ideas_status ON ideas(status);
CREATE INDEX idx_scores_idea_id ON scores(idea_id);
CREATE INDEX idx_user_feedback_idea_id ON user_feedback(idea_id);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);
