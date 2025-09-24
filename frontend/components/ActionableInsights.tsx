import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertTriangle, Lightbulb, ArrowRight } from 'lucide-react';

interface ActionableInsightsProps {
  viabilityScore: number;
  strengths: string[];
  concerns: string[];
  pivots: string[];
  nextSteps: string[];
  executiveSummary?: string;
}

export function ActionableInsights({
  viabilityScore,
  strengths,
  concerns,
  pivots,
  nextSteps,
  executiveSummary
}: ActionableInsightsProps) {
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 8) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 6) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      {executiveSummary && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Lightbulb className="w-5 h-5" />
              Executive Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-blue-800 font-medium">{executiveSummary}</p>
          </CardContent>
        </Card>
      )}

      {/* Viability Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Overall Viability Score</span>
            <Badge className={getScoreBadgeColor(viabilityScore)} variant="outline">
              {viabilityScore}/10
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Progress value={viabilityScore * 10} className="h-3" />
            <p className={`text-sm font-medium ${getScoreColor(viabilityScore)}`}>
              {viabilityScore >= 8 && "Highly Viable - Strong investment potential"}
              {viabilityScore >= 6 && viabilityScore < 8 && "Moderately Viable - Address key concerns before proceeding"}
              {viabilityScore < 6 && "Low Viability - Significant pivots or improvements needed"}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Strengths */}
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="w-5 h-5" />
              Top Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2 text-green-700">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Top Concerns */}
        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="w-5 h-5" />
              Top Concerns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {concerns.map((concern, index) => (
                <li key={index} className="flex items-start gap-2 text-red-700">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{concern}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Potential Pivots */}
      {pivots.length > 0 && (
        <Card className="bg-purple-50 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-800">
              <Lightbulb className="w-5 h-5" />
              Potential Pivots
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {pivots.map((pivot, index) => (
                <li key={index} className="flex items-start gap-2 text-purple-700">
                  <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{pivot}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommended Next Steps */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <ArrowRight className="w-5 h-5" />
            Recommended Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {nextSteps.map((step, index) => (
              <li key={index} className="flex items-start gap-3 text-blue-700">
                <div className="w-6 h-6 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                  {index + 1}
                </div>
                <span className="text-sm">{step}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}