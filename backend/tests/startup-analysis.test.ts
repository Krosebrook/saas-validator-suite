import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StartupAnalysisResult } from "../ai/startup-types";

// Mock startup analysis data for testing
const mockStartupAnalysis: StartupAnalysisResult = {
  viability_score: 8,
  market_analysis: {
    verdict: "Strong",
    analysis: "Large addressable market with strong growth trends",
    tam_analysis: "Global market size of $50B",
    sam_analysis: "Serviceable addressable market of $5B",
    market_trends: ["Digital transformation", "Remote work adoption"],
    growth_rate: "15% YoY"
  },
  competitive_analysis: {
    verdict: "Moderate",
    analysis: "Competitive landscape with established players but room for differentiation",
    direct_competitors: ["Competitor A", "Competitor B"],
    indirect_competitors: ["Alternative Solution X"],
    barriers_to_entry: ["Network effects", "High switching costs"],
    competitive_advantages: ["First-mover advantage", "Unique technology"]
  },
  differentiation_analysis: {
    verdict: "Strong",
    analysis: "Clear unique value proposition with strong competitive moats",
    unique_value_proposition: "AI-powered automation that reduces manual work by 80%",
    key_differentiators: ["Advanced AI", "User experience", "Integration capabilities"],
    competitive_moats: ["Proprietary data", "Network effects"]
  },
  customer_analysis: {
    verdict: "Strong",
    analysis: "Well-defined target market with validated pain points",
    target_personas: ["Enterprise IT managers", "Operations teams"],
    pain_points: ["Manual processes", "Lack of automation", "High operational costs"],
    urgency_level: "High",
    market_validation: "Customer interviews confirm strong demand"
  },
  monetization_analysis: {
    verdict: "Strong",
    analysis: "Multiple revenue streams with healthy unit economics",
    revenue_streams: ["SaaS subscriptions", "Professional services", "API usage"],
    pricing_strategy: "Freemium with tiered pricing",
    unit_economics: {
      cac: 1000,
      ltv: 5000,
      ltv_cac_ratio: 5.0
    },
    monetization_timeline: "Revenue positive within 6 months"
  },
  execution_analysis: {
    verdict: "Moderate",
    analysis: "Achievable with proper team and funding",
    technical_feasibility: "Medium complexity, existing technologies",
    capital_requirements: {
      initial_funding: 2000000,
      runway_months: 18,
      funding_stage: "Seed"
    },
    regulatory_considerations: ["Data privacy", "Industry compliance"],
    team_requirements: ["CTO", "Lead developers", "Sales team"]
  },
  scalability_analysis: {
    verdict: "Strong",
    analysis: "High scalability potential with multiple growth vectors",
    growth_potential: "10x growth potential within 3 years",
    scalability_factors: ["API-first architecture", "Cloud infrastructure"],
    expansion_opportunities: ["International markets", "Adjacent verticals"],
    bottlenecks: ["Talent acquisition", "Customer success scaling"]
  },
  risk_analysis: {
    verdict: "Moderate",
    analysis: "Manageable risks with clear mitigation strategies",
    market_risks: ["Market saturation", "Economic downturn"],
    execution_risks: ["Technical complexity", "Team scaling"],
    competitive_risks: ["Large player entry", "Feature commoditization"],
    regulatory_risks: ["Data regulations", "Industry compliance"],
    mitigation_strategies: ["Diversified revenue", "Strong IP protection"]
  },
  top_strengths: [
    "Strong market opportunity with validated demand",
    "Unique technology with clear competitive advantages",
    "Healthy unit economics and multiple revenue streams"
  ],
  top_concerns: [
    "Competitive landscape becoming crowded",
    "Technical execution complexity",
    "Customer acquisition cost optimization needed"
  ],
  potential_pivots: [
    "Focus on specific vertical market first",
    "Pivot to B2B2C model through partnerships",
    "Consider horizontal expansion into adjacent markets"
  ],
  recommended_next_steps: [
    "Conduct detailed customer discovery interviews",
    "Build and test MVP with early adopters",
    "Secure seed funding and hire core technical team"
  ],
  executive_summary: "Strong startup opportunity with significant market potential and clear differentiation, though execution risks need careful management."
};

