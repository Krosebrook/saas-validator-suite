import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MarketDimensionCard,
  CompetitiveDimensionCard,
  DifferentiationDimensionCard,
  CustomerDimensionCard,
  MonetizationDimensionCard,
  ExecutionDimensionCard,
  ScalabilityDimensionCard,
  RiskDimensionCard
} from './DimensionCard';
import { ActionableInsights } from './ActionableInsights';

interface StartupAnalysisResult {
  viability_score: number;
  market_analysis: {
    verdict: "Strong" | "Moderate" | "Weak";
    analysis: string;
    tam_analysis?: string;
    sam_analysis?: string;
    market_trends?: string[];
    growth_rate?: string;
  };
  competitive_analysis: {
    verdict: "Strong" | "Moderate" | "Weak";
    analysis: string;
    direct_competitors?: string[];
    indirect_competitors?: string[];
    barriers_to_entry?: string[];
    competitive_advantages?: string[];
  };
  differentiation_analysis: {
    verdict: "Strong" | "Moderate" | "Weak";
    analysis: string;
    unique_value_proposition?: string;
    key_differentiators?: string[];
    competitive_moats?: string[];
  };
  customer_analysis: {
    verdict: "Strong" | "Moderate" | "Weak";
    analysis: string;
    target_personas?: string[];
    pain_points?: string[];
    urgency_level?: string;
    market_validation?: string;
  };
  monetization_analysis: {
    verdict: "Strong" | "Moderate" | "Weak";
    analysis: string;
    revenue_streams?: string[];
    pricing_strategy?: string;
    unit_economics?: {
      cac?: number;
      ltv?: number;
      ltv_cac_ratio?: number;
    };
    monetization_timeline?: string;
  };
  execution_analysis: {
    verdict: "Strong" | "Moderate" | "Weak";
    analysis: string;
    technical_feasibility?: string;
    capital_requirements?: {
      initial_funding?: number;
      runway_months?: number;
      funding_stage?: string;
    };
    regulatory_considerations?: string[];
    team_requirements?: string[];
  };
  scalability_analysis: {
    verdict: "Strong" | "Moderate" | "Weak";
    analysis: string;
    growth_potential?: string;
    scalability_factors?: string[];
    expansion_opportunities?: string[];
    bottlenecks?: string[];
  };
  risk_analysis: {
    verdict: "Strong" | "Moderate" | "Weak";
    analysis: string;
    market_risks?: string[];
    execution_risks?: string[];
    competitive_risks?: string[];
    regulatory_risks?: string[];
    mitigation_strategies?: string[];
  };
  top_strengths: string[];
  top_concerns: string[];
  potential_pivots: string[];
  recommended_next_steps: string[];
  executive_summary?: string;
}

interface StartupAnalysisDisplayProps {
  analysis: StartupAnalysisResult;
  ideaTitle: string;
}

