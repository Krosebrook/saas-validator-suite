export type VerdictType = "Strong" | "Moderate" | "Weak";

export interface DimensionAnalysis {
  verdict: VerdictType;
  analysis: string;
  score?: number; // Optional numerical score for internal use
}

export interface MarketAnalysis extends DimensionAnalysis {
  tam_analysis?: string;
  sam_analysis?: string;
  market_trends?: string[];
  growth_rate?: string;
}

export interface CompetitiveAnalysis extends DimensionAnalysis {
  direct_competitors?: string[];
  indirect_competitors?: string[];
  barriers_to_entry?: string[];
  competitive_advantages?: string[];
}

export interface DifferentiationAnalysis extends DimensionAnalysis {
  unique_value_proposition?: string;
  key_differentiators?: string[];
  competitive_moats?: string[];
}

export interface CustomerAnalysis extends DimensionAnalysis {
  target_personas?: string[];
  pain_points?: string[];
  urgency_level?: string;
  market_validation?: string;
}

export interface MonetizationAnalysis extends DimensionAnalysis {
  revenue_streams?: string[];
  pricing_strategy?: string;
  unit_economics?: {
    cac?: number;
    ltv?: number;
    ltv_cac_ratio?: number;
  };
  monetization_timeline?: string;
}

export interface ExecutionAnalysis extends DimensionAnalysis {
  technical_feasibility?: string;
  capital_requirements?: {
    initial_funding?: number;
    runway_months?: number;
    funding_stage?: string;
  };
  regulatory_considerations?: string[];
  team_requirements?: string[];
}

export interface ScalabilityAnalysis extends DimensionAnalysis {
  growth_potential?: string;
  scalability_factors?: string[];
  expansion_opportunities?: string[];
  bottlenecks?: string[];
}

export interface RiskAnalysis extends DimensionAnalysis {
  market_risks?: string[];
  execution_risks?: string[];
  competitive_risks?: string[];
  regulatory_risks?: string[];
  mitigation_strategies?: string[];
}

export interface StartupAnalysisResult {
  viability_score: number; // 1-10
  market_analysis: MarketAnalysis;
  competitive_analysis: CompetitiveAnalysis;
  differentiation_analysis: DifferentiationAnalysis;
  customer_analysis: CustomerAnalysis;
  monetization_analysis: MonetizationAnalysis;
  execution_analysis: ExecutionAnalysis;
  scalability_analysis: ScalabilityAnalysis;
  risk_analysis: RiskAnalysis;
  top_strengths: string[];
  top_concerns: string[];
  potential_pivots: string[];
  recommended_next_steps: string[];
  executive_summary?: string;
}

export interface StartupAnalysisRequest {
  idea_id: number;
  analysis_depth?: "standard" | "deep" | "executive"; // Different analysis levels
  focus_areas?: string[]; // Optional focus on specific dimensions
}