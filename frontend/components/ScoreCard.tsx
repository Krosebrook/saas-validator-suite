import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ScoreCardProps {
  title: string;
  score: number;
  description?: string;
  className?: string;
}

export default function ScoreCard({ title, score, description, className }: ScoreCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-600';
    if (score >= 60) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
            {score}
          </span>
          <span className="text-sm text-muted-foreground">/ 100</span>
        </div>
        <Progress 
          value={score} 
          className="h-2"
          style={{
            backgroundColor: '#f1f5f9',
          }}
        />
        {description && (
          <p className="text-xs text-muted-foreground mt-2">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
