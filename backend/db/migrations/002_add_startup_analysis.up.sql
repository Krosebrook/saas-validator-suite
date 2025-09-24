-- Startup analysis results table
CREATE TABLE startup_analyses (
  id BIGSERIAL PRIMARY KEY,
  idea_id BIGINT REFERENCES ideas(id) ON DELETE CASCADE,
  viability_score INTEGER CHECK (viability_score >= 1 AND viability_score <= 10),
  
  -- Dimension verdicts
  market_verdict TEXT CHECK (market_verdict IN ('Strong', 'Moderate', 'Weak')),
  competitive_verdict TEXT CHECK (competitive_verdict IN ('Strong', 'Moderate', 'Weak')),
  differentiation_verdict TEXT CHECK (differentiation_verdict IN ('Strong', 'Moderate', 'Weak')),
  customer_verdict TEXT CHECK (customer_verdict IN ('Strong', 'Moderate', 'Weak')),
  monetization_verdict TEXT CHECK (monetization_verdict IN ('Strong', 'Moderate', 'Weak')),
  execution_verdict TEXT CHECK (execution_verdict IN ('Strong', 'Moderate', 'Weak')),
  scalability_verdict TEXT CHECK (scalability_verdict IN ('Strong', 'Moderate', 'Weak')),
  risk_verdict TEXT CHECK (risk_verdict IN ('Strong', 'Moderate', 'Weak')),
  
  -- Key insights (JSON arrays)
  strengths JSONB DEFAULT '[]',
  concerns JSONB DEFAULT '[]',
  pivots JSONB DEFAULT '[]',
  next_steps JSONB DEFAULT '[]',
  
  -- Full detailed analysis (complete JSON)
  detailed_analysis JSONB,
  
  -- Metadata
  analysis_depth TEXT DEFAULT 'standard' CHECK (analysis_depth IN ('standard', 'deep', 'executive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint - one startup analysis per idea
CREATE UNIQUE INDEX idx_startup_analyses_idea_id ON startup_analyses(idea_id);

-- Create indexes for efficient querying
CREATE INDEX idx_startup_analyses_viability_score ON startup_analyses(viability_score);
CREATE INDEX idx_startup_analyses_created_at ON startup_analyses(created_at);
CREATE INDEX idx_startup_analyses_verdicts ON startup_analyses(market_verdict, competitive_verdict, differentiation_verdict);

-- Update ideas table to support startup analysis status
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS analysis_type TEXT CHECK (analysis_type IN ('basic', 'startup', 'both')) DEFAULT 'basic';
CREATE INDEX IF NOT EXISTS idx_ideas_analysis_type ON ideas(analysis_type);

-- Create view for startup analysis summary
CREATE OR REPLACE VIEW startup_analysis_summary AS
SELECT 
  i.id as idea_id,
  i.title,
  i.description,
  i.created_at as idea_created_at,
  sa.viability_score,
  sa.market_verdict,
  sa.competitive_verdict,
  sa.differentiation_verdict,
  sa.customer_verdict,
  sa.monetization_verdict,
  sa.execution_verdict,
  sa.scalability_verdict,
  sa.risk_verdict,
  sa.strengths,
  sa.concerns,
  sa.analysis_depth,
  sa.created_at as analysis_created_at
FROM ideas i
JOIN startup_analyses sa ON i.id = sa.idea_id
WHERE i.status = 'completed';

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_startup_analysis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_startup_analysis_updated_at
  BEFORE UPDATE ON startup_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_startup_analysis_updated_at();