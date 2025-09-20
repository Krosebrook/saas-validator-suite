import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';

interface IdeaCardProps {
  id: number;
  title: string;
  description?: string;
  source: string;
  status: string;
  overallScore?: number;
  createdAt: Date;
}

export default function IdeaCard({ 
  id, 
  title, 
  description, 
  source, 
  status, 
  overallScore,
  createdAt 
}: IdeaCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'analyzing': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg line-clamp-2">
            <Link 
              to={`/ideas/${id}`}
              className="hover:text-primary transition-colors"
            >
              {title}
            </Link>
          </CardTitle>
          <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
        </div>
      </CardHeader>
      
      <CardContent>
        {description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {description}
          </p>
        )}
        
        <div className="flex items-center justify-between mb-3">
          <Badge variant="outline" className="text-xs">
            {source}
          </Badge>
          <Badge className={`text-xs ${getStatusColor(status)}`}>
            {status}
          </Badge>
        </div>

        {overallScore !== undefined && (
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Overall Score</span>
            <span className={`font-semibold ${getScoreColor(overallScore)}`}>
              {overallScore}/100
            </span>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Created {new Date(createdAt).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}