export function StartupAnalysisDisplay({ analysis, ideaTitle }: StartupAnalysisDisplayProps) {
  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatList = (items?: string[]) => {
    if (!items || items.length === 0) return null;
    return (
      <ul className="text-sm space-y-1">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 bg-current rounded-full mt-2 flex-shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            VC-Grade Startup Analysis: {ideaTitle}
          </CardTitle>
          <p className="text-indigo-100">
            Comprehensive 8-dimension validation using venture capital frameworks
          </p>
        </CardHeader>
      </Card>

      {/* Actionable Insights */}
      <ActionableInsights
        viabilityScore={analysis.viability_score}
        strengths={analysis.top_strengths}
        concerns={analysis.top_concerns}
        pivots={analysis.potential_pivots}
        nextSteps={analysis.recommended_next_steps}
        executiveSummary={analysis.executive_summary}
      />

      {/* 8-Dimension Analysis */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground mb-6">8-Dimension Analysis</h2>
        
        <div className="grid gap-6">
          {/* Market Analysis */}
          <MarketDimensionCard 
            analysis={analysis.market_analysis}
            additionalData={
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                {analysis.market_analysis.tam_analysis && (
                  <div>
                    <h4 className="font-medium text-foreground mb-1">Total Addressable Market</h4>
                    <p className="text-muted-foreground">{analysis.market_analysis.tam_analysis}</p>
                  </div>
                )}
                {analysis.market_analysis.growth_rate && (
                  <div>
                    <h4 className="font-medium text-foreground mb-1">Growth Rate</h4>
                    <p className="text-muted-foreground">{analysis.market_analysis.growth_rate}</p>
                  </div>
                )}
                {analysis.market_analysis.market_trends && (
                  <div className="md:col-span-2">
                    <h4 className="font-medium text-foreground mb-2">Market Trends</h4>
                    {formatList(analysis.market_analysis.market_trends)}
                  </div>
                )}
              </div>
            }
          />

          {/* Competitive Analysis */}
          <CompetitiveDimensionCard
            analysis={analysis.competitive_analysis}
            additionalData={
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                {analysis.competitive_analysis.direct_competitors && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Direct Competitors</h4>
                    {formatList(analysis.competitive_analysis.direct_competitors)}
                  </div>
                )}
                {analysis.competitive_analysis.barriers_to_entry && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Barriers to Entry</h4>
                    {formatList(analysis.competitive_analysis.barriers_to_entry)}
                  </div>
                )}
              </div>
            }
          />

          {/* Differentiation Analysis */}
          <DifferentiationDimensionCard
            analysis={analysis.differentiation_analysis}
            additionalData={
              <div className="space-y-3 text-sm">
                {analysis.differentiation_analysis.unique_value_proposition && (
                  <div>
                    <h4 className="font-medium text-foreground mb-1">Unique Value Proposition</h4>
                    <p className="text-muted-foreground bg-background/50 p-3 rounded-lg border">
                      {analysis.differentiation_analysis.unique_value_proposition}
                    </p>
                  </div>
                )}
                {analysis.differentiation_analysis.key_differentiators && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Key Differentiators</h4>
                    {formatList(analysis.differentiation_analysis.key_differentiators)}
                  </div>
                )}
              </div>
            }
          />

          {/* Customer Analysis */}
          <CustomerDimensionCard
            analysis={analysis.customer_analysis}
            additionalData={
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                {analysis.customer_analysis.target_personas && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Target Personas</h4>
                    {formatList(analysis.customer_analysis.target_personas)}
                  </div>
                )}
                {analysis.customer_analysis.pain_points && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Pain Points</h4>
                    {formatList(analysis.customer_analysis.pain_points)}
                  </div>
                )}
                {analysis.customer_analysis.urgency_level && (
                  <div className="md:col-span-2">
                    <h4 className="font-medium text-foreground mb-1">Urgency Level</h4>
                    <Badge variant={
                      analysis.customer_analysis.urgency_level === 'High' ? 'destructive' :
                      analysis.customer_analysis.urgency_level === 'Medium' ? 'default' : 'secondary'
                    }>
                      {analysis.customer_analysis.urgency_level}
                    </Badge>
                  </div>
                )}
              </div>
            }
          />

          {/* Monetization Analysis */}
          <MonetizationDimensionCard
            analysis={analysis.monetization_analysis}
            additionalData={
              <div className="space-y-4 text-sm">
                {analysis.monetization_analysis.revenue_streams && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Revenue Streams</h4>
                    {formatList(analysis.monetization_analysis.revenue_streams)}
                  </div>
                )}
                {analysis.monetization_analysis.unit_economics && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Unit Economics</h4>
                    <div className="grid grid-cols-3 gap-4 bg-background/50 p-3 rounded-lg border">
                      <div className="text-center">
                        <div className="font-medium">CAC</div>
                        <div className="text-muted-foreground">
                          {formatCurrency(analysis.monetization_analysis.unit_economics.cac)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">LTV</div>
                        <div className="text-muted-foreground">
                          {formatCurrency(analysis.monetization_analysis.unit_economics.ltv)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">LTV:CAC</div>
                        <div className="text-muted-foreground">
                          {analysis.monetization_analysis.unit_economics.ltv_cac_ratio?.toFixed(1) || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            }
          />

          {/* Execution Analysis */}
          <ExecutionDimensionCard
            analysis={analysis.execution_analysis}
            additionalData={
              <div className="space-y-4 text-sm">
                {analysis.execution_analysis.capital_requirements && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Capital Requirements</h4>
                    <div className="grid grid-cols-2 gap-4 bg-background/50 p-3 rounded-lg border">
                      <div>
                        <div className="font-medium">Initial Funding</div>
                        <div className="text-muted-foreground">
                          {formatCurrency(analysis.execution_analysis.capital_requirements.initial_funding)}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">Funding Stage</div>
                        <div className="text-muted-foreground">
                          {analysis.execution_analysis.capital_requirements.funding_stage || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {analysis.execution_analysis.team_requirements && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Team Requirements</h4>
                    {formatList(analysis.execution_analysis.team_requirements)}
                  </div>
                )}
              </div>
            }
          />

          {/* Scalability Analysis */}
          <ScalabilityDimensionCard
            analysis={analysis.scalability_analysis}
            additionalData={
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                {analysis.scalability_analysis.scalability_factors && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Scalability Factors</h4>
                    {formatList(analysis.scalability_analysis.scalability_factors)}
                  </div>
                )}
                {analysis.scalability_analysis.expansion_opportunities && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Expansion Opportunities</h4>
                    {formatList(analysis.scalability_analysis.expansion_opportunities)}
                  </div>
                )}
              </div>
            }
          />

          {/* Risk Analysis */}
          <RiskDimensionCard
            analysis={analysis.risk_analysis}
            additionalData={
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                {analysis.risk_analysis.market_risks && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Market Risks</h4>
                    {formatList(analysis.risk_analysis.market_risks)}
                  </div>
                )}
                {analysis.risk_analysis.mitigation_strategies && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Mitigation Strategies</h4>
                    {formatList(analysis.risk_analysis.mitigation_strategies)}
                  </div>
                )}
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
}