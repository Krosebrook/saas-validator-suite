import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, XCircle, TrendingUp, Users, DollarSign, Cog, BarChart3, Shield } from 'lucide-react';

export type VerdictType = "Strong" | "Moderate" | "Weak";

interface DimensionAnalysis {
  verdict: VerdictType;
  analysis: string;
}

interface DimensionCardProps {
  title: string;
  icon: React.ReactNode;
  analysis: DimensionAnalysis;
  additionalData?: React.ReactNode;
}

const verdictConfig = {
  Strong: {
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: <CheckCircle className="w-4 h-4 text-green-600" />,
    bgColor: 'bg-green-50'
  },
  Moderate: {
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: <AlertCircle className="w-4 h-4 text-yellow-600" />,
    bgColor: 'bg-yellow-50'
  },
  Weak: {
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: <XCircle className="w-4 h-4 text-red-600" />,
    bgColor: 'bg-red-50'
  }
};

export function DimensionCard({ title, icon, analysis, additionalData }: DimensionCardProps) {
  const config = verdictConfig[analysis.verdict];

  return (
    <Card className={`${config.bgColor} border-l-4 ${config.color.split(' ')[2]?.replace('text-', 'border-')}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon}
          <span>{title}</span>
          <Badge className={config.color} variant="outline">
            {config.icon}
            {analysis.verdict}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-foreground leading-relaxed">{analysis.analysis}</p>
        {additionalData && (
          <div className="pt-2 border-t border-border/50">
            {additionalData}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Specific dimension cards with their icons
export function MarketDimensionCard({ analysis, additionalData }: { analysis: DimensionAnalysis; additionalData?: React.ReactNode }) {
  return (
    <DimensionCard
      title="Market Size & Opportunity"
      icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
      analysis={analysis}
      additionalData={additionalData}
    />
  );
}

export function CompetitiveDimensionCard({ analysis, additionalData }: { analysis: DimensionAnalysis; additionalData?: React.ReactNode }) {
  return (
    <DimensionCard
      title="Competitive Landscape"
      icon={<BarChart3 className="w-5 h-5 text-purple-600" />}
      analysis={analysis}
      additionalData={additionalData}
    />
  );
}

export function DifferentiationDimensionCard({ analysis, additionalData }: { analysis: DimensionAnalysis; additionalData?: React.ReactNode }) {
  return (
    <DimensionCard
      title="Differentiation Analysis"
      icon={<CheckCircle className="w-5 h-5 text-green-600" />}
      analysis={analysis}
      additionalData={additionalData}
    />
  );
}

export function CustomerDimensionCard({ analysis, additionalData }: { analysis: DimensionAnalysis; additionalData?: React.ReactNode }) {
  return (
    <DimensionCard
      title="Target Customer Validation"
      icon={<Users className="w-5 h-5 text-orange-600" />}
      analysis={analysis}
      additionalData={additionalData}
    />
  );
}

export function MonetizationDimensionCard({ analysis, additionalData }: { analysis: DimensionAnalysis; additionalData?: React.ReactNode }) {
  return (
    <DimensionCard
      title="Monetization Potential"
      icon={<DollarSign className="w-5 h-5 text-green-600" />}
      analysis={analysis}
      additionalData={additionalData}
    />
  );
}

export function ExecutionDimensionCard({ analysis, additionalData }: { analysis: DimensionAnalysis; additionalData?: React.ReactNode }) {
  return (
    <DimensionCard
      title="Execution Requirements"
      icon={<Cog className="w-5 h-5 text-gray-600" />}
      analysis={analysis}
      additionalData={additionalData}
    />
  );
}

export function ScalabilityDimensionCard({ analysis, additionalData }: { analysis: DimensionAnalysis; additionalData?: React.ReactNode }) {
  return (
    <DimensionCard
      title="Scalability Assessment"
      icon={<TrendingUp className="w-5 h-5 text-indigo-600" />}
      analysis={analysis}
      additionalData={additionalData}
    />
  );
}

export function RiskDimensionCard({ analysis, additionalData }: { analysis: DimensionAnalysis; additionalData?: React.ReactNode }) {
  return (
    <DimensionCard
      title="Risk Analysis"
      icon={<Shield className="w-5 h-5 text-red-600" />}
      analysis={analysis}
      additionalData={additionalData}
    />
  );
}