describe("Startup Analysis Types", () => {
  describe("StartupAnalysisResult", () => {
    it("should have correct structure", () => {
      expect(mockStartupAnalysis).toHaveProperty("viability_score");
      expect(mockStartupAnalysis).toHaveProperty("market_analysis");
      expect(mockStartupAnalysis).toHaveProperty("competitive_analysis");
      expect(mockStartupAnalysis).toHaveProperty("differentiation_analysis");
      expect(mockStartupAnalysis).toHaveProperty("customer_analysis");
      expect(mockStartupAnalysis).toHaveProperty("monetization_analysis");
      expect(mockStartupAnalysis).toHaveProperty("execution_analysis");
      expect(mockStartupAnalysis).toHaveProperty("scalability_analysis");
      expect(mockStartupAnalysis).toHaveProperty("risk_analysis");
      expect(mockStartupAnalysis).toHaveProperty("top_strengths");
      expect(mockStartupAnalysis).toHaveProperty("top_concerns");
      expect(mockStartupAnalysis).toHaveProperty("potential_pivots");
      expect(mockStartupAnalysis).toHaveProperty("recommended_next_steps");
    });

    it("should have valid viability score range", () => {
      expect(mockStartupAnalysis.viability_score).toBeGreaterThanOrEqual(1);
      expect(mockStartupAnalysis.viability_score).toBeLessThanOrEqual(10);
    });

    it("should have valid verdicts", () => {
      const validVerdicts = ["Strong", "Moderate", "Weak"];
      
      expect(validVerdicts).toContain(mockStartupAnalysis.market_analysis.verdict);
      expect(validVerdicts).toContain(mockStartupAnalysis.competitive_analysis.verdict);
      expect(validVerdicts).toContain(mockStartupAnalysis.differentiation_analysis.verdict);
      expect(validVerdicts).toContain(mockStartupAnalysis.customer_analysis.verdict);
      expect(validVerdicts).toContain(mockStartupAnalysis.monetization_analysis.verdict);
      expect(validVerdicts).toContain(mockStartupAnalysis.execution_analysis.verdict);
      expect(validVerdicts).toContain(mockStartupAnalysis.scalability_analysis.verdict);
      expect(validVerdicts).toContain(mockStartupAnalysis.risk_analysis.verdict);
    });

    it("should have exactly 3 top strengths and concerns", () => {
      expect(mockStartupAnalysis.top_strengths).toHaveLength(3);
      expect(mockStartupAnalysis.top_concerns).toHaveLength(3);
    });

    it("should have exactly 3 recommended next steps", () => {
      expect(mockStartupAnalysis.recommended_next_steps).toHaveLength(3);
    });

    it("should have valid unit economics", () => {
      const unitEconomics = mockStartupAnalysis.monetization_analysis.unit_economics;
      
      if (unitEconomics) {
        expect(unitEconomics.cac).toBeGreaterThan(0);
        expect(unitEconomics.ltv).toBeGreaterThan(0);
        expect(unitEconomics.ltv_cac_ratio).toBeGreaterThan(0);
        
        if (unitEconomics.cac && unitEconomics.ltv) {
          expect(unitEconomics.ltv_cac_ratio).toEqual(unitEconomics.ltv / unitEconomics.cac);
        }
      }
    });

    it("should have valid capital requirements", () => {
      const capitalReqs = mockStartupAnalysis.execution_analysis.capital_requirements;
      
      if (capitalReqs) {
        expect(capitalReqs.initial_funding).toBeGreaterThan(0);
        expect(capitalReqs.runway_months).toBeGreaterThan(0);
        expect(capitalReqs.funding_stage).toBeDefined();
      }
    });
  });
});

describe("Startup Analysis Validation", () => {
  describe("Score validation", () => {
    it("should validate viability score is within range", () => {
      const validateViabilityScore = (score: number) => score >= 1 && score <= 10;
      
      expect(validateViabilityScore(1)).toBe(true);
      expect(validateViabilityScore(5)).toBe(true);
      expect(validateViabilityScore(10)).toBe(true);
      expect(validateViabilityScore(0)).toBe(false);
      expect(validateViabilityScore(11)).toBe(false);
    });
  });

  describe("Verdict validation", () => {
    it("should validate verdict types", () => {
      const isValidVerdict = (verdict: string) => 
        ["Strong", "Moderate", "Weak"].includes(verdict);
      
      expect(isValidVerdict("Strong")).toBe(true);
      expect(isValidVerdict("Moderate")).toBe(true);
      expect(isValidVerdict("Weak")).toBe(true);
      expect(isValidVerdict("Invalid")).toBe(false);
      expect(isValidVerdict("")).toBe(false);
    });
  });

  describe("Analysis depth validation", () => {
    it("should validate analysis depth options", () => {
      const isValidDepth = (depth: string) => 
        ["standard", "deep", "executive"].includes(depth);
      
      expect(isValidDepth("standard")).toBe(true);
      expect(isValidDepth("deep")).toBe(true);
      expect(isValidDepth("executive")).toBe(true);
      expect(isValidDepth("invalid")).toBe(false);
    });
  });
});

describe("Startup Analysis Utilities", () => {
  describe("Score calculations", () => {
    it("should calculate LTV:CAC ratio correctly", () => {
      const calculateLtvCacRatio = (ltv: number, cac: number) => ltv / cac;
      
      expect(calculateLtvCacRatio(5000, 1000)).toBe(5);
      expect(calculateLtvCacRatio(3000, 600)).toBe(5);
      expect(calculateLtvCacRatio(10000, 2500)).toBe(4);
    });

    it("should format currency correctly", () => {
      const formatCurrency = (amount: number) => 
        new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(amount);
      
      expect(formatCurrency(1000)).toBe("$1,000");
      expect(formatCurrency(1000000)).toBe("$1,000,000");
      expect(formatCurrency(500)).toBe("$500");
    });
  });

  describe("Analysis helpers", () => {
    it("should identify high viability scores", () => {
      const isHighViability = (score: number) => score >= 8;
      
      expect(isHighViability(8)).toBe(true);
      expect(isHighViability(9)).toBe(true);
      expect(isHighViability(10)).toBe(true);
      expect(isHighViability(7)).toBe(false);
      expect(isHighViability(5)).toBe(false);
    });

    it("should count strong verdicts", () => {
      const countStrongVerdicts = (analysis: StartupAnalysisResult) => {
        const verdicts = [
          analysis.market_analysis.verdict,
          analysis.competitive_analysis.verdict,
          analysis.differentiation_analysis.verdict,
          analysis.customer_analysis.verdict,
          analysis.monetization_analysis.verdict,
          analysis.execution_analysis.verdict,
          analysis.scalability_analysis.verdict,
          analysis.risk_analysis.verdict,
        ];
        
        return verdicts.filter(verdict => verdict === "Strong").length;
      };
      
      expect(countStrongVerdicts(mockStartupAnalysis)).toBeGreaterThan(0);
    });
  });
});